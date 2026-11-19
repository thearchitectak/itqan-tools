// الحاسبات الإنشائية: حديد التسليح، الخرسانة، الحفر والردم، الأبعاد المبدئية، المواسير
import { h, ico, select, field } from '../ui.js';
import { codeBar, getCode, N, fmt, fix, num, nf, kpis, checks, table, rowsEditor, layout, sectionTitle, xlsxDownload, boqButton } from './common.js';
import { REBAR, barKg, MIXES } from './data.js';

// طول التراكب بمضاعفات القطر حسب الكود
// المصري: ECP 203-2025 الجدول (4-9) لطول التماسك في الشد (الأسياخ ذات النتوءات)، ووصلة التراكب في الشد تساوي طول التماسك
// ACI 318-19 / SBC 304: ld المبسطة (25.4.2.3) لأسياخ سفلية بتباعد وغطاء كافيين، ووصلة الفئة B = 1.3 ld
export function lapMultiple(code, d, fy, fc) {
  if (code === 'eg') {
    const cols = [20, 25, 30, 35, 40, 45];
    const t = fy <= 280 ? [38, 36, 35, 35, 35, 35] : fy <= 420 ? [60, 55, 50, 45, 42, 40] : [67, 67, 65, 57, 53, 50];
    let i = cols.findIndex(c => fc <= c); if (i < 0) i = cols.length - 1;
    // البند (4-2-5-4): وصلة الشد = 1.3 Ld في الحالة العامة، وتساوي Ld فقط إذا كان الحديد ضعف المطلوب ولم يُوصل أكثر من 50% منه
    return { k: Math.ceil(1.3 * t[i]), ref: 'ECP 203-2025: طول التماسك من الجدول (4-9) × 1.3 للوصلة في الشد (البند 4-2-5-4)، ولا يُسمح بوصلات التراكب للأقطار الأكبر من 32 مم' };
  }
  const psiG = fy <= 420 ? 1 : fy <= 550 ? 1.15 : 1.3, sq = Math.min(Math.sqrt(fc), 8.3);
  const ld = Math.max(fy * psiG / ((d <= 19 ? 2.1 : 1.7) * sq), 300 / d);
  return { k: Math.ceil(1.3 * ld), ref: 'ACI 318-19 البند 25.4.2.3 ووصلة الفئة B (1.3 ld)' };
}
const btn = (label, icon, onclick, cls = '') => h('button', { type: 'button', class: 'btn ' + cls, onclick }, icon ? ico(icon, 18) : null, label);
const onAny = (els, fn) => els.forEach(e => { e.addEventListener('input', fn); e.addEventListener('change', fn); });

