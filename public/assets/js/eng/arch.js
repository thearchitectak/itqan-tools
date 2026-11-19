// أدوات المعماري: السلالم، الانحدار والمنحدرات، نسبة الفتحات، مقياس الرسم، محوّل الوحدات
import { h, ico, select, field, toast } from '../ui.js';
import { codeBar, getCode, N, fmt, num, nf, kpis, checks, table, rowsEditor, layout, sectionTitle, xlsxDownload } from './common.js';
import { STAIRS, RAMPS, OPENINGS, CEILING } from './data.js';

const onAny = (els, fn) => els.forEach(e => { e.addEventListener('input', fn); e.addEventListener('change', fn); });

/* ================= السلالم ================= */
export function stairs(body) {
  let code = getCode();
  const H = num(320), R = num(16.5), T = num(''), W = num(120), flights = select([['2', 'قلبتان بينهما بسطة'], ['1', 'قلبة واحدة مستقيمة'], ['3', 'ثلاث قلبات']], '2');
  const type = h('select', { class: 'input' }), units = num(4), occ = h('input', { type: 'checkbox', checked: true }), slabT = num(15);
  const unitsF = nf('عدد الوحدات في الطابق', units), occF = h('label', { class: 'check' }, occ, 'عدد شاغلي الطابق 50 شخصًا أو أكثر');
  function setCode(c) {
    code = c; type.innerHTML = ''; STAIRS[c].types.forEach(([v, t]) => type.append(h('option', { value: v }, t)));
    unitsF.style.display = c === 'eg' ? '' : 'none'; occF.style.display = c === 'eg' ? 'none' : '';
    typeF.style.display = STAIRS[c].types.length > 1 ? '' : 'none';
    calc();
  }
  const typeF = field('نوع المبنى', type);
  const svg = h('div');
  const ui = layout(body, {
    code: codeBar(setCode),
    inputs: [h('div', { class: 'opts', style: { marginTop: 0 } }, nf('الارتفاع من الطابق إلى الطابق', H, 'سم', 'من سطح التشطيب إلى سطح التشطيب'), nf('ارتفاع القائمة المرغوب', R, 'سم', 'تُضبط تلقائيًا لتتساوى القوائم'), nf('عرض النائمة (اختياري)', T, 'سم', 'اتركه فارغًا ليُحسب بقاعدة الخطوة'), nf('عرض السلم (القلبة)', W, 'سم'), field('شكل السلم', flights), typeF, unitsF, occF, nf('سماكة البلاطة المائلة', slabT, 'سم'))],
  });
  onAny([H, R, T, W, flights, type, units, occ, slabT], calc);
  function calc() {
    const rule = STAIRS[code].rule(type.value, occ.checked);
    const h0 = N(H.value, 0), rp = N(R.value, 16.5), fl = +flights.value;
    if (!(h0 > 0 && rp > 0)) return ui.show(h('div', { class: 'note err' }, 'أدخل الارتفاع وارتفاع القائمة.'));
    let n = Math.max(2, Math.round(h0 / rp));
    while (h0 / n > rule.rMax + 1e-9) n++;
    const r = h0 / n;
    let t = N(T.value, NaN); const auto = !Number.isFinite(t);
    if (auto) t = Math.max(rule.tMin, Math.round((63 - 2 * r) * 2) / 2);
    const treads = n - fl; // كل قلبة تنقص نائمة لأن آخر قائمة تصل إلى البسطة أو الطابق
    const perFlight = Math.ceil(n / fl);
    const run = treads * t, flightRun = (perFlight - 1) * t;
    const pitch = Math.atan(r / t) * 180 / Math.PI;
    const blondel = 2 * r + t;
    const wMin = rule.width(N(units.value, 4));
    const slope = Math.sqrt(r * r + t * t);
    const waist = N(slabT.value, 15);
    const concrete = (fl * (perFlight - 1) * t / 100) * (N(W.value, 0) / 100) * ((waist / 100) * slope / t + r / 200); // البلاطة المائلة + الدرجات
    ui.show(
      kpis([['عدد القوائم', fmt(n, 0), 'قائمة', 'main'], ['ارتفاع القائمة', fmt(r, 2), 'سم', r > rule.rMax ? 'bad' : ''], ['عرض النائمة', fmt(t, 1), 'سم', t < rule.tMin ? 'bad' : ''], ['عدد النوائم', fmt(treads, 0)], ['الطول الأفقي للقلبات', fmt(run / 100, 2), 'م'], ['زاوية الميل', fmt(pitch, 1), '°']]),
      table(['البند', 'القيمة'], [['القوائم في كل قلبة', fl > 1 ? `${perFlight} تقريبًا (المجموع ${n})` : String(n)], ['طول القلبة الواحدة أفقيًا', fmt(flightRun / 100, 2) + ' م'], ['قاعدة الخطوة 2ق + ن', fmt(blondel, 1) + ' سم'], ['طول خط الدرجة المائل لكل درجة', fmt(slope, 1) + ' سم'], ['خرسانة السلم التقريبية (القلبات)', fmt(concrete, 2) + ' م³']]),
      checks([
        { ok: r <= rule.rMax + 1e-9, text: `ارتفاع القائمة ${fmt(r, 2)} سم، والحد الأقصى ${fmt(rule.rMax, 1)} سم`, ref: STAIRS[code].ref },
        rule.rMin ? { ok: r >= rule.rMin, text: `الحد الأدنى للقائمة ${fmt(rule.rMin, 1)} سم` } : null,
        { ok: t >= rule.tMin - 1e-9, text: `عرض النائمة ${fmt(t, 1)} سم، والحد الأدنى ${fmt(rule.tMin, 1)} سم` + (auto ? ' (محسوبة تلقائيًا)' : '') },
        { ok: N(W.value, 0) >= wMin - 1e-9, text: `عرض السلم ${fmt(N(W.value, 0), 0)} سم، والحد الأدنى ${fmt(wMin, 1)} سم` + (code === 'eg' ? ' — ' + STAIRS.eg.widthNote(N(units.value, 4)) : '') },
        { ok: blondel >= 60 && blondel <= 65, text: `قاعدة الخطوة المريحة 2ق + ن = ${fmt(blondel, 1)} سم`, ref: 'يُوصى بأن تكون بين 60 و 65 سم (قاعدة بلونديل)' },
        rule.flightRise ? { ok: perFlight * r <= rule.flightRise, text: `ارتفاع القلبة الواحدة ${fmt(perFlight * r, 0)} سم، والحد الأقصى بين البسطات ${fmt(rule.flightRise, 0)} سم` } : { ok: perFlight <= 16 ? true : null, text: `عدد قوائم القلبة الواحدة ${perFlight}`, ref: 'يُفضَّل ألا تزيد على 16 قائمة في القلبة الواحدة (قيمة إرشادية)' },
        rule.headroom ? { ok: null, text: `الارتفاع الخالي فوق الدرجات لا يقل عن ${fmt(rule.headroom, 1)} سم` } : null,
        { ok: null, text: 'يُراعى ألا يتجاوز الفرق بين أكبر وأصغر قائمة أو نائمة في القلبة 1 سم تقريبًا.' },
      ]), stairSvg(n, r, t, fl));
  }
  setCode(code);
}
function stairSvg(n, r, t, fl) {
  const per = Math.ceil(n / fl), steps = Math.min(per, 30), W = 360, Hh = 200;
  const sx = (W - 40) / (steps * t), sy = (Hh - 30) / (steps * r), s = Math.min(sx, sy);
  let d = `M20 ${Hh - 10}`; let x = 20, y = Hh - 10;
  for (let i = 0; i < steps; i++) { y -= r * s; d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; if (i < steps - 1) { x += t * s; d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; } }
  d += ` L${(x + 30).toFixed(1)} ${y.toFixed(1)}`;
  const wrap = h('div', { style: { marginTop: '10px' } });
  wrap.innerHTML = `<svg class="eng-svg" viewBox="0 0 ${W} ${Hh}" xmlns="http://www.w3.org/2000/svg"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--tool-color)"/></svg>`;
  wrap.append(h('small', { class: 'muted' }, `قطاع تخطيطي في قلبة واحدة: ${per} قائمة بارتفاع ${fmt(r, 1)} سم ونائمة ${fmt(t, 1)} سم`));
  return wrap;
}

