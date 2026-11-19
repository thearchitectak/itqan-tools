// المطابقة البصرية للخامات (على الجهاز):
// - regionGrow: تحديد سطح الخامة من نقرة على اللقطة (نمو منطقة بتشابه اللون بعد تنعيم الصورة).
// - features: بصمة بصرية للون (Lab: المتوسط والتشتت ومدرّج اللون) والملمس (شدة التفاصيل بمقياسين، والاتجاهية، وتكرار النقشة).
// - thumbFeatures: بصمة صورة الخامة في المكتبة (من وسط الكرة المصغرة، بعد إزالة تظليلها)، مع تخزين دائم في IndexedDB.
// - rank: ترتيب المرشحين حسب القرب البصري.
import { smartFetch } from './lib.js';

/* ---------- الألوان ---------- */
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const LUT = new Float32Array(256).map((_, i) => lin(i));
const fLab = (t) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
export function lab(r, g, b) {
  const R = LUT[r], G = LUT[g], B = LUT[b];
  const x = fLab((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047), y = fLab(R * 0.2126 + G * 0.7152 + B * 0.0722), z = fLab((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/* ---------- لوحة مصغرة للتحليل ---------- */
export function analysisCanvas(src, maxSide = 480) {
  const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight, k = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height).data, N = c.width * c.height, L = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const v = lab(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]); L[i * 3] = v[0]; L[i * 3 + 1] = v[1]; L[i * 3 + 2] = v[2]; }
  return { w: c.width, h: c.height, k, rgb: d, lab: L, canvas: c };
}
function blurLab(A, r = 2) { // تنعيم صندوقي للقنوات الثلاث
  const { w, h } = A, src = A.lab, tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const s = [0, 0, 0]; let n = 0; for (let k = -r; k <= r; k++) { const xx = x + k; if (xx < 0 || xx >= w) continue; const i = (y * w + xx) * 3; s[0] += src[i]; s[1] += src[i + 1]; s[2] += src[i + 2]; n++; } const o = (y * w + x) * 3; tmp[o] = s[0] / n; tmp[o + 1] = s[1] / n; tmp[o + 2] = s[2] / n; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const s = [0, 0, 0]; let n = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy < 0 || yy >= h) continue; const i = (yy * w + x) * 3; s[0] += tmp[i]; s[1] += tmp[i + 1]; s[2] += tmp[i + 2]; n++; } const o = (y * w + x) * 3; out[o] = s[0] / n; out[o + 1] = s[1] / n; out[o + 2] = s[2] / n; }
  return out;
}

