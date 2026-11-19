// محرر العناصر التفاعلي (مثل Edit All في Foxit)
import { h, ico, toast, libs, seg } from '../ui.js';
import { pageObjects, same, applyObjectEdits, TYPE_AR } from './objects.js';
import { mul } from './engine.js';

const ap = (m, x, y) => [x * m[0] + y * m[2] + m[4], x * m[1] + y * m[3] + m[5]];
const tb = (bb, G) => { if (!G) return bb; const p = [ap(G, bb[0], bb[1]), ap(G, bb[2], bb[1]), ap(G, bb[0], bb[3]), ap(G, bb[2], bb[3])]; return [Math.min(...p.map(q => q[0])), Math.min(...p.map(q => q[1])), Math.max(...p.map(q => q[0])), Math.max(...p.map(q => q[1]))]; };

export function objectEditor({ bytes, pdf, textByPage }) {
  const N = pdf.numPages;
  let P = null, all = null, cur = 0, scope = 'all', showAll = false;
  const edits = [], undo = [];
  let sel = []; // عناصر الصفحة الحالية المحددة (من القائمة الأصلية)
  let resultBytes = bytes, resultDoc = pdf, dirty = false;

  const info = h('div', { class: 'oe-info muted' }, 'اضغط على أي عنصر لتحديده، أو اسحب مستطيلًا حول عدة عناصر. اسحب العنصر المحدد لتحريكه.');
  const pageLbl = h('b', {});
  const pageSel = h('select', { class: 'input', style: { width: 'auto' }, 'aria-label': 'الانتقال إلى صفحة' }, Array.from({ length: N }, (_, i) => h('option', { value: i }, `الصفحة ${i + 1}`)));
  pageSel.onchange = () => go(+pageSel.value);
  const stage = h('div', { class: 'oe-stage' });
  const pct = h('input', { class: 'input', type: 'number', value: 100, min: 5, max: 500, style: { width: '84px' }, dir: 'ltr' });
  const btn = (icon, t, fn, cls = 'btn light sm') => h('button', { class: cls, type: 'button', onclick: fn }, ico(icon, 15), t);
  const el = h('div', { class: 'oe' },
    h('div', { class: 'oe-bar' },
      btn('arrow-right', '', () => go(cur - 1)), pageSel, pageLbl, btn('arrow-left', '', () => go(cur + 1)),
      h('span', { class: 'spacer' }),
      seg([['all', 'على كل الصفحات التي يتكرر فيها'], ['page', 'على هذه الصفحة فقط']], scope, v => { scope = v; }),
      h('label', { class: 'check' }, (() => { const c = h('input', { type: 'checkbox' }); c.onchange = () => { showAll = c.checked; paint(); }; return c; })(), 'إظهار حدود كل العناصر')),
    h('div', { class: 'oe-bar' },
      btn('trash-2', 'حذف', () => act({ del: true }), 'btn sm danger'),
      btn('zoom-in', 'تكبير 10%', () => scaleBy(1.1)), btn('zoom-out', 'تصغير 10%', () => scaleBy(1 / 1.1)),
      h('span', { class: 'row', style: { gap: '4px' } }, pct, h('span', {}, '%'), btn('maximize', 'تطبيق الحجم', () => scaleBy((+pct.value || 100) / 100))),
      btn('undo-2', 'تراجع', doUndo), btn('x', 'إلغاء التحديد', () => { sel = []; paint(); })),
    info, stage);

  async function init() {
    P = await libs.pdfLib();
    const doc = await P.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    all = doc.getPages().map((pg, i) => pageObjects(P, doc, pg, textByPage[i]).objects);
    await render();
  }
  const go = (i) => { if (i < 0 || i >= N) return; cur = i; sel = []; render(); };
  const editFor = (o, pi) => edits.find(e => same(e.proto, o) && (e.scope === 'all' || e.page === pi));
  const repeats = (o) => all.filter(objs => objs.some(x => same(o, x))).length;

  function act({ del, G }) {
    if (!sel.length) return toast('حدّد عنصرًا أولًا.', true);
    if (G && sel.some(o => o.type === 'text')) toast('النصوص تُحذف فقط؛ التحريك وتغيير الحجم للصور والأشكال والعناصر المركّبة.', true, 5000);
    undo.push(JSON.stringify(edits));
    for (const o of sel) {
      if (G && o.type === 'text') continue;
      let e = edits.find(x => same(x.proto, o) && x.scope === scope && (scope === 'all' || x.page === cur));
      if (!e) { e = { proto: { type: o.type, sig: o.sig, bbox: o.bbox, str: o.str }, scope, page: cur, del: false, G: null }; edits.push(e); }
      if (del) e.del = true; else e.G = e.G ? mul(e.G, G) : G;
    }
    if (del) sel = [];
    dirty = true; render();
  }
  function scaleBy(s) {
    if (!sel.length) return toast('حدّد عنصرًا أولًا.', true);
    // التكبير حول مركز التحديد الحالي
    const bbs = sel.map(o => tb(o.bbox, editFor(o, cur)?.G)); const cx = (Math.min(...bbs.map(b => b[0])) + Math.max(...bbs.map(b => b[2]))) / 2, cy = (Math.min(...bbs.map(b => b[1])) + Math.max(...bbs.map(b => b[3]))) / 2;
    act({ G: [s, 0, 0, s, cx - s * cx, cy - s * cy] });
  }
  function doUndo() { if (!undo.length) return; const prev = JSON.parse(undo.pop()); edits.length = 0; edits.push(...prev); dirty = true; render(); }

  /* ---------- العرض ---------- */
  let vp = null, canvas = null, ov = null;
  async function render() {
    pageLbl.textContent = `من ${N}`; pageSel.value = cur;
    if (dirty) { const r = await applyObjectEdits(P, bytes, edits, textByPage); resultBytes = r.bytes; resultDoc = await (await libs.pdfjs()).getDocument({ data: resultBytes.slice(), isEvalSupported: false }).promise; dirty = false; }
    const page = await resultDoc.getPage(cur + 1), v0 = page.getViewport({ scale: 1 });
    // تُعرض الصفحة كاملة داخل ارتفاع الشاشة لسهولة التحرير
    const fitH = Math.max(420, (window.innerHeight || 900) - 170);
    vp = page.getViewport({ scale: Math.min(1.8, 820 / v0.width, fitH / v0.height) });
    canvas = h('canvas', { width: Math.ceil(vp.width), height: Math.ceil(vp.height) });
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    ov = h('div', { class: 'oe-ov' });
    stage.innerHTML = ''; const wrap = h('div', { class: 'oe-wrap' }, canvas, ov); stage.append(wrap);
    bindPointer(wrap); paint();
  }
  const toPx = (bb) => { const [a, b] = vp.convertToViewportPoint(bb[0], bb[1]), [c, d] = vp.convertToViewportPoint(bb[2], bb[3]); const k = canvas.clientWidth / canvas.width || 1; return { left: Math.min(a, c) * k, top: Math.min(b, d) * k, width: Math.abs(c - a) * k, height: Math.abs(d - b) * k }; };
  const visible = () => (all?.[cur] || []).map(o => { const e = editFor(o, cur); return e?.del ? null : { o, bb: tb(o.bbox, e?.G) }; }).filter(Boolean);
  function paint(drag) {
    if (!ov) return; ov.innerHTML = '';
    for (const { o, bb } of visible()) {
      const isSel = sel.includes(o); if (!isSel && !showAll) continue;
      let r = toPx(bb); if (isSel && drag) r = { ...r, left: r.left + drag[0], top: r.top + drag[1] };
      ov.append(h('div', { class: 'oe-box' + (isSel ? ' sel' : '') + ' t-' + o.type, style: Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v + 'px'])) }));
    }
    if (sel.length) {
      const kinds = [...new Set(sel.map(o => TYPE_AR[o.type]))].join('، ');
      const rep = Math.max(...sel.map(repeats));
      info.textContent = `المحدد: ${sel.length === 1 ? kinds : sel.length + ' عناصر (' + kinds + ')'} — يتكرر في ${rep} من ${N} ${N > 2 && N <= 10 ? 'صفحات' : 'صفحة'}. ${scope === 'all' ? 'التعديل سيُطبَّق على كل الصفحات التي يتكرر فيها.' : 'التعديل على هذه الصفحة فقط.'} (Delete للحذف، والأسهم للتحريك)`;
      info.classList.remove('muted');
    } else { info.textContent = 'اضغط على أي عنصر لتحديده، أو اسحب مستطيلًا حول عدة عناصر. اسحب العنصر المحدد لتحريكه.'; info.classList.add('muted'); }
  }

  /* ---------- الفأرة ولوحة المفاتيح ---------- */
  function bindPointer(wrap) {
    let mode = null, s = null, box = null;
    const pt = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const k = () => canvas.width / canvas.clientWidth;
    const pdfPt = ([x, y]) => vp.convertToPdfPoint(x * k(), y * k());
    const hit = (p) => { const [x, y] = pdfPt(p); const cands = visible().filter(({ bb }) => x >= bb[0] - 1 && x <= bb[2] + 1 && y >= bb[1] - 1 && y <= bb[3] + 1); cands.sort((a, b) => (a.bb[2] - a.bb[0]) * (a.bb[3] - a.bb[1]) - (b.bb[2] - b.bb[0]) * (b.bb[3] - b.bb[1])); return cands[0]?.o || null; };
    wrap.onpointerdown = (e) => {
      wrap.focus(); s = pt(e); const o = hit(s);
      if (o && sel.includes(o)) mode = 'move';
      else if (o) { sel = e.shiftKey ? [...sel, o] : [o]; mode = 'move'; paint(); }
      else { mode = 'marquee'; if (!e.shiftKey) sel = []; box = h('div', { class: 'oe-marq' }); ov.append(box); }
      wrap.setPointerCapture(e.pointerId);
    };
    wrap.onpointermove = (e) => {
      if (!mode) return; const p = pt(e);
      if (mode === 'move') paint([p[0] - s[0], p[1] - s[1]]);
      else Object.assign(box.style, { left: Math.min(s[0], p[0]) + 'px', top: Math.min(s[1], p[1]) + 'px', width: Math.abs(p[0] - s[0]) + 'px', height: Math.abs(p[1] - s[1]) + 'px' });
    };
    wrap.onpointerup = (e) => {
      const p = pt(e), m = mode; mode = null;
      if (m === 'move') {
        if (Math.hypot(p[0] - s[0], p[1] - s[1]) < 3) { paint(); return; }
        const a = pdfPt(s), b = pdfPt(p); act({ G: [1, 0, 0, 1, b[0] - a[0], b[1] - a[1]] });
      } else if (m === 'marquee') {
        const a = pdfPt(s), b = pdfPt(p), x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
        if (x1 - x0 > 2 && y1 - y0 > 2) for (const { o, bb } of visible()) if (bb[0] >= x0 - 1 && bb[2] <= x1 + 1 && bb[1] >= y0 - 1 && bb[3] <= y1 + 1 && !sel.includes(o)) sel.push(o);
        paint();
      }
    };
    wrap.tabIndex = 0;
    wrap.onkeydown = (e) => {
      if (!sel.length) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); act({ del: true }); return; }
      const st = e.shiftKey ? 10 : 1, mv = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, st], ArrowDown: [0, -st] }[e.key];
      if (mv) { e.preventDefault(); act({ G: [1, 0, 0, 1, mv[0], mv[1]] }); }
    };
  }

  init().catch(e => { console.error(e); stage.append(h('div', { class: 'note err' }, 'تعذّر تحليل عناصر الصفحات: ' + e.message)); });
  return {
    el,
    hasEdits: () => edits.some(e => e.del || e.G),
    edits: () => edits.filter(e => e.del || e.G),
    async bytes() { if (dirty || !edits.length) { const r = await applyObjectEdits(P || await libs.pdfLib(), bytes, edits, textByPage); return r.bytes; } return resultBytes; },
    count: () => edits.filter(e => e.del || e.G).length,
  };
}