/* ================= الانحدار والمنحدرات ================= */
export function rampSlope(body) {
  let code = getCode();
  const pct = num(8.33), ang = num(''), ratio = num(''), rise = num(''), run = num('');
  const rRise = num(90), rWidth = num(120), rLen = num('');
  let lock = false;
  const sync = (src) => {
    if (lock) return; lock = true;
    let p = NaN;
    if (src === 'pct') p = N(pct.value);
    if (src === 'ang') p = Math.tan(N(ang.value) * Math.PI / 180) * 100;
    if (src === 'ratio') p = 100 / N(ratio.value);
    if (src === 'rr') p = N(rise.value) / N(run.value) * 100;
    if (Number.isFinite(p) && p > 0) {
      if (src !== 'pct') pct.value = +p.toFixed(3);
      if (src !== 'ang') ang.value = +(Math.atan(p / 100) * 180 / Math.PI).toFixed(3);
      if (src !== 'ratio') ratio.value = +(100 / p).toFixed(2);
    }
    lock = false; calc();
  };
  pct.oninput = () => sync('pct'); ang.oninput = () => sync('ang'); ratio.oninput = () => sync('ratio'); rise.oninput = () => sync('rr'); run.oninput = () => sync('rr');
  const ui = layout(body, {
    code: codeBar((c) => { code = c; calc(); }),
    inputs: [sectionTitle('محوّل الانحدار', 'triangle-right'), h('p', { class: 'eng-sub' }, 'اكتب أي قيمة لتتحول بقية القيم تلقائيًا.'),
      h('div', { class: 'opts', style: { marginTop: 0 } }, nf('النسبة المئوية', pct, '%'), nf('الزاوية', ang, 'درجة'), nf('النسبة 1 :', ratio, 'أفقي'), nf('فرق المنسوب', rise, 'سم'), nf('المسافة الأفقية', run, 'سم')),
      sectionTitle('منحدر ذوي الإعاقة', 'triangle-right'),
      h('div', { class: 'opts', style: { marginTop: 0 } }, nf('فرق المنسوب المطلوب تجاوزه', rRise, 'سم'), nf('عرض المنحدر', rWidth, 'سم'), nf('الطول الأفقي المتاح (اختياري)', rLen, 'م', 'لمعرفة الميل الناتج والتحقق منه'))],
  });
  onAny([rRise, rWidth, rLen], calc);
  function calc() {
    const k = RAMPS[code], p = N(pct.value, 0);
    const riseCm = N(rRise.value, 0), wid = N(rWidth.value, 0), avail = N(rLen.value, NaN) * 100;
    const minRun = riseCm / k.maxSlope;
    const segs = k.maxRise ? Math.max(1, Math.ceil(riseCm / k.maxRise - 1e-9)) : 1;
    const landings = segs - 1;
    const total = minRun + landings * (k.landing || 150);
    const used = Number.isFinite(avail) && avail > 0 ? riseCm / avail : null;
    ui.show(
      kpis([['الانحدار', fmt(p, 2), '%', 'main'], ['الزاوية', fmt(Math.atan(p / 100) * 180 / Math.PI, 2), '°'], ['النسبة', '1 : ' + fmt(100 / p, 1)], ['الارتفاع لكل 1 م أفقي', fmt(p, 1), 'سم']]),
      sectionTitle('منحدر ذوي الإعاقة'),
      kpis([['أقل طول أفقي للمنحدر', fmt(minRun / 100, 2), 'م', 'main'], ['عدد الأجزاء', fmt(segs, 0)], ['البسطات الوسطية', fmt(landings, 0)], ['الطول الكلي مع البسطات', fmt(total / 100, 2), 'م']]),
      checks([
        { ok: null, text: `أقصى ميل مسموح 1 : 12 (${fmt(k.maxSlope * 100, 2)}%)`, ref: k.ref },
        used != null ? { ok: used <= k.maxSlope + 1e-9, text: `الميل الناتج عن الطول المتاح: ${fmt(used * 100, 2)}% (1 : ${fmt(1 / used, 1)})` } : null,
        { ok: wid >= k.minWidth, text: `عرض المنحدر ${fmt(wid, 0)} سم، والحد الأدنى ${fmt(k.minWidth, 1)} سم` },
        k.maxRise ? { ok: null, text: `ارتفاع كل جزء لا يزيد على ${k.maxRise} سم، وطول البسطة لا يقل عن ${k.landing} سم، ويُضاف درابزين على الجانبين.` } : { ok: null, text: 'يُفضَّل وضع بسطة استراحة كل 9 م تقريبًا، ودرابزين على الجانبين، وسطح مقاوم للانزلاق (قيمة إرشادية).' },
        { ok: null, text: 'منحدرات السيارات: تُصمَّم عادة بميل لا يتجاوز 15% تقريبًا مع منطقة انتقال بنصف الميل عند الطرفين (قيمة إرشادية تختلف حسب اشتراطات الجهة المختصة).' },
      ]));
  }
  sync('pct');
}

