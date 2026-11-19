// أدوات مشتركة للحاسبات الهندسية: اختيار الكود، حقول الأرقام، الجداول القابلة للتحرير، النتائج، والتصدير إلى Excel
import { h, $$, ico, toast, libs, download } from '../ui.js';
import { supportNudge } from '../profile.js';

export const CODES = {
  eg: { short: 'الكود المصري', full: 'الكود المصري (ECP 203 واللائحة التنفيذية لقانون البناء 119)' },
  sa: { short: 'الكود السعودي', full: 'كود البناء السعودي (SBC 201 و SBC 304 و SBC 1101)' },
  intl: { short: 'الكود العالمي', full: 'الكود العالمي (ACI 318 و IBC و IRC)' },
};
const KEY = 'itq-eng-code';

export function getCode() {
  let c = null;
  try { c = localStorage.getItem(KEY); } catch { /* التخزين غير متاح */ }
  if (!CODES[c]) c = window.__ITQAN_CFG?.eng?.defaultCode;
  return CODES[c] ? c : 'sa';
}
function setCode(c) { try { localStorage.setItem(KEY, c); } catch { /* تجاهل */ } }

// شريط اختيار الكود في أعلى الأداة؛ يُحفظ الاختيار ويُستخدم في بقية الأدوات
export function codeBar(onChange, note) {
  let cur = getCode();
  const wrap = h('div', { class: 'code-bar' });
  const seg = h('div', { class: 'seg' });
  const desc = h('small', { class: 'muted' });
  const draw = () => { $$('button', seg).forEach(b => b.classList.toggle('on', b.dataset.c === cur)); desc.textContent = 'المرجع: ' + CODES[cur].full + (note ? ' — ' + note : ''); };
  for (const [id, c] of Object.entries(CODES)) {
    const b = h('button', { type: 'button', 'data-c': id }, c.short);
    b.onclick = () => { if (cur === id) return; cur = id; setCode(id); draw(); onChange?.(id); };
    seg.append(b);
  }
  wrap.append(h('div', { class: 'code-row' }, h('b', {}, ico('building-2', 18), 'الكود المرجعي:'), seg), desc);
  draw();
  wrap.get = () => cur;
  return wrap;
}

// تحويل النص إلى رقم مع قبول الأرقام العربية والفاصلة العربية
export function N(v, def = NaN) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : def;
  let s = String(v ?? '').trim().replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/٫/g, '.').replace(/٬/g, ',').replace(/\s/g, '');
  // الفاصلة: فاصل آلاف إن تلتها ثلاثة أرقام، وإلا فهي فاصلة عشرية (مثل 2,5)
  if (s.includes(',')) s = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) ? s.replace(/,/g, '') : (s.includes('.') ? s.replace(/,/g, '') : s.replace(',', '.'));
  if (s === '') return def;
  const n = Number(s);
  return Number.isFinite(n) ? n : def;
}

export function fmt(n, d = 2) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 });
}
export const fix = (n, d = 2) => Number.isFinite(n) ? Number(n.toFixed(d)) : 0;

// حقل رقمي (نصي لقبول الأرقام العربية)
export function num(value, attrs = {}) {
  return h('input', { class: 'input num', type: 'text', inputmode: 'decimal', dir: 'ltr', value: value ?? '', autocomplete: 'off', ...attrs });
}
export function nf(label, input, unit, hint) {
  return h('label', { class: 'field' }, h('span', {}, label), unit ? h('div', { class: 'unit-in' }, input, h('em', {}, unit)) : input, hint ? h('small', {}, hint) : null);
}

// بطاقات النتائج الرئيسية
export function kpis(items) {
  return h('div', { class: 'eng-kpis' }, ...items.filter(Boolean).map(([label, value, unit, cls]) =>
    h('div', { class: 'eng-kpi' + (cls ? ' ' + cls : '') }, h('small', {}, label), h('b', { dir: 'auto' }, value, unit ? h('em', {}, ' ' + unit) : null))));
}

