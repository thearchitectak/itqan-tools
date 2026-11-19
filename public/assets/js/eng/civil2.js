// حساب الأحمال، تصميم الأعمدة، تصميم القواعد المنفصلة
import { h, ico, select, field, toast, download } from '../ui.js';
import { codeBar, getCode, N, fmt, num, nf, kpis, checks, table, rowsEditor, layout, sectionTitle, store, boqButton } from './common.js';
import { MIXES, barKg } from './data.js';
import { liveFor, WALLS, combo, defaultLoads, designColumn, designFooting, columnSvg, footingSvg, colBars } from './struct.js';

const onAny = (els, fn) => els.forEach(e => { e.addEventListener('input', fn); e.addEventListener('change', fn); });
const grades = (code) => code === 'eg' ? [['400', 'B400'], ['420', 'B420DWR'], ['500', 'B500'], ['350', 'B350DWR'], ['240', 'B240']] : [['420', 'Grade 60 (420)'], ['520', 'Grade 75 (520)'], ['280', 'Grade 40 (280)']];
const fcLabel = (code) => code === 'eg' ? 'مقاومة الخرسانة المكعبية fcu' : "مقاومة الخرسانة الأسطوانية f'c";
const fcDef = (code) => code === 'eg' ? 25 : 28;

// عرض رسم SVG مع أزرار التنزيل
export function svgBlock(svg, name) {
  if (!svg) return null;
  const box = h('div', { class: 'eng-draw', html: svg });
  const dl = (kind) => {
    if (kind === 'svg') return download(new Blob([svg], { type: 'image/svg+xml' }), name + '.svg');
    const img = new Image(); const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => { const vb = svg.match(/viewBox="0 0 (\d+) (\d+)"/); const w = +vb[1] * 3, hh = +vb[2] * 3; const c = document.createElement('canvas'); c.width = w; c.height = hh; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, hh); g.drawImage(img, 0, 0, w, hh); c.toBlob(b => download(b, name + '.png'), 'image/png'); URL.revokeObjectURL(url); };
    img.src = url;
  };
  return h('div', {}, box, h('div', { class: 'actions', style: { marginTop: '8px' } }, h('button', { type: 'button', class: 'btn light sm', onclick: () => dl('png') }, ico('download', 16), 'PNG'), h('button', { type: 'button', class: 'btn light sm', onclick: () => dl('svg') }, ico('download', 16), 'SVG')));
}