/* ================= نسبة الفتحات ================= */
export function openings(body) {
  let code = getCode();
  const types = [['hab', 'غرفة سكنية (نوم، معيشة، استقبال)'], ['srv', 'مرفق (حمام، مطبخ، درج)']];
  const ed = rowsEditor({
    columns: [{ key: 'name', label: 'الفراغ', type: 'text', def: 'غرفة' }, { key: 't', label: 'النوع', type: 'select', options: types, def: 'hab' }, { key: 'l', label: 'الطول (م)', type: 'num' }, { key: 'w', label: 'العرض (م)', type: 'num' }, { key: 'g', label: 'مساحة الزجاج (م²)', type: 'num' }, { key: 'o', label: 'المساحة القابلة للفتح (م²)', type: 'num' }],
    rows: [{ name: 'غرفة النوم الرئيسية', t: 'hab', l: '4.5', w: '4', g: '1.8', o: '0.9' }, { name: 'المعيشة', t: 'hab', l: '6', w: '5', g: '2.2', o: '1.1' }, { name: 'المطبخ', t: 'srv', l: '3.5', w: '3', g: '0.9', o: '0.45' }, { name: 'الحمام', t: 'srv', l: '2.5', w: '1.8', g: '0.36', o: '0.36' }],
    onChange: calc, addLabel: 'إضافة فراغ',
  });
  const ceil = num(300);
  const ui = layout(body, {
    code: codeBar((c) => { code = c; calc(); }), wide: true,
    inputs: [sectionTitle('الفراغات والنوافذ', 'sun-medium'), h('p', { class: 'eng-sub' }, 'مساحة الزجاج تشمل جميع النوافذ والأبواب الزجاجية المطلة على الخارج، والمساحة القابلة للفتح هي الجزء الذي يُفتح فعلًا للتهوية.'), ed.el,
      h('div', { class: 'opts' }, nf('صافي ارتفاع الفراغات', ceil, 'سم'))],
  });
  ceil.oninput = calc;
  let rowsOut = [];
  function calc() {
    const k = OPENINGS[code];
    rowsOut = ed.data.map(r => {
      const A = N(r.l, 0) * N(r.w, 0); if (!(A > 0)) return null;
      const req = r.t === 'srv' ? k.service : k.habitable;
      const g = N(r.g, 0), o = N(r.o, 0), lp = g / A * 100, vp = (k.oneRatio ? g : o) / A * 100;
      const okL = lp >= req.light - 1e-9, okV = vp >= req.vent - 1e-9;
      return { name: r.name, A, lp, vp, req, okL, okV, needG: A * req.light / 100, needO: A * req.vent / 100 };
    }).filter(Boolean);
    const fails = rowsOut.filter(r => !(r.okL && r.okV)).length;
    const c = CEILING[code];
    ui.show(
      kpis([['الفراغات المطابقة', `${rowsOut.length - fails} من ${rowsOut.length}`, '', fails ? 'bad' : 'main'], ['الحد الأدنى للغرف السكنية', k.oneRatio ? `${k.habitable.light}%` : `${k.habitable.light}% إضاءة و${k.habitable.vent}% تهوية`], ['الحد الأدنى للمرافق', k.oneRatio ? `${k.service.light}%` : `${k.service.vent}% تهوية`]]),
      table(k.oneRatio ? ['الفراغ', 'المساحة (م²)', 'نسبة الفتحات', 'المطلوب (م²)', 'الحالة'] : ['الفراغ', 'المساحة (م²)', 'الإضاءة', 'التهوية', 'المطلوب زجاج / فتح (م²)', 'الحالة'],
        rowsOut.map(r => k.oneRatio ? [r.name, fmt(r.A, 2), fmt(r.lp, 1) + '%', fmt(r.needG, 2), r.okL ? '✓ مطابق' : '✕ غير مطابق'] : [r.name, fmt(r.A, 2), fmt(r.lp, 1) + '%', fmt(r.vp, 1) + '%', `${fmt(r.needG, 2)} / ${fmt(r.needO, 2)}`, r.okL && r.okV ? '✓ مطابق' : '✕ غير مطابق'])),
      checks([
        { ok: null, text: 'تُقاس النسبة إلى مساحة أرضية الفراغ نفسه.', ref: k.ref },
        !k.oneRatio ? { ok: null, text: 'في الحمامات والمطابخ يجوز الاستعاضة عن التهوية الطبيعية بتهوية ميكانيكية وفق الكود الميكانيكي، ولا يُشترط فيها حد أدنى للإضاءة الطبيعية.' } : null,
        { ok: N(ceil.value, 0) >= c.min, text: `صافي الارتفاع ${fmt(N(ceil.value, 0), 0)} سم، والحد الأدنى ${c.min} سم`, ref: c.ref },
      ]),
      h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: exportX }, ico('download', 18), 'تنزيل Excel')));
  }
  function exportX() {
    xlsxDownload('openings-check.xlsx', [{ name: 'الفتحات', title: 'التحقق من نسب الفتحات — ' + ({ eg: 'الكود المصري', sa: 'الكود السعودي', intl: 'الكود العالمي' })[code], columns: [{ header: 'الفراغ', width: 22 }, { header: 'المساحة (م²)', width: 13, fmt: '0.00' }, { header: 'الزجاج (م²)', width: 12, fmt: '0.00' }, { header: 'نسبة الإضاءة', width: 13, fmt: '0.0%' }, { header: 'المطلوب', width: 10, fmt: '0%' }, { header: 'الحالة', width: 12 }],
      rows: rowsOut.map(r => [r.name, r.A, r.A * r.lp / 100, (row) => ({ formula: `C${row}/B${row}` }), r.req.light / 100 || r.req.vent / 100, (row) => ({ formula: `IF(D${row}>=E${row},"مطابق","غير مطابق")` })]), notes: [OPENINGS[code].ref] }]);
  }
  calc();
}

