// أدوات PDF — تعمل جميعها داخل المتصفح دون رفع الملفات إلى أي خادم.
import { h, $, $$, ico, toast, fmtSize, libs, download, baseName, parseRanges, field, select, seg, dropzone, progressBar, readArrayBuffer, textToPng } from './ui.js';

const PDF_ACCEPT = 'application/pdf,.pdf';
const IMG_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/bmp';

/* ============ أدوات مساعدة عامة ============ */

async function loadPdf(bytes) {
  const { PDFDocument } = await libs.pdfLib();
  try { return await PDFDocument.load(bytes, { ignoreEncryption: true }); }
  catch (e) { throw new Error('تعذّرت قراءة الملف. تأكد أنه ملف PDF سليم وغير محمي بكلمة مرور.'); }
}
async function pdfjsDoc(bytes) {
  const pdfjs = await libs.pdfjs();
  return pdfjs.getDocument({ data: bytes.slice(0), isEvalSupported: false }).promise;
}
async function renderPage(page, scale, type = 'image/jpeg', quality = 0.92) {
  const vp = page.getViewport({ scale });
  const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  const blob = await new Promise(r => c.toBlob(r, type, quality));
  return { blob, width: c.width, height: c.height, canvas: c };
}
async function zipOutputs(outputs, zipName) {
  const JSZip = await libs.jszip(); const z = new JSZip();
  for (const o of outputs) z.file(o.name, o.blob);
  return { name: zipName, blob: await z.generateAsync({ type: 'blob' }) };
}
const pdfBlob = (bytes) => new Blob([bytes], { type: 'application/pdf' });
const toArabicDigits = (s) => String(s).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

function pageSelector(label, total) {
  const mode = seg([['all', 'جميع الصفحات'], ['odd', 'الفردية'], ['even', 'الزوجية'], ['custom', 'صفحات محددة']], 'all', v => inp.classList.toggle('hidden', v !== 'custom'));
  const inp = h('input', { class: 'input hidden', placeholder: 'مثال: 1-3, 5, 8', style: { marginTop: '6px' } });
  const el = h('div', { class: 'field' }, h('span', {}, label), mode, inp);
  return {
    el, get(n) {
      const all = Array.from({ length: n }, (_, i) => i + 1);
      if (mode.value === 'odd') return all.filter(i => i % 2 === 1);
      if (mode.value === 'even') return all.filter(i => i % 2 === 0);
      if (mode.value === 'custom') { const r = parseRanges(inp.value, n).flat(); if (!r.length) throw new Error('حدّد الصفحات المطلوبة.'); return [...new Set(r)]; }
      return all;
    }
  };
}

/* ============ مصغّرات الصفحات ============ */

async function thumbnails(container, bytes, { mode, onChange }) {
  container.innerHTML = '';
  container.append(h('p', { class: 'muted center' }, 'جارٍ عرض الصفحات…'));
  const doc = await pdfjsDoc(bytes);
  const n = doc.numPages;
  const grid = h('div', { class: 'thumbs' });
  container.innerHTML = ''; container.append(grid);
  const items = [];
  for (let i = 1; i <= n; i++) {
    const card = h('div', { class: 'thumb' + (mode === 'keep' ? ' keep' : ''), draggable: mode === 'order' ? 'true' : null });
    const item = { index: i - 1, rotate: 0, deleted: false, selected: false, card };
    const holder = h('div', { style: { minHeight: '120px', display: 'grid', placeItems: 'center' } }, h('span', { class: 'muted' }, '…'));
    const num = h('div', { class: 'num' }, 'صفحة ' + i);
    card.append(holder, num);
    if (mode === 'order') {
      const rot = h('button', { class: 'icon-btn', title: 'تدوير', type: 'button', html: ico('rotate-cw', 16).innerHTML });
      const del = h('button', { class: 'icon-btn', title: 'حذف', type: 'button', html: ico('trash-2', 16).innerHTML });
      rot.onclick = (e) => { e.stopPropagation(); item.rotate = (item.rotate + 90) % 360; holder.style.transform = `rotate(${item.rotate}deg)`; onChange?.(); };
      del.onclick = (e) => { e.stopPropagation(); item.deleted = !item.deleted; card.classList.toggle('sel', item.deleted); onChange?.(); };
      num.prepend(rot); num.append(del);
      card.ondragstart = () => { card.classList.add('dragging'); grid.dataset.drag = items.indexOf(item); };
      card.ondragend = () => { card.classList.remove('dragging'); $$('.over', grid).forEach(x => x.classList.remove('over')); };
      card.ondragover = (e) => { e.preventDefault(); card.classList.add('over'); };
      card.ondragleave = () => card.classList.remove('over');
      card.ondrop = (e) => {
        e.preventDefault(); card.classList.remove('over');
        const from = +grid.dataset.drag; const to = items.indexOf(item); if (from === to) return;
        const [m] = items.splice(from, 1); items.splice(to, 0, m);
        grid.innerHTML = ''; items.forEach(x => grid.append(x.card)); onChange?.();
      };
    } else {
      card.onclick = () => { item.selected = !item.selected; card.classList.toggle('sel', item.selected); onChange?.(); };
    }
    items.push(item); grid.append(card);
  }
  // عرض المصغرات تدريجيًا
  (async () => {
    for (const it of items.slice()) {
      try {
        const page = await doc.getPage(it.index + 1);
        const vp = page.getViewport({ scale: 1 });
        const r = await renderPage(page, Math.min(1, 220 / vp.width), 'image/jpeg', 0.8);
        const holder = it.card.firstChild; holder.innerHTML = ''; holder.append(r.canvas);
      } catch { }
    }
  })();
  return { items, count: n };
}

/* ============ إطار عام لأدوات الملفات ============ */

