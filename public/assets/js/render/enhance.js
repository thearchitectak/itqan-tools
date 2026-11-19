// تحسين صورة الخامة قبل استخراج الخرائط.
// local: تكبير تدريجي عالي الجودة + زيادة حدة (Unsharp mask) + إبراز التفاصيل الدقيقة (Clarity) — لا يخترع تفاصيل.
// ai: إعادة توليد الخامة بالذكاء الاصطناعي من الصورة نفسها كأنها ممسوحة بماسح خامات، متكررة دون فواصل.
import { blur } from './maps.js';
import { canvasToPayload } from '../ai-tools.js';

const tick = () => new Promise(r => setTimeout(r, 0));
export const MAX_LOCAL = 4096;

function toCanvas(src) {
  if (src instanceof HTMLCanvasElement) return src;
  const c = document.createElement('canvas'); c.width = src.naturalWidth || src.width; c.height = src.naturalHeight || src.height;
  c.getContext('2d').drawImage(src, 0, 0); return c;
}

// target: الطول الأكبر المطلوب بالبكسل
export async function enhanceLocal(src, target = 4096, { sharpen = 0.7, clarity = 0.25 } = {}, onStep) {
  let c = toCanvas(src); target = Math.min(MAX_LOCAL, target);
  const big = Math.max(c.width, c.height);
  onStep?.('تكبير الصورة تدريجيًا…'); await tick();
  // تكبير بخطوات لا تتجاوز ضعف الحجم في كل مرة (أنعم وأدق من التكبير المباشر)
  while (Math.max(c.width, c.height) < target) {
    const f = Math.min(2, target / Math.max(c.width, c.height));
    const n = document.createElement('canvas'); n.width = Math.round(c.width * f); n.height = Math.round(c.height * f);
    const x = n.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, n.width, n.height); c = n; await tick();
  }
  if (big > target) { // تصغير إن كانت أكبر من الهدف
    const f = target / big, n = document.createElement('canvas'); n.width = Math.round(c.width * f); n.height = Math.round(c.height * f);
    const x = n.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, n.width, n.height); c = n;
  }
  onStep?.('زيادة الحدة وإبراز التفاصيل…'); await tick();
  const w = c.width, h = c.height, x = c.getContext('2d', { willReadFrequently: true }), im = x.getImageData(0, 0, w, h), d = im.data, N = w * h;
  const L = new Float32Array(N); for (let i = 0; i < N; i++) L[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
  const up = Math.max(1, Math.round(Math.max(w, h) / Math.max(1, big))); // نصف قطر الحدة يتناسب مع نسبة التكبير
  const s1 = blur(L, w, h, Math.max(1, Math.round(up * 0.8))); await tick();
  const s2 = blur(L, w, h, Math.max(4, Math.round(Math.max(w, h) / 160))); await tick();
  for (let i = 0; i < N; i++) {
    let dl = (L[i] - s1[i]) * sharpen + (L[i] - s2[i]) * clarity;
    dl = Math.max(-40, Math.min(40, dl)); // حدّ لمنع الهالات
    const o = i * 4; d[o] += dl; d[o + 1] += dl; d[o + 2] += dl; // Uint8Clamped يقصّ تلقائيًا
  }
  x.putImageData(im, 0, 0);
  return c;
}

// إعادة التوليد بالذكاء الاصطناعي. يعيد لوحة (دقة النموذج نحو 1K، فتُكبَّر بعدها محليًا)
export async function enhanceAI(src, { seamless = true, category = '', finish = '' } = {}) {
  const payload = await canvasToPayload(toCanvas(src), 1536, 0.9);
  const r = await fetch('/api/texenhance', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image: payload, seamless, category, finish }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.error || 'تعذّرت إعادة التوليد.'); e.unavailable = !!d.unavailable; e.limit = !!d.limit; throw e; }
  const img = new Image(); img.src = `data:${d.image.mime};base64,${d.image.data}`; await img.decode();
  return toCanvas(img);
}