/* ================= مقياس الرسم ================= */
const SCALES = [1, 2, 5, 10, 20, 25, 50, 75, 100, 125, 200, 250, 500, 1000, 1250, 2000, 2500, 5000, 10000];
const PAPERS = { A0: [1189, 841], A1: [841, 594], A2: [594, 420], A3: [420, 297], A4: [297, 210] };
export function scale(body) {
  const sc = num(100), dLen = num(25), dUnit = select([['mm', 'مم'], ['cm', 'سم']], 'mm'), rLen = num(''), rUnit = select([['m', 'م'], ['cm', 'سم'], ['mm', 'مم']], 'm');
  const fD = num(42), fDU = select([['mm', 'مم'], ['cm', 'سم']], 'mm'), fR = num(4.2), fRU = select([['m', 'م'], ['cm', 'سم']], 'm');
  const bL = num(24), bW = num(16), paper = select(Object.keys(PAPERS), 'A3'), margin = num(20);
  const toMm = (v, u) => v * ({ mm: 1, cm: 10, m: 1000 })[u];
  let lock = false;
  const fromDraw = () => { if (lock) return; lock = true; const r = toMm(N(dLen.value, 0), dUnit.value) * N(sc.value, 1); rLen.value = r ? +(r / toMm(1, rUnit.value)).toFixed(4) : ''; lock = false; calc(); };
  const fromReal = () => { if (lock) return; lock = true; const d = toMm(N(rLen.value, 0), rUnit.value) / N(sc.value, 1); dLen.value = d ? +(d / toMm(1, dUnit.value)).toFixed(3) : ''; lock = false; calc(); };
  [sc, dLen, dUnit, rUnit].forEach(e => { e.addEventListener('input', fromDraw); e.addEventListener('change', fromDraw); });
  rLen.addEventListener('input', fromReal);
  onAny([fD, fDU, fR, fRU, bL, bW, paper, margin], calc);
  const ui = layout(body, {
    inputs: [sectionTitle('التحويل بين الرسم والطبيعة', 'pencil-ruler'), h('div', { class: 'opts', style: { marginTop: 0 } }, nf('مقياس الرسم 1 :', sc), h('label', { class: 'field' }, h('span', {}, 'الطول على الرسم'), h('div', { class: 'unit-in' }, dLen, dUnit)), h('label', { class: 'field' }, h('span', {}, 'الطول في الطبيعة'), h('div', { class: 'unit-in' }, rLen, rUnit))),
      sectionTitle('معرفة مقياس رسم مجهول', 'crosshair'), h('div', { class: 'opts', style: { marginTop: 0 } }, h('label', { class: 'field' }, h('span', {}, 'طول مقيس على الرسم'), h('div', { class: 'unit-in' }, fD, fDU)), h('label', { class: 'field' }, h('span', {}, 'طوله الحقيقي المعروف'), h('div', { class: 'unit-in' }, fR, fRU))),
      sectionTitle('المقياس المناسب للورقة', 'maximize'), h('div', { class: 'opts', style: { marginTop: 0 } }, nf('طول المبنى أو المسقط', bL, 'م'), nf('عرضه', bW, 'م'), field('مقاس الورقة', paper), nf('الهامش من كل جانب', margin, 'مم'))],
  });
  function calc() {
    const found = toMm(N(fR.value, 0), fRU.value) / toMm(N(fD.value, 0), fDU.value);
    const near = SCALES.reduce((a, b) => Math.abs(b - found) < Math.abs(a - found) ? b : a, SCALES[0]);
    const [pw, ph] = PAPERS[paper.value], m = N(margin.value, 0) * 2, L = N(bL.value, 0) * 1000, Wd = N(bW.value, 0) * 1000;
    const fit = (s) => { const a = L / s, b = Wd / s; return (a <= pw - m && b <= ph - m) || (a <= ph - m && b <= pw - m); };
    const best = SCALES.find(fit);
    ui.show(
      kpis([['الطول في الطبيعة', `${rLen.value || '—'}`, rUnit.selectedOptions[0].textContent, 'main'], ['الطول على الرسم', `${dLen.value || '—'}`, dUnit.selectedOptions[0].textContent], ['1 سم على الرسم يساوي', fmt(N(sc.value, 1) / 100, 3), 'م']]),
      sectionTitle('المقياس المجهول'),
      kpis([['المقياس المحسوب', Number.isFinite(found) ? '1 : ' + fmt(found, 1) : '—', '', 'main'], ['أقرب مقياس قياسي', Number.isFinite(found) ? '1 : ' + near : '—']]),
      sectionTitle('المقياس المناسب للورقة'),
      kpis([[`أكبر مقياس يناسب ${paper.value}`, best ? '1 : ' + best : 'لا يوجد', '', best ? 'main' : 'bad'], best ? ['أبعاد الرسم على الورقة', `${fmt(L / best, 0)} × ${fmt(Wd / best, 0)}`, 'مم'] : null]),
      table(['المقياس', 'أبعاد الرسم (مم)', `يناسب ${paper.value}`], [20, 25, 50, 75, 100, 200, 250, 500].map(s => [`1 : ${s}`, `${fmt(L / s, 0)} × ${fmt(Wd / s, 0)}`, fit(s) ? '✓' : '✕'])));
  }
  fromDraw();
}