/* ---------- تحديد السطح من نقرة ---------- */
// tol: التسامح اللوني (ΔE). يعيد { mask, bbox:[x,y,w,h], count } بإحداثيات لوحة التحليل
export function regionGrow(A, px, py, tol = 14) {
  if (!A._smooth) A._smooth = blurLab(A, Math.max(1, Math.round(Math.max(A.w, A.h) / 240)));
  const S = A._smooth, { w, h } = A;
  // حواف قوية (من الصورة الأصلية غير المنعّمة) تعمل حاجزًا يوقف التحديد عند حدود العنصر
  if (!A._edge) {
    const L = A.lab, e = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; e[i] = Math.hypot(L[(i + 1) * 3] - L[(i - 1) * 3], L[(i + w) * 3] - L[(i - w) * 3]); }
    A._edge = boxBlur1(e, w, h, 1);
  }
  const E = A._edge, mask = new Uint8Array(w * h), q = new Int32Array(w * h);
  const seed = py * w + px;
  // لون مرجعي ثابت: متوسط نافذة صغيرة حول النقرة (لا ينجرف مع نمو المنطقة)
  let rL = 0, rA = 0, rB = 0, rn = 0, eRef = 0;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const x = px + dx, y = py + dy; if (x < 0 || y < 0 || x >= w || y >= h) continue; const i = y * w + x; rL += S[i * 3]; rA += S[i * 3 + 1]; rB += S[i * 3 + 2]; eRef += E[i]; rn++; }
  rL /= rn; rA /= rn; rB /= rn; eRef /= rn;
  const edgeMax = Math.max(14, eRef * 3 + tol); // الملمس الطبيعي للخامة لا يُعد حدًّا
  let head = 0, tail = 0, cnt = 1, x0 = px, y0 = py, x1 = px, y1 = py;
  mask[seed] = 1; q[tail++] = seed;
  while (head < tail) {
    const i = q[head++], x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const j = yy * w + xx; if (mask[j]) continue;
      const a = S[j * 3], b = S[j * 3 + 1], c = S[j * 3 + 2];
      const dR = Math.hypot((a - rL) * 0.55, (b - rA) * 2.2, (c - rB) * 2.2); // السطوع أقل وزنًا لتغيّر الإضاءة على السطح نفسه
      if (dR > tol || E[j] > edgeMax) continue;
      mask[j] = 1; q[tail++] = j; cnt++;
      if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy;
    }
  }
  return { mask, bbox: [x0, y0, x1 - x0 + 1, y1 - y0 + 1], count: cnt };
}
export function rectMask(A, x, y, w, h) {
  const mask = new Uint8Array(A.w * A.h); x = Math.max(0, Math.round(x)); y = Math.max(0, Math.round(y));
  const x1 = Math.min(A.w, Math.round(x + w)), y1 = Math.min(A.h, Math.round(y + h));
  for (let yy = y; yy < y1; yy++) mask.fill(1, yy * A.w + x, yy * A.w + x1);
  return { mask, bbox: [x, y, x1 - x, y1 - y], count: (x1 - x) * (y1 - y) };
}

/* ---------- البصمة البصرية ---------- */
// يحسب البصمة من مصفوفة Lab (w×h) مع قناع اختياري. delight: إزالة تدرّج الإضاءة الكبير قبل قياس الملمس
function featuresOf(L, w, h, mask, delight) {
  const N = w * h, lum = new Float32Array(N); for (let i = 0; i < N; i++) lum[i] = L[i * 3];
  const inM = (i) => !mask || mask[i];
  // اللون
  let n = 0, sL = 0, sA = 0, sB = 0;
  for (let i = 0; i < N; i++) if (inM(i)) { sL += L[i * 3]; sA += L[i * 3 + 1]; sB += L[i * 3 + 2]; n++; }
  if (n < 16) return null;
  const mL = sL / n, mA = sA / n, mB = sB / n; let vL = 0, vA = 0, vB = 0;
  const hist = new Float32Array(36); // مدرّج لوني 6×6 للقناتين a و b
  for (let i = 0; i < N; i++) if (inM(i)) {
    vL += (L[i * 3] - mL) ** 2; vA += (L[i * 3 + 1] - mA) ** 2; vB += (L[i * 3 + 2] - mB) ** 2;
    // توزيع ناعم (ثنائي الخطية) على الخانات المتجاورة حتى لا يقفز الفرق عند حدود الخانات
    const fa = Math.min(5, Math.max(0, (L[i * 3 + 1] + 30) / 10 - 0.5)), fb = Math.min(5, Math.max(0, (L[i * 3 + 2] + 30) / 10 - 0.5));
    const a0 = Math.floor(fa), b0 = Math.floor(fb), ta = fa - a0, tb = fb - b0, a1 = Math.min(5, a0 + 1), b1 = Math.min(5, b0 + 1);
    hist[a0 * 6 + b0] += (1 - ta) * (1 - tb); hist[a1 * 6 + b0] += ta * (1 - tb); hist[a0 * 6 + b1] += (1 - ta) * tb; hist[a1 * 6 + b1] += ta * tb;
  }
  for (let k = 0; k < 36; k++) hist[k] /= n;
  // الملمس: يُطرح التدرّج الكبير (إضاءة/تظليل) ثم تُقاس التفاصيل
  let det = lum;
  if (delight) {
    const r = Math.max(3, Math.round(Math.min(w, h) / 6)), big = boxBlur1(lum, w, h, r); det = new Float32Array(N);
    for (let i = 0; i < N; i++) det[i] = lum[i] - big[i];
  }
  const blur2 = boxBlur1(det, w, h, 2);
  let g1 = 0, g2 = 0, m = 0; const ori = new Float32Array(8);
  for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
    const i = y * w + x; if (mask && !(mask[i] && mask[i - 2] && mask[i + 2] && mask[i - 2 * w] && mask[i + 2 * w])) continue;
    const gx = det[i + 1] - det[i - 1], gy = det[i + w] - det[i - w], mag = Math.hypot(gx, gy);
    const cx = blur2[i + 2] - blur2[i - 2], cy = blur2[i + 2 * w] - blur2[i - 2 * w];
    g1 += mag; g2 += Math.hypot(cx, cy) / 2; m++;
    if (mag > 0.5) ori[Math.floor(((Math.atan2(gy, gx) + Math.PI) / Math.PI) * 4) % 8] += mag;
  }
  if (!m) m = 1;
  let os = 0, omax = 0; for (const v of ori) { os += v; if (v > omax) omax = v; }
  const aniso = os ? omax / (os / 8) : 1; // 1 = متساوية الاتجاهات، أكبر = خطوط/عروق في اتجاه
  return { mL, mA, mB, sL: Math.sqrt(vL / n), sA: Math.sqrt(vA / n), sB: Math.sqrt(vB / n), hist: [...hist], fine: g1 / m, coarse: g2 / m, aniso };
}
function boxBlur1(a, w, h, r) {
  const t = new Float32Array(a.length), o = new Float32Array(a.length);
  for (let y = 0; y < h; y++) { let s = 0, n = 0; for (let x = -r; x <= r; x++) if (x >= 0 && x < w) { s += a[y * w + x]; n++; }
    for (let x = 0; x < w; x++) { t[y * w + x] = s / n; const xa = x + r + 1, xr = x - r; if (xa < w) { s += a[y * w + xa]; n++; } if (xr >= 0) { s -= a[y * w + xr]; n--; } } }
  for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let y = -r; y <= r; y++) if (y >= 0 && y < h) { s += t[y * w + x]; n++; }
    for (let y = 0; y < h; y++) { o[y * w + x] = s / n; const ya = y + r + 1, yr = y - r; if (ya < h) { s += t[ya * w + x]; n++; } if (yr >= 0) { s -= t[yr * w + x]; n--; } } }
  return o;
}

