// تحويل صورة خامة إلى خرائط PBR حسابيًا (على الجهاز، دون ذكاء اصطناعي):
// إزالة الإضاءة غير المتساوية، جعل الصورة متكررة دون فواصل، Height و Normal (DirectX) و Roughness و AO.

const tick = () => new Promise(r => setTimeout(r, 0));

function boxBlur(src, w, h, r) {
  if (r < 1) return src.slice();
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const o = y * w; let acc = 0;
    for (let x = -r; x <= r; x++) acc += src[o + ((x % w) + w) % w];
    for (let x = 0; x < w; x++) { tmp[o + x] = acc / n; acc += src[o + (x + r + 1) % w] - src[o + ((x - r) % w + w) % w]; }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[(((y % h) + h) % h) * w + x];
    for (let y = 0; y < h; y++) { out[y * w + x] = acc / n; acc += tmp[((y + r + 1) % h) * w + x] - tmp[(((y - r) % h + h) % h) * w + x]; }
  }
  return out;
}
const blur = (a, w, h, r) => boxBlur(boxBlur(boxBlur(a, w, h, r), w, h, r), w, h, r); // تقريب Gaussian

function normalize(a, lo = 0.01, hi = 0.99) {
  const step = Math.max(1, Math.floor(a.length / 262144)), smp = new Float32Array(Math.ceil(a.length / step));
  for (let i = 0, j = 0; i < a.length; i += step, j++) smp[j] = a[i];
  const s = smp.sort(), mn = s[Math.floor(s.length * lo)], mx = s[Math.floor(s.length * hi)], d = mx - mn || 1;
  for (let i = 0; i < a.length; i++) a[i] = Math.min(1, Math.max(0, (a[i] - mn) / d));
  return a;
}

// جعل الصورة متكررة: مزج الصورة مع نسخة مزاحة بنصف الأبعاد بقناع ناعم عند الحواف
function makeSeamless(rgb, w, h, band = 0.18) {
  const out = new Float32Array(rgb.length), bw = Math.max(2, band * w), bh = Math.max(2, band * h);
  const sm = (t) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const m = Math.min(sm(Math.min(x, w - 1 - x) / bw), sm(Math.min(y, h - 1 - y) / bh)); // 1 في الوسط، 0 عند الحواف
    const i = (y * w + x) * 3, j = (((y + (h >> 1)) % h) * w + ((x + (w >> 1)) % w)) * 3;
    for (let k = 0; k < 3; k++) out[i + k] = rgb[i + k] * m + rgb[j + k] * (1 - m);
  }
  return out;
}