/* ================= حديد التسليح ================= */
export function rebar(body) {
  let code = getCode();
  const grade = h('select', { class: 'input' });
  const stock = num(12), lapK = num(''), waste = num(5), price = num(''), fcR = num(25);
  const autoLap = h('input', { type: 'checkbox', checked: true });
  const elements = ['قواعد', 'رقاب أعمدة', 'أعمدة', 'كمرات', 'بلاطات', 'سملات', 'حوائط خرسانية', 'سلالم', 'أخرى'];
  const barOpts = () => REBAR[code].bars.map(b => [String(b.d), b.label]);
  let ed;
  const cols = () => [
    { key: 'el', label: 'العنصر', type: 'select', options: elements, def: 'قواعد' },
    { key: 'd', label: 'القطر', type: 'select', options: barOpts(), def: String(REBAR[code].bars[3].d) },
    { key: 'len', label: 'طول السيخ (م)', type: 'num', placeholder: '6.5' },
    { key: 'n', label: 'عدد الأسياخ', type: 'num', placeholder: '10' },
    { key: 'm', label: 'عدد العناصر المتماثلة', type: 'num', def: '1' },
  ];
  const holder = h('div');
  function build(rows) {
    ed = rowsEditor({ columns: cols(), rows, onChange: calc, addLabel: 'إضافة بند حديد' });
    holder.innerHTML = ''; holder.append(ed.el);
  }
  function setCode(c) {
    code = c; const R = REBAR[c];
    grade.innerHTML = ''; R.grades.forEach(([v, t]) => grade.append(h('option', { value: v }, t)));
    stock.value = R.stock; fcR.value = c === 'eg' ? 25 : 28;
    const valid = R.bars.map(b => String(b.d));
    const rows = (ed?.data || [{ el: 'قواعد', d: '16', len: '3.2', n: '12', m: '4' }, { el: 'أعمدة', d: '16', len: '4.2', n: '8', m: '6' }, { el: 'أعمدة', d: '8', len: '1.4', n: '30', m: '6' }])
      .map(r => ({ ...r, d: valid.includes(r.d) ? r.d : valid.reduce((a, b) => Math.abs(b - r.d) < Math.abs(a - r.d) ? b : a) }));
    build(rows);
    calc();
  }
  const bar = codeBar(setCode);
  const ui = layout(body, {
    code: bar,
    inputs: [sectionTitle('بنود الحديد', 'construction'), h('p', { class: 'eng-sub' }, 'أدخل طول السيخ الواحد بعد التشكيل (شاملًا الجنشات)، وعدد الأسياخ في العنصر الواحد، وعدد العناصر المتماثلة.'), holder,
      sectionTitle('الإعدادات', 'settings'),
      h('div', { class: 'opts', style: { marginTop: 0 } }, field('رتبة الصلب', grade), nf('طول السيخ التجاري', stock, 'م'),
        nf('مقاومة الخرسانة', fcR, 'ميجاباسكال', 'المكعبية للكود المصري والأسطوانية لغيره'), nf('طول التراكب (اختياري)', lapK, '× القطر', 'اتركه فارغًا ليُحسب حسب الكود لكل قطر'), nf('نسبة الهالك', waste, '%'), nf('سعر الطن (اختياري)', price, 'للطن'),
        h('label', { class: 'check' }, autoLap, 'إضافة طول التراكب للأسياخ الأطول من السيخ التجاري'))],
    wide: true,
  });
  onAny([grade, stock, lapK, waste, price, autoLap, fcR], calc);
  let last = null;
  function calc() {
    const st = N(stock.value, 12), kIn = N(lapK.value, NaN), w = N(waste.value, 0) / 100, pr = N(price.value, 0);
    const lapOf = (d) => Number.isFinite(kIn) && kIn > 0 ? kIn : lapMultiple(code, d, +grade.value, N(fcR.value, 25)).k;
    const lapRef = Number.isFinite(kIn) && kIn > 0 ? 'قيمة أدخلتها' : lapMultiple(code, 16, +grade.value, N(fcR.value, 25)).ref;
    const byD = new Map(); let warn = 0;
    for (const r of ed.data) {
      const d = +r.d, L = N(r.len, 0), n = N(r.n, 0), m = N(r.m, 1);
      if (!(L > 0 && n > 0 && m > 0)) continue;
      let Ladd = L;
      const lap = lapOf(d) * d / 1000;
      if (autoLap.checked && L > st) { if (st - lap <= 0) { warn++; continue; } const pieces = Math.ceil((L - lap) / (st - lap)); Ladd = L + (pieces - 1) * lap; }
      const tot = Ladd * n * m;
      const o = byD.get(d) || { d, len: 0, items: 0 }; o.len += tot; o.items += n * m; byD.set(d, o);
    }
    const rows = [...byD.values()].sort((a, b) => a.d - b.d).map(o => { const kg = barKg(code, o.d); const wt = o.len * kg * (1 + w); return { ...o, kgm: kg, wt, bars: Math.ceil(o.len * (1 + w) / st) }; });
    const totW = rows.reduce((s, r) => s + r.wt, 0);
    last = { rows, totW, st, w, pr };
    const lbl = (d) => REBAR[code].bars.find(b => b.d === d)?.label || d;
    ui.show(
      kpis([['إجمالي الوزن', fmt(totW / 1000, 3), 'طن', 'main'], ['بالكيلوجرام', fmt(totW, 0), 'كجم'], ['عدد الأسياخ التجارية', fmt(rows.reduce((s, r) => s + r.bars, 0), 0), 'سيخ'], pr > 0 ? ['التكلفة التقديرية', fmt(totW / 1000 * pr, 0)] : null]),
      rows.length ? table(['القطر', 'وزن المتر (كجم)', 'الطول الكلي (م)', `عدد أسياخ ${st} م`, 'الوزن مع الهالك (كجم)'],
        rows.map(r => [lbl(r.d), fmt(r.kgm, 3), fmt(r.len, 1), fmt(r.bars, 0), fmt(r.wt, 1)]), ['الإجمالي', '', fmt(rows.reduce((s, r) => s + r.len, 0), 1), fmt(rows.reduce((s, r) => s + r.bars, 0), 0), fmt(totW, 1)]) : h('p', { class: 'muted' }, 'أدخل أطوال الأسياخ وأعدادها.'),
      warn ? h('div', { class: 'note err' }, 'طول التراكب أكبر من طول السيخ التجاري في بعض البنود، فاستُبعدت من الحساب.') : null,
      checks([{ ok: null, text: `طول التراكب المستخدم: ${[...new Set(rows.map(r => lapOf(r.d)))].map(x => x + 'Φ').join(' / ') || '—'}`, ref: lapRef }, { text: 'وزن المتر الطولي = 0.006165 × القطر² (بالمليمتر)، وهو ما يعادل تقريبًا القطر² ÷ 162.', ok: null, ref: code === 'intl' ? 'في الكود العالمي تُستخدم الكتلة الاسمية لأسياخ ASTM A615M مباشرة.' : REBAR[code].ref }]),
      h('div', { class: 'actions' }, btn('تنزيل Excel', 'download', exportX), ...boqButton(() => rows.map(r => ({ section: 'أعمال حديد التسليح', desc: `توريد وتركيب حديد تسليح ${lbl(r.d)} — ${grade.selectedOptions[0]?.textContent.split('—')[0].trim()}`, unit: 'طن', qty: r.wt / 1000 })))));
  }
  function exportX() {
    const lbl = (d) => REBAR[code].bars.find(b => b.d === d)?.label || d;
    const det = ed.data.filter(r => N(r.len) > 0 && N(r.n) > 0).map(r => [r.el, lbl(+r.d), N(r.len), N(r.n), N(r.m, 1), (row) => ({ formula: `C${row}*D${row}*E${row}` }), barKg(code, +r.d), (row) => ({ formula: `F${row}*G${row}` })]);
    const n = det.length;
    det.push(['الإجمالي', '', '', '', '', { formula: `SUM(F4:F${3 + n})` }, '', { formula: `SUM(H4:H${3 + n})` }]);
    det.push([`مع هالك ${N(waste.value, 0)}%`, '', '', '', '', '', '', { formula: `H${4 + n}*(1+${N(waste.value, 0) / 100})` }]);
    xlsxDownload('rebar-schedule.xlsx', [{ name: 'جدول الحديد', title: 'جدول حصر حديد التسليح — ' + grade.selectedOptions[0]?.textContent, columns: [{ header: 'العنصر', width: 18 }, { header: 'القطر', width: 12 }, { header: 'طول السيخ (م)', width: 14, fmt: '0.00' }, { header: 'عدد الأسياخ', width: 12 }, { header: 'عدد العناصر', width: 12 }, { header: 'الطول الكلي (م)', width: 16, fmt: '0.00' }, { header: 'وزن المتر (كجم)', width: 16, fmt: '0.000' }, { header: 'الوزن (كجم)', width: 16, fmt: '#,##0.0' }], rows: det, boldRows: [n, n + 1], notes: ['الطول الكلي في هذا الجدول لا يشمل أطوال التراكب الإضافية؛ يظهر أثرها في نتائج الأداة.', 'أُعد بواسطة أدوات إتقان'] }]);
  }
  setCode(code);
}

