// أدوات PDF الهندسية: مقارنة نسختين من المخطط، والقياس على المخطط
import { h, ico, toast, libs, download, dropzone, progressBar, readArrayBuffer, select, field, baseName } from '../ui.js';
import { N, fmt, num, nf, kpis, checks, layout, sectionTitle, xlsxDownload } from './common.js';
import { supportNudge } from '../profile.js';

async function openPdf(bytes) { const pdfjs = await libs.pdfjs(); return pdfjs.getDocument({ data: bytes, isEvalSupported: false }).promise; }
async function renderPage(doc, n, maxW) {
  const page = await doc.getPage(n); const vp1 = page.getViewport({ scale: 1 });
  const scale = Math.min(3, maxW / vp1.width); const vp = page.getViewport({ scale });
  const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return { canvas: c, wPt: vp1.width, hPt: vp1.height };
}

/* ================= مقارنة نسختين ================= */
export function pdfCompare(body) {
  const files = { a: null, b: null }, docs = {};
  const slot = (k, label) => {
    const info = h('div', { class: 'muted center', style: { marginTop: '8px', fontWeight: 700 } });
    const dz = dropzone({ accept: 'application/pdf,.pdf', label, hint: 'اختر ملف PDF أو اسحبه هنا', onFiles: async ([f]) => { files[k] = f; info.textContent = f.name; docs[k] = await openPdf(await readArrayBuffer(f)).catch(() => null); if (!docs[k]) { toast('تعذّر فتح الملف.', true); files[k] = null; info.textContent = ''; } ready(); } });
    return h('div', {}, dz, info);
  };
  const pageSel = h('select', { class: 'input' }), sens = h('input', { type: 'range', min: 30, max: 230, value: 120 }), view = select([['diff', 'الفروق ملوّنة'], ['a', 'النسخة القديمة'], ['b', 'النسخة الجديدة']], 'diff');
  const tol = h('input', { type: 'checkbox', checked: true });
  const out = h('div'), stats = h('div');
  const work = h('div', { class: 'panel', style: { display: 'none', marginTop: '16px' } },
    h('div', { class: 'opts', style: { marginTop: 0 } }, field('الصفحة', pageSel), field('العرض', view), h('label', { class: 'field' }, h('span', {}, 'حساسية اكتشاف الخطوط'), sens), h('label', { class: 'check' }, tol, 'تجاهل الإزاحات الطفيفة (بكسل واحد)')),
    h('div', { class: 'legend' }, h('span', {}, h('i', { style: { background: '#dc2626' } }), 'محذوف من النسخة الجديدة'), h('span', {}, h('i', { style: { background: '#16a34a' } }), 'مضاف في النسخة الجديدة'), h('span', {}, h('i', { style: { background: '#cbd5e1' } }), 'دون تغيير')),
    stats, h('div', { class: 'cv-wrap' }, out),
    h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: dlPng }, ico('download', 18), 'تنزيل الصفحة PNG'), h('button', { type: 'button', class: 'btn light', onclick: dlReport }, ico('file-text', 18), 'تقرير PDF لجميع الصفحات')),
    supportNudge(window.__ITQAN_CFG || {}));
  body.append(h('div', { class: 'note info', style: { marginBottom: '14px' } }, 'تُقارَن الصفحات بصريًا داخل متصفحك دون رفع الملفات. يُشترط أن تكون النسختان بالمقياس والإطار نفسيهما (تصدير من البرنامج نفسه).'),
    h('div', { class: 'eng-layout', style: { gridTemplateColumns: '1fr 1fr' } }, slot('a', 'النسخة القديمة'), slot('b', 'النسخة الجديدة')), work);
  let cur = null;
  function ready() {
    if (!docs.a || !docs.b) return;
    const n = Math.min(docs.a.numPages, docs.b.numPages);
    pageSel.innerHTML = ''; for (let i = 1; i <= n; i++) pageSel.append(h('option', { value: i }, `صفحة ${i}`));
    work.style.display = '';
    if (docs.a.numPages !== docs.b.numPages) toast(`عدد الصفحات مختلف (${docs.a.numPages} و ${docs.b.numPages})؛ ستُقارَن أول ${n} صفحة.`);
    run();
  }
  [pageSel, view, tol].forEach(e => e.onchange = run); sens.onchange = run;
  async function diffPage(n, maxW = 1800) {
    const A = await renderPage(docs.a, n, maxW), B0 = await renderPage(docs.b, n, maxW);
    const W = A.canvas.width, H = A.canvas.height;
    const B = document.createElement('canvas'); B.width = W; B.height = H; const bx = B.getContext('2d'); bx.fillStyle = '#fff'; bx.fillRect(0, 0, W, H); bx.drawImage(B0.canvas, 0, 0, W, H);
    const da = A.canvas.getContext('2d').getImageData(0, 0, W, H).data, db = bx.getImageData(0, 0, W, H).data;
    const thr = 255 - (+sens.value), ma = new Uint8Array(W * H), mb = new Uint8Array(W * H);
    for (let i = 0, p = 0; p < W * H; p++, i += 4) { ma[p] = (da[i] * 0.299 + da[i + 1] * 0.587 + da[i + 2] * 0.114) < thr ? 1 : 0; mb[p] = (db[i] * 0.299 + db[i + 1] * 0.587 + db[i + 2] * 0.114) < thr ? 1 : 0; }
    const dil = (m) => { if (!tol.checked) return m; const o = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = y * W + x; if (m[p]) { for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx >= 0 && xx < W) o[yy * W + xx] = 1; } } } } return o; };
    const xa = dil(ma), xb = dil(mb);
    const C = document.createElement('canvas'); C.width = W; C.height = H; const cx = C.getContext('2d'); const img = cx.createImageData(W, H), d = img.data;
    let rem = 0, add = 0, ink = 0;
    for (let p = 0, i = 0; p < W * H; p++, i += 4) {
      let r = 255, g = 255, b = 255;
      if (ma[p] && !xb[p]) { r = 220; g = 38; b = 38; rem++; }
      else if (mb[p] && !xa[p]) { r = 22; g = 163; b = 74; add++; }
      else if (ma[p] || mb[p]) { r = 190; g = 199; b = 212; }
      if (ma[p] || mb[p]) ink++;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
    cx.putImageData(img, 0, 0);
    return { diff: C, a: A.canvas, b: B, rem, add, ink, wPt: A.wPt, hPt: A.hPt };
  }
  async function run() {
    out.innerHTML = ''; out.append(h('p', { class: 'center muted', style: { padding: '30px' } }, 'جارٍ المقارنة…'));
    try {
      cur = await diffPage(+pageSel.value);
      const c = view.value === 'diff' ? cur.diff : cur[view.value];
      c.style.width = '100%'; c.style.height = 'auto'; out.innerHTML = ''; out.append(c);
      const ch = cur.rem + cur.add, pct = cur.ink ? ch / cur.ink * 100 : 0;
      stats.innerHTML = ''; stats.append(kpis([['نسبة التغيير في الخطوط', fmt(pct, 2), '%', ch ? 'main' : ''], ['محذوف', fmt(cur.rem, 0), 'بكسل'], ['مضاف', fmt(cur.add, 0), 'بكسل']])); if (ch === 0) stats.append(h('div', { class: 'note ok' }, 'لا توجد فروق مرئية في هذه الصفحة.'));
    } catch (e) { console.error(e); out.innerHTML = ''; out.append(h('div', { class: 'note err' }, 'تعذّرت المقارنة: ' + e.message)); }
  }
  function dlPng() { if (!cur) return; (view.value === 'diff' ? cur.diff : cur[view.value]).toBlob(b => download(b, `compare-page-${pageSel.value}.png`), 'image/png'); }
  async function dlReport() {
    const { PDFDocument } = await libs.pdfLib(); const pdf = await PDFDocument.create();
    const n = Math.min(docs.a.numPages, docs.b.numPages); const pb = progressBar(); stats.append(pb.el);
    for (let i = 1; i <= n; i++) {
      pb.set((i - 1) / n, `جارٍ مقارنة الصفحة ${i} من ${n}…`);
      const r = await diffPage(i, 2400);
      const png = await new Promise(res => r.diff.toBlob(res, 'image/png'));
      const im = await pdf.embedPng(new Uint8Array(await png.arrayBuffer()));
      const pg = pdf.addPage([r.wPt, r.hPt]); pg.drawImage(im, { x: 0, y: 0, width: r.wPt, height: r.hPt });
    }
    pb.set(1, 'اكتمل التقرير.');
    download(new Blob([await pdf.save()], { type: 'application/pdf' }), `${baseName(files.b?.name || 'drawing')}-compare.pdf`);
    setTimeout(() => pb.el.remove(), 2500);
  }
}