// بصمة منطقة محددة في اللقطة: تُقص المنطقة وتُعاد عيّنتها إلى نحو 128 بكسل حتى يقترب مقياس الملمس من صور المكتبة
export function regionFeatures(src, A, sel) {
  const [bx, by, bw, bh] = sel.bbox, inv = 1 / A.k, S = 128, k = S / Math.max(bw, bh) ;
  const W = Math.max(8, Math.round(bw * k)), H = Math.max(8, Math.round(bh * k));
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingQuality = 'high'; x.drawImage(src, bx * inv, by * inv, bw * inv, bh * inv, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data, L = new Float32Array(W * H * 3), mask = new Uint8Array(W * H);
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
    const i = yy * W + xx, v = lab(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]); L[i * 3] = v[0]; L[i * 3 + 1] = v[1]; L[i * 3 + 2] = v[2];
    const mx = Math.min(A.w - 1, bx + Math.floor(xx / W * bw)), my = Math.min(A.h - 1, by + Math.floor(yy / H * bh)); mask[i] = sel.mask[my * A.w + mx];
  }
  return featuresOf(L, W, H, mask, true);
}

/* ---------- بصمة صورة المكتبة (كرة مصغرة) مع تخزين دائم ---------- */
const DB = 'itq-match', ST = 'feat', V = 3;
let dbP = null;
function idb() { return dbP ||= new Promise((res) => { try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch { res(null); } }); }
async function idbGet(k) { const d = await idb(); if (!d) return null; return new Promise(res => { try { const t = d.transaction(ST).objectStore(ST).get(k); t.onsuccess = () => res(t.result || null); t.onerror = () => res(null); } catch { res(null); } }); }
async function idbSet(k, v) { const d = await idb(); if (!d) return; try { d.transaction(ST, 'readwrite').objectStore(ST).put(v, k); } catch { } }
const mem = new Map();
export async function thumbFeatures(m) {
  const key = `${V}:${m.src}:${m.id}`;
  if (mem.has(key)) return mem.get(key);
  let f = await idbGet(key);
  if (!f && m.thumb) {
    try {
      const bmp = await createImageBitmap(await (await smartFetch(m.thumb)).blob());
      // وسط الكرة فقط (أقل تشوهًا وأبعد عن الخلفية)
      const s = Math.min(bmp.width, bmp.height), cs = s * 0.46, S = 112;
      const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(bmp, (bmp.width - cs) / 2, (bmp.height - cs) / 2, cs, cs, 0, 0, S, S);
      const d = x.getImageData(0, 0, S, S).data, L = new Float32Array(S * S * 3);
      for (let i = 0; i < S * S; i++) { const v = lab(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]); L[i * 3] = v[0]; L[i * 3 + 1] = v[1]; L[i * 3 + 2] = v[2]; }
      f = featuresOf(L, S, S, null, true);
      if (f) idbSet(key, f);
    } catch { f = null; }
  }
  mem.set(key, f); return f;
}

