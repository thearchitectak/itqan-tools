// أداة «مصحح ورق التظليل»: تقرأ أوراق الإجابة المظللة وتصححها داخل المتصفح.
// لا تستخدم الذكاء الاصطناعي، ولا ترفع أي صورة إلى خادم؛ المحرك في engine.js.
import { h, libs, loadScript, download } from '../ui.js';
import { aiPicker, vision } from '../ai-tools.js';

const AR = ['أ', 'ب', 'ج', 'د', 'هـ'], EN = ['A', 'B', 'C', 'D', 'E'];
const arNum = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const TW = 1200, BAND = 76, LS = 'omr-saved-keys-v1';
const safe = s => String(s).replace(/[\\/:*?"<>|]/g, '-');

/* ---------- المحرك: عامل خلفي، ومع تعذّره يعمل في الصفحة نفسها ---------- */
let worker = null, jobs = new Map(), jobId = 0, inlineReady = null;
function startWorker() {
  if (worker !== null) return;
  try {
    worker = new Worker('/assets/js/omr/worker.js');
    worker.onmessage = e => { const j = jobs.get(e.data.id); jobs.delete(e.data.id); if (j) e.data.ok ? j.res(e.data.res) : j.rej(new Error(e.data.err)); };
    worker.onerror = () => { const pend = [...jobs.values()]; jobs.clear(); worker.terminate(); worker = false; pend.forEach(j => j.retry()); };
  } catch (e) { worker = false; }
}
function gradeInline(data, w, h_, opts, rtl, expect) {
  inlineReady = inlineReady || loadScript('/assets/js/omr/engine.js');
  return inlineReady.then(() => new Promise((res, rej) => setTimeout(() => {
    try { const r = window.OMR.gradeSheet(data, w, h_, opts, rtl, expect); delete r.img; res(r); } catch (e) { rej(e); }
  }, 20)));
}
function grade(imgData, w, h_, opts, rtl, expect) {
  expect = expect || null; startWorker();
  if (!worker) return gradeInline(imgData.data, w, h_, opts, rtl, expect);
  return new Promise((res, rej) => {
    const id = ++jobId;
    jobs.set(id, { res, rej, retry: () => gradeInline(imgData.data, w, h_, opts, rtl, expect).then(res, rej) });
    const buf = imgData.data.buffer.slice(0);
    worker.postMessage({ id, buf, w, h: h_, opts, rtl, expect }, [buf]);
  });
}

/* ---------- قراءة الملفات ---------- */
function toCanvas(src, sw, sh) {
  const c = document.createElement('canvas'); c.width = TW; c.height = Math.round(sh * TW / sw);
  const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(src, 0, 0, c.width, c.height); return c;
}
async function fileToPages(file) {
  const base = file.name.replace(/\.[^.]+$/, '');
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    let lib; try { lib = await libs.pdfjs(); } catch (e) { throw new Error('LOAD'); }
    const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise; const out = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p), vp0 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: 1600 / vp0.width });
      const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: x, viewport: vp }).promise;
      out.push({ name: doc.numPages > 1 ? `${base} - صفحة ${arNum(p)}` : base, canvas: toCanvas(c, c.width, c.height) });
    }
    return out;
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('IMG')); i.src = url; });
    return [{ name: base, canvas: toCanvas(img, img.naturalWidth, img.naturalHeight) }];
  } finally { URL.revokeObjectURL(url); }
}
const canvasBlob = c => new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
function fileError(e, name) {
  const m = String((e && e.message) || e);
  if (m.includes('GRID_NOT_FOUND')) return `${name}: تعذّر العثور على شبكة الدوائر. صوّر الورقة كاملة ومستوية وفي إضاءة أوضح.`;
  if (m.startsWith('IMG')) return `${name}: لا يستطيع المتصفح فتح هذا الملف صورةً. إن كانت صورة من آيفون بصيغة HEIC فحوّلها إلى JPG أولًا.`;
  if (m.startsWith('LOAD')) return `${name}: تعذّر تحميل قارئ ملفات PDF. جرّب رفع صورة بدلًا منه.`;
  return `${name}: حدثت مشكلة في قراءة الملف.`;
}

