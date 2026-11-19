// جدول الكميات والتكلفة التقديرية للبناء
import { h, ico, select, field, toast } from '../ui.js';
import { codeBar, getCode, N, fmt, num, nf, kpis, checks, table, rowsEditor, layout, sectionTitle, xlsxDownload, store, col } from './common.js';

const onAny = (els, fn) => els.forEach(e => { e.addEventListener('input', fn); e.addEventListener('change', fn); });
const UNITS = ['م³', 'م²', 'م.ط', 'طن', 'كجم', 'عدد', 'مقطوعية', 'لتر'];
const VAT = { eg: 14, sa: 15, intl: 0 };
const CUR = { eg: 'جنيه', sa: 'ريال', intl: 'دولار' };

const TEMPLATE = [
  ['أعمال الحفر والردم', 'حفر في أي نوع من التربة حتى منسوب التأسيس', 'م³'], ['أعمال الحفر والردم', 'ردم على طبقات مع الرش والدمك', 'م³'],
  ['أعمال الخرسانة', 'خرسانة عادية أسفل القواعد', 'م³'], ['أعمال الخرسانة', 'خرسانة مسلحة للقواعد والميدات', 'م³'], ['أعمال الخرسانة', 'خرسانة مسلحة للأعمدة', 'م³'], ['أعمال الخرسانة', 'خرسانة مسلحة للأسقف والكمرات', 'م³'],
  ['أعمال حديد التسليح', 'توريد وتركيب حديد التسليح', 'طن'], ['أعمال العزل', 'عزل الأساسات ضد الرطوبة', 'م²'], ['أعمال المباني', 'مباني بالطوب أو البلوك', 'م²'],
  ['أعمال التشطيب', 'لياسة (بياض) داخلية وخارجية', 'م²'], ['أعمال التشطيب', 'أرضيات بلاط أو بورسلين', 'م²'], ['أعمال التشطيب', 'دهانات', 'م²'], ['الأعمال الكهربائية والصحية', 'تمديدات كهربائية', 'مقطوعية'], ['الأعمال الكهربائية والصحية', 'تمديدات صحية', 'مقطوعية'],
];