/* ================= القياس على المخطط ================= */
const COLORS = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];
export function pdfMeasure(body) {
  let doc = null, pageNo = 1, zoom = 1, fit = 1, page = null, vpScale = 1, fileName = 'drawing';
  let tool = 'dist', pts = [], hover = null;
  const meas = {}; // { [page]: [{ type, pts, color, label }] }
  const cal = {}; // { [page]: metersPerPt }
  const base = h('canvas'), over = h('canvas', { style: { cursor: 'crosshair', touchAction: 'none' } });
  const stack = h('div', { class: 'cv-stack' }, base, over);
  const wrap = h('div', { class: 'cv-wrap' }, stack);
  const pageSel = h('select', { class: 'input', style: { width: 'auto' } });
  const toolSeg = h('div', { class: 'seg' });
  [['dist', 'مسافة'], ['poly', 'طول متعدد'], ['area', 'مساحة'], ['cal', 'معايرة بخط معلوم']].forEach(([v, t]) => { const b = h('button', { type: 'button', class: v === tool ? 'on' : '', 'data-t': v }, t); b.onclick = () => setTool(v); toolSeg.append(b); });
  const scMode = select([['scale', 'مقياس الرسم المطبوع'], ['line', 'معايرة بخط معلوم الطول']], 'scale'), scVal = num(100), calInfo = h('small', { class: 'muted' });
  const scField = nf('مقياس الرسم 1 :', scVal, null, 'صحيح عند تصدير المخطط بحجم الورقة الفعلي (100%)');
  const calForm = h('div', { class: 'note info', style: { display: 'none', marginTop: '10px' } });
  const list = h('ul', { class: 'meas-list' }), sum = h('div');
  const finish = h('button', { type: 'button', class: 'btn sm', style: { display: 'none' } }, ico('check', 16), 'إنهاء الشكل');
  const undo = h('button', { type: 'button', class: 'btn light sm' }, ico('undo-2', 16), 'تراجع');
  const zin = h('button', { type: 'button', class: 'btn light sm', title: 'تكبير' }, ico('zoom-in', 16)), zout = h('button', { type: 'button', class: 'btn light sm', title: 'تصغير' }, ico('zoom-out', 16));
  const work = h('div', { style: { display: 'none' } },
    h('div', { class: 'panel' },
      h('div', { class: 'opts', style: { marginTop: 0 } }, field('طريقة ضبط المقياس', scMode), scField), calInfo, calForm),
    h('div', { class: 'panel' },
      h('div', { class: 'toolbar' }, pageSel, toolSeg, finish, undo, zout, zin),
      h('p', { class: 'eng-sub', style: { margin: '0 0 8px' } }, 'انقر لتحديد النقاط. في الطول المتعدد والمساحة: انقر مرتين أو اضغط «إنهاء الشكل». اضغط Shift لرسم خطوط أفقية أو رأسية.'),
      wrap),
    h('div', { class: 'panel' }, sectionTitle('القياسات', 'ruler'), sum, list,
      h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: exportX }, ico('download', 18), 'تنزيل Excel'), h('button', { type: 'button', class: 'btn light', onclick: dlPng }, 'تنزيل الصفحة مع القياسات PNG')), supportNudge(window.__ITQAN_CFG || {})));
  const dz = dropzone({ accept: 'application/pdf,.pdf', label: 'اختر ملف المخطط PDF', onFiles: async ([f]) => {
    try { doc = await openPdf(await readArrayBuffer(f)); } catch { return toast('تعذّر فتح الملف.', true); }
    fileName = baseName(f.name); pageSel.innerHTML = ''; for (let i = 1; i <= doc.numPages; i++) pageSel.append(h('option', { value: i }, `صفحة ${i}`));
    dz.style.display = 'none'; work.style.display = ''; pageNo = 1; zoom = 1; await load();
  } });
  body.append(dz, work);
  const mpp = () => cal[pageNo] ?? (scMode.value === 'scale' ? 25.4 / 72 / 1000 * N(scVal.value, 100) : null);
  scMode.onchange = () => { if (scMode.value === 'scale') delete cal[pageNo]; else setTool('cal'); refresh(); };
  scVal.oninput = () => { if (scMode.value === 'scale') { delete cal[pageNo]; refresh(); } };
  pageSel.onchange = async () => { pageNo = +pageSel.value; pts = []; await load(); };
  zin.onclick = () => { zoom = Math.min(8, zoom * 1.4); draw(); }; zout.onclick = () => { zoom = Math.max(0.4, zoom / 1.4); draw(); };
  undo.onclick = () => { if (pts.length) pts.pop(); else (meas[pageNo] || []).pop(); refresh(); };
  finish.onclick = () => done();
  function setTool(t) { tool = t; pts = []; [...toolSeg.children].forEach(b => b.classList.toggle('on', b.dataset.t === t)); calForm.style.display = 'none'; refresh(); }
  async function load() { page = await doc.getPage(pageNo); const vp = page.getViewport({ scale: 1 }); fit = Math.min(2.5, (wrap.clientWidth || 900) / vp.width); await draw(); }
  let rendering = null;
  async function draw() {
    if (!page) return;
    vpScale = fit * zoom; const dpr = window.devicePixelRatio || 1; const vp = page.getViewport({ scale: vpScale * dpr });
    for (const c of [base, over]) { c.width = Math.round(vp.width); c.height = Math.round(vp.height); c.style.width = (vp.width / dpr) + 'px'; c.style.height = (vp.height / dpr) + 'px'; }
    rendering?.cancel?.(); const ctx = base.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, base.width, base.height);
    rendering = page.render({ canvasContext: ctx, viewport: vp });
    try { await rendering.promise; } catch { /* أُلغي الرسم بسبب تكبير جديد */ }
    paint();
  }
  // تحويل موضع المؤشر إلى وحدات PDF
  function toPt(e) { const r = over.getBoundingClientRect(); return { x: (e.clientX - r.left) / vpScale, y: (e.clientY - r.top) / vpScale }; }
  function ortho(p) { if (!pts.length) return p; const q = pts[pts.length - 1]; return Math.abs(p.x - q.x) > Math.abs(p.y - q.y) ? { x: p.x, y: q.y } : { x: q.x, y: p.y }; }
  over.addEventListener('pointerdown', (e) => {
    if (!page || e.button !== 0) return;
    let p = toPt(e); if (e.shiftKey) p = ortho(p);
    pts.push(p);
    if ((tool === 'dist' || tool === 'cal') && pts.length === 2) done();
    refresh();
  });
  over.addEventListener('pointermove', (e) => { if (!page) return; hover = toPt(e); if (e.shiftKey) hover = ortho(hover); paint(); });
  over.addEventListener('pointerleave', () => { hover = null; paint(); });
  over.addEventListener('dblclick', (e) => { e.preventDefault(); if (tool === 'poly' || tool === 'area') { pts.pop(); done(); } });
  document.addEventListener('keydown', (e) => { if (!work.isConnected) return; if (e.key === 'Enter') done(); if (e.key === 'Escape') { pts = []; refresh(); } });
  const lenPt = (P) => P.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - P[i].x, p.y - P[i].y), 0);
  const areaPt = (P) => Math.abs(P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; return s + p.x * q.y - q.x * p.y; }, 0)) / 2;
  function value(m) { const k = mpp(); if (!k) return null; return m.type === 'area' ? areaPt(m.pts) * k * k : lenPt(m.pts) * k; }
  function done() {
    if (tool === 'cal') {
      if (pts.length < 2) return;
      const L = lenPt(pts); const P = pts.slice(); pts = [];
      const inp = num('', { placeholder: 'مثال: 5' });
      calForm.innerHTML = ''; calForm.style.display = '';
      calForm.append(h('b', {}, 'ما الطول الحقيقي للخط الذي رسمته؟ '), h('div', { class: 'unit-in', style: { maxWidth: '220px', margin: '8px 0' } }, inp, h('em', {}, 'م')),
        h('button', { type: 'button', class: 'btn sm', onclick: () => { const v = N(inp.value, 0); if (!(v > 0)) return toast('أدخل طولًا صحيحًا.', true); cal[pageNo] = v / L; scMode.value = 'line'; calForm.style.display = 'none'; calLine = P; toast('ضُبط المقياس.'); setTool('dist'); } }, 'اعتماد'));
      setTimeout(() => inp.focus(), 50); refresh(); return;
    }
    const need = tool === 'area' ? 3 : 2;
    if (pts.length < need) { if (tool !== 'dist') toast(tool === 'area' ? 'حدد ثلاث نقاط على الأقل.' : 'حدد نقطتين على الأقل.', true); return; }
    const arr = meas[pageNo] ||= [];
    arr.push({ type: tool, pts: pts.slice(), color: COLORS[arr.length % COLORS.length] });
    pts = []; refresh();
  }
  let calLine = null;
  function label(m, i) { return (m.type === 'area' ? 'مساحة ' : m.type === 'poly' ? 'طول متعدد ' : 'مسافة ') + (i + 1); }
  function show(v, type) { if (v == null) return 'اضبط المقياس'; return type === 'area' ? `${fmt(v, 2)} م²` : `${fmt(v, 3)} م`; }
  function refresh() {
    const k = mpp();
    scField.style.display = scMode.value === 'scale' ? '' : 'none';
    calInfo.textContent = k ? `المقياس الحالي: 1 مم على الورقة = ${fmt(k * 72 / 25.4 * 1000, 3)} مم في الطبيعة (≈ 1 : ${fmt(k * 72 / 25.4 * 1000, 1)})` : 'ارسم خطًا معلوم الطول على المخطط لضبط المقياس.';
    finish.style.display = (tool === 'poly' || tool === 'area') && pts.length ? '' : 'none';
    const arr = meas[pageNo] || [];
    list.innerHTML = '';
    arr.forEach((m, i) => { const del = h('button', { type: 'button', class: 'icon-btn' }, ico('x', 14)); del.onclick = () => { arr.splice(i, 1); refresh(); }; list.append(h('li', {}, h('span', { class: 'sw', style: { background: m.color } }), label(m, i), h('b', {}, show(value(m), m.type)), del)); });
    const tl = arr.filter(m => m.type !== 'area').reduce((s, m) => s + (value(m) || 0), 0), ta = arr.filter(m => m.type === 'area').reduce((s, m) => s + (value(m) || 0), 0);
    sum.innerHTML = ''; if (arr.length && k) sum.append(kpis([['مجموع الأطوال', fmt(tl, 3), 'م'], ['مجموع المساحات', fmt(ta, 2), 'م²']]));
    if (!arr.length) list.append(h('li', { class: 'muted' }, 'لا توجد قياسات في هذه الصفحة بعد.'));
    paint();
  }
  function paint() {
    const dpr = window.devicePixelRatio || 1, s = vpScale * dpr, g = over.getContext('2d');
    g.clearRect(0, 0, over.width, over.height); g.lineJoin = 'round'; g.lineCap = 'round';
    const path = (P, close) => { g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p.x * s, p.y * s) : g.moveTo(p.x * s, p.y * s)); if (close) g.closePath(); };
    const tag = (txt, p, color) => { g.font = `bold ${13 * dpr}px Cairo, Arial`; const w = g.measureText(txt).width + 10 * dpr; g.fillStyle = 'rgba(255,255,255,.92)'; g.fillRect(p.x * s - w / 2, p.y * s - 22 * dpr, w, 18 * dpr); g.fillStyle = color; g.textAlign = 'center'; g.fillText(txt, p.x * s, p.y * s - 8 * dpr); };
    (meas[pageNo] || []).forEach((m) => {
      g.strokeStyle = m.color; g.lineWidth = 2.5 * dpr; path(m.pts, m.type === 'area');
      if (m.type === 'area') { g.fillStyle = m.color + '26'; g.fill(); }
      g.stroke(); m.pts.forEach(p => { g.fillStyle = m.color; g.beginPath(); g.arc(p.x * s, p.y * s, 3.5 * dpr, 0, 7); g.fill(); });
      const c = m.type === 'area' ? { x: m.pts.reduce((a, p) => a + p.x, 0) / m.pts.length, y: m.pts.reduce((a, p) => a + p.y, 0) / m.pts.length } : m.pts[Math.floor((m.pts.length - 1) / 2)];
      const mid = m.type === 'area' ? c : { x: (c.x + m.pts[Math.floor((m.pts.length - 1) / 2) + 1].x) / 2, y: (c.y + m.pts[Math.floor((m.pts.length - 1) / 2) + 1].y) / 2 };
      tag(show(value(m), m.type), mid, m.color);
    });
    if (calLine && cal[pageNo]) { g.setLineDash([6 * dpr, 4 * dpr]); g.strokeStyle = '#64748b'; g.lineWidth = 2 * dpr; path(calLine); g.stroke(); g.setLineDash([]); }
    if (pts.length) {
      const P = hover ? pts.concat([hover]) : pts;
      g.strokeStyle = tool === 'cal' ? '#64748b' : '#0f172a'; g.lineWidth = 2 * dpr; g.setLineDash([5 * dpr, 4 * dpr]); path(P, tool === 'area' && P.length > 2); g.stroke(); g.setLineDash([]);
      P.forEach(p => { g.fillStyle = '#0f172a'; g.beginPath(); g.arc(p.x * s, p.y * s, 3 * dpr, 0, 7); g.fill(); });
      if (hover && tool !== 'cal') { const tmp = { type: tool, pts: P }; const v = value(tmp); if (v != null) tag(show(v, tool), hover, '#0f172a'); }
    }
  }
  function exportX() {
    const rows = [];
    Object.keys(meas).sort((a, b) => a - b).forEach(p => { const k = cal[p] ?? (scMode.value === 'scale' ? 25.4 / 72 / 1000 * N(scVal.value, 100) : null); (meas[p] || []).forEach((m, i) => { const v = k ? (m.type === 'area' ? areaPt(m.pts) * k * k : lenPt(m.pts) * k) : null; rows.push([+p, label(m, i), m.type === 'area' ? 'م²' : 'م', v == null ? '' : +v.toFixed(4)]); }); });
    if (!rows.length) return toast('لا توجد قياسات.', true);
    xlsxDownload(`${fileName}-measurements.xlsx`, [{ name: 'القياسات', title: 'قياسات المخطط — ' + fileName, columns: [{ header: 'الصفحة', width: 10 }, { header: 'القياس', width: 22 }, { header: 'الوحدة', width: 10 }, { header: 'القيمة', width: 16, fmt: '#,##0.000' }], rows }]);
  }
  function dlPng() { const c = document.createElement('canvas'); c.width = base.width; c.height = base.height; const g = c.getContext('2d'); g.drawImage(base, 0, 0); g.drawImage(over, 0, 0); c.toBlob(b => download(b, `${fileName}-p${pageNo}-measure.png`), 'image/png'); }
  window.addEventListener('resize', () => { if (page && work.isConnected) load(); });
}