/* ---------- المسافة البصرية ---------- */
export function distance(a, b) {
  const dE = Math.hypot((a.mL - b.mL) * 0.55, (a.mA - b.mA) * 1.3, (a.mB - b.mB) * 1.3); // فرق اللون (مع تخفيف أثر الإضاءة على السطوع)
  let h = 0; for (let k = 0; k < 36; k++) { const s = a.hist[k] + b.hist[k]; if (s > 0) h += (a.hist[k] - b.hist[k]) ** 2 / s; } // Chi²
  const var_ = Math.abs(a.sL - b.sL) * 0.6 + Math.abs(a.sA - b.sA) + Math.abs(a.sB - b.sB);
  const rel = (p, q) => Math.abs(Math.log((p + 0.3) / (q + 0.3)));
  const tex = rel(a.fine, b.fine) * 5 + rel(a.coarse, b.coarse) * 4 + rel(a.fine / (a.coarse + 0.3), b.fine / (b.coarse + 0.3)) * 3;
  const dir = Math.abs(Math.log(a.aniso / b.aniso)) * 7;
  return dE * 1.0 + h * 10 + var_ * 0.5 + tex + dir;
}

// ترتيب المرشحين: يعيد [{ m, d }] تصاعديًا. concurrency لتنزيل الصور المصغرة
export async function rank(feat, cands, { onProgress, concurrency = 8 } = {}) {
  const out = new Array(cands.length); let i = 0, done = 0;
  const worker = async () => { while (i < cands.length) { const j = i++; const f = await thumbFeatures(cands[j]); out[j] = { m: cands[j], d: f ? distance(feat, f) : Infinity }; done++; onProgress?.(done / cands.length); } };
  await Promise.all(Array.from({ length: Math.min(concurrency, cands.length) }, worker));
  return out.filter(x => Number.isFinite(x.d)).sort((a, b) => a.d - b.d);
}
// نسبة تشابه تقريبية للعرض (0..100)
export const similarity = (d) => Math.max(0, Math.min(100, Math.round(100 * Math.exp(-d / 45))));

/* ---------- كلمات اللون للبحث ---------- */
export function colorWords(f) {
  const C = Math.hypot(f.mA, f.mB), hue = (Math.atan2(f.mB, f.mA) * 180 / Math.PI + 360) % 360, L = f.mL;
  if (C < 8) return [L > 80 ? 'white' : L < 25 ? 'black' : L < 45 ? 'dark grey' : 'grey'];
  if (hue < 40 || hue > 340) return L < 40 ? ['dark red'] : ['red'];
  if (hue < 100) return L > 70 ? ['beige'] : L < 40 ? ['dark brown'] : ['brown'];
  if (hue < 200) return ['green']; if (hue < 290) return ['blue']; return ['purple'];
}