function fileTool(body, t, cfg) {
  let files = [];
  const upload = h('div');
  const work = h('div', { class: 'hidden' });
  const resultBox = h('div', { class: 'hidden' });
  body.append(upload, work, resultBox);
  const list = h('ul', { class: 'files' });
  const optsBox = h('div');
  const extra = h('div');
  const runBtn = h('button', { class: 'btn' }, ico('check', 20), cfg.action);
  const pb = progressBar(); pb.el.classList.add('hidden');
  const addMore = cfg.multiple ? h('button', { class: 'btn light sm', type: 'button' }, ico('plus', 16), 'إضافة ملفات') : null;
  const moreInput = h('input', { type: 'file', accept: cfg.accept, multiple: cfg.multiple, class: 'hidden' });
  if (addMore) { addMore.onclick = () => moreInput.click(); moreInput.onchange = () => { addFiles([...moreInput.files]); moreInput.value = ''; }; }
  work.append(h('div', { class: 'panel' },
    h('div', { class: 'row' }, h('b', {}, cfg.multiple ? 'الملفات المختارة' : 'الملف المختار'), h('span', { class: 'spacer' }), addMore, moreInput,
      h('button', { class: 'btn light sm', type: 'button', onclick: reset }, ico('x', 16), 'إلغاء')),
    list, extra, optsBox, cfg.note ? h('div', { class: 'note info', style: { marginTop: '16px' } }, cfg.note) : null,
    h('div', { class: 'actions' }, runBtn), pb.el));

  const ctx = { get files() { return files; }, extra, optsBox, opts: null, state: {} };

  upload.append(dropzone({ accept: cfg.accept, multiple: cfg.multiple, label: cfg.uploadLabel, onFiles: addFiles }));

  function validType(f) { return cfg.validate ? cfg.validate(f) : true; }
  async function addFiles(fs) {
    const ok = fs.filter(validType);
    if (ok.length < fs.length) toast('تم تجاهل ملفات غير مدعومة في هذه الأداة.', true);
    if (!ok.length) return;
    files = cfg.multiple ? files.concat(ok) : ok.slice(0, 1);
    upload.classList.add('hidden'); work.classList.remove('hidden'); resultBox.classList.add('hidden');
    drawList();
    if (!ctx.opts) { ctx.opts = cfg.options ? cfg.options(ctx) : null; if (ctx.opts?.el) optsBox.append(h('div', { class: 'opts' }, ctx.opts.el)); }
    try { await cfg.onFiles?.(ctx); } catch (e) { toast(e.message, true); }
  }
  function drawList() {
    list.innerHTML = '';
    files.forEach((f, i) => {
      list.append(h('li', {}, ico(cfg.fileIcon || 'file-text', 18), h('span', { class: 'name' }, f.name), h('span', { class: 'size' }, fmtSize(f.size)),
        cfg.multiple ? h('button', { class: 'icon-btn', title: 'تحريك للأعلى', disabled: i === 0, onclick: () => { [files[i - 1], files[i]] = [files[i], files[i - 1]]; drawList(); } }, ico('arrow-up', 16)) : null,
        cfg.multiple ? h('button', { class: 'icon-btn', title: 'تحريك للأسفل', disabled: i === files.length - 1, onclick: () => { [files[i + 1], files[i]] = [files[i], files[i + 1]]; drawList(); } }, ico('arrow-down', 16)) : null,
        h('button', { class: 'icon-btn', title: 'إزالة', onclick: () => { files.splice(i, 1); if (!files.length) reset(); else drawList(); } }, ico('trash-2', 16))));
    });
  }
  function reset() {
    files = []; ctx.opts = null; ctx.state = {}; optsBox.innerHTML = ''; extra.innerHTML = '';
    work.classList.add('hidden'); resultBox.classList.add('hidden'); upload.classList.remove('hidden'); pb.el.classList.add('hidden');
  }
  runBtn.onclick = async () => {
    if (cfg.minFiles && files.length < cfg.minFiles) return toast(`اختر ${cfg.minFiles === 2 ? 'ملفين' : cfg.minFiles + ' ملفات'} على الأقل.`, true);
    runBtn.disabled = true; pb.el.classList.remove('hidden'); pb.set(0.02, 'جارٍ المعالجة…');
    try {
      let outs = await cfg.run(ctx, (p, m) => pb.set(p, m));
      if (outs === null) { toast('اختر «حفظ بتنسيق PDF» من نافذة الطباعة لحفظ الملف.'); return; }
      outs = outs.filter(Boolean);
      if (!outs.length) throw new Error('لم ينتج أي ملف.');
      let main = outs;
      if (outs.length > 1 && cfg.zipName) main = [await zipOutputs(outs, cfg.zipName(ctx))];
      showResult(main, outs.length > 1 ? outs : null, ctx.state.resultNote);
    } catch (e) { console.error(e); toast(e.message || 'حدث خطأ غير متوقع.', true, 6000); }
    finally { runBtn.disabled = false; pb.el.classList.add('hidden'); }
  };
  function showResult(main, parts, note) {
    work.classList.add('hidden'); resultBox.classList.remove('hidden'); resultBox.innerHTML = '';
    const dl = h('div', { class: 'downloads' });
    main.forEach(o => dl.append(h('button', { class: 'btn block', onclick: () => download(o.blob, o.name) }, ico('download', 20), `تنزيل ${o.name} (${fmtSize(o.blob.size)})`)));
    let partsEl = null;
    if (parts && parts.length <= 30) {
      partsEl = h('details', { style: { marginTop: '12px' } }, h('summary', { style: { cursor: 'pointer' } }, `تنزيل الملفات منفردة (${parts.length})`),
        h('div', { class: 'downloads' }, parts.map(o => h('button', { class: 'btn light sm block', onclick: () => download(o.blob, o.name) }, o.name))));
    }
    resultBox.append(h('div', { class: 'panel result' }, h('h2', {}, 'اكتملت العملية بنجاح'), note ? h('p', { class: 'muted' }, note) : null, dl, partsEl,
      h('div', { class: 'actions' }, h('button', { class: 'btn light', onclick: () => { resultBox.classList.add('hidden'); work.classList.remove('hidden'); } }, ico('arrow-right', 18), 'العودة إلى الإعدادات'), h('button', { class: 'btn light', onclick: reset }, ico('refresh-cw', 18), 'البدء من جديد'))));
    main.length === 1 && download(main[0].blob, main[0].name);
  }
  return ctx;
}