// قائمة التحقق من اشتراطات الكود
export function checks(list) {
  const items = list.filter(Boolean);
  if (!items.length) return null;
  return h('ul', { class: 'eng-checks' }, ...items.map(c => h('li', { class: c.ok === true ? 'ok' : c.ok === false ? 'bad' : 'info' },
    h('span', { class: 'mk' }, c.ok === true ? '✓' : c.ok === false ? '✕' : 'i'), h('div', {}, c.text, c.ref ? h('small', {}, c.ref) : null))));
}

// جدول نتائج بسيط
export function table(headers, rows, foot) {
  return h('div', { class: 'tbl-wrap' }, h('table', { class: 'eng-tbl' },
    h('thead', {}, h('tr', {}, ...headers.map(x => h('th', {}, x)))),
    h('tbody', {}, ...rows.map(r => h('tr', {}, ...r.map(c => h('td', {}, c))))),
    foot ? h('tfoot', {}, h('tr', {}, ...foot.map(c => h('td', {}, c)))) : null));
}

// جدول إدخال قابل للتحرير: إضافة وحذف صفوف
// columns: [{ key, label, type: 'num'|'text'|'select', options, width, placeholder, def }]
export function rowsEditor({ columns, rows, onChange, addLabel = 'إضافة صف', min = 1, numbered = false }) {
  const data = rows.map(r => ({ ...r }));
  const tbody = h('tbody');
  const blank = () => Object.fromEntries(columns.map(c => [c.key, typeof c.def === 'function' ? c.def(data) : (c.def ?? '')]));
  const change = () => onChange?.(data);
  function draw() {
    tbody.innerHTML = '';
    data.forEach((r, i) => {
      const tr = h('tr');
      if (numbered) tr.append(h('td', { class: 'n' }, String(i + 1)));
      for (const c of columns) {
        let el;
        if (c.type === 'select') {
          el = h('select', { class: 'input' }, ...c.options.map(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v, selected: String(r[c.key]) === String(v) }, t); }));
          el.onchange = () => { r[c.key] = el.value; change(); };
        } else {
          el = c.type === 'num' ? num(r[c.key], { placeholder: c.placeholder || '' }) : h('input', { class: 'input', value: r[c.key] ?? '', placeholder: c.placeholder || '', dir: c.dir || 'auto' });
          el.oninput = () => { r[c.key] = el.value; change(); };
        }
        tr.append(h('td', { style: c.width ? { width: c.width } : null }, el));
      }
      const del = h('button', { type: 'button', class: 'icon-btn', title: 'حذف الصف', html: '' }, ico('trash-2', 16));
      del.onclick = () => { if (data.length <= min) return toast('يجب أن يبقى صف واحد على الأقل.', true); data.splice(i, 1); draw(); change(); };
      tr.append(h('td', { class: 'x' }, del));
      tbody.append(tr);
    });
  }
  const add = h('button', { type: 'button', class: 'btn light sm' }, ico('plus', 16), addLabel);
  add.onclick = () => { data.push(blank()); draw(); change(); tbody.lastChild?.querySelector('input,select')?.focus(); };
  const el = h('div', {},
    h('div', { class: 'tbl-wrap' }, h('table', { class: 'eng-tbl edit' },
      h('thead', {}, h('tr', {}, numbered ? h('th', {}, 'م') : null, ...columns.map(c => h('th', {}, c.label)), h('th', {}))), tbody)),
    h('div', { style: { marginTop: '10px' } }, add));
  draw();
  return { el, data, set(rows) { data.splice(0, data.length, ...rows.map(r => ({ ...blank(), ...r }))); draw(); change(); }, redraw: draw };
}

// تخطيط الأداة: لوحة إدخال ولوحة نتائج
export function layout(body, { code, inputs, results, wide = false, intro }) {
  const res = h('div', { class: 'panel eng-res' });
  body.append(...[
    intro ? h('div', { class: 'note info', style: { marginBottom: '14px' } }, intro) : null,
    code || null,
    h('div', { class: wide ? 'eng-stack' : 'eng-layout' }, h('div', { class: 'panel' }, ...[].concat(inputs)), res),
    h('p', { class: 'muted eng-disc' }, 'النتائج تقديرية للمساعدة في التخطيط والمراجعة، ولا تغني عن التصميم والاعتماد من مهندس مختص وفق الكود المعتمد في بلدك.')].filter(Boolean));
  const nudge = supportNudge(window.__ITQAN_CFG || {});
  return {
    res,
    show(...kids) { res.innerHTML = ''; res.append(...kids.flat().filter(Boolean)); if (nudge) res.append(nudge); },
  };
}