/* ================= محوّل الوحدات ================= */
const UNITS = {
  length: { t: 'الطول', u: [['m', 'متر', 1], ['cm', 'سنتيمتر', 0.01], ['mm', 'مليمتر', 0.001], ['km', 'كيلومتر', 1000], ['in', 'بوصة', 0.0254], ['ft', 'قدم', 0.3048], ['yd', 'ياردة', 0.9144], ['mi', 'ميل', 1609.344]] },
  area: { t: 'المساحة', u: [['m2', 'متر مربع', 1], ['cm2', 'سنتيمتر مربع', 1e-4], ['km2', 'كيلومتر مربع', 1e6], ['ha', 'هكتار', 1e4], ['dunam', 'دونم', 1000], ['feddan', 'فدان مصري', 4200.83], ['qirat', 'قيراط مصري', 4200.83 / 24], ['sahm', 'سهم مصري', 4200.83 / 576], ['acre', 'إيكر (أكر)', 4046.8564224], ['ft2', 'قدم مربع', 0.09290304], ['yd2', 'ياردة مربعة', 0.83612736]] },
  volume: { t: 'الحجم', u: [['m3', 'متر مكعب', 1], ['L', 'لتر', 0.001], ['cm3', 'سنتيمتر مكعب', 1e-6], ['ft3', 'قدم مكعب', 0.028316846592], ['yd3', 'ياردة مكعبة', 0.764554857984], ['gal', 'جالون أمريكي', 0.003785411784], ['igal', 'جالون إمبراطوري', 0.00454609]] },
  mass: { t: 'الكتلة', u: [['kg', 'كيلوجرام', 1], ['g', 'جرام', 0.001], ['t', 'طن متري', 1000], ['lb', 'رطل (باوند)', 0.45359237], ['kip', 'كيب (1000 رطل)', 453.59237], ['sht', 'طن أمريكي قصير', 907.18474]] },
  force: { t: 'القوة', u: [['kN', 'كيلونيوتن', 1], ['N', 'نيوتن', 0.001], ['tf', 'طن قوة', 9.80665], ['kgf', 'كيلوجرام قوة', 0.00980665], ['lbf', 'رطل قوة', 0.0044482216], ['kipf', 'كيب', 4.4482216]] },
  stress: { t: 'الإجهاد والضغط', u: [['MPa', 'ميجاباسكال (نيوتن/مم²)', 1], ['kPa', 'كيلوباسكال (كيلونيوتن/م²)', 0.001], ['Pa', 'باسكال', 1e-6], ['kgcm2', 'كجم/سم²', 0.0980665], ['tm2', 'طن/م²', 0.00980665], ['bar', 'بار', 0.1], ['psi', 'رطل/بوصة² (psi)', 0.006894757], ['ksi', 'كيب/بوصة² (ksi)', 6.894757], ['psf', 'رطل/قدم² (psf)', 0.0000478803]] },
  line: { t: 'الحمل الخطي', u: [['kNm', 'كيلونيوتن/م', 1], ['tm', 'طن/م', 9.80665], ['kgm', 'كجم/م', 0.00980665], ['plf', 'رطل/قدم', 0.01459390], ['klf', 'كيب/قدم', 14.5939]] },
  moment: { t: 'العزم', u: [['kNm', 'كيلونيوتن.م', 1], ['tm', 'طن.م', 9.80665], ['kgcm', 'كجم.سم', 0.0000980665], ['lbft', 'رطل.قدم', 0.0013558179], ['kipft', 'كيب.قدم', 1.3558179]] },
  density: { t: 'الكثافة ووزن الوحدة', u: [['kgm3', 'كجم/م³', 1], ['tm3', 'طن/م³', 1000], ['gcm3', 'جم/سم³', 1000], ['pcf', 'رطل/قدم³', 16.018463]] },
};
export function units(body) {
  const cat = select(Object.entries(UNITS).map(([k, v]) => [k, v.t]), 'length');
  const val = num(1), from = h('select', { class: 'input' });
  const fill = () => { from.innerHTML = ''; UNITS[cat.value].u.forEach(([id, t]) => from.append(h('option', { value: id }, t))); if (cat.value === 'area') from.value = 'feddan'; calc(); };
  cat.onchange = fill; onAny([val, from], calc);
  const ui = layout(body, { inputs: [h('div', { class: 'opts', style: { marginTop: 0 } }, field('نوع الكمية', cat), nf('القيمة', val), field('من وحدة', from))], intro: 'الفدان المصري = 24 قيراطًا = 4200.83 م²، والقيراط = 24 سهمًا = 175.03 م²، والدونم = 1000 م².' });
  function calc() {
    const U = UNITS[cat.value], f = U.u.find(x => x[0] === from.value), v = N(val.value, NaN);
    if (!f || !Number.isFinite(v)) return ui.show(h('div', { class: 'note err' }, 'أدخل قيمة صحيحة.'));
    const base = v * f[2];
    const rows = U.u.filter(x => x[0] !== f[0]).map(([id, t, k]) => {
      const out = base / k; const s = Math.abs(out) >= 1e6 || (Math.abs(out) < 1e-4 && out !== 0) ? out.toExponential(4) : fmt(out, 6);
      const copy = h('button', { type: 'button', class: 'icon-btn', title: 'نسخ' }, ico('copy', 14)); copy.onclick = () => navigator.clipboard?.writeText(String(+out.toPrecision(10))).then(() => toast('نُسخت القيمة.'));
      return [t, h('b', { style: { direction: 'ltr', display: 'inline-block' } }, s), copy];
    });
    let extra = null;
    if (cat.value === 'area') { const fd = base / 4200.83, F = Math.floor(fd + 1e-9), qr = (fd - F) * 24, Q = Math.floor(qr + 1e-9), S = (qr - Q) * 24; extra = kpis([['بالتقسيم المصري', `${F} ف  ${Q} ط  ${fmt(S, 2)} س`, '', 'main']]); }
    ui.show(kpis([[`${fmt(v, 6)} ${f[1]}`, fmt(base, 6), U.u[0][1], 'main']]), extra, table(['الوحدة', 'القيمة', ''], rows));
  }
  fill();
}