const isPdf = (f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
const pdfCfg = (o) => ({ accept: PDF_ACCEPT, validate: isPdf, uploadLabel: o.multiple ? 'اختر ملفات PDF' : 'اختر ملف PDF', ...o });

/* ============ تعريف الأدوات ============ */

const TOOLS = {
  merge: pdfCfg({
    multiple: true, minFiles: 2, action: 'دمج الملفات',
    note: 'رتّب الملفات بالأسهم قبل الدمج، فسيُدمج كل ملف بالترتيب الظاهر.',
    async run(ctx, p) {
      const { PDFDocument } = await libs.pdfLib();
      const out = await PDFDocument.create();
      for (const [i, f] of ctx.files.entries()) {
        p(i / ctx.files.length, `جارٍ إضافة ${f.name}`);
        const src = await loadPdf(await readArrayBuffer(f));
        (await out.copyPages(src, src.getPageIndices())).forEach(pg => out.addPage(pg));
      }
      p(0.95, 'جارٍ حفظ الملف…');
      return [{ name: 'merged.pdf', blob: pdfBlob(await out.save()) }];
    }
  }),

  split: pdfCfg({
    action: 'تقسيم الملف', zipName: (ctx) => baseName(ctx.files[0].name) + '-split.zip',
    options(ctx) {
      const range = h('input', { class: 'input hidden', placeholder: 'مثال: 1-3, 4-6, 7' });
      const every = h('input', { class: 'input hidden', type: 'number', min: 1, value: 2 });
      const mode = seg([['all', 'كل صفحة في ملف'], ['ranges', 'حسب نطاقات'], ['every', 'كل عدد من الصفحات']], 'all', v => { range.classList.toggle('hidden', v !== 'ranges'); every.classList.toggle('hidden', v !== 'every'); });
      return { el: h('div', { class: 'field', style: { gridColumn: '1/-1' } }, h('span', {}, 'طريقة التقسيم'), mode, range, every, h('small', {}, 'في وضع النطاقات يصبح كل نطاق ملفًا مستقلًا.')), get: () => ({ mode: mode.value, range: range.value, every: +every.value || 1 }) };
    },
    async run(ctx, p) {
      const { PDFDocument } = await libs.pdfLib();
      const f = ctx.files[0]; const src = await loadPdf(await readArrayBuffer(f)); const n = src.getPageCount();
      const o = ctx.opts.get(); let groups;
      if (o.mode === 'ranges') { groups = parseRanges(o.range, n); if (!groups.length) throw new Error('أدخل نطاقًا صحيحًا واحدًا على الأقل.'); }
      else { const size = o.mode === 'every' ? o.every : 1; groups = []; for (let i = 1; i <= n; i += size) groups.push(Array.from({ length: Math.min(size, n - i + 1) }, (_, k) => i + k)); }
      const outs = [];
      for (const [gi, g] of groups.entries()) {
        p(gi / groups.length, `جارٍ إنشاء الملف ${gi + 1} من ${groups.length}`);
        const d = await PDFDocument.create(); (await d.copyPages(src, g.map(x => x - 1))).forEach(pg => d.addPage(pg));
        const label = g.length === 1 ? `${g[0]}` : `${g[0]}-${g[g.length - 1]}`;
        outs.push({ name: `${baseName(f.name)}-${label}.pdf`, blob: pdfBlob(await d.save()) });
      }
      return outs;
    }
  }),

  'remove-pages': pdfCfg({
    action: 'حذف الصفحات المحددة',
    note: 'اضغط على الصفحات التي تريد حذفها لتحديدها.',
    async onFiles(ctx) { ctx.state.th = await thumbnails(ctx.extra, await readArrayBuffer(ctx.files[0]), { mode: 'select' }); },
    async run(ctx, p) {
      const del = ctx.state.th.items.filter(x => x.selected).map(x => x.index);
      if (!del.length) throw new Error('لم تحدد أي صفحة للحذف.');
      if (del.length === ctx.state.th.count) throw new Error('لا يمكن حذف جميع الصفحات.');
      const doc = await loadPdf(await readArrayBuffer(ctx.files[0]));
      del.sort((a, b) => b - a).forEach(i => doc.removePage(i));
      p(0.9, 'جارٍ الحفظ…');
      return [{ name: baseName(ctx.files[0].name) + '-edited.pdf', blob: pdfBlob(await doc.save()) }];
    }
  }),

  'extract-pages': pdfCfg({
    action: 'استخراج الصفحات', zipName: (ctx) => baseName(ctx.files[0].name) + '-pages.zip',
    note: 'اضغط على الصفحات التي تريد استخراجها لتحديدها.',
    options() { const m = seg([['one', 'في ملف واحد'], ['each', 'كل صفحة في ملف']], 'one'); return { el: h('div', { class: 'field' }, h('span', {}, 'طريقة الاستخراج'), m), get: () => ({ mode: m.value }) }; },
    async onFiles(ctx) { ctx.state.th = await thumbnails(ctx.extra, await readArrayBuffer(ctx.files[0]), { mode: 'keep' }); },
    async run(ctx, p) {
      const { PDFDocument } = await libs.pdfLib();
      const keep = ctx.state.th.items.filter(x => x.selected).map(x => x.index).sort((a, b) => a - b);
      if (!keep.length) throw new Error('لم تحدد أي صفحة.');
      const src = await loadPdf(await readArrayBuffer(ctx.files[0])); const bn = baseName(ctx.files[0].name);
      if (ctx.opts.get().mode === 'one') { const d = await PDFDocument.create(); (await d.copyPages(src, keep)).forEach(x => d.addPage(x)); return [{ name: bn + '-extracted.pdf', blob: pdfBlob(await d.save()) }]; }
      const outs = [];
      for (const i of keep) { const d = await PDFDocument.create(); d.addPage((await d.copyPages(src, [i]))[0]); outs.push({ name: `${bn}-${i + 1}.pdf`, blob: pdfBlob(await d.save()) }); }
      return outs;
    }
  }),

  organize: pdfCfg({
    action: 'حفظ الترتيب الجديد',
    note: 'اسحب الصفحات لإعادة ترتيبها، واستخدم الزرين أسفل كل صفحة لتدويرها أو حذفها.',
    async onFiles(ctx) { ctx.state.th = await thumbnails(ctx.extra, await readArrayBuffer(ctx.files[0]), { mode: 'order' }); },
    async run(ctx, p) {
      const { PDFDocument, degrees } = await libs.pdfLib();
      const items = ctx.state.th.items.filter(x => !x.deleted);
      if (!items.length) throw new Error('لا يمكن حذف جميع الصفحات.');
      const src = await loadPdf(await readArrayBuffer(ctx.files[0]));
      const d = await PDFDocument.create();
      const pages = await d.copyPages(src, items.map(x => x.index));
      pages.forEach((pg, k) => { if (items[k].rotate) pg.setRotation(degrees((pg.getRotation().angle + items[k].rotate) % 360)); d.addPage(pg); });
      return [{ name: baseName(ctx.files[0].name) + '-organized.pdf', blob: pdfBlob(await d.save()) }];
    }
  }),

  compress: pdfCfg({
    action: 'ضغط الملف',
    options() {
      const m = seg([['low', 'ضغط خفيف'], ['mid', 'ضغط موصى به'], ['high', 'ضغط قوي']], 'mid', v => hint.textContent = HINTS[v]);
      const HINTS = { low: 'يحافظ على النصوص والجودة كما هي، ويقلل الحجم بإعادة بناء بنية الملف.', mid: 'جودة جيدة وحجم أصغر بكثير. تتحول الصفحات إلى صور، فلا يمكن تحديد النص بعد الضغط.', high: 'أصغر حجم ممكن مع جودة أقل. تتحول الصفحات إلى صور.' };
      const hint = h('small', {}, HINTS.mid);
      return { el: h('div', { class: 'field', style: { gridColumn: '1/-1' } }, h('span', {}, 'مستوى الضغط'), m, hint), get: () => ({ level: m.value }) };
    },
    async run(ctx, p) {
      const { PDFDocument } = await libs.pdfLib();
      const f = ctx.files[0]; const bytes = await readArrayBuffer(f); const { level } = ctx.opts.get();
      let out;
      if (level === 'low') {
        const doc = await loadPdf(bytes); out = await doc.save({ useObjectStreams: true });
      } else {
        const [dpi, q] = level === 'mid' ? [120, 0.65] : [85, 0.45];
        const src = await pdfjsDoc(bytes); const d = await PDFDocument.create();
        for (let i = 1; i <= src.numPages; i++) {
          p((i - 1) / src.numPages, `جارٍ ضغط الصفحة ${i} من ${src.numPages}`);
          const page = await src.getPage(i); const vp = page.getViewport({ scale: 1 });
          const r = await renderPage(page, dpi / 72, 'image/jpeg', q);
          const img = await d.embedJpg(new Uint8Array(await r.blob.arrayBuffer()));
          d.addPage([vp.width, vp.height]).drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
        }
        out = await d.save({ useObjectStreams: true });
        try { const lossless = await (await loadPdf(bytes)).save({ useObjectStreams: true }); if (lossless.length < out.length) out = lossless; } catch { }
      }
      const pct = Math.round((1 - out.length / bytes.length) * 100);
      if (out.length >= bytes.length) { ctx.state.resultNote = 'الملف مضغوط مسبقًا بدرجة عالية، لذا احتفظنا بالنسخة الأصلية لأنها الأصغر.'; out = bytes; }
      else ctx.state.resultNote = `انخفض الحجم من ${fmtSize(bytes.length)} إلى ${fmtSize(out.length)} (توفير ${pct}٪).`;
      return [{ name: baseName(f.name) + '-compressed.pdf', blob: pdfBlob(out) }];
    }
  }),

  'img-to-pdf': {
    accept: IMG_ACCEPT, multiple: true, uploadLabel: 'اختر الصور', fileIcon: 'image', action: 'تحويل إلى PDF',
    validate: (f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name),
    options() {
      const size = select([['fit', 'بحجم الصورة'], ['a4', 'A4'], ['letter', 'Letter']], 'a4');
      const orient = select([['auto', 'تلقائي'], ['portrait', 'طولي'], ['landscape', 'عرضي']], 'auto');
      const margin = select([['0', 'بدون هوامش'], ['20', 'هوامش صغيرة'], ['45', 'هوامش كبيرة']], '20');
      return { el: [field('حجم الصفحة', size), field('اتجاه الصفحة', orient), field('الهوامش', margin)], get: () => ({ size: size.value, orient: orient.value, margin: +margin.value }) };
    },
    async run(ctx, p) {
      const { PDFDocument } = await libs.pdfLib(); const d = await PDFDocument.create(); const o = ctx.opts.get();
      const SIZES = { a4: [595.28, 841.89], letter: [612, 792] };
      for (const [i, f] of ctx.files.entries()) {
        p(i / ctx.files.length, `جارٍ إضافة ${f.name}`);
        let bytes = await readArrayBuffer(f); let img;
        try {
          if (/jpe?g/i.test(f.type) || /\.jpe?g$/i.test(f.name)) img = await d.embedJpg(bytes);
          else if (/png/i.test(f.type) || /\.png$/i.test(f.name)) img = await d.embedPng(bytes);
        } catch { img = null; }
        if (!img) { // تحويل الصيغ الأخرى عبر لوحة الرسم
          const bmp = await createImageBitmap(f); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
          const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0);
          img = await d.embedJpg(new Uint8Array(await (await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92))).arrayBuffer()));
        }
        let pw, ph;
        if (o.size === 'fit') { pw = img.width + o.margin * 2; ph = img.height + o.margin * 2; }
        else {
          [pw, ph] = SIZES[o.size];
          const land = o.orient === 'landscape' || (o.orient === 'auto' && img.width > img.height);
          if (land) [pw, ph] = [ph, pw];
        }
        const s = Math.min((pw - o.margin * 2) / img.width, (ph - o.margin * 2) / img.height, o.size === 'fit' ? 1 : Infinity);
        const w = img.width * s, hh = img.height * s;
        d.addPage([pw, ph]).drawImage(img, { x: (pw - w) / 2, y: (ph - hh) / 2, width: w, height: hh });
      }
      return [{ name: (ctx.files.length === 1 ? baseName(ctx.files[0].name) : 'images') + '.pdf', blob: pdfBlob(await d.save()) }];
    }
  },

  'pdf-to-img': pdfCfg({
    action: 'تحويل إلى صور', zipName: (ctx) => baseName(ctx.files[0].name) + '-images.zip',
    options() {
      const fmt = select([['jpg', 'JPG'], ['png', 'PNG']], 'jpg');
      const dpi = select([['96', 'عادية (96 نقطة/بوصة)'], ['150', 'عالية (150)'], ['300', 'عالية جدًا للطباعة (300)']], '150');
      return { el: [field('صيغة الصور', fmt), field('الجودة', dpi)], get: () => ({ fmt: fmt.value, dpi: +dpi.value }) };
    },
    async run(ctx, p) {
      const f = ctx.files[0]; const o = ctx.opts.get(); const src = await pdfjsDoc(await readArrayBuffer(f)); const outs = [];
      for (let i = 1; i <= src.numPages; i++) {
        p((i - 1) / src.numPages, `جارٍ تحويل الصفحة ${i} من ${src.numPages}`);
        const r = await renderPage(await src.getPage(i), o.dpi / 72, o.fmt === 'png' ? 'image/png' : 'image/jpeg', 0.92);
        outs.push({ name: `${baseName(f.name)}-${String(i).padStart(3, '0')}.${o.fmt}`, blob: r.blob });
      }
      return outs;
    }
  }),

  'word-to-pdf': {
    accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', multiple: true, uploadLabel: 'اختر ملفات Word', action: 'تحويل إلى PDF',
    zipName: () => 'word-to-pdf.zip',
    validate: (f) => /\.docx$/i.test(f.name),
    note: 'تدعم الأداة ملفات DOCX. للملفات القديمة بصيغة DOC احفظها أولًا بصيغة DOCX من برنامج Word. قد يختلف التنسيق قليلًا في المستندات المعقدة.',
    options() {
      const sz = select([['a4', 'A4'], ['letter', 'Letter']], 'a4');
      const mode = select([['direct', 'تنزيل مباشر (يحافظ على الشكل)'], ['print', 'عبر نافذة الطباعة (نص قابل للتحديد والبحث)']], 'direct');
      return { el: [field('حجم الصفحة', sz), field('طريقة الإنشاء', mode, 'في وضع الطباعة اختر «حفظ بتنسيق PDF» من نافذة الطباعة')], get: () => ({ size: sz.value, mode: mode.value }) };
    },
    async run(ctx, p) {
      const mammoth = await libs.mammoth(); const outs = [];
      if (ctx.opts.get().mode === 'print') {
        let html = '';
        for (const [i, f] of ctx.files.entries()) { const res = await mammoth.convertToHtml({ arrayBuffer: await f.arrayBuffer() }, { convertImage: mammoth.images.imgElement(img => img.read('base64').then(b => ({ src: `data:${img.contentType};base64,${b}` }))) }); html += (i ? '<div style="page-break-before:always"></div>' : '') + res.value; }
        printHtml(html, ctx.opts.get().size);
        ctx.state.printed = true; return null;
      }
      const html2pdf = await libs.html2pdf();
      for (const [i, f] of ctx.files.entries()) {
        p(i / ctx.files.length, `جارٍ تحويل ${f.name}`);
        const res = await mammoth.convertToHtml({ arrayBuffer: await f.arrayBuffer() }, { convertImage: mammoth.images.imgElement(img => img.read('base64').then(b => ({ src: `data:${img.contentType};base64,${b}` }))) });
        const blob = await htmlToPdf(html2pdf, res.value, ctx.opts.get().size, 'portrait');
        outs.push({ name: baseName(f.name) + '.pdf', blob });
      }
      return outs;
    }
  },

  'excel-to-pdf': {
    accept: '.xlsx,.xls,.csv,.ods', multiple: false, uploadLabel: 'اختر ملف Excel', fileIcon: 'sheet', action: 'تحويل إلى PDF',
    validate: (f) => /\.(xlsx|xls|csv|ods)$/i.test(f.name),
    options() {
      const o = select([['landscape', 'عرضي'], ['portrait', 'طولي']], 'landscape');
      const sz = select([['a4', 'A4'], ['a3', 'A3']], 'a4');
      return { el: [field('اتجاه الصفحة', o), field('حجم الصفحة', sz)], get: () => ({ orient: o.value, size: sz.value }) };
    },
    async run(ctx, p) {
      const XLSX = await libs.xlsx(); const html2pdf = await libs.html2pdf();
      const wb = XLSX.read(await ctx.files[0].arrayBuffer(), { type: 'array' });
      let html = '';
      wb.SheetNames.forEach((n, i) => {
        const sh = wb.Sheets[n]; if (!sh['!ref']) return;
        html += `${i ? '<div class="html2pdf__page-break"></div>' : ''}<h3>${n.replace(/</g, '&lt;')}</h3>` + XLSX.utils.sheet_to_html(sh, { header: '', footer: '' }).replace(/^[\s\S]*?<table/i, '<table').replace(/<\/table>[\s\S]*$/i, '</table>');
      });
      if (!html) throw new Error('الملف لا يحتوي على بيانات.');
      p(0.4, 'جارٍ إنشاء ملف PDF…');
      const o = ctx.opts.get();
      return [{ name: baseName(ctx.files[0].name) + '.pdf', blob: await htmlToPdf(html2pdf, html, o.size, o.orient, true) }];
    }
  },

  'pdf-to-word': pdfCfg({
    action: 'تحويل إلى Word',
    options() {
      const m = seg([['text', 'نص قابل للتحرير'], ['image', 'مطابق للشكل الأصلي']], 'text', v => hint.textContent = v === 'text' ? 'يستخرج النصوص في فقرات يمكنك تعديلها. لا يشمل الصور والجداول المعقدة.' : 'يضع كل صفحة صورةً في المستند فيبقى الشكل مطابقًا تمامًا، لكن النص لا يكون قابلًا للتحرير.');
      const hint = h('small', {}, 'يستخرج النصوص في فقرات يمكنك تعديلها. لا يشمل الصور والجداول المعقدة.');
      return { el: h('div', { class: 'field', style: { gridColumn: '1/-1' } }, h('span', {}, 'نوع التحويل'), m, hint), get: () => ({ mode: m.value }) };
    },
    note: 'الملفات الممسوحة ضوئيًا (صور بلا نص) تُحوَّل بوضع «مطابق للشكل الأصلي» فقط.',
    async run(ctx, p) {
      const docx = await libs.docx(); const f = ctx.files[0]; const src = await pdfjsDoc(await readArrayBuffer(f)); const mode = ctx.opts.get().mode;
      const sections = [];
      let totalText = 0;
      for (let i = 1; i <= src.numPages; i++) {
        p((i - 1) / src.numPages, `جارٍ معالجة الصفحة ${i} من ${src.numPages}`);
        const page = await src.getPage(i); const vp = page.getViewport({ scale: 1 });
        const pageProps = { page: { size: { width: Math.round(vp.width * 20), height: Math.round(vp.height * 20) }, margin: mode === 'image' ? { top: 0, bottom: 0, left: 0, right: 0 } : { top: 1000, bottom: 1000, left: 1000, right: 1000 } } };
        if (mode === 'image') {
          const r = await renderPage(page, 2, 'image/jpeg', 0.9);
          sections.push({ properties: pageProps, children: [new docx.Paragraph({ children: [new docx.ImageRun({ type: 'jpg', data: new Uint8Array(await r.blob.arrayBuffer()), transformation: { width: Math.floor(vp.width * 96 / 72) - 2, height: Math.floor(vp.height * 96 / 72) - 4 } })] })] });
        } else {
          const lines = await pageLines(page);
          totalText += lines.reduce((a, l) => a + l.text.length, 0);
          const children = lines.map(l => new docx.Paragraph({ bidirectional: l.rtl, alignment: l.rtl ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT, spacing: { before: l.gapBefore > l.size * 1.2 ? 160 : 0, after: 60 }, children: [new docx.TextRun({ text: l.text, size: Math.round(l.size * 2), sizeComplexScript: Math.round(l.size * 2), rightToLeft: l.rtl, font: 'Arial', bold: l.bold, boldComplexScript: l.bold })] }));
          sections.push({ properties: pageProps, children: children.length ? children : [new docx.Paragraph('')] });
        }
      }
      if (mode === 'text' && totalText < 5) throw new Error('لا يحتوي الملف على نص قابل للاستخراج (غالبًا ممسوح ضوئيًا). جرّب وضع «مطابق للشكل الأصلي».');
      p(0.95, 'جارٍ إنشاء مستند Word…');
      const blob = await docx.Packer.toBlob(new docx.Document({ creator: 'ITQAN Tools', sections }));
      return [{ name: baseName(f.name) + '.docx', blob }];
    }
  }),

  'pdf-to-excel': pdfCfg({
    action: 'تحويل إلى Excel',
    options() { const m = seg([['sheets', 'كل صفحة في ورقة'], ['one', 'جميع الصفحات في ورقة واحدة']], 'sheets'); return { el: h('div', { class: 'field' }, h('span', {}, 'طريقة التوزيع'), m), get: () => ({ mode: m.value }) }; },
    note: 'تعمل الأداة بأفضل صورة مع الجداول النصية الواضحة. الملفات الممسوحة ضوئيًا لا تحتوي على نص قابل للاستخراج.',
    async run(ctx, p) {
      const ExcelJS = await libs.exceljs(); const f = ctx.files[0]; const src = await pdfjsDoc(await readArrayBuffer(f)); const mode = ctx.opts.get().mode;
      const wb = new ExcelJS.Workbook(); let ws = null; let any = false;
      for (let i = 1; i <= src.numPages; i++) {
        p((i - 1) / src.numPages, `جارٍ معالجة الصفحة ${i} من ${src.numPages}`);
        const rows = await pageRows(await src.getPage(i));
        if (mode === 'sheets' || !ws) { ws = wb.addWorksheet(mode === 'sheets' ? `صفحة ${i}` : 'البيانات'); }
        const rtl = rows.some(r => r.rtl); if (rtl) ws.views = [{ rightToLeft: true }];
        rows.forEach(r => { any = true; ws.addRow(r.cells.map(c => { const n = c.replace(/[,\s]/g, ''); return /^-?\d+(\.\d+)?$/.test(n) && n.length < 15 ? Number(n) : c; })); });
        if (mode === 'one') ws.addRow([]);
        ws.columns.forEach(c => c.width = 18);
      }
      if (!any) throw new Error('لم يُعثر على نص في الملف.');
      return [{ name: baseName(f.name) + '.xlsx', blob: new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }) }];
    }
  }),

  rotate: pdfCfg({
    action: 'تدوير الصفحات',
    options() {
      const ang = seg([['90', '90° مع عقارب الساعة'], ['180', '180°'], ['270', '90° عكس عقارب الساعة']], '90');
      const pages = pageSelector('الصفحات', 0);
      return { el: [h('div', { class: 'field' }, h('span', {}, 'زاوية التدوير'), ang), pages.el], get: () => ({ angle: +ang.value, pages }) };
    },
    async run(ctx) {
      const { degrees } = await libs.pdfLib(); const doc = await loadPdf(await readArrayBuffer(ctx.files[0])); const o = ctx.opts.get();
      const sel = o.pages.get(doc.getPageCount());
      sel.forEach(n => { const pg = doc.getPage(n - 1); pg.setRotation(degrees((pg.getRotation().angle + o.angle) % 360)); });
      return [{ name: baseName(ctx.files[0].name) + '-rotated.pdf', blob: pdfBlob(await doc.save()) }];
    }
  }),

  watermark: pdfCfg({
    action: 'إضافة العلامة المائية',
    options() {
      const kind = seg([['text', 'نص'], ['image', 'صورة']], 'text', v => { textBox.classList.toggle('hidden', v !== 'text'); imgBox.classList.toggle('hidden', v !== 'image'); });
      const text = h('input', { class: 'input', value: 'سري' });
      const color = h('input', { class: 'input', type: 'color', value: '#d00000', style: { height: '42px', padding: '4px' } });
      const size = h('input', { class: 'input', type: 'number', value: 60, min: 8, max: 300 });
      const textBox = h('div', { class: 'opts', style: { gridColumn: '1/-1', marginTop: 0 } }, field('نص العلامة', text), field('اللون', color), field('حجم الخط', size));
      const img = h('input', { class: 'input', type: 'file', accept: 'image/png,image/jpeg' });
      const imgScale = h('input', { class: 'input', type: 'number', value: 40, min: 5, max: 100 });
      const imgBox = h('div', { class: 'opts hidden', style: { gridColumn: '1/-1', marginTop: 0 } }, field('صورة العلامة (PNG أو JPG)', img), field('عرض الصورة ٪ من عرض الصفحة', imgScale));
      const opacity = select([['0.15', '15٪'], ['0.3', '30٪'], ['0.5', '50٪'], ['0.75', '75٪'], ['1', '100٪']], '0.3');
      const rot = select([['45', 'مائل 45°'], ['0', 'أفقي'], ['-45', 'مائل -45°'], ['90', 'رأسي']], '45');
      const layout = select([['center', 'في منتصف الصفحة'], ['tile', 'متكرر على الصفحة']], 'center');
      const pages = pageSelector('الصفحات');
      return { el: [h('div', { class: 'field', style: { gridColumn: '1/-1' } }, h('span', {}, 'نوع العلامة'), kind), textBox, imgBox, field('الشفافية', opacity), field('الاتجاه', rot), field('التوزيع', layout), pages.el], get: () => ({ kind: kind.value, text: text.value, color: color.value, size: +size.value, img: img.files[0], imgScale: +imgScale.value / 100, opacity: +opacity.value, rot: +rot.value, layout: layout.value, pages }) };
    },
    async run(ctx, p) {
      const { degrees } = await libs.pdfLib(); const o = ctx.opts.get(); const doc = await loadPdf(await readArrayBuffer(ctx.files[0]));
      let emb, baseW, baseH;
      if (o.kind === 'text') {
        if (!o.text.trim()) throw new Error('اكتب نص العلامة المائية.');
        const r = await textToPng(o.text, { size: o.size, color: o.color, weight: 800 }); emb = await doc.embedPng(r.bytes); baseW = r.width; baseH = r.height;
      } else {
        if (!o.img) throw new Error('اختر صورة العلامة المائية.');
        const b = await readArrayBuffer(o.img); emb = /png/i.test(o.img.type) ? await doc.embedPng(b) : await doc.embedJpg(b); baseW = emb.width; baseH = emb.height;
      }
      const th = o.rot * Math.PI / 180;
      for (const n of o.pages.get(doc.getPageCount())) {
        const pg = doc.getPage(n - 1); const { width: W, height: H } = pg.getSize();
        let w = baseW, hh = baseH;
        if (o.kind === 'image') { w = W * o.imgScale; hh = baseH * w / baseW; }
        const draw = (cx, cy) => pg.drawImage(emb, { x: cx - (w / 2 * Math.cos(th) - hh / 2 * Math.sin(th)), y: cy - (w / 2 * Math.sin(th) + hh / 2 * Math.cos(th)), width: w, height: hh, rotate: degrees(o.rot), opacity: o.opacity });
        if (o.layout === 'center') draw(W / 2, H / 2);
        else { const sx = Math.max(w, hh) * 1.3, sy = Math.max(hh * 3, sx * 0.7); for (let y = sy / 2; y < H; y += sy) for (let x = sx / 2; x < W + sx; x += sx) draw(x, y); }
      }
      return [{ name: baseName(ctx.files[0].name) + '-watermarked.pdf', blob: pdfBlob(await doc.save()) }];
    }
  }),

  'page-numbers': pdfCfg({
    action: 'إضافة أرقام الصفحات',
    options() {
      const pos = select([['bc', 'أسفل الوسط'], ['br', 'أسفل اليمين'], ['bl', 'أسفل اليسار'], ['tc', 'أعلى الوسط'], ['tr', 'أعلى اليمين'], ['tl', 'أعلى اليسار']], 'bc');
      const fmt = select([['n', '1'], ['n/t', '1 / 10'], ['page', 'صفحة 1'], ['page-of', 'صفحة 1 من 10'], ['dash', '- 1 -']], 'n');
      const digits = select([['latin', 'أرقام 1 2 3'], ['arabic', 'أرقام ١ ٢ ٣']], 'latin');
      const start = h('input', { class: 'input', type: 'number', value: 1 });
      const size = h('input', { class: 'input', type: 'number', value: 12, min: 6, max: 48 });
      const skipFirst = h('input', { type: 'checkbox' });
      return { el: [field('الموضع', pos), field('التنسيق', fmt), field('شكل الأرقام', digits), field('يبدأ الترقيم من', start), field('حجم الخط', size), h('label', { class: 'check' }, skipFirst, 'عدم ترقيم الصفحة الأولى (الغلاف)')], get: () => ({ pos: pos.value, fmt: fmt.value, digits: digits.value, start: +start.value || 1, size: +size.value || 12, skipFirst: skipFirst.checked }) };
    },
    async run(ctx, p) {
      const o = ctx.opts.get(); const doc = await loadPdf(await readArrayBuffer(ctx.files[0])); const n = doc.getPageCount();
      const pages = doc.getPages(); const first = o.skipFirst ? 1 : 0; const total = n - first + o.start - 1;
      for (let i = first; i < n; i++) {
        p(i / n, `جارٍ ترقيم الصفحة ${i + 1}`);
        const k = i - first + o.start;
        let label = { n: `${k}`, 'n/t': `${k} / ${total}`, page: `صفحة ${k}`, 'page-of': `صفحة ${k} من ${total}`, dash: `- ${k} -` }[o.fmt];
        if (o.digits === 'arabic') label = toArabicDigits(label);
        const r = await textToPng(label, { size: o.size, color: '#222222', weight: 600 }); const img = await doc.embedPng(r.bytes);
        const pg = pages[i]; const { width: W, height: H } = pg.getSize(); const m = 24;
        const x = o.pos[1] === 'c' ? (W - r.width) / 2 : o.pos[1] === 'r' ? W - m - r.width : m;
        const y = o.pos[0] === 'b' ? m - r.height * 0.25 : H - m - r.height * 0.75;
        pg.drawImage(img, { x, y, width: r.width, height: r.height });
      }
      return [{ name: baseName(ctx.files[0].name) + '-numbered.pdf', blob: pdfBlob(await doc.save()) }];
    }
  }),

  sign: pdfCfg({
    action: 'توقيع الملف',
    options(ctx) {
      const pad = h('canvas', { class: 'sig-pad', width: 700, height: 220 });
      const g = pad.getContext('2d'); let drawing = false, drawn = false;
      const pen = h('input', { type: 'color', value: '#0b3d91', class: 'input', style: { width: '60px', height: '36px', padding: '2px' } });
      const pos = (e) => { const r = pad.getBoundingClientRect(); return [(e.clientX - r.left) * pad.width / r.width, (e.clientY - r.top) * pad.height / r.height]; };
      pad.onpointerdown = (e) => { drawing = true; drawn = true; pad.setPointerCapture(e.pointerId); g.beginPath(); g.moveTo(...pos(e)); g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = pen.value; };
      pad.onpointermove = (e) => { if (!drawing) return; g.lineTo(...pos(e)); g.stroke(); };
      pad.onpointerup = () => drawing = false;
      const clear = h('button', { class: 'btn light sm', type: 'button', onclick: () => { g.clearRect(0, 0, pad.width, pad.height); drawn = false; } }, 'مسح التوقيع');
      const upload = h('input', { class: 'input', type: 'file', accept: 'image/png,image/jpeg' });
      const typed = h('input', { class: 'input', placeholder: 'اكتب اسمك' });
      const kind = seg([['draw', 'رسم التوقيع'], ['upload', 'رفع صورة التوقيع'], ['type', 'كتابة الاسم']], 'draw', v => { drawBox.classList.toggle('hidden', v !== 'draw'); upBox.classList.toggle('hidden', v !== 'upload'); typeBox.classList.toggle('hidden', v !== 'type'); });
      const drawBox = h('div', { style: { gridColumn: '1/-1' } }, pad, h('div', { class: 'row', style: { marginTop: '6px' } }, clear, h('span', { class: 'muted' }, 'لون القلم'), pen));
      const upBox = h('div', { class: 'hidden', style: { gridColumn: '1/-1' } }, field('صورة التوقيع (يفضّل PNG بخلفية شفافة)', upload));
      const typeBox = h('div', { class: 'hidden', style: { gridColumn: '1/-1' } }, field('الاسم', typed));
      const where = select([['br', 'أسفل اليمين'], ['bl', 'أسفل اليسار'], ['bc', 'أسفل الوسط'], ['tr', 'أعلى اليمين'], ['tl', 'أعلى اليسار']], 'bl');
      const width = h('input', { class: 'input', type: 'number', value: 30, min: 5, max: 90 });
      const pages = select([['last', 'الصفحة الأخيرة'], ['first', 'الصفحة الأولى'], ['all', 'جميع الصفحات']], 'last');
      return {
        el: [h('div', { class: 'field', style: { gridColumn: '1/-1' } }, h('span', {}, 'طريقة التوقيع'), kind), drawBox, upBox, typeBox, field('موضع التوقيع', where), field('عرض التوقيع ٪ من عرض الصفحة', width), field('الصفحات', pages)],
        async getImage() {
          if (kind.value === 'draw') { if (!drawn) throw new Error('ارسم توقيعك أولًا.'); return { bytes: new Uint8Array(await (await new Promise(r => pad.toBlob(r, 'image/png'))).arrayBuffer()), png: true, trim: true }; }
          if (kind.value === 'upload') { const f = upload.files[0]; if (!f) throw new Error('اختر صورة التوقيع.'); return { bytes: await readArrayBuffer(f), png: /png/i.test(f.type) }; }
          if (!typed.value.trim()) throw new Error('اكتب اسمك.'); const r = await textToPng(typed.value, { size: 64, color: pen.value, weight: 700 }); return { bytes: r.bytes, png: true };
        },
        get: () => ({ where: where.value, width: +width.value / 100, pages: pages.value }),
      };
    },
    async run(ctx) {
      const o = ctx.opts.get(); const im = await ctx.opts.getImage(); const doc = await loadPdf(await readArrayBuffer(ctx.files[0]));
      let bytes = im.bytes;
      if (im.trim) bytes = await trimPng(bytes);
      const emb = im.png ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      const n = doc.getPageCount(); const idx = o.pages === 'all' ? [...Array(n).keys()] : [o.pages === 'first' ? 0 : n - 1];
      for (const i of idx) {
        const pg = doc.getPage(i); const { width: W, height: H } = pg.getSize(); const w = W * o.width; const hh = emb.height * w / emb.width; const m = 36;
        const x = o.where[1] === 'c' ? (W - w) / 2 : o.where[1] === 'r' ? W - m - w : m; const y = o.where[0] === 'b' ? m : H - m - hh;
        pg.drawImage(emb, { x, y, width: w, height: hh });
      }
      return [{ name: baseName(ctx.files[0].name) + '-signed.pdf', blob: pdfBlob(await doc.save()) }];
    }
  }),
};