export const sectionTitle = (t, icon) => h('h3', { class: 'eng-h' }, icon ? ico(icon, 18) : null, t);

// تنزيل ملف Excel؛ الخلية قد تكون قيمة أو { formula, result }
export async function xlsxDownload(fileName, sheets) {
  try {
    const ExcelJS = await libs.exceljs();
    const wb = new ExcelJS.Workbook(); wb.creator = 'ITQAN Tools';
    for (const s of sheets) {
      const ws = wb.addWorksheet(s.name, { views: [{ rightToLeft: true, state: s.freeze ? 'frozen' : 'normal', ySplit: s.freeze ? (s.title ? 3 : 1) : 0 }] });
      let r0 = 1;
      if (s.title) {
        ws.mergeCells(1, 1, 1, Math.max(1, s.columns.length));
        const c = ws.getCell(1, 1); c.value = s.title; c.font = { bold: true, size: 14, name: 'Arial' }; c.alignment = { horizontal: 'center' };
        r0 = 3;
      }
      s.columns.forEach((c, i) => { ws.getColumn(i + 1).width = c.width || 14; });
      const hr = ws.getRow(r0); s.columns.forEach((c, i) => { const cell = hr.getCell(i + 1); cell.value = c.header; cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial' }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }; cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });
      s.rows.forEach((row, ri) => {
        const r = ws.getRow(r0 + 1 + ri);
        row.forEach((v, ci) => { const cell = r.getCell(ci + 1); cell.value = typeof v === 'function' ? v(r0 + 1 + ri) : v; cell.font = { name: 'Arial', bold: !!s.boldRows?.includes(ri) }; if (s.columns[ci]?.fmt) cell.numFmt = s.columns[ci].fmt; });
      });
      const last = r0 + s.rows.length;
      for (let r = r0; r <= last; r++) for (let c = 1; c <= s.columns.length; c++) ws.getCell(r, c).border = { top: { style: 'thin', color: { argb: 'FFD1D5DB' } }, bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }, left: { style: 'thin', color: { argb: 'FFD1D5DB' } }, right: { style: 'thin', color: { argb: 'FFD1D5DB' } } };
      (s.notes || []).forEach((n, i) => { const c = ws.getCell(last + 2 + i, 1); c.value = n; c.font = { italic: true, color: { argb: 'FF6B7280' }, name: 'Arial' }; });
    }
    const buf = await wb.xlsx.writeBuffer();
    download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
  } catch (e) { console.error(e); toast('تعذّر إنشاء ملف Excel: ' + e.message, true); }
}
// اسم عمود Excel من رقمه
export const col = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

// مسودة محفوظة في المتصفح (لجدول الكميات وغيره)
export const store = {
  get(k, def) { try { const v = localStorage.getItem('itq-' + k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set(k, v) { try { localStorage.setItem('itq-' + k, JSON.stringify(v)); } catch { /* تجاهل */ } },
};

// إضافة بنود إلى جدول الكميات من أي حاسبة
export function sendToBoq(items) {
  const cur = store.get('boq', null) || { rows: [] };
  cur.rows = (cur.rows || []).filter(r => r.desc || N(r.qty) > 0).concat(items.map(i => ({ section: i.section || '', desc: i.desc, unit: i.unit, qty: String(fix(i.qty, 3)), price: '' })));
  store.set('boq', cur);
  toast('أُضيفت البنود إلى جدول الكميات.');
}
export function boqButton(getItems) {
  const b = h('button', { type: 'button', class: 'btn light' }, ico('clipboard-list', 18), 'أضِف إلى جدول الكميات');
  b.onclick = () => { const items = getItems(); if (!items.length) return toast('لا توجد كميات لإضافتها.', true); sendToBoq(items); };
  const go = h('a', { class: 'btn light', href: '#/tool/boq' }, 'فتح جدول الكميات');
  return [b, go];
}
