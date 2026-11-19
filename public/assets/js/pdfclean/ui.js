// أداة «إزالة العلامة المائية والعناصر المكررة من PDF»
import { h, ico, toast, libs, download, baseName, parseRanges, seg, dropzone, progressBar } from '../ui.js';
import { analyze, clean } from './engine.js';
import { aiStatus, canvasToPayload } from '../ai-tools.js';

const ANN_AR = { Watermark: 'علامات مائية مضافة تعليقًا', Stamp: 'أختام (مثل: معتمد، مسودة، سري)', FreeText: 'نصوص حرة مضافة فوق الصفحات', Text: 'ملاحظات لاصقة', Square: 'مستطيلات مرسومة', Circle: 'دوائر مرسومة', Ink: 'رسومات حرة', Highlight: 'تظليل', Underline: 'تسطير', StrikeOut: 'شطب', Line: 'خطوط', Polygon: 'أشكال', FileAttachment: 'مرفقات', Caret: 'علامات إدراج' };
const ANN_DEFAULT = new Set(['Watermark', 'Stamp']);
// صياغة العدد بالعربية: واحد، اثنان، 3–10 جمع، أكثر من 10 مفرد
const cnt = (n, one, two, plural) => (n === 1 ? one : n === 2 ? two : `${n} ${n <= 10 ? plural : one}`);
const pg = (N) => (N > 2 && N <= 10 ? 'صفحات' : 'صفحة');

