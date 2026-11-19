// خيار «الذكاء الاصطناعي» داخل الأدوات: مكوّن اختيار طريقة المعالجة، وإرسال الصور إلى /api/vision.
import { h } from './ui.js';
import { icon } from './icons.js';

let statusP = null;
export function aiStatus(force) {
  if (!statusP || force) statusP = fetch('/api/vision', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
  return statusP;
}

const REASON = { nokey: 'غير مفعّل على المنصة', credit: 'نفد الرصيد مؤقتًا', quota: 'انتهت الحصة المجانية لليوم', auth: 'غير متاح مؤقتًا', disabled: 'متوقف حاليًا' };
const OPTS = [
  ['local', 'على جهازك', 'دون ذكاء اصطناعي · فوري وخاص', 'shield-check'],
  ['gemini', 'Gemini', 'ذكاء اصطناعي · مجاني', 'sparkles'],
  ['anthropic', 'Claude', 'ذكاء اصطناعي · الأدق', 'wand-sparkles'],
];

// يعيد { el, get value(), isAi } ويحفظ اختيار المستخدم لكل أداة على جهازه
export function aiPicker(toolId, { onChange, note } = {}) {
  const key = 'itq-ai-' + toolId;
  let value = 'local';
  try { value = localStorage.getItem(key) || 'local'; } catch { }
  const btns = {};
  const hint = h('p', { class: 'ai-hint' });
  const row = h('div', { class: 'ai-pick', role: 'radiogroup', 'aria-label': 'طريقة المعالجة' });
  const box = h('div', { class: 'ai-box' }, h('span', { class: 'ai-label' }, 'طريقة المعالجة'), row, hint);
  const paint = () => {
    for (const [id, b] of Object.entries(btns)) { b.classList.toggle('on', id === value); b.setAttribute('aria-checked', id === value); }
    hint.textContent = value === 'local'
      ? 'تُعالج الملفات على جهازك فقط، دون رفعها إلى أي مكان.'
      : 'تُرسل الصور عبر المنصة إلى خدمة الذكاء الاصطناعي لقراءتها ثم تُهمل، ولا تُحفظ على خوادمنا.' + (note ? ' ' + note : '');
  };
  const set = (v, silent) => { value = v; try { localStorage.setItem(key, v); } catch { } paint(); if (!silent) onChange?.(v); };
  for (const [id, t, sub, ic] of OPTS) {
    const b = h('button', { type: 'button', class: 'ai-opt', role: 'radio', 'data-id': id },
      h('span', { class: 'ai-ic', html: icon(ic, 18) }), h('span', { class: 'ai-t' }, h('b', {}, t), h('small', {}, sub)));
    b.onclick = () => { if (!b.disabled) set(id); };
    btns[id] = b; row.append(b);
  }
  paint();
  aiStatus().then(st => {
    const s = st?.status || {};
    for (const p of ['gemini', 'anthropic']) {
      const ok = st && st.enabled !== false && s[p]?.available;
      const b = btns[p]; b.disabled = !ok;
      if (!ok) { b.querySelector('small').textContent = REASON[s[p]?.reason] || (st ? 'غير متاح حاليًا' : 'تعذّر الاتصال بالخادم'); }
    }
    // إن لم يكن أي مزوّد متاحًا يُخفى الخيار كله إذا كان متوقفًا من الإدارة
    if (st && st.enabled === false) box.classList.add('hidden');
    if (value !== 'local' && btns[value]?.disabled) set('local', true);
    paint();
  });
  return {
    el: box,
    get value() { return value; },
    get isAi() { return value !== 'local'; },
    fallbackLocal() { set('local'); },
  };
}

// تحويل لوحة رسم أو صورة إلى JPEG بحجم مناسب للإرسال (أطول ضلع لا يتجاوز maxSide)
export async function canvasToPayload(canvas, maxSide = 1600, quality = 0.85) {
  let c = canvas;
  const s = Math.min(1, maxSide / Math.max(canvas.width, canvas.height));
  if (s < 1) {
    c = document.createElement('canvas'); c.width = Math.round(canvas.width * s); c.height = Math.round(canvas.height * s);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingQuality = 'high'; x.drawImage(canvas, 0, 0, c.width, c.height);
  }
  const url = c.toDataURL('image/jpeg', quality);
  return { mime: 'image/jpeg', data: url.slice(url.indexOf(',') + 1) };
}

export class AiError extends Error { constructor(msg, { unavailable, limit } = {}) { super(msg); this.unavailable = !!unavailable; this.limit = !!limit; } }

// إرسال صورة واحدة لمهمة محددة على الخادم: omr | ocr | table
export async function vision(task, canvas, { provider, params, maxSide } = {}) {
  const image = await canvasToPayload(canvas, maxSide || (task === 'omr' ? 1400 : 1800));
  let r;
  try {
    r = await fetch('/api/vision', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ task, provider, params, image }) });
  } catch (e) { throw new AiError('تعذّر الاتصال بالخادم. تحقّق من الإنترنت.'); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (d.unavailable || d.limit) aiStatus(true);
    throw new AiError(d.error || 'تعذّرت القراءة بالذكاء الاصطناعي.', { unavailable: d.unavailable, limit: d.limit });
  }
  return d;
}