/* ================= الخرسانة والمواد ================= */
export function concrete(body) {
  let code = getCode();
  const mixSel = h('select', { class: 'input' });
  const cement = num(), sand = num(), agg = num(), water = num(), waste = num(5), bag = num(50);
  const types = ['قواعد منفصلة', 'قواعد شريطية', 'لبشة', 'خرسانة عادية', 'رقاب أعمدة', 'أعمدة', 'كمرات', 'بلاطات', 'سملات', 'حوائط', 'سلالم', 'أخرى'];
  const ed = rowsEditor({
    columns: [{ key: 't', label: 'العنصر', type: 'select', options: types, def: 'أعمدة' }, { key: 'l', label: 'الطول (م)', type: 'num' }, { key: 'w', label: 'العرض (م)', type: 'num' }, { key: 'd', label: 'الارتفاع أو السماكة (م)', type: 'num' }, { key: 'n', label: 'العدد', type: 'num', def: '1' }],
    rows: [{ t: 'خرسانة عادية', l: '2.4', w: '2.4', d: '0.2', n: '6' }, { t: 'قواعد منفصلة', l: '2', w: '2', d: '0.6', n: '6' }, { t: 'أعمدة', l: '0.3', w: '0.6', d: '3.2', n: '6' }, { t: 'بلاطات', l: '12', w: '10', d: '0.15', n: '1' }],
    onChange: calc, addLabel: 'إضافة عنصر',
  });
  function fill() { const m = MIXES[code].list.find(x => x.id === mixSel.value); if (!m) return; cement.value = m.cement; sand.value = m.sand; agg.value = m.agg; water.value = m.water; calc(); }
  function setCode(c) { code = c; mixSel.innerHTML = ''; MIXES[c].list.forEach(m => mixSel.append(h('option', { value: m.id }, m.label))); fill(); }
  mixSel.onchange = fill;
  const aggLbl = h('span');
  const ui = layout(body, {
    code: codeBar(setCode), wide: true,
    inputs: [sectionTitle('العناصر الخرسانية', 'cuboid'), ed.el, sectionTitle('الخلطة (لكل متر مكعب)', 'settings'),
      h('div', { class: 'opts', style: { marginTop: 0 } }, field('نوع الخلطة', mixSel), nf('الأسمنت', cement, 'كجم'), nf('الرمل', sand, 'م³'), h('label', { class: 'field' }, aggLbl, h('div', { class: 'unit-in' }, agg, h('em', {}, 'م³'))), nf('الماء', water, 'لتر'), nf('نسبة الهالك', waste, '%'), nf('وزن كيس الأسمنت', bag, 'كجم'))],
  });
  onAny([cement, sand, agg, water, waste, bag], calc);
  function calc() {
    aggLbl.textContent = MIXES[code].agg;
    const w = 1 + N(waste.value, 0) / 100;
    const items = ed.data.map(r => ({ t: r.t, v: N(r.l, 0) * N(r.w, 0) * N(r.d, 0) * N(r.n, 1) })).filter(x => x.v > 0);
    const byT = new Map(); items.forEach(x => byT.set(x.t, (byT.get(x.t) || 0) + x.v));
    const V = items.reduce((s, x) => s + x.v, 0), Vw = V * w;
    const cKg = Vw * N(cement.value, 0);
    ui.show(
      kpis([['حجم الخرسانة', fmt(V, 2), 'م³', 'main'], ['الحجم مع الهالك', fmt(Vw, 2), 'م³'], ['الأسمنت', fmt(cKg / 1000, 2), 'طن'], ['عدد الأكياس', fmt(Math.ceil(cKg / N(bag.value, 50)), 0), 'كيس'], ['الرمل', fmt(Vw * N(sand.value, 0), 2), 'م³'], [MIXES[code].agg, fmt(Vw * N(agg.value, 0), 2), 'م³'], ['الماء', fmt(Vw * N(water.value, 0), 0), 'لتر']]),
      byT.size ? table(['العنصر', 'الحجم (م³)', 'النسبة'], [...byT].map(([t, v]) => [t, fmt(v, 3), fmt(v / V * 100, 1) + '%']), ['الإجمالي', fmt(V, 3), '100%']) : null,
      checks([{ ok: null, text: 'كميات المواد استرشادية؛ تختلف حسب تدرّج الركام ورطوبة الرمل وتصميم الخلطة المعتمد.', ref: MIXES[code].ref }]),
      h('div', { class: 'actions' }, btn('تنزيل Excel', 'download', () => exportX(byT, V, Vw)), ...boqButton(() => [...byT].map(([t, v]) => ({ section: 'أعمال الخرسانة', desc: `توريد وصب خرسانة ${t} — ${mixSel.selectedOptions[0]?.textContent.split('—')[0].trim()}`, unit: 'م³', qty: v })))));
  }
  function exportX(byT, V, Vw) {
    const rows = ed.data.filter(r => N(r.l) > 0).map(r => [r.t, N(r.l), N(r.w), N(r.d), N(r.n, 1), (row) => ({ formula: `B${row}*C${row}*D${row}*E${row}` })]);
    const n = rows.length, tot = 4 + n;
    rows.push(['الإجمالي', '', '', '', '', { formula: `SUM(F4:F${3 + n})` }]);
    const s2 = [['الحجم مع الهالك (م³)', { formula: `'العناصر'!F${tot}*(1+${N(waste.value, 0) / 100})` }], ['الأسمنت (كجم)', (r) => ({ formula: `B4*${N(cement.value, 0)}` })], ['عدد الأكياس', (r) => ({ formula: `ROUNDUP(B5/${N(bag.value, 50)},0)` })], ['الرمل (م³)', { formula: `B4*${N(sand.value, 0)}` }], [MIXES[code].agg + ' (م³)', { formula: `B4*${N(agg.value, 0)}` }], ['الماء (لتر)', { formula: `B4*${N(water.value, 0)}` }]];
    xlsxDownload('concrete-quantities.xlsx', [
      { name: 'العناصر', title: 'حصر كميات الخرسانة', columns: [{ header: 'العنصر', width: 18 }, { header: 'الطول (م)', width: 11 }, { header: 'العرض (م)', width: 11 }, { header: 'الارتفاع (م)', width: 12 }, { header: 'العدد', width: 9 }, { header: 'الحجم (م³)', width: 13, fmt: '0.000' }], rows, boldRows: [n] },
      { name: 'المواد', title: 'كميات المواد — ' + mixSel.selectedOptions[0]?.textContent, columns: [{ header: 'البند', width: 26 }, { header: 'الكمية', width: 16, fmt: '#,##0.00' }], rows: s2 },
    ]);
  }
  setCode(code);
}