export function renderWatermark(body) {
  let bytes = null, file = null, pdf = null, A = null, cur = 0;
  const pick = { acrobat: true, annots: new Set(), xobj: new Set(), text: new Set() };
  const regions = []; // { x, y, w, h, color, hideText, cx, cy, cw, ch } (cx.. بالبكسل للمعاينة)
  const upload = h('div'), work = h('div', { class: 'hidden wm' });

  upload.append(dropzone({ accept: 'application/pdf,.pdf', label: 'اختر ملف PDF', onFiles: ([f]) => load(f) }),
    h('div', { class: 'note info', style: { marginTop: '14px' } }, 'هذه الأداة مخصصة لملفاتك أو الملفات التي لك حق تعديلها، مثل إزالة «مسودة» من نسخة نهائية أو شعار قديم من مستنداتك. أما إزالة علامات حقوق النشر من ملفات الآخرين فلا تجوز. يُعالَج الملف على جهازك، ولا يُرفع إلا صفحات «إعادة الرسم بالذكاء الاصطناعي» إن اخترتها.'));
  body.append(upload, work);

  async function load(f) {
    file = f; bytes = new Uint8Array(await f.arrayBuffer());
    upload.classList.add('hidden'); work.classList.remove('hidden'); work.innerHTML = '';
    const pb = progressBar(); work.append(h('div', { class: 'panel' }, h('b', {}, 'جارٍ تحليل الملف…'), pb.el));
    try {
      const pdfjs = await libs.pdfjs();
      pdf = await pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false }).promise;
      const tbp = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        pb.set(i / pdf.numPages * 0.8, `قراءة الصفحة ${i} من ${pdf.numPages}`);
        const tc = await (await pdf.getPage(i)).getTextContent();
        tbp.push(tc.items.map(x => ({ str: x.str, transform: x.transform, width: x.width, height: x.height })));
      }
      pb.set(0.9, 'البحث عن العلامات والعناصر المكررة…');
      A = await analyze(await libs.pdfLib(), bytes, tbp);
      pick.acrobat = A.acrobat > 0;
      pick.annots = new Set(Object.keys(A.annots).filter(k => ANN_DEFAULT.has(k)));
      pick.text = new Set(A.text.filter(t => t.rotated).map(t => t.key));
      pick.xobj = new Set();
      draw();
    } catch (e) { console.error(e); work.innerHTML = ''; work.append(h('div', { class: 'note err' }, 'تعذّرت قراءة الملف: ' + e.message), h('button', { class: 'btn light', onclick: reset }, 'اختيار ملف آخر')); }
  }
  function reset() { bytes = null; pdf = null; A = null; regions.length = 0; work.classList.add('hidden'); upload.classList.remove('hidden'); }

  /* ---------- اللوحة الرئيسية ---------- */
  let rasterMode = 'none', strength = 50, colored = false, dpi = 200, rasterPages = '', regionPages = '', regionColor = 'auto', hideText = true;
  const preview = h('div', { class: 'wm-prev' }), regList = h('div');
  function draw() {
    work.innerHTML = '';
    const N = A.pages;
    const found = h('div', { class: 'wm-found' });
    const chk = (on, label, sub, onCh, extra) => { const c = h('input', { type: 'checkbox', checked: on }); c.onchange = () => onCh(c.checked); return h('label', { class: 'wm-item' }, c, extra || null, h('span', {}, h('b', {}, label), sub ? h('small', {}, sub) : null)); };
    if (A.acrobat) found.append(chk(pick.acrobat, 'علامة مائية مضافة ببرنامج Acrobat', `في ${A.acrobat} من ${N} ${pg(N)} — إزالة نظيفة`, v => pick.acrobat = v));
    for (const [k, n] of Object.entries(A.annots)) found.append(chk(pick.annots.has(k), ANN_AR[k] || `تعليقات من نوع ${k}`, cnt(n, 'عنصر واحد', 'عنصران', 'عناصر'), v => v ? pick.annots.add(k) : pick.annots.delete(k)));
    for (const t of A.text) found.append(chk(pick.text.has(t.key), `«${t.str.length > 60 ? t.str.slice(0, 60) + '…' : t.str}»`, `نص ${t.rotated ? 'مائل ' : ''}يتكرر في ${t.count} من ${N} ${pg(N)}`, v => v ? pick.text.add(t.key) : pick.text.delete(t.key)));
    for (const x of A.xobj) {
      const thumb = x.preview ? h('img', { src: URL.createObjectURL(new Blob([x.preview], { type: 'image/jpeg' })), alt: '' }) : h('span', { class: 'wm-ph', html: '' }, ico(x.kind === 'Image' ? 'image' : 'layers', 20));
      found.append(chk(pick.xobj.has(x.sig), x.kind === 'Image' ? `صورة ${x.w}×${x.h} بكسل` : 'عنصر مركّب (شعار أو رسم أو نص مجمّع)', `تتكرر في ${x.count} من ${N} ${pg(N)}`, v => v ? pick.xobj.add(x.sig) : pick.xobj.delete(x.sig), thumb));
    }
    if (!found.children.length) found.append(h('p', { class: 'muted' }, A.scanned ? 'الملف ممسوح ضوئيًا (صور)، فلا توجد عناصر مستقلة يمكن حذفها. استخدم «الصفحات الممسوحة ضوئيًا» أدناه.' : 'لم تُكتشف علامات أو عناصر مكررة تلقائيًا. استخدم «تغطية منطقة ثابتة» أدناه.'));

    // التغطية
    const pageSel = h('select', { class: 'input', style: { width: 'auto' } }, Array.from({ length: N }, (_, i) => h('option', { value: i, selected: i === cur }, `الصفحة ${i + 1}`)));
    pageSel.onchange = () => { cur = +pageSel.value; showPage(); };
    const colorSeg = seg([['auto', 'لون الخلفية تلقائيًا'], ['white', 'أبيض'], ['black', 'أسود']], regionColor, v => regionColor = v);
    const hide = h('input', { type: 'checkbox', checked: hideText }); hide.onchange = () => hideText = hide.checked;
    const rp = h('input', { class: 'input', placeholder: 'كل الصفحات، أو مثل: 1-3, 7', value: regionPages }); rp.oninput = () => regionPages = rp.value;

    // الصفحات الممسوحة
    const rm = seg([['none', 'دون معالجة'], ['lighten', 'تفتيح العلامات الباهتة (على جهازك)'], ['ai', 'إعادة الرسم بالذكاء الاصطناعي (Gemini)']], rasterMode, v => { rasterMode = v; rasterOpts(); });
    const rOpts = h('div');
    const rasterOpts = () => {
      rOpts.innerHTML = '';
      if (rasterMode === 'none') return;
      const st = h('input', { type: 'range', min: 10, max: 90, value: strength }); st.oninput = () => strength = +st.value;
      const col = h('input', { type: 'checkbox', checked: colored }); col.onchange = () => colored = col.checked;
      const dp = h('select', { class: 'input' }, [[150, '150 نقطة/بوصة (حجم أصغر)'], [200, '200 (موصى به)'], [300, '300 (أعلى جودة)']].map(([v, t]) => h('option', { value: v, selected: v === dpi }, t))); dp.onchange = () => dpi = +dp.value;
      const pr = h('input', { class: 'input', placeholder: 'كل الصفحات، أو مثل: 1-5', value: rasterPages }); pr.oninput = () => rasterPages = pr.value;
      if (rasterMode === 'lighten') rOpts.append(h('div', { class: 'opts' }, h('label', { class: 'field' }, h('span', {}, 'قوة التفتيح'), st, h('small', {}, 'ارفعها إذا بقيت العلامة، واخفضها إذا بهت النص')), h('label', { class: 'check' }, col, 'تشمل العلامات الملونة الفاتحة (حمراء أو زرقاء)'), h('label', { class: 'field' }, h('span', {}, 'الجودة'), dp), h('label', { class: 'field' }, h('span', {}, 'الصفحات'), pr)));
      else {
        const note = h('div', { class: 'note warn' }, 'يعيد Gemini رسم كل صفحة دون العلامة. النتيجة قد تكون مبهرة لكنها غير مضمونة: قد تقل حدة النص الصغير أو يتغير حرف أو رقم، فراجع المعاينة قبل الاعتماد، ولا تستخدمها للمستندات الرسمية والأرقام الحساسة. تُرسل صور الصفحات المختارة فقط، وكل صفحة تُحسب من الحد اليومي. الحد الأقصى 20 صفحة في المرة.');
        aiStatus().then(s => { if (!s?.status?.gemini?.available) note.after(h('div', { class: 'note err' }, 'Gemini غير متاح على المنصة حاليًا، فلن يعمل هذا الخيار. استخدم «تفتيح العلامات الباهتة».')); });
        rOpts.append(note, h('div', { class: 'opts' }, h('label', { class: 'field' }, h('span', {}, 'الصفحات'), pr)));
      }
    };
    rasterOpts();

    const prevBtn = h('button', { class: 'btn light', type: 'button' }, ico('eye', 18), 'معاينة الصفحة الحالية');
    const goBtn = h('button', { class: 'btn', type: 'button' }, ico('download', 18), 'تنظيف الملف وتنزيله');
    const pb = progressBar(); pb.el.classList.add('hidden');
    prevBtn.onclick = () => run(true, prevBtn, pb); goBtn.onclick = () => run(false, goBtn, pb);

    work.append(
      h('div', { class: 'panel' }, h('div', { class: 'row' }, h('b', {}, file.name), h('span', { class: 'muted' }, ` — ${cnt(N, 'صفحة واحدة', 'صفحتان', 'صفحات')}${A.scanned ? ' — ممسوح ضوئيًا' : ''}`), h('span', { class: 'spacer' }), h('button', { class: 'btn light sm', onclick: reset }, ico('x', 16), 'ملف آخر'))),
      h('div', { class: 'panel' }, h('h3', {}, '١. ما اكتُشف تلقائيًا'), h('p', { class: 'muted' }, 'حدّد ما تريد حذفه. الحذف هنا نظيف: يُزال العنصر نفسه ويبقى المحتوى تحته سليمًا.'), found),
      h('div', { class: 'panel' }, h('h3', {}, '٢. تغطية منطقة ثابتة (اختياري)'), h('p', { class: 'muted' }, 'اسحب على الصفحة لتحديد منطقة (رقم صفحة قديم، شعار في الهامش…)، فتُغطّى في كل الصفحات المحددة. يمكنك تحديد أكثر من منطقة.'),
        h('div', { class: 'row' }, pageSel, colorSeg), h('div', { class: 'opts' }, h('label', { class: 'check' }, hide, 'حذف النص الموجود تحت المنطقة أيضًا'), h('label', { class: 'field' }, h('span', {}, 'الصفحات'), rp)), regList, preview),
      h('div', { class: 'panel' }, h('h3', {}, '٣. الصفحات الممسوحة ضوئيًا (اختياري)'), h('p', { class: 'muted' }, A.scanned ? 'الملف ممسوح ضوئيًا، فالعلامة جزء من صورة الصفحة. اختر طريقة المعالجة:' : 'للصفحات التي تكون العلامة فيها جزءًا من الصورة نفسها.'), rm, rOpts),
      h('div', { class: 'panel' }, h('div', { class: 'actions' }, prevBtn, goBtn), pb.el, h('div', { class: 'wm-result' })));
    drawRegions(); showPage();
  }

  /* ---------- معاينة الصفحة ورسم المناطق بالسحب ---------- */
  let vp = null, canvas = null;
  async function showPage() {
    preview.innerHTML = '';
    const page = await pdf.getPage(cur + 1); const v0 = page.getViewport({ scale: 1 });
    const scale = Math.min(1.6, 760 / v0.width); vp = page.getViewport({ scale });
    canvas = h('canvas', { width: Math.ceil(vp.width), height: Math.ceil(vp.height) });
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const wrap = h('div', { class: 'wm-canvas' }, canvas); preview.append(wrap);
    const overlay = h('div', { class: 'wm-ov' }); wrap.append(overlay);
    const paintRegs = () => { overlay.innerHTML = ''; regions.forEach(r => { const [a, b] = vp.convertToViewportPoint(r.x, r.y), [c, d] = vp.convertToViewportPoint(r.x + r.w, r.y + r.h); const k = canvas.clientWidth / canvas.width; overlay.append(h('div', { class: 'wm-rect', style: { left: Math.min(a, c) * k + 'px', top: Math.min(b, d) * k + 'px', width: Math.abs(c - a) * k + 'px', height: Math.abs(d - b) * k + 'px' } })); }); };
    let start = null, box = null;
    const pt = (e) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height]; };
    wrap.onpointerdown = (e) => { start = pt(e); box = h('div', { class: 'wm-rect drawing' }); overlay.append(box); wrap.setPointerCapture(e.pointerId); };
    wrap.onpointermove = (e) => { if (!start) return; const p = pt(e), k = canvas.clientWidth / canvas.width; Object.assign(box.style, { left: Math.min(start[0], p[0]) * k + 'px', top: Math.min(start[1], p[1]) * k + 'px', width: Math.abs(p[0] - start[0]) * k + 'px', height: Math.abs(p[1] - start[1]) * k + 'px' }); };
    wrap.onpointerup = (e) => {
      if (!start) return; const p = pt(e), s = start; start = null;
      if (Math.abs(p[0] - s[0]) < 6 || Math.abs(p[1] - s[1]) < 6) { box.remove(); return; }
      const [x1, y1] = vp.convertToPdfPoint(s[0], s[1]), [x2, y2] = vp.convertToPdfPoint(p[0], p[1]);
      regions.push({ x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), sample: sampleColor(ctx, s, p) });
      drawRegions(); paintRegs();
    };
    paintRegs(); window.__wmPaint = paintRegs;
  }
  // لون الخلفية حول المنطقة (الوسيط)
  function sampleColor(ctx, s, p) {
    const x0 = Math.max(0, Math.min(s[0], p[0]) - 4), y0 = Math.max(0, Math.min(s[1], p[1]) - 4), x1 = Math.min(ctx.canvas.width - 1, Math.max(s[0], p[0]) + 4), y1 = Math.min(ctx.canvas.height - 1, Math.max(s[1], p[1]) + 4);
    const px = []; const get = (x, y) => { const d = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data; px.push([d[0], d[1], d[2]]); };
    for (let x = x0; x <= x1; x += Math.max(1, (x1 - x0) / 20)) { get(x, y0); get(x, y1); }
    for (let y = y0; y <= y1; y += Math.max(1, (y1 - y0) / 20)) { get(x0, y); get(x1, y); }
    const med = (k) => px.map(c => c[k]).sort((a, b) => a - b)[px.length >> 1] / 255;
    return [med(0), med(1), med(2)];
  }
  function drawRegions() {
    regList.innerHTML = '';
    regions.forEach((r, i) => regList.append(h('div', { class: 'wm-reg' }, h('span', {}, `منطقة ${i + 1}: ${Math.round(r.w)}×${Math.round(r.h)} نقطة`), h('button', { class: 'icon-btn', title: 'حذف', onclick: () => { regions.splice(i, 1); drawRegions(); window.__wmPaint?.(); } }, ico('trash-2', 16)))));
  }

  /* ---------- التنفيذ ---------- */
  const pagesSet = (txt, n) => { if (!String(txt || '').trim()) return null; return new Set(parseRanges(txt, n).flat().map(x => x - 1)); };
  async function run(previewOnly, btn, pb) {
    btn.disabled = true; pb.el.classList.remove('hidden'); const resBox = work.querySelector('.wm-result'); resBox.innerHTML = '';
    try {
      const P = await libs.pdfLib(), N = A.pages;
      const regSet = pagesSet(regionPages, N);
      const regs = regions.map(r => ({ ...r, color: regionColor === 'white' ? [1, 1, 1] : regionColor === 'black' ? [0, 0, 0] : r.sample, hideText }));
      pb.set(0.1, 'جارٍ حذف العناصر المختارة…');
      // تُطبَّق المناطق على الصفحات المحددة فقط: تشغيلان إذا اختلفت الصفحات
      let out = await clean(P, bytes, { acrobat: pick.acrobat, annots: [...pick.annots], xobj: [...pick.xobj], text: [...pick.text], textByPage: A.textByPage, regions: regSet ? [] : regs, pages: previewOnly ? new Set([cur]) : null });
      let stats = out.stats;
      if (regSet && regs.length) { const o2 = await clean(P, out.bytes, { regions: regs, pages: previewOnly ? new Set([cur].filter(i => regSet.has(i))) : regSet }); out = o2; stats = { ...stats, regions: o2.stats.regions, hiddenUnderRegion: o2.stats.hiddenUnderRegion }; }
      let finalBytes = out.bytes, rasterDone = 0;
      if (rasterMode !== 'none') {
        const rset = pagesSet(rasterPages, N) || new Set(Array.from({ length: N }, (_, i) => i));
        const targets = previewOnly ? [cur].filter(i => rset.has(i)) : [...rset].sort((a, b) => a - b);
        if (rasterMode === 'ai' && targets.length > 20) throw new Error('إعادة الرسم بالذكاء الاصطناعي تقبل 20 صفحة على الأكثر في المرة. حدّد صفحات أقل.');
        const r = await rasterize(P, finalBytes, targets, (i, k) => pb.set(0.2 + 0.75 * k / targets.length, `${rasterMode === 'ai' ? 'إعادة رسم' : 'تفتيح'} الصفحة ${i + 1} (${k + 1} من ${targets.length})…`));
        finalBytes = r.bytes; rasterDone = r.done;
      }
      pb.set(1, 'اكتمل.');
      if (previewOnly) await showCompare(finalBytes, resBox);
      else {
        download(new Blob([finalBytes], { type: 'application/pdf' }), baseName(file.name) + ' - نظيف.pdf');
        const parts = [stats.acrobat && 'حذف ' + cnt(stats.acrobat, 'علامة Acrobat واحدة', 'علامتي Acrobat', 'علامات Acrobat'), stats.annots && 'حذف ' + cnt(stats.annots, 'تعليق أو ختم', 'تعليقين أو ختمين', 'تعليقات وأختام'), stats.xobj && 'حذف ' + cnt(stats.xobj, 'صورة أو عنصر', 'صورتين أو عنصرين', 'صور وعناصر'), stats.text && 'حذف ' + cnt(stats.text, 'نص مكرر', 'نصين مكررين', 'نصوص مكررة'), stats.regions && 'تغطية ' + cnt(stats.regions, 'منطقة واحدة', 'منطقتين', 'مناطق'), rasterDone && 'معالجة ' + cnt(rasterDone, 'صفحة ممسوحة واحدة', 'صفحتين ممسوحتين', 'صفحات ممسوحة')].filter(Boolean);
        resBox.append(h('div', { class: 'note info' }, parts.length ? 'تم: ' + parts.join('، ') + '. نُزّل الملف النظيف.' : 'لم يُختر أي عنصر للحذف؛ نُزّل الملف كما هو.'));
        await showCompare(finalBytes, resBox);
      }
    } catch (e) { console.error(e); toast(e.message || 'حدث خطأ.', true, 7000); }
    btn.disabled = false; setTimeout(() => pb.el.classList.add('hidden'), 800);
  }

  // تحويل الصفحات المختارة إلى صور معالجة (تفتيح أو ذكاء اصطناعي) وإعادة بناء الملف
  async function rasterize(P, src, targets, onStep) {
    const pdfjs = await libs.pdfjs(); const d = await pdfjs.getDocument({ data: src.slice(), isEvalSupported: false }).promise;
    const done = new Map();
    for (let k = 0; k < targets.length; k++) {
      const i = targets[k]; onStep(i, k);
      const page = await d.getPage(i + 1), v = page.getViewport({ scale: dpi / 72 });
      const c = document.createElement('canvas'); c.width = Math.ceil(v.width); c.height = Math.ceil(v.height);
      const x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: x, viewport: v }).promise;
      let outCanvas = c;
      if (rasterMode === 'lighten') lighten(x, c.width, c.height);
      else {
        const payload = await canvasToPayload(c, 2000, 0.9);
        const r = await fetch('/api/pageclean', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image: payload }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((j.error || 'تعذّرت إعادة الرسم.') + (done.size ? ` عولجت ${done.size} صفحة قبل التوقف.` : ''));
        const im = new Image(); im.src = `data:${j.image.mime};base64,${j.image.data}`; await im.decode();
        outCanvas = document.createElement('canvas'); outCanvas.width = c.width; outCanvas.height = c.height;
        const ox = outCanvas.getContext('2d'); ox.fillStyle = '#fff'; ox.fillRect(0, 0, c.width, c.height); ox.imageSmoothingQuality = 'high'; ox.drawImage(im, 0, 0, c.width, c.height);
      }
      const jpg = await new Promise(r => outCanvas.toBlob(r, 'image/jpeg', 0.9));
      done.set(i, { jpg: new Uint8Array(await jpg.arrayBuffer()), size: page.getViewport({ scale: 1 }) });
    }
    const srcDoc = await P.PDFDocument.load(src, { ignoreEncryption: true }), out = await P.PDFDocument.create();
    const n = srcDoc.getPageCount();
    for (let i = 0; i < n; i++) {
      if (done.has(i)) { const { jpg, size } = done.get(i); const img = await out.embedJpg(jpg); const pg = out.addPage([size.width, size.height]); pg.drawImage(img, { x: 0, y: 0, width: size.width, height: size.height }); }
      else { const [cp] = await out.copyPages(srcDoc, [i]); out.addPage(cp); }
    }
    return { bytes: await out.save({ useObjectStreams: true }), done: done.size };
  }
  // تفتيح: تبييض البكسلات الفاتحة قليلة التشبع (العلامات الباهتة) مع الإبقاء على النص الداكن
  function lighten(ctx, w, hgt) {
    const id = ctx.getImageData(0, 0, w, hgt), d = id.data, T = 250 - strength * 1.3;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), L = 0.2126 * r + 0.7152 * g + 0.0722 * b, sat = mx ? (mx - mn) / mx : 0;
      if (L >= T && (colored || sat < 0.25)) { d[i] = d[i + 1] = d[i + 2] = 255; }
      else if (L > T - 40 && (colored || sat < 0.25)) { const k = (L - (T - 40)) / 40; d[i] += (255 - r) * k; d[i + 1] += (255 - g) * k; d[i + 2] += (255 - b) * k; }
    }
    ctx.putImageData(id, 0, 0);
  }

  // مقارنة قبل وبعد للصفحة الحالية
  async function showCompare(outBytes, box) {
    const pdfjs = await libs.pdfjs(); const after = await pdfjs.getDocument({ data: outBytes.slice(), isEvalSupported: false }).promise;
    const render = async (doc) => { const pg = await doc.getPage(cur + 1); const v0 = pg.getViewport({ scale: 1 }); const v = pg.getViewport({ scale: Math.min(1.4, 520 / v0.width) }); const c = h('canvas', { width: Math.ceil(v.width), height: Math.ceil(v.height) }); await pg.render({ canvasContext: c.getContext('2d'), viewport: v }).promise; return c; };
    box.append(h('div', { class: 'wm-cmp' }, h('figure', {}, await render(pdf), h('figcaption', {}, `قبل — الصفحة ${cur + 1}`)), h('figure', {}, await render(after), h('figcaption', {}, 'بعد'))));
  }
}
