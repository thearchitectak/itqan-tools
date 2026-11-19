// تحليل قابلية التكرار دون فواصل:
// 1) seamScore: يقيس الفاصل عند تكرار صورة (الحافة اليمنى مع اليسرى، والسفلى مع العليا) مقارنة بالفرق الطبيعي داخل الصورة.
// 2) findTileableCrop: يبحث في الصورة عن أفضل مربع يتكرر دون فواصل (بأحجام ومواضع مختلفة).
// القيمة 1 تعني أن الفاصل لا يختلف عن أي موضع آخر في الخامة؛ كلما زادت ظهر الفاصل أكثر.

const tick = () => new Promise(r => setTimeout(r, 0));
const A = 384; // دقة التحليل

function lumOf(src, sx, sy, sw, sh, W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high';
  x.drawImage(src, sx, sy, sw, sh, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data, L = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i++) { L[i * 3] = d[i * 4]; L[i * 3 + 1] = d[i * 4 + 1]; L[i * 3 + 2] = d[i * 4 + 2]; }
  return L;
}
// فرق لوني بين بكسلين (مجموع مطلق للقنوات)
const df = (P, i, j) => Math.abs(P[i] - P[j]) + Math.abs(P[i + 1] - P[j + 1]) + Math.abs(P[i + 2] - P[j + 2]);

// يقيّم مربعًا [x0,y0,s] داخل مصفوفة P بعرض W
function scoreSquare(P, W, x0, y0, s) {
  const st = Math.max(1, Math.round(s / 96)); // عيّنة كافية
  let seamX = 0, seamY = 0, baseX = 0, baseY = 0, n = 0, nb = 0;
  const id = (x, y) => ((y0 + y) * W + (x0 + x)) * 3;
  for (let t = 0; t < s; t += st) {
    // الفاصل: آخر عمود يلي أول عمود عند التكرار (ونفس الشيء للصفوف) — بعرض بكسلين لتقليل الضوضاء
    seamX += df(P, id(s - 1, t), id(0, t)) + 0.5 * df(P, id(s - 2, t), id(1, t));
    seamY += df(P, id(t, s - 1), id(t, 0)) + 0.5 * df(P, id(t, s - 2), id(t, 1));
    n++;
    // الخط الأساسي: فرق بكسلات متجاورة داخل المربع في مواضع متفرقة
    for (const q of [0.25, 0.5, 0.75]) { const c = Math.floor(s * q);
      baseX += df(P, id(c, t), id(c + 1, t)) + 0.5 * df(P, id(c - 1, t), id(c + 2, t));
      baseY += df(P, id(t, c), id(t, c + 1)) + 0.5 * df(P, id(t, c - 1), id(t, c + 2)); nb++; }
  }
  const bx = baseX / nb + 3, by = baseY / nb + 3;
  const rx = (seamX / n) / bx, ry = (seamY / n) / by;
  // فرق الإضاءة أو اللون العام بين جانبين متقابلين (يكشف التدرّج الذي يُظهر نمط الشطرنج عند التكرار)
  const band = Math.max(2, Math.round(s / 40)), m = (ax, ay, w, h) => { let a = 0, k = 0; for (let y = 0; y < h; y += st) for (let x = 0; x < w; x += st) { const i = id(ax + x, ay + y); a += P[i] + P[i + 1] + P[i + 2]; k++; } return a / k; };
  let all = 0, all2 = 0, k = 0; for (let y = 0; y < s; y += st * 2) for (let x = 0; x < s; x += st * 2) { const i = id(x, y), v = P[i] + P[i + 1] + P[i + 2]; all += v; all2 += v * v; k++; }
  const sd = Math.sqrt(Math.max(1, all2 / k - (all / k) ** 2)) + 6;
  const lf = (Math.abs(m(0, 0, band, s) - m(s - band, 0, band, s)) + Math.abs(m(0, 0, s, band) - m(0, s - band, s, band))) / sd;
  return { score: Math.max(rx, ry) * 0.7 + (rx + ry) * 0.15 + lf * 0.8, rx, ry, lf, sd, edge: (bx + by) / 2 };
}