/* ================= الحفر والردم ================= */
export function excavation(body) {
  const soils = [['25', 'تربة عادية (انتفاش 25%)'], ['12', 'رمل (انتفاش 12%)'], ['30', 'طين (انتفاش 30%)'], ['40', 'تربة صخرية مفككة (انتفاش 40%)'], ['60', 'صخر بعد التكسير (انتفاش 60%)']];
  const soil = select(soils, '25'), slope = num(0.5), work = num(0.5), shrink = num(10), truck = num(12), structV = num(30);
  const ed = rowsEditor({
    columns: [{ key: 'name', label: 'البند', type: 'text', def: 'حفرة قاعدة' }, { key: 'l', label: 'طول القاع (م)', type: 'num' }, { key: 'w', label: 'عرض القاع (م)', type: 'num' }, { key: 'd', label: 'العمق (م)', type: 'num' }, { key: 'n', label: 'العدد', type: 'num', def: '1' }],
    rows: [{ name: 'حفر القواعد', l: '2.4', w: '2.4', d: '1.5', n: '6' }, { name: 'خندق الميدات', l: '30', w: '0.6', d: '1', n: '1' }], onChange: calc, addLabel: 'إضافة حفرة أو خندق',
  });
  const ui = layout(body, {
    wide: true,
    inputs: [sectionTitle('الحفر', 'shovel'), h('p', { class: 'eng-sub' }, 'أبعاد القاع هي أبعاد الأساس نفسه؛ وتُضاف إليها مسافة العمل من كل جانب، ثم يتسع الحفر إلى أعلى حسب الميل.'), ed.el,
      sectionTitle('الإعدادات', 'settings'),
      h('div', { class: 'opts', style: { marginTop: 0 } }, nf('ميل جوانب الحفر (أفقي : رأسي)', slope, ': 1', '0 للجوانب الرأسية، و0.5 للتربة المتماسكة، و1 للرملية'), nf('مسافة العمل من كل جانب', work, 'م'), field('نوع التربة', soil), nf('نسبة الهبوط عند الدمك', shrink, '%', 'تقلّص الحجم عند الدمك مقارنة بالحالة الطبيعية'), nf('حجم المنشآت المدفونة (اختياري)', structV, 'م³', 'القواعد والميدات والأعمدة تحت منسوب الردم'), nf('سعة سيارة النقل', truck, 'م³'))],
  });
  onAny([soil, slope, work, shrink, truck, structV], calc);
  function calc() {
    const s = N(slope.value, 0), wk = N(work.value, 0);
    const rows = ed.data.map(r => {
      const L = N(r.l, 0) + 2 * wk, B = N(r.w, 0) + 2 * wk, D = N(r.d, 0), n = N(r.n, 1);
      if (!(L > 0 && B > 0 && D > 0)) return null;
      const Lt = L + 2 * s * D, Bt = B + 2 * s * D, Lm = (L + Lt) / 2, Bm = (B + Bt) / 2;
      const V = D / 6 * (L * B + 4 * Lm * Bm + Lt * Bt); // معادلة المنشور (دقيقة لهذا الشكل)
      return { name: r.name, bottom: L * B, top: Lt * Bt, V: V * n, n };
    }).filter(Boolean);
    const Vexc = rows.reduce((a, r) => a + r.V, 0);
    const Vs = Math.min(N(structV.value, 0), Vexc);
    const backfill = Vexc - Vs; // حجم الردم بعد الدمك
    const need = backfill / (1 - N(shrink.value, 0) / 100); // حجم الحفر الطبيعي اللازم للردم
    const excess = Math.max(0, Vexc - need), loose = excess * (1 + N(soil.value, 0) / 100);
    const shortage = Math.max(0, need - Vexc);
    ui.show(
      kpis([['حجم الحفر', fmt(Vexc, 2), 'م³', 'main'], ['حجم الردم (مدموك)', fmt(backfill, 2), 'م³'], ['الناتج الزائد بعد الانتفاش', fmt(loose, 2), 'م³'], ['عدد النقلات', fmt(Math.ceil(loose / N(truck.value, 12)), 0), 'نقلة'], shortage > 0 ? ['عجز يُورّد من الخارج', fmt(shortage, 2), 'م³', 'bad'] : null]),
      rows.length ? table(['البند', 'مساحة القاع (م²)', 'مساحة الفتحة العلوية (م²)', 'العدد', 'الحجم (م³)'], rows.map(r => [r.name, fmt(r.bottom, 2), fmt(r.top, 2), fmt(r.n, 0), fmt(r.V, 2)]), ['الإجمالي', '', '', '', fmt(Vexc, 2)]) : null,
      checks([{ ok: null, text: 'يُحسب الحجم بمعادلة المنشور: ح = ع ÷ 6 × (م القاع + 4 م الوسط + م القمة)، وهي دقيقة للحفر ذي الجوانب المائلة.' }, { ok: null, text: 'الردم = حجم الحفر − حجم المنشآت المدفونة. والناتج الزائد يُحسب بعد خصم ما يلزم للردم مع مراعاة الهبوط، ثم يُضرب في معامل الانتفاش.' }]),
      h('div', { class: 'actions' }, ...boqButton(() => [{ section: 'أعمال الحفر والردم', desc: 'حفر في أي نوع من التربة حتى المناسيب المطلوبة', unit: 'م³', qty: Vexc }, { section: 'أعمال الحفر والردم', desc: 'ردم على طبقات مع الرش والدمك', unit: 'م³', qty: backfill }, excess > 0 ? { section: 'أعمال الحفر والردم', desc: 'نقل الناتج الزائد إلى المقالب العمومية', unit: 'م³', qty: loose } : null].filter(Boolean))));
  }
  calc();
}