/* ================= حساب الأحمال ================= */
export function loads(body) {
  let code = getCode();
  const slabT = num(15), slabMode = select([['solid', 'بلاطة مصمتة (حسب السماكة)'], ['custom', 'وزن ذاتي أُدخله مباشرة']], 'solid'), slabW = num(4);
  const fin = num(1.5), part = num(1.5), occ = h('select', { class: 'input' }), liveIn = num(''), floorA = num(150), floors = num(4), roofOcc = h('select', { class: 'input' });
  const useWalls = h('input', { type: 'checkbox' });
  const walls = rowsEditor({
    columns: [{ key: 't', label: 'نوع الحائط', type: 'select', options: WALLS.map(w => [w[0], w[1]]), def: 'brick-h' }, { key: 'th', label: 'السماكة (سم)', type: 'num', def: '25' }, { key: 'hh', label: 'الارتفاع (م)', type: 'num', def: '2.8' }, { key: 'len', label: 'الطول في الطابق (م)', type: 'num', def: '' }],
    rows: [{ t: 'brick-h', th: '25', hh: '2.8', len: '40' }, { t: 'brick-h', th: '12', hh: '2.8', len: '35' }], onChange: calc, addLabel: 'إضافة نوع حائط',
  });
  const wallBox = h('div', { style: { display: 'none', marginTop: '10px' } }, walls.el);
  useWalls.onchange = () => { wallBox.style.display = useWalls.checked ? '' : 'none'; partF.style.display = useWalls.checked ? 'none' : ''; calc(); };
  const partF = nf('القواطع والحوائط (حمل مكافئ موزع)', part, 'كيلونيوتن/م²', 'قيمة شائعة: 1.0 إلى 1.5 للمباني السكنية');
  function setCode(c) {
    code = c; const lv = liveFor(c);
    occ.innerHTML = ''; lv.list.forEach(([id, t, v]) => occ.append(h('option', { value: id }, `${t} — ${v} كن/م²`)));
    roofOcc.innerHTML = ''; lv.list.filter(x => x[0].startsWith('roof')).forEach(([id, t, v]) => roofOcc.append(h('option', { value: id }, `${t} — ${v} كن/م²`)));
    part.value = c === 'eg' ? 1.5 : 1.0;
    calc();
  }
  const ui = layout(body, {
    code: codeBar(setCode),
    inputs: [
      sectionTitle('الأحمال الميتة', 'weight'),
      h('div', { class: 'opts', style: { marginTop: 0 } }, field('البلاطة', slabMode), nf('سماكة البلاطة', slabT, 'سم'), nf('الوزن الذاتي للبلاطة', slabW, 'كيلونيوتن/م²', 'للبلاطات المفرغة (الهوردي) أو غيرها'), nf('التشطيبات (بلاط ومونة ورمل)', fin, 'كيلونيوتن/م²', 'قيمة شائعة: 1.5'), partF),
      h('label', { class: 'check', style: { marginTop: '12px' } }, useWalls, 'حساب الحوائط بالتفصيل بدل الحمل المكافئ'), wallBox,
      sectionTitle('الأحمال الحية', 'boxes'),
      h('div', { class: 'opts', style: { marginTop: 0 } }, field('استخدام الطابق', occ), nf('قيمة مخصصة (اختياري)', liveIn, 'كيلونيوتن/م²'), field('السطح الأخير', roofOcc)),
      sectionTitle('المبنى', 'building-2'),
      h('div', { class: 'opts', style: { marginTop: 0 } }, nf('مساحة الطابق', floorA, 'م²'), nf('عدد الطوابق المتكررة', floors, '', 'السطح يُحسب بحمله الحي الخاص')),
    ],
  });
  onAny([slabT, slabMode, slabW, fin, part, occ, liveIn, floorA, floors, roofOcc], calc);
  function calc() {
    const A = N(floorA.value, 0), nF = Math.max(0, N(floors.value, 0));
    const sw = slabMode.value === 'solid' ? N(slabT.value, 0) / 100 * 25 : N(slabW.value, 0);
    let wallEq = N(part.value, 0), wallRows = [];
    if (useWalls.checked) {
      wallRows = walls.data.map(r => { const w = WALLS.find(x => x[0] === r.t) || WALLS[0]; const lineL = (N(r.th, 0) / 100 * w[2] + 0.8) * N(r.hh, 0); return { name: w[1], lineL, tot: lineL * N(r.len, 0) }; });
      wallEq = A > 0 ? wallRows.reduce((s, r) => s + r.tot, 0) / A : 0;
    }
    const D = sw + N(fin.value, 0) + wallEq;
    const lv = liveFor(code).list, L = N(liveIn.value, NaN) > 0 ? N(liveIn.value) : (lv.find(x => x[0] === occ.value)?.[2] ?? 2);
    const Lr = lv.find(x => x[0] === roofOcc.value)?.[2] ?? 1;
    const c = combo(code, D, L), cr = combo(code, D - wallEq, Lr);
    const floorS = (D + L) * A, floorU = c.wu * A, roofS = (D - wallEq + Lr) * A, roofU = cr.wu * A;
    const totS = floorS * nF + roofS, totU = floorU * nF + roofU;
    store.set('loads', { code, D, L, ws: D + L, wu: c.wu, floors: nF + 1 });
    ui.show(
      kpis([['الحمل الميت D', fmt(D, 2), 'كن/م²'], ['الحمل الحي L', fmt(L, 2), 'كن/م²'], ['حمل التشغيل D + L', fmt(D + L, 2), 'كن/م²'], ['الحمل التصميمي المصعّد', fmt(c.wu, 2), 'كن/م²', 'main']]),
      table(['البند', 'القيمة'], [
        ['الوزن الذاتي للبلاطة', fmt(sw, 2) + ' كن/م²'], ['التشطيبات', fmt(N(fin.value, 0), 2) + ' كن/م²'], [useWalls.checked ? 'الحوائط (محوّلة إلى حمل موزع)' : 'القواطع (حمل مكافئ)', fmt(wallEq, 2) + ' كن/م²'],
        ['تركيبة الأحمال', c.rule], ['حمل الطابق الواحد (تشغيل / مصعّد)', `${fmt(floorS, 0)} / ${fmt(floorU, 0)} كن`], ['حمل السطح (تشغيل / مصعّد)', `${fmt(roofS, 0)} / ${fmt(roofU, 0)} كن`],
        ['إجمالي حمل المبنى على الأساسات (تشغيل)', `${fmt(totS, 0)} كن ≈ ${fmt(totS / 9.81, 0)} طن`], ['إجمالي الحمل المصعّد', `${fmt(totU, 0)} كن`],
      ]),
      useWalls.checked && wallRows.length ? table(['الحائط', 'الحمل الخطي (كن/م)', 'الإجمالي (كن)'], wallRows.map(r => [r.name, fmt(r.lineL, 2), fmt(r.tot, 0)])) : null,
      checks([{ ok: null, text: `قيم الأحمال الحية من ${liveFor(code).ref}.` }, { ok: null, text: `تركيبة الأحمال: ${c.rule}`, ref: c.ref }, { ok: null, text: 'وزن الحائط = (السماكة × وزن الوحدة + 0.8 للبياض على الوجهين) × الارتفاع، وكثافة الخرسانة المسلحة 25 كن/م³.' }, { ok: null, text: 'لا تشمل الحسابات أحمال الرياح والزلازل، وتلزم مراجعتها للمباني المرتفعة.' }]),
      h('div', { class: 'actions' }, h('a', { class: 'btn', href: '#/tool/col-layout' }, ico('grid-3x3', 18), 'استخدمها في توزيع الأعمدة'), h('a', { class: 'btn light', href: '#/tool/col-design' }, 'تصميم عمود')));
  }
  setCode(code);
}