export function boq(body) {
  let code = getCode();
  const saved = store.get('boq', null);
  const title = h('input', { class: 'input', value: saved?.title || 'جدول كميات مشروع', placeholder: 'اسم المشروع' });
  const cont = num(saved?.cont ?? 5), vat = num(saved?.vat ?? VAT[code]), cur = h('input', { class: 'input', value: saved?.cur ?? CUR[code], placeholder: 'العملة' });
  const ed = rowsEditor({
    numbered: true,
    columns: [{ key: 'section', label: 'القسم', type: 'text', placeholder: 'أعمال الخرسانة' }, { key: 'desc', label: 'وصف البند', type: 'text', placeholder: 'وصف البند' }, { key: 'unit', label: 'الوحدة', type: 'select', options: UNITS, def: 'م³' }, { key: 'qty', label: 'الكمية', type: 'num' }, { key: 'price', label: 'سعر الوحدة', type: 'num' }],
    rows: saved?.rows?.length ? saved.rows : [{ section: 'أعمال الخرسانة', desc: 'خرسانة مسلحة للأسقف والكمرات', unit: 'م³', qty: '', price: '' }],
    onChange: calc, addLabel: 'إضافة بند',
  });
  const tpl = h('button', { type: 'button', class: 'btn light sm' }, ico('clipboard-list', 16), 'إدراج بنود مبنى سكني نموذجية');
  tpl.onclick = () => { ed.set(ed.data.filter(r => r.desc).concat(TEMPLATE.map(([section, desc, unit]) => ({ section, desc, unit, qty: '', price: '' })))); toast('أُدرجت البنود؛ أدخل الكميات والأسعار.'); };
  const clr = h('button', { type: 'button', class: 'btn light sm' }, ico('trash-2', 16), 'مسح الجدول');
  clr.onclick = () => { if (confirm('هل تريد مسح جميع البنود؟')) ed.set([{ unit: 'م³' }]); };
  const ui = layout(body, {
    code: codeBar((c) => { code = c; vat.value = VAT[c]; cur.value = CUR[c] || cur.value; calc(); }, 'يحدّد نسبة ضريبة القيمة المضافة والعملة الافتراضيتين'), wide: true,
    intro: 'يُحفظ الجدول تلقائيًا في متصفحك، ويمكنك إضافة بنود إليه مباشرة من حاسبات الحديد والخرسانة والحفر.',
    inputs: [h('div', { class: 'opts', style: { marginTop: 0 } }, field('اسم المشروع', title), field('العملة', cur), nf('نسبة الاحتياطي والطوارئ', cont, '%'), nf('ضريبة القيمة المضافة', vat, '%')),
      sectionTitle('البنود', 'clipboard-list'), h('div', { class: 'toolbar' }, tpl, clr), ed.el],
  });
  onAny([title, cont, vat, cur], calc);
  function calc() {
    store.set('boq', { title: title.value, cont: cont.value, vat: vat.value, cur: cur.value, rows: ed.data });
    const rows = ed.data.map(r => ({ ...r, total: N(r.qty, 0) * N(r.price, 0) }));
    const sub = rows.reduce((s, r) => s + r.total, 0), c = sub * N(cont.value, 0) / 100, v = (sub + c) * N(vat.value, 0) / 100;
    const bySec = new Map(); rows.forEach(r => { const k = r.section || 'بنود عامة'; bySec.set(k, (bySec.get(k) || 0) + r.total); });
    const u = cur.value ? ' ' + cur.value : '';
    ui.show(
      kpis([['الإجمالي قبل الإضافات', fmt(sub, 2), cur.value], ['الاحتياطي', fmt(c, 2), cur.value], ['ضريبة القيمة المضافة', fmt(v, 2), cur.value], ['الإجمالي النهائي', fmt(sub + c + v, 2), cur.value, 'main']]),
      sub > 0 ? table(['القسم', 'القيمة', 'النسبة'], [...bySec].filter(([, x]) => x > 0).map(([k, x]) => [k, fmt(x, 2) + u, fmt(x / sub * 100, 1) + '%'])) : h('p', { class: 'muted' }, 'أدخل الكميات وأسعار الوحدات لعرض الملخص.'),
      h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: exportX }, ico('download', 18), 'تنزيل Excel بالمعادلات'), h('button', { type: 'button', class: 'btn light', onclick: () => window.print() }, 'طباعة')));
  }
  function exportX() {
    const data = ed.data.filter(r => r.desc || N(r.qty) > 0);
    if (!data.length) return toast('أضف بندًا واحدًا على الأقل.', true);
    const first = 4, last = first + data.length - 1, T = last + 1;
    const rows = data.map((r, i) => [i + 1, r.section || '', r.desc || '', r.unit || '', N(r.qty, 0), N(r.price, 0), (row) => ({ formula: `E${row}*F${row}` })]);
    rows.push(['', '', 'الإجمالي قبل الإضافات', '', '', '', { formula: `SUM(G${first}:G${last})` }]);
    rows.push(['', '', `الاحتياطي ${N(cont.value, 0)}%`, '', '', '', { formula: `G${T}*${N(cont.value, 0) / 100}` }]);
    rows.push(['', '', `ضريبة القيمة المضافة ${N(vat.value, 0)}%`, '', '', '', { formula: `(G${T}+G${T + 1})*${N(vat.value, 0) / 100}` }]);
    rows.push(['', '', 'الإجمالي النهائي', '', '', '', { formula: `SUM(G${T}:G${T + 2})` }]);
    const money = '#,##0.00';
    xlsxDownload((title.value || 'boq').replace(/[\\/:*?"<>|]/g, '') + '.xlsx', [{ name: 'جدول الكميات', title: title.value + (cur.value ? ` (بالـ${cur.value})` : ''), freeze: true, columns: [{ header: 'م', width: 6 }, { header: 'القسم', width: 22 }, { header: 'وصف البند', width: 46 }, { header: 'الوحدة', width: 10 }, { header: 'الكمية', width: 12, fmt: '#,##0.000' }, { header: 'سعر الوحدة', width: 14, fmt: money }, { header: 'الإجمالي', width: 18, fmt: money }], rows, boldRows: [data.length, data.length + 1, data.length + 2, data.length + 3], notes: ['أُعد بواسطة أدوات إتقان — يمكنك تعديل الكميات والأسعار وستُحدَّث الإجماليات تلقائيًا.'] }]);
  }
  calc();
}

/* ================= التكلفة التقديرية ================= */
const LEVELS = [['none', 'عظم فقط (هيكل خرساني ومبانٍ)'], ['economy', 'تشطيب اقتصادي'], ['standard', 'تشطيب متوسط (لوكس)'], ['lux', 'تشطيب فاخر (سوبر لوكس)']];
export function buildCost(body) {
  const cfg = window.__ITQAN_CFG?.eng || {};
  let code = getCode();
  const area = num(300), floors = num(2), annex = num(0), base = num(0), level = select(LEVELS, 'standard');
  const shell = num(), fin = num(), fees = num(3), contg = num(5), cur = h('input', { class: 'input' });
  const fenceL = num(''), fenceRate = num('');
  function setCode(c) {
    code = c; const r = cfg.costRates?.[c === 'intl' ? 'sa' : c];
    if (c === 'intl') { shell.value = ''; fin.value = ''; cur.value = 'دولار'; }
    else if (r) { shell.value = r.shell; fin.value = r.finish[level.value] ?? 0; cur.value = r.currency; }
    note.textContent = c === 'intl' ? 'أدخل أسعار المتر في بلدك.' : (cfg.priceNote || '');
    calc();
  }
  level.onchange = () => { const r = cfg.costRates?.[code]; if (r && code !== 'intl') fin.value = r.finish[level.value] ?? 0; calc(); };
  const note = h('small', { class: 'muted' });
  const ui = layout(body, {
    code: codeBar(setCode, 'تُعرض أسعار مصر عند اختيار الكود المصري، وأسعار السعودية عند اختيار الكود السعودي'),
    inputs: [sectionTitle('المسطحات', 'building-2'), h('div', { class: 'opts', style: { marginTop: 0 } }, nf('مساحة الطابق المتكرر', area, 'م²'), nf('عدد الطوابق', floors), nf('مساحة الملحق العلوي', annex, 'م²'), nf('مساحة القبو', base, 'م²', 'يُحسب القبو بسعر العظم مضروبًا في 1.3')),
      sectionTitle('الأسعار', 'banknote'), h('div', { class: 'opts', style: { marginTop: 0 } }, field('مستوى التشطيب', level), nf('سعر متر العظم', shell, 'للمتر²'), nf('إضافة التشطيب للمتر', fin, 'للمتر²'), field('العملة', cur), nf('أتعاب التصميم والإشراف والرخص', fees, '%'), nf('الاحتياطي', contg, '%'), nf('طول السور (اختياري)', fenceL, 'م'), nf('سعر متر السور', fenceRate, 'للمتر')), note],
  });
  onAny([area, floors, annex, base, shell, fin, fees, contg, cur, fenceL, fenceRate], calc);
  function calc() {
    const A = N(area.value, 0) * N(floors.value, 1) + N(annex.value, 0), B = N(base.value, 0);
    const s = N(shell.value, 0), f = N(fin.value, 0);
    const shellC = A * s + B * s * 1.3, finC = (A + B) * f, fence = N(fenceL.value, 0) * N(fenceRate.value, 0);
    const sub = shellC + finC + fence, feeC = sub * N(fees.value, 0) / 100, cC = sub * N(contg.value, 0) / 100, total = sub + feeC + cC;
    const u = cur.value;
    if (!(s > 0)) return ui.show(h('div', { class: 'note info' }, 'أدخل سعر متر العظم لحساب التكلفة.'));
    ui.show(
      kpis([['إجمالي المسطحات', fmt(A + B, 1), 'م²'], ['التكلفة الإجمالية', fmt(total, 0), u, 'main'], ['متوسط تكلفة المتر', fmt(total / (A + B || 1), 0), u + '/م²']]),
      table(['البند', 'التكلفة', 'النسبة'], [['أعمال العظم', shellC], ['أعمال التشطيب', finC], ['السور', fence], ['الأتعاب والرخص', feeC], ['الاحتياطي', cC]].filter(([, v]) => v > 0).map(([k, v]) => [k, fmt(v, 0) + ' ' + u, fmt(v / total * 100, 1) + '%']), ['الإجمالي', fmt(total, 0) + ' ' + u, '100%']),
      checks([{ ok: null, text: 'التقدير يعتمد على متوسط سعر المتر المربع لمسطحات البناء، ويتأثر بنوع التربة والأساسات والمدينة وجودة المواد وأسعار السوق وقت التنفيذ.' }, { ok: null, text: 'للحصول على تكلفة دقيقة: أعدّ جدول كميات تفصيليًا واطلب عروض أسعار من المقاولين.' }]));
  }
  setCode(code);
}