/* ================= التقدير المبدئي للأبعاد ================= */
// معاملات السماكة الدنيا (المجاز ÷ المعامل) لعدم حساب الترخيم
const DEPTH = {
  eg: {
    // ECP 203-2025 جدول (4-10): البحر الخالص ÷ العمق الكلي لصلب 420، وتُقسم القيم على (0.4 + fy/700) لغيره
    slab1: { ss: 25, one: 28, both: 31, cant: 10 }, slab2: { ss: 35, one: 40, both: 45, cant: 10 }, beam: { ss: 12, one: 14, both: 16, cant: 5 }, minSlab: 100, minFlat: 150,
    // جدول (6-3) للبلاطات اللاكمرية دون سقوط: [خارجية دون كمرة طرفية، خارجية بكمرة طرفية أو داخلية] لإجهاد خضوع 350 و 420 و 500
    flatT: { 350: [32, 35], 420: [30, 33], 500: [28, 31] },
    ref: 'الكود المصري ECP 203-2025: الجدول (4-10) والمعادلة (4-82) للبلاطات ذات الاتجاهين والمعادلات (6-6) والجدول (6-3) للبلاطات اللاكمرية', fy: (fy) => 0.4 + fy / 700,
  },
  aci: {
    slab1: { ss: 20, one: 24, both: 28, cant: 10 }, beam: { ss: 16, one: 18.5, both: 21, cant: 8 }, flat: { ext: 30, extEdge: 33, int: 33 }, minFlat: 125,
    ref: 'ACI 318-19 الجداول 7.3.1.1 و 9.3.1.1 و 8.3.1.1 (ويعتمدها SBC 304)', fy: (fy) => 0.4 + fy / 700,
  },
};
export function sizing(body) {
  let code = getCode();
  const D = () => code === 'eg' ? DEPTH.eg : DEPTH.aci;
  // البلاطات
  const sType = h('select', { class: 'input' }), sSup = select([['ss', 'بسيطة الارتكاز'], ['one', 'مستمرة من طرف واحد'], ['both', 'مستمرة من الطرفين'], ['cant', 'كابولي']], 'one');
  const sSpan = num(4.5), sLong = num(5.5), fySel = h('select', { class: 'input' }), fcIn = num(25);
  const bSup = select([['ss', 'بسيطة الارتكاز'], ['one', 'مستمرة من طرف واحد'], ['both', 'مستمرة من الطرفين'], ['cant', 'كابولي']], 'one'), bSpan = num(5);
  const cArea = num(16), cFloors = num(4), cLoad = num(14), cRho = num(1), qAllow = num(150);
  function setCode(c) {
    code = c;
    sType.innerHTML = ''; (c === 'eg' ? [['one', 'بلاطة مصمتة في اتجاه واحد'], ['two', 'بلاطة مصمتة في اتجاهين'], ['flat', 'بلاطة لاكمرية (فلات سلاب)']] : [['one', 'بلاطة مصمتة في اتجاه واحد'], ['two', 'بلاطة في اتجاهين على كمرات صلبة'], ['flat', 'بلاطة لاكمرية (فلات بليت)']]).forEach(([v, t]) => sType.append(h('option', { value: v }, t)));
    fySel.innerHTML = ''; (c === 'eg' ? [['400', 'B400'], ['420', 'B420DWR'], ['500', 'B500'], ['350', 'B350DWR'], ['240', 'B240']] : [['420', 'Grade 60 (420)'], ['280', 'Grade 40 (280)'], ['520', 'Grade 75 (520)']]).forEach(([v, t]) => fySel.append(h('option', { value: v }, t)));
    fcIn.value = c === 'eg' ? 25 : 28;
    fcLbl.firstChild.textContent = c === 'eg' ? 'مقاومة الخرسانة المكعبية fcu' : "مقاومة الخرسانة الأسطوانية f'c";
    calc();
  }
  const fcLbl = nf('', fcIn, 'ميجاباسكال');
  const supNote = h('small', { class: 'muted' });
  const ui = layout(body, {
    code: codeBar(setCode),
    inputs: [
      sectionTitle('المواد', 'settings'), h('div', { class: 'opts', style: { marginTop: 0 } }, field('رتبة الصلب', fySel), fcLbl),
      sectionTitle('البلاطة', 'layers'), h('div', { class: 'opts', style: { marginTop: 0 } }, field('نوع البلاطة', sType), field('حالة الارتكاز', sSup, null), nf('البحر القصير (الصافي)', sSpan, 'م'), nf('البحر الطويل', sLong, 'م', 'يُستخدم للبلاطات في اتجاهين')),
      sectionTitle('الكمرة', 'ruler'), h('div', { class: 'opts', style: { marginTop: 0 } }, field('حالة الارتكاز', bSup), nf('بحر الكمرة', bSpan, 'م')),
      sectionTitle('العمود والقاعدة', 'columns-3'), h('div', { class: 'opts', style: { marginTop: 0 } }, nf('مساحة التحميل للعمود', cArea, 'م²', 'نصف المسافة إلى الأعمدة المجاورة في كل اتجاه'), nf('عدد الطوابق فوق العمود', cFloors), nf('الحمل التصميمي المصعّد للطابق', cLoad, 'كيلونيوتن/م²', 'قيمة شائعة للمباني السكنية: 12 إلى 16 شاملة الحوائط'), nf('نسبة حديد العمود', cRho, '%'), nf('جهد التربة المسموح', qAllow, 'كيلونيوتن/م²', '150 كيلونيوتن/م² ≈ 1.5 كجم/سم²')),
    ],
  });
  onAny([sType, sSup, sSpan, sLong, fySel, fcIn, bSup, bSpan, cArea, cFloors, cLoad, cRho, qAllow], calc);
  const up = (x, step) => Math.ceil(x / step - 1e-9) * step;
  function calc() {
    const d = D(), fy = +fySel.value, fc = N(fcIn.value, 25), k = d.fy(fy);
    const Ls = N(sSpan.value, 0) * 1000, Ll = Math.max(N(sLong.value, 0) * 1000, Ls), out = [], chk = [];
    // البلاطة
    let ts = 0, how = '';
    const sup = sSup.value, st = sType.value;
    if (st === 'one') { ts = Ls / d.slab1[sup] * k; how = `البحر الخالص ÷ ${d.slab1[sup]}`; }
    else if (st === 'two') {
      if (code === 'eg') {
        // المعادلة (4-82) مع الحد الأدنى a/35 أو a/40 أو a/45 من المعادلات (6-6)
        const a = Ls, b2 = Ll, bp = sup === 'ss' ? 0 : sup === 'one' ? b2 / (2 * (a + b2)) : sup === 'both' ? 2 * b2 / (2 * (a + b2)) : 0;
        const t82 = a * (0.85 + fy / 1600) / (15 + 25 / (b2 / a) + 10 * bp), t6 = a / d.slab2[sup];
        ts = Math.max(t82, t6, 100); how = `الأكبر من المعادلة (4-82) = ${Math.round(t82)} والبحر القصير ÷ ${d.slab2[sup]} و 100 مم`;
      }
      else { const beta = Ll / Ls; ts = Math.max(Ll * (0.8 + fy / 1400) / (36 + 9 * beta), 90); how = 'ℓn(0.8 + fy/1400) ÷ (36 + 9β)'; }
    } else {
      const lmax = Ll, ext = sup === 'ss' || sup === 'one';
      let f;
      if (code === 'eg') { const T = d.flatT, i = ext ? 0 : 1, f1 = fy <= 350 ? T[350][i] : fy <= 420 ? T[350][i] + (T[420][i] - T[350][i]) * (fy - 350) / 70 : T[420][i] + (T[500][i] - T[420][i]) * Math.min(fy - 420, 80) / 80; f = +f1.toFixed(1); ts = Math.max(lmax / f, d.minFlat); }
      else { f = ext ? d.flat.ext : d.flat.int; ts = Math.max(lmax / f * k, d.minFlat); }
      how = `البحر الخالص الأكبر ÷ ${f}`;
    }
    if (st === 'one' && code === 'eg') ts = Math.max(ts, 80);
    supNote.textContent = '';
    const tsR = up(ts, 10);
    // الكمرة
    const Lb = N(bSpan.value, 0) * 1000, hb = Lb / d.beam[bSup.value] * k, hbR = up(Math.max(hb, 300), 50);
    const bb = Math.max(200, up(hbR / 2.5, 50));
    // العمود
    const Pu = N(cArea.value, 0) * N(cFloors.value, 0) * N(cLoad.value, 0) * 1000; // نيوتن
    const rho = N(cRho.value, 1) / 100;
    const cap = code === 'eg' ? 0.35 * fc * (1 - rho) + 0.67 * fy * rho : 0.65 * 0.8 * (0.85 * fc * (1 - rho) + fy * rho);
    const Ag = Pu / cap; const side = Math.max(up(Math.sqrt(Ag), 50), code === 'eg' ? 250 : 250);
    const b1 = 250, l1 = Math.max(up(Ag / b1, 50), 250), b2 = 300, l2 = Math.max(up(Ag / b2, 50), 300);
    // القاعدة: الحمل التشغيلي ≈ المصعّد ÷ 1.45 مع 10% للوزن الذاتي والردم
    const Ps = Pu / 1000 / 1.45, Af = 1.1 * Ps / N(qAllow.value, 150), Bf = up(Math.sqrt(Af) * 1000, 100);
    ui.show(
      kpis([['سماكة البلاطة', fmt(tsR, 0), 'مم', 'main'], ['أبعاد الكمرة', `${fmt(bb, 0)} × ${fmt(hbR, 0)}`, 'مم'], ['قطاع العمود المربع', `${fmt(side, 0)} × ${fmt(side, 0)}`, 'مم'], ['القاعدة المربعة', `${fmt(Bf / 1000, 1)} × ${fmt(Bf / 1000, 1)}`, 'م']]),
      table(['العنصر', 'الطريقة', 'القيمة المحسوبة', 'المقترح'], [
        ['البلاطة', how + (k !== 1 && st !== 'two' ? ` × ${fmt(k, 3)} (معامل الصلب)` : ''), fmt(ts, 0) + ' مم', fmt(tsR, 0) + ' مم'],
        ['الكمرة (العمق الكلي)', `البحر ÷ ${d.beam[bSup.value]}` + (k !== 1 ? ` × ${fmt(k, 3)}` : ''), fmt(hb, 0) + ' مم', `${fmt(bb, 0)} × ${fmt(hbR, 0)} مم`],
        ['الحمل المصعّد على العمود', 'المساحة × الطوابق × الحمل', fmt(Pu / 1000, 0) + ' كيلونيوتن', ''],
        ['مساحة العمود اللازمة', code === 'eg' ? 'Pu = 0.35 fcu Ac + 0.67 fy As' : "Pu = 0.65 × 0.80 [0.85 f'c (Ag − Ast) + fy Ast]", fmt(Ag / 100, 0) + ' سم²', `${fmt(side, 0)} × ${fmt(side, 0)} أو ${b1} × ${fmt(l1, 0)} أو ${b2} × ${fmt(l2, 0)} مم`],
        ['مساحة القاعدة', '1.1 × الحمل التشغيلي ÷ جهد التربة', fmt(Af, 2) + ' م²', `${fmt(Bf / 1000, 1)} × ${fmt(Bf / 1000, 1)} م`],
      ]),
      checks([
        { ok: null, text: 'السماكات المقترحة هي الحد الأدنى الذي لا يلزم معه حساب الترخيم، وقد يتطلب التصميم سماكة أكبر بسبب العزوم أو القص أو الثقب.', ref: d.ref },
        code === 'eg' ? { ok: null, text: 'يسري الجدول (4-10) للمباني العادية بحمل حي لا يزيد على 5 كن/م² وبحور لا تتجاوز 6 م وكوابيل لا تتجاوز 2 م؛ وفيما عدا ذلك يلزم حساب الترخيم.' } : null,
        code === 'eg' ? { ok: null, text: 'معادلة العمود القصير المحمّل محوريًا في الكود المصري تتضمن معاملات الأمان، ولا تراعي العزوم أو النحافة.', ref: 'ECP 203' } : { ok: null, text: 'معادلة الأعمدة ذات الكانات (φ = 0.65) مع حد اللامركزية 0.80، ولا تراعي العزوم أو النحافة.', ref: 'ACI 318 البند 22.4 — SBC 304' },
        { ok: rho >= 0.008 && rho <= (code === 'eg' ? 0.04 : 0.08), text: `نسبة حديد العمود ${fmt(rho * 100, 2)}%`, ref: code === 'eg' ? 'الحد الأدنى الشائع 0.8% والأقصى 4% في الكود المصري' : 'ACI 318: من 1% إلى 8% (ويُفضّل ألا تتجاوز 4% عمليًا)' },
        { ok: null, text: 'الحمل التشغيلي للقاعدة مقدَّر بقسمة الحمل المصعّد على 1.45 تقريبًا؛ أدخل حملك الفعلي عند توفره.' },
      ]));
  }
  setCode(code);
}