/* ============ دوال مساعدة للتحويلات ============ */

function printHtml(html, size) {
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-9999px';
  document.body.append(f);
  const d = f.contentDocument;
  d.open(); d.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>@font-face{font-family:Cairo;src:url(/vendor/fonts/cairo-arabic-wght-normal.woff2)}@page{size:${size === 'letter' ? 'letter' : 'A4'};margin:18mm}body{font-family:Cairo,Arial,sans-serif;font-size:12pt;line-height:1.6;color:#111}p,li,h1,h2,h3,td{unicode-bidi:plaintext;text-align:start}img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:3px 6px}</style></head><body dir="auto">${html}</body></html>`); d.close();
  setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 60000); }, 600);
}

async function htmlToPdf(html2pdf, html, size, orientation, table = false) {
  const el = document.createElement('div');
  el.setAttribute('dir', 'auto');
  el.innerHTML = `<style>
    .doc{font-family:Cairo,Arial,sans-serif;color:#111;font-size:12pt;line-height:1.6;unicode-bidi:plaintext}
    .doc p,.doc li,.doc h1,.doc h2,.doc h3,.doc td{unicode-bidi:plaintext;text-align:start}
    .doc img{max-width:100%;height:auto}
    .doc table{border-collapse:collapse;width:100%;margin:6px 0;font-size:${table ? '10.5pt' : '11pt'}}
    .doc td,.doc th{border:1px solid #999;padding:3px 6px;vertical-align:top}
  </style><div class="doc">${html}</div>`;
  el.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + (orientation === 'landscape' ? (size === 'a3' ? 1500 : 1050) : 760) + 'px;background:#fff;padding:0';
  document.body.append(el);
  try {
    await document.fonts.ready;
    return await html2pdf().set({ margin: [12, 12, 12, 12], image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' }, jsPDF: { unit: 'mm', format: size, orientation }, pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'img'] } }).from(el.firstElementChild.nextElementSibling || el).outputPdf('blob');
  } finally { el.remove(); }
}

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

async function textItems(page) {
  const tc = await page.getTextContent();
  const vp = page.getViewport({ scale: 1 });
  return tc.items.filter(it => it.str && it.str.trim()).map(it => {
    it = { ...it, str: it.str.normalize('NFKC') };
    const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
    const size = Math.hypot(it.transform[2], it.transform[3]) || it.height || 10;
    const font = tc.styles[it.fontName]?.fontFamily || '';
    return { str: it.str, x, y, w: it.width, size, rtl: it.dir === 'rtl' || ARABIC.test(it.str), bold: /bold|black|heavy/i.test(it.fontName + font) };
  });
}
function groupLines(items) {
  items.sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  for (const it of items) {
    const ln = lines.find(l => Math.abs(l.y - it.y) < Math.max(2.5, it.size * 0.45));
    if (ln) ln.items.push(it); else lines.push({ y: it.y, items: [it] });
  }
  lines.sort((a, b) => a.y - b.y);
  return lines;
}
async function pageLines(page) {
  const lines = groupLines(await textItems(page));
  let prevY = null;
  return lines.map(l => {
    const rtl = l.items.filter(i => i.rtl).length >= l.items.length / 2;
    l.items.sort((a, b) => rtl ? b.x - a.x : a.x - b.x);
    let text = '';
    l.items.forEach((it, k) => {
      if (k) { const prev = l.items[k - 1]; const gap = rtl ? prev.x - (it.x + it.w) : it.x - (prev.x + prev.w); if (gap > it.size * 0.15 && !/\s$/.test(text) && !/^\s/.test(it.str)) text += ' '; }
      text += it.str;
    });
    const size = Math.max(...l.items.map(i => i.size));
    const r = { text: text.replace(/\s+/g, ' ').trim(), rtl, size: Math.min(Math.max(size, 7), 40), bold: l.items.every(i => i.bold), gapBefore: prevY == null ? 0 : l.y - prevY };
    prevY = l.y; return r;
  }).filter(l => l.text);
}
async function pageRows(page) {
  const lines = groupLines(await textItems(page));
  return lines.map(l => {
    const rtl = l.items.filter(i => i.rtl).length >= l.items.length / 2;
    l.items.sort((a, b) => rtl ? b.x - a.x : a.x - b.x);
    const cells = []; let cur = '';
    l.items.forEach((it, k) => {
      if (k) { const prev = l.items[k - 1]; const gap = rtl ? prev.x - (it.x + it.w) : it.x - (prev.x + prev.w); if (gap > it.size * 0.3) { cells.push(cur.trim()); cur = ''; } else if (gap > it.size * 0.15) cur += ' '; }
      cur += it.str;
    });
    cells.push(cur.trim());
    return { cells, rtl };
  });
}
async function trimPng(bytes) {
  const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; const g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 <= x0) return bytes;
  const pad = 6; const t = document.createElement('canvas'); t.width = x1 - x0 + pad * 2; t.height = y1 - y0 + pad * 2;
  t.getContext('2d').drawImage(c, x0 - pad, y0 - pad, t.width, t.height, 0, 0, t.width, t.height);
  return new Uint8Array(await (await new Promise(r => t.toBlob(r, 'image/png'))).arrayBuffer());
}

export function renderPdfTool(id, body, t) {
  const cfg = TOOLS[id];
  if (!cfg) { body.append(h('div', { class: 'note err' }, 'هذه الأداة غير متاحة.')); return; }
  const c = { ...cfg };
  const userOpts = cfg.options;
  if (userOpts) c.options = (ctx) => { const o = userOpts(ctx); if (Array.isArray(o.el)) o.el = h('div', { style: { display: 'contents' } }, o.el); return o; };
  fileTool(body, t, c);
}