/* ================= تصميم العمود ================= */
export function colDesign(body) {
  let code = getCode();
  const L0 = store.get('loads', null);
  const mode = select([['direct', 'أُدخل الحمل المصعّد مباشرة'], ['area', 'أحسبه من مساحة التحميل']], 'area');
  const Pu = num(1500), trib = num(16), floors = num(L0?.floors || 5), wu = num(L0 && L0.code === code ? +L0.wu.toFixed(2) : defaultLoads(code).wu.toFixed(2));
  const fc = num(fcDef(code)), fy = h('select', { class: 'input' }), shape = select([['rect', 'مستطيل بعرض ثابت'], ['sq', 'مربع'], ['circ', 'دائري']], 'rect'), b = num(code === 'eg' ? 250 : 300), rho = num(1), H = num(2.7), cover = num(40);
  const fcF = nf('', fc, 'ميجاباسكال');
  const pF = nf('الحمل المصعّد على العمود Pu', Pu, 'كيلونيوتن'), aF = h('div', { class: 'opts', style: { marginTop: 0 } }, nf('مساحة التحميل', trib, 'م²'), nf('عدد الأسقف المحمولة', floors), nf('الحمل المصعّد للمتر', wu, 'كن/م²', 'من أداة حساب الأحمال'));
  mode.onchange = () => { pF.style.display = mode.value === 'direct' ? '' : 'none'; aF.style.display = mode.value === 'area' ? '' : 'none'; calc(); };
  function setCode(c) { code = c; fy.innerHTML = ''; grades(c).forEach(([v, t]) => fy.append(h('option', { value: v }, t))); fc.value = fcDef(c); fcF.firstChild.textContent = fcLabel(c); b.value = c === 'eg' ? 250 : 300; const l = store.get('loads', null); wu.value = l && l.code === c ? +l.wu.toFixed(2) : defaultLoads(c).wu.toFixed(2); calc(); }
  const ui = layout(body, {
    code: codeBar(setCode),
    inputs: [sectionTitle('الحمل', 'weight'), field('طريقة إدخال الحمل', mode), pF, aF,
      sectionTitle('القطاع والمواد', 'columns-3'), h('div', { class: 'opts', style: { marginTop: 0 } }, field('شكل القطاع', shape), nf('العرض الثابت (أو أقل بُعد)', b, 'مم', 'غالبًا بعرض الحائط'), fcF, field('رتبة الصلب', fy), nf('نسبة الحديد المستهدفة', rho, '%'), nf('الارتفاع الصافي للعمود', H, 'م'), nf('الغطاء الخرساني حتى الكانة', cover, 'مم'))],
  });
  onAny([Pu, trib, floors, wu, fc, fy, shape, b, rho, H, cover], calc); mode.onchange();
  function calc() {
    const P = mode.value === 'direct' ? N(Pu.value, 0) : N(trib.value, 0) * N(floors.value, 0) * N(wu.value, 0) * 1.05;
    if (!(P > 0)) return ui.show(h('div', { class: 'note info' }, 'أدخل الحمل.'));
    const c = designColumn({ code, Pu: P, fc: N(fc.value, 25), fy: +fy.value, b: N(b.value, 250), shape: shape.value, rho: N(rho.value, 1), cover: N(cover.value, 40), H: N(H.value, 2.7) });
    const mix = MIXES[code].list[0];
    const vol = (c.shape === 'circ' ? Math.PI * c.b * c.b / 4 : c.b * c.h) / 1e6 * (N(H.value, 2.7) + 0.5);
    const steel = c.pick ? c.pick.n * barKg(code, c.pick.bar.id) * (N(H.value, 2.7) + 0.5 + 0.8) : 0;
    const perim = c.shape === 'circ' ? Math.PI * (c.b - 2 * c.cover) : 2 * (c.b + c.h - 4 * c.cover);
    const ties = c.s ? Math.ceil(N(H.value, 2.7) * 1000 / c.s) + 1 : 0, tieKg = ties * (perim + 200) / 1000 * barKg(code, c.dt);
    ui.show(
      kpis([['القطاع', c.shape === 'circ' ? `قطر ${c.b}` : `${c.b} × ${c.h}`, 'مم', 'main'], ['الحديد الطولي', c.pick ? `${c.pick.n} ${c.pick.bar.label}` : 'غير متاح', '', c.pick ? '' : 'bad'], ['الكانات', c.pick ? `Φ${c.dt} كل ${c.s} مم` : '—'], ['نسبة الحديد', fmt(c.rho * 100, 2), '%'], ['الحمل المصعّد', fmt(P, 0), 'كن'], ['مقاومة القطاع', fmt(c.cap, 0), 'كن', c.ok ? '' : 'bad']]),
      svgBlock(columnSvg(c, 'C1'), 'column-C1'),
      checks([
        { ok: c.ok, text: `مقاومة القطاع ${fmt(c.cap, 0)} كن ≥ الحمل ${fmt(P, 0)} كن`, ref: c.formula },
        { ok: c.rho >= c.rmin - 1e-9 && c.rho <= c.rmax + 1e-9, text: `نسبة الحديد ${fmt(c.rho * 100, 2)}% بين ${c.rmin * 100}% و ${c.rmax * 100}%` },
        c.pick ? { ok: true, text: `المسافة الصافية بين الأسياخ ${fmt(c.pick.lay.clear, 0)} مم (لا تقل عن ${fmt(Math.max(40, 1.5 * c.pick.bar.d), 0)} مم)` } : { ok: false, text: 'تعذّر توزيع الحديد داخل القطاع؛ زِد أبعاد العمود.' },
        c.pick ? { ok: null, text: `تباعد الكانات = ${c.sRule}.` } : null,
        c.crossTies ? { ok: null, text: 'المسافة الصافية بين بعض الأسياخ أكبر من 150 مم، فيلزم ربطها بكانات داخلية أو روابط عرضية.' } : null,
        { ok: c.slender.val <= c.slender.lim, text: `${c.slender.txt} = ${fmt(c.slender.val, 1)} (الحد ${c.slender.lim} للعمود القصير المقيد)`, ref: c.slender.val > c.slender.lim ? 'العمود نحيف: يلزم حساب تكبير العزوم أو زيادة البعد الأصغر.' : null },
        { ok: null, text: 'التصميم محوري للأعمدة الداخلية؛ أعمدة الأطراف والأركان تتعرض لعزوم وتحتاج إلى تصميم بالعزم.' },
      ]),
      sectionTitle('الخرسانة والكميات لكل طابق', 'cuboid'),
      table(['البند', 'القيمة'], [['الخلطة المقترحة', mix.label], ['حجم خرسانة العمود (شامل الاتصال بالسقف)', fmt(vol, 3) + ' م³'], ['الأسمنت', fmt(vol * mix.cement, 0) + ' كجم'], ['الحديد الطولي (مع وصلة التراكب)', fmt(steel, 1) + ' كجم'], ['الكانات', `${ties} كانة ≈ ${fmt(tieKg, 1)} كجم`]]),
      h('div', { class: 'actions' }, ...boqButton(() => [{ section: 'أعمال الخرسانة', desc: `خرسانة مسلحة لعمود ${c.b}×${c.h} مم (لطابق واحد)`, unit: 'م³', qty: vol }, { section: 'أعمال حديد التسليح', desc: 'حديد أعمدة (طولي وكانات) لطابق واحد', unit: 'طن', qty: (steel + tieKg) / 1000 }])));
  }
  setCode(code);
}

