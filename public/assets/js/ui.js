import { icon } from './icons.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return e;
}
export const ico = (n, s) => h('span', { html: icon(n, s), style: { display: 'inline-flex' } });

export function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

export function toast(msg, err = false, ms = 3500) {
  const t = h('div', { class: 'toast' + (err ? ' err' : '') }, msg);
  document.body.append(t); setTimeout(() => t.remove(), ms);
}

export function fmtSize(b) { if (b < 1024) return b + ' بايت'; if (b < 1048576) return (b / 1024).toFixed(1) + ' ك.ب'; return (b / 1048576).toFixed(2) + ' م.ب'; }

const loaded = {};
export function loadScript(src) {
  if (!loaded[src]) loaded[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('تعذّر تحميل المكتبة: ' + src)); document.head.append(s); });
  return loaded[src];
}
export const libs = {
  pdfLib: () => loadScript('/vendor/pdf-lib.min.js').then(() => window.PDFLib),
  jszip: () => loadScript('/vendor/jszip.min.js').then(() => window.JSZip),
  docx: () => loadScript('/vendor/docx.js').then(() => window.docx),
  exceljs: () => loadScript('/vendor/exceljs.min.js').then(() => window.ExcelJS),
  mammoth: () => loadScript('/vendor/mammoth.browser.min.js').then(() => window.mammoth),
  html2pdf: () => loadScript('/vendor/html2pdf.bundle.min.js').then(() => window.html2pdf),
  xlsx: () => loadScript('/vendor/xlsx.full.min.js').then(() => window.XLSX),
  qr: () => loadScript('/vendor/qr-code-styling.js').then(() => window.QRCodeStyling),
  barcode: () => loadScript('/vendor/JsBarcode.all.min.js').then(() => window.JsBarcode),
  async pdfjs() {
    const m = await import('/vendor/pdfjs/pdf.min.mjs');
    m.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';
    return m;
  },
};

export function download(data, name, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: type || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function baseName(name) { return name.replace(/\.[^.]+$/, ''); }

// تحليل نطاقات الصفحات مثل: 1-3, 5, 8-10
export function parseRanges(str, max) {
  const out = [];
  for (const part of String(str).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/،/g, ',').split(',')) {
    const p = part.trim(); if (!p) continue;
    const m = p.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) { let a = +m[1], b = +m[2]; if (a > b) [a, b] = [b, a]; const r = []; for (let i = Math.max(1, a); i <= Math.min(max, b); i++) r.push(i); if (r.length) out.push(r); }
    else if (/^\d+$/.test(p)) { const n = +p; if (n >= 1 && n <= max) out.push([n]); }
    else throw new Error('صيغة النطاق غير صحيحة: ' + p);
  }
  return out;
}

export function field(label, input, hint) {
  return h('label', { class: 'field' }, h('span', {}, label), input, hint ? h('small', {}, hint) : null);
}
export function select(options, value) {
  const s = h('select', { class: 'input' });
  for (const o of options) { const [v, t] = Array.isArray(o) ? o : [o, o]; s.append(h('option', { value: v, selected: String(v) === String(value) }, t)); }
  return s;
}
export function seg(options, value, onChange) {
  const wrap = h('div', { class: 'seg' });
  wrap.value = value;
  for (const [v, t] of options) {
    const b = h('button', { type: 'button', class: v === value ? 'on' : '' }, t);
    b.onclick = () => { wrap.value = v; $$('button', wrap).forEach(x => x.classList.remove('on')); b.classList.add('on'); onChange?.(v); };
    wrap.append(b);
  }
  return wrap;
}

// منطقة رفع الملفات
export function dropzone({ accept, multiple, label, hint, onFiles }) {
  const input = h('input', { type: 'file', accept, multiple, class: 'hidden' });
  const dz = h('div', { class: 'dropzone' },
    h('button', { type: 'button', class: 'big' }, ico('upload', 22), label),
    h('p', {}, hint || 'أو اسحب الملفات وأفلتها هنا'), input);
  dz.onclick = (e) => { if (e.target !== input) input.click(); };
  input.onchange = () => { if (input.files.length) onFiles([...input.files]); input.value = ''; };
  dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('drag'); };
  dz.ondragleave = () => dz.classList.remove('drag');
  dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('drag'); const f = [...e.dataTransfer.files]; if (f.length) onFiles(multiple ? f : f.slice(0, 1)); };
  return dz;
}

export function progressBar() {
  const bar = h('div'); const wrap = h('div', { class: 'progress' }, bar); const st = h('div', { class: 'status' });
  return { el: h('div', {}, wrap, st), set(p, msg) { bar.style.width = Math.round(p * 100) + '%'; if (msg != null) st.textContent = msg; } };
}

export async function readArrayBuffer(file) { return new Uint8Array(await file.arrayBuffer()); }

// رسم نص (عربي أو غيره) على لوحة ثم إرجاعه صورة PNG، لأن مكتبة pdf-lib لا تشكّل الحروف العربية
export async function textToPng(text, { size = 48, color = '#000000', weight = 700, font = 'Cairo', opacity = 1 } = {}) {
  await document.fonts.load(`${weight} ${size}px ${font}`).catch(() => {});
  const c = document.createElement('canvas'); const ctx = c.getContext('2d');
  const scale = 3; ctx.font = `${weight} ${size * scale}px ${font}, Tahoma, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + 8 * scale; const hgt = Math.ceil(size * scale * 1.6);
  c.width = w; c.height = hgt;
  const g = c.getContext('2d'); g.font = `${weight} ${size * scale}px ${font}, Tahoma, sans-serif`; g.fillStyle = color; g.globalAlpha = opacity;
  g.textBaseline = 'middle'; g.direction = 'rtl'; g.textAlign = 'center'; g.fillText(text, w / 2, hgt / 2);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width: w / scale, height: hgt / scale };
}