// opts: { size, seamless, delight, strength (0.5..4), finish: 'matte'|'satin'|'glossy', metal, invertHeight }
export async function imageToMaps(source, opts = {}, onStep) {
  const size = opts.size || 2048;
  const sw = source.width || source.naturalWidth, sh = source.height || source.naturalHeight;
  // مربع بالطول الأقصر ثم التحجيم إلى الدقة المطلوبة
  const side = Math.min(sw, sh), c = document.createElement('canvas'); c.width = c.height = size;
  const cx = c.getContext('2d', { willReadFrequently: true }); cx.imageSmoothingQuality = 'high';
  cx.drawImage(source, (sw - side) / 2, (sh - side) / 2, side, side, 0, 0, size, size);
  const w = size, h = size, id = cx.getImageData(0, 0, w, h).data, N = w * h;
  onStep?.('تحليل الصورة…'); await tick();
  let rgb = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { rgb[i * 3] = id[i * 4] / 255; rgb[i * 3 + 1] = id[i * 4 + 1] / 255; rgb[i * 3 + 2] = id[i * 4 + 2] / 255; }

  if (opts.delight !== false) { // إزالة تدرج الإضاءة الكبير
    onStep?.('إزالة الإضاءة غير المتساوية…'); await tick();
    const L = new Float32Array(N); let mean = 0;
    for (let i = 0; i < N; i++) { L[i] = 0.2126 * rgb[i * 3] + 0.7152 * rgb[i * 3 + 1] + 0.0722 * rgb[i * 3 + 2] + 1e-3; mean += L[i]; }
    mean /= N; const big = blur(L, w, h, Math.round(w / 12));
    for (let i = 0; i < N; i++) { const f = mean / big[i]; for (let k = 0; k < 3; k++) rgb[i * 3 + k] = Math.min(1, rgb[i * 3 + k] * f); }
  }
  if (opts.seamless !== false) { onStep?.('جعل الخامة متكررة دون فواصل…'); await tick(); rgb = makeSeamless(rgb, w, h); }

  onStep?.('توليد خريطة الارتفاع…'); await tick();
  let H = new Float32Array(N);
  for (let i = 0; i < N; i++) H[i] = 0.2126 * rgb[i * 3] + 0.7152 * rgb[i * 3 + 1] + 0.0722 * rgb[i * 3 + 2];
  if (opts.invertHeight) for (let i = 0; i < N; i++) H[i] = 1 - H[i];
  const low = blur(H, w, h, Math.round(w / 24));
  for (let i = 0; i < N; i++) H[i] = H[i] - low[i] * 0.85; // تمرير عالٍ: التفاصيل دون تدرج الإضاءة
  H = normalize(blur(H, w, h, Math.max(1, Math.round(w / 1024))));

  onStep?.('توليد خريطة Normal…'); await tick();
  const st = (opts.strength || 2) * (w / 1024), nrm = new Uint8ClampedArray(N * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const g = (xx, yy) => H[((yy + h) % h) * w + ((xx + w) % w)];
    const dx = (g(x + 1, y - 1) + 2 * g(x + 1, y) + g(x + 1, y + 1)) - (g(x - 1, y - 1) + 2 * g(x - 1, y) + g(x - 1, y + 1));
    const dy = (g(x - 1, y + 1) + 2 * g(x, y + 1) + g(x + 1, y + 1)) - (g(x - 1, y - 1) + 2 * g(x, y - 1) + g(x + 1, y - 1));
    let nx = -dx * st, ny = dy * st, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l; // DirectX: Y للأسفل
    const o = (y * w + x) * 4; nrm[o] = (nx * 0.5 + 0.5) * 255; nrm[o + 1] = (ny * 0.5 + 0.5) * 255; nrm[o + 2] = (nz * 0.5 + 0.5) * 255; nrm[o + 3] = 255;
  }

  onStep?.('توليد Roughness و AO…'); await tick();
  const base = { matte: 0.82, satin: 0.5, glossy: 0.22 }[opts.finish || 'satin'], spread = { matte: 0.12, satin: 0.18, glossy: 0.12 }[opts.finish || 'satin'];
  const hb = blur(H, w, h, Math.max(2, Math.round(w / 128)));
  const R = new Uint8ClampedArray(N * 4), AO = new Uint8ClampedArray(N * 4), HH = new Uint8ClampedArray(N * 4), BC = new Uint8ClampedArray(N * 4);
  for (let i = 0; i < N; i++) {
    const cav = Math.max(0, hb[i] - H[i]); // الأماكن الغائرة
    const r = Math.min(1, Math.max(0.02, base + (0.5 - H[i]) * spread * 2 + cav * 0.5));
    const ao = Math.max(0, 1 - cav * 2.2);
    const o = i * 4;
    R[o] = R[o + 1] = R[o + 2] = r * 255; AO[o] = AO[o + 1] = AO[o + 2] = ao * 255; HH[o] = HH[o + 1] = HH[o + 2] = H[i] * 255;
    BC[o] = rgb[i * 3] * 255; BC[o + 1] = rgb[i * 3 + 1] * 255; BC[o + 2] = rgb[i * 3 + 2] * 255;
    R[o + 3] = AO[o + 3] = HH[o + 3] = BC[o + 3] = 255;
  }
  onStep?.('حفظ الخرائط…'); await tick();
  const toBlob = async (data) => { const k = document.createElement('canvas'); k.width = w; k.height = h; k.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0); return { canvas: k, blob: await new Promise(r => k.toBlob(r, 'image/jpeg', 0.94)) }; };
  const res = { basecolor: await toBlob(BC), normal: await toBlob(nrm), roughness: await toBlob(R), ao: await toBlob(AO), height: await toBlob(HH) };
  if (opts.metal) { const M = new Uint8ClampedArray(N * 4).fill(255); res.metal = await toBlob(M); }
  return res; // { key: { canvas, blob } }
}