/* ================= تصميم القواعد المنفصلة ================= */
export function footings(body) {
  let code = getCode();
  const c1 = num(code === 'eg' ? 250 : 300), c2 = num(550), P = num(1000), Pu = num(1450), q = num(150), fc = num(fcDef(code)), fy = h('select', { class: 'input' });
  const cover = num(75), pcT = num(20), pcP = num(15), minH = num(400), colBar = h('select', { class: 'input' }), colN = num(10);
  const fcF = nf('', fc, 'ميجاباسكال'), pcBox = h('div', { class: 'opts' }, nf('سماكة الخرسانة العادية', pcT, 'سم'), nf('بروز الخرسانة العادية', pcP, 'سم'));
  function setCode(c) {
    code = c; fy.innerHTML = ''; grades(c).forEach(([v, t]) => fy.append(h('option', { value: v }, t))); fc.value = fcDef(c); fcF.firstChild.textContent = fcLabel(c);
    colBar.innerHTML = ''; colBars(c).forEach(b => colBar.append(h('option', { value: b.d }, b.label))); colBar.value = String(colBars(c).find(b => b.id >= 16)?.d || colBars(c)[0].d);
    pcBox.style.display = c === 'eg' ? '' : 'none'; minH.value = c === 'eg' ? 400 : 300; calc();
  }
  const ui = layout(body, {
    code: codeBar(setCode),
    inputs: [sectionTitle('العمود والأحمال', 'weight'), h('div', { class: 'opts', style: { marginTop: 0 } }, nf('بُعد العمود الأول', c1, 'مم'), nf('بُعد العمود الثاني', c2, 'مم'), nf('حمل التشغيل P (ميت + حي)', P, 'كيلونيوتن'), nf('الحمل المصعّد Pu', Pu, 'كيلونيوتن'), nf('جهد التربة المسموح', q, 'كن/م²', 'من تقرير التربة؛ 100 كن/م² ≈ 1 كجم/سم²'), field('أشاير العمود', colBar), nf('عدد الأشاير', colN)),
      sectionTitle('المواد والتفاصيل', 'settings'), h('div', { class: 'opts', style: { marginTop: 0 } }, fcF, field('رتبة الصلب', fy), nf('الغطاء الخرساني', cover, 'مم'), nf('أقل سماكة للقاعدة', minH, 'مم')), pcBox],
  });
  onAny([c1, c2, P, Pu, q, fc, fy, cover, pcT, pcP, minH, colBar, colN], calc);
  function calc() {
    const f = designFooting({ code, c1: N(c1.value, 300), c2: N(c2.value, 300), P: N(P.value, 0), Pu: N(Pu.value, 0), q: N(q.value, 150), fc: N(fc.value, 25), fy: +fy.value, cover: N(cover.value, 75), pcT: N(pcT.value, 0) / 100, pcProj: N(pcP.value, 0) / 100, minH: N(minH.value, 300), colBar: +colBar.value, colN: N(colN.value, 8) });
    if (!(N(P.value) > 0 && N(Pu.value) > 0)) return ui.show(h('div', { class: 'note info' }, 'أدخل الأحمال.'));
    if (!f.ok) return ui.show(h('div', { class: 'note err' }, 'تعذّر الوصول إلى سماكة مناسبة؛ راجع الأحمال أو جهد التربة.'));
    const vol = f.Bx * f.By * f.h / 1000, pcVol = f.usePC ? f.pcBx * f.pcBy * f.pcT : f.Bx * f.By * 0.1;
    const steel = (f.rx.n * (f.Bx - 0.15 + 0.4) * barKg(code, f.rx.bar.id) + f.ry.n * (f.By - 0.15 + 0.4) * barKg(code, f.ry.bar.id));
    ui.show(
      kpis([['أبعاد القاعدة المسلحة', `${f.Bx.toFixed(2)} × ${f.By.toFixed(2)}`, 'م', 'main'], ['السماكة', fmt(f.h, 0), 'مم', 'main'], f.usePC ? ['الخرسانة العادية', `${f.pcBx.toFixed(2)} × ${f.pcBy.toFixed(2)}`, 'م'] : null, ['الحديد السفلي (الاتجاه الأول)', `${f.rx.n} ${f.rx.bar.label}`], ['الحديد السفلي (الاتجاه الثاني)', `${f.ry.n} ${f.ry.bar.label}`], ['جهد التربة الفعلي', fmt(f.qs, 1), 'كن/م²', f.qs > N(q.value) * 1.001 ? 'bad' : '']]),
      svgBlock(footingSvg(f, 'F1', 'C1'), 'footing-F1'),
      table(['البند', 'المحسوب', 'المسموح أو المطلوب'], [
        ['المساحة اللازمة (مع 10% للوزن الذاتي والردم)', fmt(f.A, 2) + ' م²', fmt(f.usePC ? f.pcBx * f.pcBy : f.Bx * f.By, 2) + ' م² مُنفَّذة'],
        ['الضغط الصافي المصعّد على القاعدة', fmt(f.qu, 1) + ' كن/م²', ''],
        ['إجهاد الثقب', fmt(f.vp, 3) + ' ميجاباسكال', fmt(f.vpCap, 3) + ' ميجاباسكال'],
        ['القص في الاتجاه الأول', fmt(f.sx.v, 3) + ' ميجاباسكال', fmt(f.sx.cap, 3) + ' ميجاباسكال'],
        ['القص في الاتجاه الثاني', fmt(f.sy.v, 3) + ' ميجاباسكال', fmt(f.sy.cap, 3) + ' ميجاباسكال'],
        ['العزم عند وجه العمود (الاتجاه الأول)', fmt(f.fx.Mu, 1) + ' كن.م', `حديد مطلوب ${fmt(f.fx.As, 0)} مم² / مُنفَّذ ${fmt(f.rx.As, 0)} مم²`],
        ['العزم عند وجه العمود (الاتجاه الثاني)', fmt(f.fy.Mu, 1) + ' كن.م', `حديد مطلوب ${fmt(f.fy.As, 0)} مم² / مُنفَّذ ${fmt(f.ry.As, 0)} مم²`],
        ['تباعد الحديد', `${f.rx.s} و ${f.ry.s} مم`, ''], f.ldc ? ['طول التماسك في الضغط للأشاير', fmt(f.ldc, 0) + ' مم', `العمق الفعال ${fmt(f.d, 0)} مم`] : null,
      ].filter(Boolean)),
      checks([
        { ok: f.qs <= N(q.value) * 1.001, text: `جهد التربة الفعلي ${fmt(f.qs, 1)} ≤ المسموح ${fmt(N(q.value), 0)} كن/م²` },
        { ok: true, text: 'السماكة تحقق الثقب والقص في الاتجاهين والانحناء.', ref: f.pRule },
        code === 'eg' ? { ok: null, text: 'القص في اتجاه واحد عند d/2 من وجه العمود، وقيمة qcu = 0.16√(fcu/γc) للقواعد دون تسليح قص.', ref: 'ECP 203' } : { ok: null, text: 'القص في اتجاه واحد عند d من وجه العمود بمعادلة ACI 318-19 التي تراعي نسبة الحديد ومعامل الحجم.', ref: 'ACI 318-19 الجدول 22.5.5.1 — SBC 304' },
        { ok: null, text: 'القاعدة مصممة لحمل محوري دون عزوم؛ عند وجود لامركزية أو تداخل مع قاعدة مجاورة تلزم قاعدة مشتركة أو شدادات.' },
      ]),
      h('div', { class: 'actions' }, ...boqButton(() => [{ section: 'أعمال الخرسانة', desc: f.usePC ? 'خرسانة عادية أسفل القواعد' : 'خرسانة نظافة أسفل القواعد', unit: 'م³', qty: pcVol }, { section: 'أعمال الخرسانة', desc: `خرسانة مسلحة لقاعدة ${f.Bx.toFixed(2)}×${f.By.toFixed(2)}×${(f.h / 1000).toFixed(2)} م`, unit: 'م³', qty: vol }, { section: 'أعمال حديد التسليح', desc: 'حديد قواعد', unit: 'طن', qty: steel / 1000 }])));
  }
  setCode(code);
}