export const grade = (sc) => sc <= 1.35 ? { id: 'excellent', ar: 'ممتاز', ok: true } : sc <= 1.8 ? { id: 'good', ar: 'جيد', ok: true } : sc <= 2.6 ? { id: 'weak', ar: 'ضعيف', ok: false } : { id: 'bad', ar: 'غير صالح للتكرار', ok: false };

// تقييم صورة (أو لوحة) كاملة كوحدة متكررة
export function seamScore(src) {
  const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight, S = Math.min(A, w, h);
  const P = lumOf(src, 0, 0, w, h, S, S); const r = scoreSquare(P, S, 0, 0, S);
  return { ...r, grade: grade(r.score) };
}

// البحث عن أفضل مربع قابل للتكرار. يعيد { x, y, side, score, grade, whole } بإحداثيات الصورة الأصلية
export async function findTileableCrop(src, { minFrac = 0.42, onStep } = {}) {
  const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
  const k = A / Math.max(w, h), W = Math.max(8, Math.round(w * k)), H = Math.max(8, Math.round(h * k));
  const P = lumOf(src, 0, 0, w, h, W, H), mn = Math.min(W, H);
  onStep?.('البحث عن جزء يتكرر دون فواصل…'); await tick();
  const sizePenalty = (s) => 1 + 0.35 * (1 - s / mn); // تفضيل الأجزاء الأكبر (تكرار أقل وضوحًا)
  // مرجع التفاصيل: الجزء المختار يجب أن يحمل تفاصيل الخامة لا منطقة فارغة مسطحة
  const ref = scoreSquare(P, W, Math.floor((W - mn) / 2), Math.floor((H - mn) / 2), mn);
  const detailPenalty = (r) => { const q = Math.min(r.sd / ref.sd, r.edge / ref.edge); return q < 0.35 ? Infinity : 1 + Math.max(0, 0.7 - q) * 3; };
  let best = null;
  const tryAt = (x, y, s) => {
    if (x < 0 || y < 0 || x + s > W || y + s > H || s < 8) return;
    const r = scoreSquare(P, W, x, y, s), v = r.score * sizePenalty(s) * detailPenalty(r);
    if (!Number.isFinite(v)) return;
    if (!best || v < best.v) best = { x, y, s, v, ...r };
  };
  // مسح خشن
  for (let s = mn; s >= Math.round(mn * minFrac); s -= Math.max(1, Math.round(mn * 0.02))) {
    const stp = Math.max(1, Math.round(mn * 0.025));
    for (let y = 0; y <= H - s; y += stp) for (let x = 0; x <= W - s; x += stp) tryAt(x, y, s);
    await tick();
  }
  if (!best) best = { x: Math.floor((W - mn) / 2), y: Math.floor((H - mn) / 2), s: mn, ...ref };
  // تحسين دقيق حول الأفضل
  onStep?.('ضبط حدود الجزء المختار…'); await tick();
  const b0 = { ...best };
  for (let ds = -4; ds <= 4; ds++) for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) tryAt(b0.x + dx, b0.y + dy, b0.s + ds);
  // الصورة كاملة كمرجع (مربع بالطول الأقصر في المنتصف)
  const whole = ref;
  const inv = 1 / k;
  return {
    x: Math.round(best.x * inv), y: Math.round(best.y * inv), side: Math.min(Math.round(best.s * inv), Math.min(w, h)),
    score: best.score, grade: grade(best.score), frac: best.s / mn,
    whole: { score: whole.score, grade: grade(whole.score) },
  };
}

// قصّ الجزء المختار إلى لوحة
export function cropTo(src, c) {
  const k = document.createElement('canvas'); k.width = k.height = c.side;
  const x = k.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, c.x, c.y, c.side, c.side, 0, 0, c.side, c.side);
  return k;
}

// معاينة تكرار n×n
export function tilePreview(src, n = 3, out = 600) {
  const c = document.createElement('canvas'); c.width = c.height = out; const x = c.getContext('2d'), t = out / n;
  x.imageSmoothingQuality = 'high';
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) x.drawImage(src, Math.round(i * t), Math.round(j * t), Math.ceil(t), Math.ceil(t));
  return c;
}