/* ---------- الواجهة ---------- */
export function renderOmr(body) {
  const state = { opts: 4, rtl: true, key: null, sheets: [], sel: -1 };
  const letters = () => (state.rtl ? AR : EN);
  const el = {};
  const E = (name, node) => (el[name] = node);

  const sec = (num, title, hint, ...kids) => h('section', { class: 'omr-card' },
    h('div', { class: 'omr-head' }, h('span', { class: 'omr-step' }, num), h('h2', {}, title), hint ? h('p', { class: 'omr-hint' }, hint) : null), ...kids);
  const drop = (id, title, hint, multiple) => {
    const inp = E(id + 'In', h('input', { type: 'file', accept: 'image/*,application/pdf', multiple: multiple || null, hidden: true }));
    return E(id, h('label', { class: 'omr-drop', tabindex: '0' }, h('strong', {}, title), h('span', { class: 'omr-hint' }, hint), inp));
  };

  const picker = aiPicker('omr', { note: 'ويقرأ الذكاء الاصطناعي اسم الطالب ورقمه أيضًا، ويعمل قارئًا ثانيًا يؤكد قراءة الجهاز.' });
  const optSel = E('optN', h('select', { class: 'input' }, h('option', { value: '3' }, '٣'), h('option', { value: '4', selected: true }, '٤'), h('option', { value: '5' }, '٥')));
  const dirSel = E('optDir', h('select', { class: 'input' }, h('option', { value: 'rtl', selected: true }, 'عربية (أ ب ج د)'), h('option', { value: 'ltr' }, 'إنجليزية (A B C D)')));

  body.append(h('div', { class: 'omr' },
    h('p', { class: 'omr-lead' }, 'ارفع نموذج الإجابة ثم أوراق الطلاب. يجري التصحيح كاملًا على جهازك، فلا تُرفع الصور إلى أي مكان، ولا يُستخدم الذكاء الاصطناعي.'),
    sec('١', 'نموذج الإجابة', 'صورة أو ملف PDF لورقة تظليل ظُلِّلت عليها الإجابات الصحيحة. السؤال غير المظلل في النموذج لا يدخل في الدرجة.',
      h('div', { class: 'omr-row' },
        h('label', { class: 'omr-inline' }, 'عدد الاختيارات', optSel),
        h('label', { class: 'omr-inline' }, 'لغة الورقة', dirSel)),
      E('savedBox', h('div', { class: 'omr-col', hidden: true }, h('p', { class: 'omr-hint' }, 'النماذج المحفوظة على هذا الجهاز:'), E('savedList', h('div', { class: 'omr-saved' })))),
      drop('dropKey', 'اختر ملف النموذج أو اسحبه إلى هنا', 'JPG أو PNG أو PDF', false),
      E('keyStatus', h('div', { class: 'omr-status', role: 'status' })),
      E('keyView', h('div', { class: 'omr-col', hidden: true },
        h('div', { class: 'omr-row' },
          h('div', { class: 'omr-grow' }, E('keySummary', h('b')), h('p', { class: 'omr-hint' }, 'اضغط أي دائرة لتعديل الإجابة، والضغط على الإجابة المظللة يستبعد السؤال من التصحيح.')),
          E('keyName', h('input', { type: 'text', class: 'input', placeholder: 'اسم الاختبار (للحفظ)', 'aria-label': 'اسم الاختبار' })),
          E('keySave', h('button', { class: 'omr-btn', type: 'button' }, 'حفظ النموذج'))),
        h('div', { class: 'omr-gridwrap' }, E('keyGrid', h('div', { class: 'omr-sheet' })))))),
    sec('٢', 'أوراق الطلاب', 'يمكنك رفع أوراق كثيرة دفعة واحدة، صورًا أو ملفات PDF (كل صفحة تُحسب ورقة مستقلة).',
      picker.el,
      drop('dropSt', 'اختر أوراق الطلاب أو اسحبها إلى هنا', 'صوّر الورقة كاملة من أعلى، في إضاءة جيدة ودون ظلال', true),
      E('prog', h('div', { class: 'omr-progress', hidden: true }, h('i'))),
      E('stStatus', h('div', { class: 'omr-status', role: 'status' }))),
    sec('٣', 'النتائج', null,
      E('resEmpty', h('div', { class: 'omr-col' },
        h('div', { class: 'omr-steps' },
          h('div', {}, h('span', { class: 'omr-pill ok' }, 'صحيح'), h('span', {}, 'تظهر لكل ورقة درجتها وأرقام الأسئلة الخاطئة فيها.')),
          h('div', {}, h('span', { class: 'omr-pill cross' }, 'شطب'), h('span', {}, 'تُتجاهل الدائرة المشطوبة بعلامة X، وتُحتسب الإجابة المظللة الأخرى.')),
          h('div', {}, h('span', { class: 'omr-pill warn' }, 'مراجعة'), h('span', {}, 'يُعلَّم السؤال غير الواضح، ويمكنك تعديله يدويًا.'))),
        h('p', { class: 'omr-empty' }, 'ستظهر النتائج هنا بعد رفع النموذج وأوراق الطلاب.'))),
      E('resView', h('div', { class: 'omr-col', hidden: true },
        h('div', { class: 'omr-row' },
          E('stats', h('div', { class: 'omr-stats omr-grow' })),
          E('btnXlsx', h('button', { class: 'omr-btn primary', type: 'button' }, 'تنزيل النتائج (Excel)')),
          E('btnAll', h('button', { class: 'omr-btn', type: 'button' }, 'تنزيل الأوراق المصححة (PDF)')),
          E('btnClear', h('button', { class: 'omr-btn', type: 'button' }, 'مسح الأوراق'))),
        h('div', { class: 'omr-tablewrap' }, h('table', { class: 'omr-table' },
          h('thead', {}, h('tr', {}, ...['#', 'اسم الطالب', 'الدرجة', 'الأخطاء', 'الشطب', 'الحالة'].map(t => h('th', {}, t)))),
          E('resBody', h('tbody'))))))),
    E('secDetail', h('section', { class: 'omr-card', hidden: true },
      h('div', { class: 'omr-row' }, E('hDetail', h('h3', { class: 'omr-grow' })),
        E('btnPng', h('button', { class: 'omr-btn', type: 'button' }, 'تنزيل الورقة المصححة')),
        E('btnClose', h('button', { class: 'omr-btn', type: 'button' }, 'إغلاق'))),
      h('div', { class: 'omr-legend' },
        h('span', {}, h('i', { class: 'omr-bub ok' }), 'إجابة صحيحة'),
        h('span', {}, h('i', { class: 'omr-bub bad' }), 'إجابة خاطئة'),
        h('span', {}, h('i', { class: 'omr-bub key' }), 'الإجابة الصحيحة'),
        h('span', {}, h('i', { class: 'omr-bub xed' }), 'مشطوبة'),
        h('span', {}, h('i', { class: 'omr-mark-ai' }), 'حسمه الذكاء الاصطناعي')),
      h('div', { class: 'omr-detail' },
        h('div', { class: 'omr-col' }, h('p', { class: 'omr-hint' }, 'اضغط أي دائرة لتغيير إجابة الطالب، وتُعاد حساب الدرجة تلقائيًا.'),
          h('div', { class: 'omr-gridwrap' }, E('detGrid', h('div', { class: 'omr-sheet' })))),
        h('div', { class: 'omr-col', style: { alignItems: 'center' } }, E('detCanvas', h('canvas', { 'aria-label': 'صورة الورقة بعد التصحيح' }))))))));

  const setStatus = (node, text, err) => { node.className = 'omr-status' + (err ? ' err' : ''); node.textContent = text; };
  const readPage = (pg, expect) => { const c = pg.canvas; return grade(c.getContext('2d').getImageData(0, 0, c.width, c.height), c.width, c.height, state.opts, state.rtl, expect); };
  const keyLayout = () => (state.key ? { rows: state.key.rows, cols: state.key.cols } : null);
  const sameLayout = r => !!state.key && r.rows === state.key.rows && r.cols === state.key.cols;
  const keyCount = () => (state.key ? state.key.ans.filter(a => a >= 0).length : 0);

  // إعادة قراءة الأوراق التي لم تطابق تخطيط النموذج بعد معرفته
  async function regradeMismatched() {
    for (const s of state.sheets) {
      if (!s.mismatch) continue;
      try {
        const bmp = await createImageBitmap(s.blob), c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
        c.getContext('2d', { willReadFrequently: true }).drawImage(bmp, 0, 0);
        const res = await readPage({ canvas: c }, keyLayout()); s.res = res; s.mismatch = !sameLayout(res); s.over = {};
      } catch (e) { /* تبقى الورقة كما هي */ }
    }
    renderResults();
  }

  function setKeyFrom(res, name) {
    state.key = { name: name || '', rows: res.rows, cols: res.cols, groups: res.groups, opts: res.opts, rtl: state.rtl, ans: res.questions.map(q => q.ans) };
    state.sheets.forEach(s => (s.mismatch = !sameLayout(s.res)));
    renderKey(); renderResults(); regradeMismatched();
  }

  function gridFor(nq, rows, groups, build) {
    const frag = document.createDocumentFragment();
    for (let gi = 0; gi < groups; gi++) {
      const col = h('div', { class: 'omr-grp' });
      for (let r = 0; r < rows; r++) { const q = gi * rows + r; if (q < nq) col.append(build(q)); }
      frag.append(col);
    }
    return frag;
  }

  function renderKey() {
    const k = state.key; el.keyView.hidden = !k; if (!k) return;
    el.keySummary.textContent = `في الورقة ${arNum(k.ans.length)} سؤالًا، يُحتسب منها ${arNum(keyCount())}`;
    if (k.name) el.keyName.value = k.name;
    const L = k.rtl ? AR : EN, grid = el.keyGrid; grid.replaceChildren(); grid.style.direction = k.rtl ? 'rtl' : 'ltr';
    grid.append(gridFor(k.ans.length, k.rows, k.groups, q => {
      const row = h('div', { class: 'omr-q' + (k.ans[q] < 0 ? ' off' : '') }, h('span', { class: 'n' }, k.rtl ? arNum(q + 1) : q + 1));
      for (let o = 0; o < k.opts; o++) {
        const b = h('button', { type: 'button', class: 'omr-bub' + (k.ans[q] === o ? ' on' : ''), 'aria-label': `السؤال ${q + 1} الاختيار ${L[o]}` }, L[o]);
        b.onclick = () => { k.ans[q] = k.ans[q] === o ? -1 : o; renderKey(); renderResults(); };
        row.append(b);
      }
      return row;
    }));
  }

  /* النماذج المحفوظة في هذا المتصفح فقط */
  const savedKeys = () => { try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch (e) { return []; } };
  const writeSaved = list => { try { localStorage.setItem(LS, JSON.stringify(list)); return true; } catch (e) { return false; } };
  function renderSaved() {
    const list = savedKeys(); el.savedBox.hidden = !list.length; el.savedList.replaceChildren();
    list.forEach((k, i) => {
      const u = h('button', { type: 'button', class: 'use' }, 'استخدام');
      u.onclick = () => {
        state.opts = k.opts; state.rtl = k.rtl; optSel.value = k.opts; dirSel.value = k.rtl ? 'rtl' : 'ltr';
        state.key = JSON.parse(JSON.stringify(k)); state.sheets.forEach(s => (s.mismatch = !sameLayout(s.res))); regradeMismatched();
        setStatus(el.keyStatus, `حُمِّل نموذج «${k.name}».`); renderKey(); renderResults();
      };
      const d = h('button', { type: 'button', 'aria-label': 'حذف ' + k.name }, 'حذف'); let armed = false;
      d.onclick = () => {
        if (!armed) { armed = true; d.textContent = 'تأكيد الحذف'; setTimeout(() => { armed = false; d.textContent = 'حذف'; }, 3000); return; }
        const l = savedKeys(); l.splice(i, 1); writeSaved(l); renderSaved();
      };
      el.savedList.append(h('span', { class: 'omr-chip' }, h('span', {}, `${k.name} · ${arNum(k.ans.filter(a => a >= 0).length)} سؤالًا`), u, d));
    });
  }
  el.keySave.onclick = () => {
    const k = state.key; if (!k) return;
    const name = el.keyName.value.trim() || 'اختبار دون اسم'; k.name = name;
    const l = savedKeys().filter(x => x.name !== name); l.unshift(JSON.parse(JSON.stringify(k)));
    const ok = writeSaved(l.slice(0, 30)); renderSaved();
    setStatus(el.keyStatus, ok ? `حُفظ النموذج «${name}» على هذا الجهاز.` : 'هذا المتصفح لا يسمح بالحفظ، وستحتاج إلى رفع النموذج في كل مرة.', !ok);
  };

  async function handleKey(files) {
    const f = files[0]; if (!f) return;
    setStatus(el.keyStatus, 'جارٍ قراءة النموذج…');
    try {
      const pages = await fileToPages(f); const res = await readPage(pages[0]);
      setKeyFrom(res, f.name.replace(/\.[^.]+$/, ''));
      const flags = res.questions.filter(q => q.flag === 'review' || q.flag === 'crossed').length;
      setStatus(el.keyStatus, `تمت القراءة: عُثر على ${arNum(res.questions.length)} سؤالًا. راجع الإجابات أدناه قبل التصحيح` + (flags ? `، وفيها ${arNum(flags)} سؤالًا غير واضح عُلِّم للمراجعة.` : '.'));
    } catch (e) { setStatus(el.keyStatus, fileError(e, f.name), true); }
  }

  // دمج قراءة الذكاء الاصطناعي مع قراءة الجهاز
  function mergeAi(local, ai) {
    const k = state.key, A = ai.answers || [];
    if (local && sameLayout(local)) {
      let changed = 0, conflicts = 0;
      local.questions.forEach((q, i) => {
        const x = A[i]; if (!x) return;
        q.aiAns = x.a;
        if (x.a === q.ans) { if (q.flag === 'review') { q.flag = ''; changed++; } return; }
        if (['review', 'blank', 'faint'].includes(q.flag) && !x.unsure && x.a >= 0) { q.ans = x.a; q.flag = 'ai'; changed++; }
        else { q.flag = 'review'; conflicts++; }
      });
      local.ai = { changed, conflicts };
      return local;
    }
    // تعذّرت قراءة الجهاز: تُعتمد قراءة الذكاء الاصطناعي وحدها
    const n = k.ans.length;
    return { rows: k.rows, cols: k.cols, groups: k.groups, opts: k.opts, r: 0, aiOnly: true,
      questions: Array.from({ length: n }, (_, i) => { const x = A[i] || { a: -1, unsure: true }; return { q: i + 1, pos: null, inner: new Array(k.opts).fill(0), ring: new Array(k.opts).fill(0), ans: x.a, aiAns: x.a, flag: x.unsure ? 'review' : '' }; }) };
  }

  let busy = false; const queue = [];
  async function handleSheets(files) {
    queue.push(...files); if (busy) return; busy = true;
    const bar = el.prog.firstElementChild; el.prog.hidden = false;
    let done = 0, aiOff = false, aiNote = ''; const errs = [];
    if (picker.isAi && !state.key) aiNote = 'القراءة بالذكاء الاصطناعي تحتاج إلى نموذج الإجابة أولًا، فصُحِّحت الأوراق على جهازك.';
    while (queue.length) {
      const f = queue.shift(); const total = done + queue.length + 1;
      setStatus(el.stStatus, `جارٍ تصحيح ${f.name} (${arNum(done + 1)} من ${arNum(total)})…`);
      try {
        const pages = await fileToPages(f);
        for (const pg of pages) {
          try {
            let res = null, localErr = null, name = pg.name, sid = '', via = 'local';
            try { res = await readPage(pg, keyLayout()); } catch (e) { localErr = e; }
            if (picker.isAi && state.key && !aiOff) {
              setStatus(el.stStatus, `جارٍ قراءة ${pg.name} بالذكاء الاصطناعي (${arNum(done + 1)} من ${arNum(total)})…`);
              try {
                const k = state.key;
                const d = await vision('omr', pg.canvas, { provider: picker.value, params: { n: k.ans.length, opts: k.opts, rows: k.rows, groups: k.groups, rtl: k.rtl } });
                res = mergeAi(res, d.data); via = res.aiOnly ? 'ai' : 'both';
                if (d.data.name) name = d.data.name; sid = d.data.id || '';
              } catch (e) {
                aiNote = e.message;
                if (e.unavailable || e.limit) { aiOff = true; }
              }
            }
            if (!res) throw localErr;
            const blob = await canvasBlob(pg.canvas);
            state.sheets.push({ name, sid, via, res, blob, w: pg.canvas.width, h: pg.canvas.height, over: {}, mismatch: !res.aiOnly && !sameLayout(res) });
            renderResults();
          } catch (e) { errs.push(fileError(e, pg.name)); }
        }
      } catch (e) { errs.push(fileError(e, f.name)); }
      done++; bar.style.width = (100 * done / (done + queue.length)) + '%';
    }
    busy = false; setTimeout(() => { el.prog.hidden = true; bar.style.width = '0'; }, 600);
    let msg = errs.length ? errs.join(' · ') : `اكتمل تصحيح ${arNum(done)} ملف.`;
    if (!state.key) msg += ' ارفع نموذج الإجابة لتظهر الدرجات.';
    if (aiNote) msg += ' تنبيه: ' + aiNote + (aiOff ? ' وأُكمل التصحيح على جهازك.' : '');
    setStatus(el.stStatus, msg, errs.length || !state.key || !!aiNote);
  }

  const studentAns = (s, q) => ((q in s.over) ? s.over[q] : s.res.questions[q].ans);
  function scoreOf(s) {
    const k = state.key; if (!k || s.mismatch) return null;
    let ok = 0, crossed = 0, review = 0; const wrong = [];
    k.ans.forEach((a, q) => {
      const qq = s.res.questions[q]; if (!qq) return;
      if (qq.flag === 'crossed') crossed++;
      if (qq.flag === 'review' && !(q in s.over)) review++;
      if (a < 0) return; if (studentAns(s, q) === a) ok++; else wrong.push(q + 1);
    });
    return { ok, total: keyCount(), wrong, crossed, review };
  }

  function renderResults() {
    const has = state.sheets.length > 0; el.resEmpty.hidden = has; el.resView.hidden = !has;
    el.resBody.replaceChildren();
    const scores = state.sheets.map(scoreOf);
    state.sheets.forEach((s, i) => {
      const sc = scores[i], tr = h('tr', { tabindex: '0', class: i === state.sel ? 'sel' : null });
      const td = t => { const c = h('td'); if (t !== undefined) c.textContent = t; tr.append(c); return c; };
      td(arNum(i + 1));
      const inp = h('input', { type: 'text', 'aria-label': 'اسم الطالب', value: s.name });
      inp.onclick = e => e.stopPropagation(); inp.onkeydown = e => e.stopPropagation();
      inp.oninput = () => { s.name = inp.value; if (state.sel === i) el.hDetail.textContent = s.name; };
      td().append(inp); tr.lastChild.className = 'name';
      const scC = td();
      if (sc) scC.append(h('span', { class: 'score' }, `${arNum(sc.ok)} / ${arNum(sc.total)}`), h('span', { class: 'omr-bar' }, h('i', { style: { width: (sc.total ? 100 * sc.ok / sc.total : 0) + '%' } })));
      else scC.textContent = '—';
      td(sc ? arNum(sc.wrong.length) : '—'); td(sc ? arNum(sc.crossed) : '—');
      const p = h('span', { class: 'omr-pill' });
      if (!state.key) { p.classList.add('warn'); p.textContent = 'في انتظار النموذج'; }
      else if (s.mismatch) { p.classList.add('bad'); p.textContent = `تختلف عن النموذج: ${arNum(s.res.rows)} صفًّا و${arNum(s.res.cols)} عمودًا`; p.title = 'أعد تصوير الورقة كاملة ومستوية، أو ارفعها بجودة أعلى'; }
      else if (s.res.aiOnly) { p.classList.add('warn'); p.textContent = 'قراءة الذكاء الاصطناعي وحدها — راجعها'; p.title = 'تعذّرت قراءة الورقة على الجهاز، فاعتُمدت قراءة الذكاء الاصطناعي'; }
      else if (sc.review) { p.classList.add('warn'); p.textContent = `${arNum(sc.review)} تحتاج إلى مراجعة`; }
      else { p.classList.add('ok'); p.textContent = s.via === 'both' ? 'تم · مؤكَّد بالذكاء الاصطناعي' : 'تم'; }
      td().append(p);
      tr.onclick = () => openDetail(i); tr.onkeydown = e => { if (e.key === 'Enter') openDetail(i); };
      el.resBody.append(tr);
    });
    const valid = scores.filter(Boolean); el.stats.replaceChildren();
    const add = (v, l) => el.stats.append(h('div', { class: 'omr-stat' }, h('b', {}, v), h('small', {}, l)));
    add(arNum(state.sheets.length), 'ورقة');
    if (valid.length) {
      const avg = valid.reduce((a, s) => a + s.ok, 0) / valid.length;
      add(arNum(avg.toFixed(1)) + ' / ' + arNum(keyCount()), 'متوسط الدرجات');
      add(arNum(Math.max(...valid.map(s => s.ok))), 'أعلى درجة');
      add(arNum(valid.filter(s => s.review).length), 'أوراق تحتاج إلى مراجعة');
    }
    if (state.sel >= 0) renderDetail();
  }

  function openDetail(i) {
    state.sel = i; el.secDetail.hidden = false; renderResults();
    el.secDetail.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
  el.btnClose.onclick = () => { state.sel = -1; el.secDetail.hidden = true; renderResults(); };

  async function drawMarked(s, canvas) {
    if (s.res.aiOnly) {
      const bmp = await createImageBitmap(s.blob); canvas.width = s.w; canvas.height = s.h + BAND;
      const x = canvas.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, canvas.width, BAND);
      const sc = scoreOf(s); x.fillStyle = '#17233a'; x.textBaseline = 'middle'; x.direction = 'rtl'; x.textAlign = 'right';
      x.font = '700 30px Cairo, Tahoma, sans-serif'; x.fillText(s.name || '', canvas.width - 28, BAND / 2);
      x.textAlign = 'left'; x.fillStyle = '#2456a6'; x.fillText(sc ? `${arNum(sc.ok)} / ${arNum(sc.total)}` : '—', 28, BAND / 2);
      x.fillStyle = '#d9e0ec'; x.fillRect(0, BAND - 2, canvas.width, 2); x.drawImage(bmp, 0, BAND); return;
    }
    const bmp = await createImageBitmap(s.blob); canvas.width = s.w; canvas.height = s.h + BAND;
    const x = canvas.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, canvas.width, BAND);
    const sc = scoreOf(s); x.fillStyle = '#17233a'; x.textBaseline = 'middle'; x.direction = 'rtl'; x.textAlign = 'right';
    x.font = '700 30px Cairo, Tahoma, sans-serif'; x.fillText(s.name || '', canvas.width - 28, BAND / 2);
    x.textAlign = 'left'; x.fillStyle = sc ? '#2456a6' : '#5d6b85';
    x.fillText(sc ? `${arNum(sc.ok)} / ${arNum(sc.total)}` : '—', 28, BAND / 2);
    x.fillStyle = '#d9e0ec'; x.fillRect(0, BAND - 2, canvas.width, 2);
    x.translate(0, BAND); x.drawImage(bmp, 0, 0); const k = state.key, r = s.res.r + 4;
    x.lineWidth = 3.5;
    const ring = (p, color) => { x.strokeStyle = color; x.beginPath(); x.arc(p[0], p[1], r, 0, Math.PI * 2); x.stroke(); };
    s.res.questions.forEach((q, i) => {
      const a = studentAns(s, i), key = k && !s.mismatch ? k.ans[i] : -1;
      if (key < 0) { if (a >= 0) ring(q.pos[a], '#2456a6'); return; }
      if (a === key) ring(q.pos[a], '#1d8a4e');
      else { if (a >= 0) ring(q.pos[a], '#d0312d'); ring(q.pos[key], '#1e88e5'); }
      if (q.flag === 'crossed' || q.flag === 'review') {
        const xs = q.pos.map(p => p[0]), ys = q.pos.map(p => p[1]);
        x.strokeStyle = q.flag === 'crossed' ? '#e8890c' : '#c99a06'; x.lineWidth = 3;
        x.strokeRect(Math.min(...xs) - r - 4, Math.min(...ys) - r - 4, Math.max(...xs) - Math.min(...xs) + 2 * r + 8, Math.max(...ys) - Math.min(...ys) + 2 * r + 8);
        x.lineWidth = 3.5;
      }
    });
  }

  function renderDetail() {
    const s = state.sheets[state.sel]; if (!s) return;
    el.hDetail.textContent = s.name;
    const k = state.key, L = letters(), qs = s.res.questions, grid = el.detGrid; grid.replaceChildren();
    grid.style.direction = state.rtl ? 'rtl' : 'ltr';
    grid.append(gridFor(qs.length, s.res.rows, s.res.groups, q => {
      const qq = qs[q], a = studentAns(s, q), key = k && !s.mismatch ? k.ans[q] : -1;
      const row = h('div', { class: 'omr-q' + (qq.flag === 'crossed' ? ' flag-crossed' : '') + (qq.flag === 'review' && !(q in s.over) ? ' flag-review' : '') + (qq.flag === 'faint' ? ' flag-faint' : '') + (qq.flag === 'ai' && !(q in s.over) ? ' flag-ai' : '') + (key < 0 && k ? ' off' : ''), title: qq.aiAns !== undefined && qq.aiAns !== a ? `قراءة الذكاء الاصطناعي: ${qq.aiAns < 0 ? 'فارغ' : L[qq.aiAns]}` : null },
        h('span', { class: 'n' }, state.rtl ? arNum(q + 1) : q + 1));
      const marked = qq.inner.map(v => v > 0.12);
      for (let o = 0; o < s.res.opts; o++) {
        let c = 'omr-bub';
        if (a === o) c += key < 0 ? ' on' : (o === key ? ' ok' : ' bad');
        else if (o === key && a !== key) c += ' key';
        else if (marked[o] && (qq.flag === 'crossed' || qq.flag === 'review')) c += ' xed';
        const b = h('button', { type: 'button', class: c, 'aria-label': `السؤال ${q + 1} الاختيار ${L[o]}` }, L[o]);
        b.onclick = () => { s.over[q] = (a === o) ? -1 : o; renderResults(); };
        row.append(b);
      }
      return row;
    }));
    drawMarked(s, el.detCanvas);
  }

  /* ---------- التنزيل المباشر من المتصفح ---------- */
  el.btnXlsx.onclick = async () => {
    let XLSX; try { XLSX = await libs.xlsx(); } catch (e) { return setStatus(el.stStatus, 'تعذّر تحميل مكتبة Excel. تحقّق من الاتصال وأعد المحاولة.', true); }
    const k = state.key, L = letters();
    const VIA = { local: 'على الجهاز', both: 'الجهاز مع الذكاء الاصطناعي', ai: 'الذكاء الاصطناعي وحده' };
    const sum = [['#', 'اسم الطالب', 'رقم الطالب', 'الدرجة', 'من', 'النسبة %', 'عدد الأخطاء', 'أرقام الأسئلة الخاطئة', 'أسئلة فيها شطب', 'تحتاج إلى مراجعة', 'طريقة القراءة']];
    state.sheets.forEach((s, i) => {
      const sc = scoreOf(s);
      sum.push(sc ? [i + 1, s.name, s.sid || '', sc.ok, sc.total, sc.total ? Math.round(1000 * sc.ok / sc.total) / 10 : 0, sc.wrong.length, sc.wrong.join('، '), sc.crossed, sc.review, VIA[s.via] || '']
        : [i + 1, s.name, s.sid || '', '', '', '', '', s.mismatch ? 'ورقة تختلف عن النموذج' : 'دون نموذج', '', '', VIA[s.via] || '']);
    });
    const nq = k ? k.ans.length : 0, ans = [['اسم الطالب', ...Array.from({ length: nq }, (_, q) => 'س' + (q + 1))]];
    if (k) ans.push(['نموذج الإجابة', ...k.ans.map(a => (a < 0 ? '' : L[a]))]);
    state.sheets.forEach(s => { if (s.mismatch) return; ans.push([s.name, ...Array.from({ length: nq }, (_, q) => { const a = studentAns(s, q); return a < 0 ? '' : L[a]; })]); });
    const wb = XLSX.utils.book_new(), w1 = XLSX.utils.aoa_to_sheet(sum), w2 = XLSX.utils.aoa_to_sheet(ans);
    w1['!cols'] = [{ wch: 4 }, { wch: 26 }, { wch: 12 }, { wch: 8 }, { wch: 6 }, { wch: 9 }, { wch: 11 }, { wch: 40 }, { wch: 14 }, { wch: 16 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, w1, 'النتائج'); XLSX.utils.book_append_sheet(wb, w2, 'الإجابات');
    wb.Workbook = { Views: [{ RTL: true }] };
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    download(new Uint8Array(out), safe((k && k.name ? k.name : 'نتائج التصحيح') + '.xlsx'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };
  el.btnPng.onclick = () => {
    const s = state.sheets[state.sel]; if (!s) return;
    el.detCanvas.toBlob(b => download(b, safe((s.name || 'ورقة') + ' - مصححة.png')), 'image/png');
  };
  el.btnAll.onclick = async () => {
    if (!state.sheets.length) return;
    let PDFLib; try { PDFLib = await libs.pdfLib(); } catch (e) { return setStatus(el.stStatus, 'تعذّر تحميل مكتبة PDF. تحقّق من الاتصال وأعد المحاولة.', true); }
    el.btnAll.disabled = true;
    try {
      const pdf = await PDFLib.PDFDocument.create(), c = document.createElement('canvas');
      const PW = 595.28, PH = 841.89, M = 14; // A4 بالنقاط
      for (let i = 0; i < state.sheets.length; i++) {
        setStatus(el.stStatus, `جارٍ تجهيز الورقة ${arNum(i + 1)} من ${arNum(state.sheets.length)}…`);
        await drawMarked(state.sheets[i], c);
        const jpg = await pdf.embedJpg(await (await canvasBlob(c)).arrayBuffer());
        const sc = Math.min((PW - 2 * M) / c.width, (PH - 2 * M) / c.height), w = c.width * sc, hh = c.height * sc;
        pdf.addPage([PW, PH]).drawImage(jpg, { x: (PW - w) / 2, y: (PH - hh) / 2, width: w, height: hh });
      }
      download(await pdf.save(), safe(((state.key && state.key.name) || 'الاختبار') + ' - الأوراق المصححة.pdf'), 'application/pdf');
      setStatus(el.stStatus, 'جُهِّز ملف الأوراق المصححة.');
    } catch (e) { console.error(e); setStatus(el.stStatus, 'حدثت مشكلة أثناء تجهيز ملف PDF.', true); }
    finally { el.btnAll.disabled = false; }
  };
  let clearArmed = false;
  el.btnClear.onclick = () => {
    const b = el.btnClear;
    if (!clearArmed) { clearArmed = true; b.textContent = 'تأكيد المسح'; setTimeout(() => { clearArmed = false; b.textContent = 'مسح الأوراق'; }, 3000); return; }
    clearArmed = false; b.textContent = 'مسح الأوراق'; state.sheets = []; state.sel = -1; el.secDetail.hidden = true; el.stStatus.textContent = ''; renderResults();
  };

  /* ---------- الإدخال ---------- */
  function wireDrop(d, inp, fn) {
    d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
    ['dragenter', 'dragover'].forEach(t => d.addEventListener(t, e => { e.preventDefault(); d.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(t => d.addEventListener(t, e => { e.preventDefault(); d.classList.remove('over'); }));
    d.addEventListener('drop', e => { const f = [...(e.dataTransfer.files || [])]; if (f.length) fn(f); });
    inp.addEventListener('change', () => { const f = [...inp.files]; inp.value = ''; if (f.length) fn(f); });
  }
  wireDrop(el.dropKey, el.dropKeyIn, handleKey);
  wireDrop(el.dropSt, el.dropStIn, handleSheets);
  optSel.onchange = () => { state.opts = +optSel.value; };
  dirSel.onchange = () => { state.rtl = dirSel.value === 'rtl'; };
  renderSaved(); renderResults();
}