/* ================= تصريف المواسير بمعادلة مانينج ================= */
const MATERIALS = [['0.010', 'PVC أو uPVC (n = 0.010)'], ['0.011', 'HDPE بولي إيثيلين (n = 0.011)'], ['0.013', 'خرسانة (n = 0.013)'], ['0.013', 'فخار مزجج (n = 0.013)'], ['0.012', 'حديد مرن مبطن (n = 0.012)'], ['0.015', 'حديد زهر قديم (n = 0.015)'], ['custom', 'قيمة أخرى']];
const STD_D = [110, 160, 200, 250, 315, 400, 500, 600, 700, 800, 900, 1000, 1200, 1400, 1600];
function partial(D, yD) { // الخصائص الهندسية للامتلاء الجزئي
  const y = Math.min(Math.max(yD, 1e-6), 1);
  if (y >= 1) return { A: Math.PI * D * D / 4, P: Math.PI * D };
  const th = 2 * Math.acos(1 - 2 * y);
  return { A: D * D / 8 * (th - Math.sin(th)), P: D * th / 2 };
}
function manning(D, S, n, yD) { const { A, P } = partial(D, yD); const R = A / P; const V = 1 / n * Math.pow(R, 2 / 3) * Math.sqrt(S); return { A, R, V, Q: A * V }; }
export function pipes(body) {
  const mode = h('div', { class: 'seg' }), mat = select(MATERIALS, '0.010'), nIn = num(0.010), D = num(200), S = num(0.5), fill = num(70), Q = num(25);
  let m = 'cap';
  [['cap', 'سعة ماسورة معلومة'], ['size', 'القطر المطلوب لتصريف معيّن']].forEach(([v, t]) => { const b = h('button', { type: 'button', class: v === m ? 'on' : '' }, t); b.onclick = () => { m = v; [...mode.children].forEach(x => x.classList.toggle('on', x === b)); draw(); calc(); }; mode.append(b); });
  mat.onchange = () => { if (mat.value !== 'custom') nIn.value = mat.value; calc(); };
  const dF = nf('القطر الداخلي', D, 'مم'), qF = nf('التصريف المطلوب', Q, 'لتر/ث');
  function draw() { dF.style.display = m === 'cap' ? '' : 'none'; qF.style.display = m === 'size' ? '' : 'none'; }
  const ui = layout(body, {
    inputs: [h('div', { style: { marginBottom: '14px' } }, mode), h('div', { class: 'opts', style: { marginTop: 0 } }, field('مادة الماسورة', mat), nf('معامل مانينج n', nIn), dF, qF, nf('الميل الطولي', S, '%', '0.5% = 5 لكل ألف'), nf('نسبة الامتلاء التصميمية', fill, '%', 'شائعًا 50% للمواسير الصغيرة و75% للكبيرة'))],
  });
  onAny([nIn, D, S, fill, Q], calc); draw();
  function calc() {
    const n = N(nIn.value, 0.013), s = N(S.value, 0) / 100, y = N(fill.value, 100) / 100;
    if (!(n > 0 && s > 0)) return ui.show(h('div', { class: 'note err' }, 'أدخل معامل الخشونة والميل.'));
    let d = N(D.value, 0) / 1000, picked = null;
    if (m === 'size') {
      const q = N(Q.value, 0) / 1000; if (!(q > 0)) return ui.show(h('div', { class: 'note err' }, 'أدخل التصريف المطلوب.'));
      let lo = 0.01, hi = 5; for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (manning(mid, s, n, y).Q < q) lo = mid; else hi = mid; }
      picked = { need: hi * 1000, std: STD_D.find(x => x >= hi * 1000) };
      d = (picked.std || Math.ceil(hi * 10) * 100) / 1000;
    }
    if (!(d > 0)) return ui.show(h('div', { class: 'note err' }, 'أدخل قطر الماسورة.'));
    const full = manning(d, s, n, 1), part = manning(d, s, n, y);
    const vOk = part.V >= 0.6 && part.V <= 3;
    ui.show(
      picked ? kpis([['القطر النظري', fmt(picked.need, 0), 'مم'], ['القطر التجاري المقترح', fmt(d * 1000, 0), 'مم', 'main']]) : null,
      kpis([['التصريف عند الامتلاء الكامل', fmt(full.Q * 1000, 1), 'لتر/ث', m === 'cap' ? 'main' : ''], ['السرعة عند الامتلاء الكامل', fmt(full.V, 2), 'م/ث'], [`التصريف عند ${fmt(y * 100, 0)}%`, fmt(part.Q * 1000, 1), 'لتر/ث'], [`السرعة عند ${fmt(y * 100, 0)}%`, fmt(part.V, 2), 'م/ث', vOk ? '' : 'bad']]),
      table(['البند', 'القيمة'], [['التصريف بالمتر المكعب في الساعة (امتلاء كامل)', fmt(full.Q * 3600, 1) + ' م³/س'], ['التصريف اليومي (امتلاء كامل)', fmt(full.Q * 86400, 0) + ' م³/يوم'], ['نصف القطر الهيدروليكي (امتلاء كامل)', fmt(full.R * 1000, 1) + ' مم'], ['مساحة المقطع', fmt(full.A * 1e4, 1) + ' سم²']]),
      checks([{ ok: vOk, text: `سرعة التشغيل ${fmt(part.V, 2)} م/ث`, ref: 'الحدود الشائعة لشبكات الصرف: لا تقل عن 0.6 م/ث للتنظيف الذاتي، ولا تزيد على 3 م/ث لتجنب النحر' }, { ok: null, text: 'معادلة مانينج: V = (1/n) R^(2/3) S^(1/2)، و Q = A × V.' }]));
  }
  calc();
}
