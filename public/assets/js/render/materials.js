// أداة «خامات الريندر»: من صورة الشوت أو بالبحث في المكتبة، ثم التجهيز والحفظ في مكتبة خامات إتقان.
import { h, ico, toast, select, seg, dropzone } from '../ui.js';
import { aiPicker, vision } from '../ai-tools.js';
import { searchMaterials, resolutionsOf, fetchMaps, RES_ORDER, smartFetch } from './lib.js';
import { makeInfo, materialFiles, makeWriter, canPickFolder, savedFolder, chooseFolder, ensurePermission, ROOT_NAME } from './pack.js';
import { imageToMaps } from './maps.js';
import { analysisCanvas, regionGrow, rectMask, regionFeatures, rank, similarity, colorWords } from './match.js';

const CATS = [['', 'الكل'], ['marble', 'رخام'], ['wood', 'خشب'], ['parquet floor', 'باركيه'], ['tiles', 'بلاط'], ['concrete', 'خرسانة'], ['plaster', 'محارة ودهان'], ['brick', 'طوب'], ['stone', 'حجر'], ['metal', 'معادن'], ['fabric', 'أقمشة'], ['leather', 'جلد'], ['carpet', 'سجاد'], ['asphalt', 'أسفلت'], ['ground', 'أرض وتربة'], ['grass', 'نجيل'], ['gravel', 'حصى'], ['roof', 'أسقف']];
const CAT_AR = { wood: 'خشب', floor_wood: 'أرضية خشبية', marble: 'رخام', stone: 'حجر', concrete: 'خرسانة', plaster: 'محارة', paint: 'دهان', brick: 'طوب', tiles: 'بلاط', ceramic: 'سيراميك', terrazzo: 'تيرازو', metal: 'معدن', fabric: 'قماش', leather: 'جلد', carpet: 'سجاد', wallpaper: 'ورق حائط', glass: 'زجاج', plastic: 'بلاستيك', asphalt: 'أسفلت', ground: 'أرض', grass: 'نجيل', gravel: 'حصى', sand: 'رمل', roofing: 'سقف', other: 'أخرى' };
const CAT_EN = { floor_wood: 'wood floor', wood: 'wood', marble: 'marble', stone: 'stone', concrete: 'concrete', plaster: 'plaster', paint: 'plaster', brick: 'brick', tiles: 'tiles', ceramic: 'tiles', terrazzo: 'terrazzo', metal: 'metal', fabric: 'fabric', leather: 'leather', carpet: 'carpet', wallpaper: 'fabric', asphalt: 'asphalt', ground: 'ground', grass: 'grass', gravel: 'gravel', sand: 'sand', roofing: 'roof' };
const CAT_FROM = { marble: 'marble', wood: 'wood', 'parquet floor': 'floor_wood', tiles: 'tiles', concrete: 'concrete', plaster: 'plaster', brick: 'brick', stone: 'stone', metal: 'metal', fabric: 'fabric', leather: 'leather', carpet: 'carpet', asphalt: 'asphalt', ground: 'ground', grass: 'grass', gravel: 'gravel', roof: 'roofing' };
const RES_AR = { '2k': '2K', '4k': '4K', '8k': '8K', '16k': '16K' };
const fmtMB = (b) => (b / 1048576).toFixed(b > 1048576 * 10 ? 0 : 1) + ' م.ب';

export function renderMaterials(body) {
  const cart = []; // { m, meta, maps?(جاهزة للمولّدة) }
  let shotImg = null;

  /* ---------- الوجهة والدقة ---------- */
  const resSel = select(RES_ORDER.map(r => [r, RES_AR[r] + (r === '2k' ? ' (افتراضي)' : '')]), '2k');
  const fmtSel = select([['jpg', 'JPG (حجم أصغر)'], ['png', 'PNG (أعلى جودة)']], 'jpg');
  const folderName = h('b', {}, '—');
  let root = null, dest = canPickFolder() ? 'folder' : 'zip';
  const destSeg = seg(canPickFolder() ? [['folder', 'حفظ في مجلد على جهازي'], ['zip', 'تنزيل ملف ZIP']] : [['zip', 'تنزيل ملف ZIP']], dest, v => { dest = v; folderRow.classList.toggle('hidden', v !== 'folder'); });
  const pickBtn = h('button', { class: 'btn light sm', type: 'button' }, ico('folder-open', 16), 'اختيار مجلد المكتبة');
  pickBtn.onclick = async () => { try { root = await chooseFolder(); folderName.textContent = root.name; toast('سيُحفظ كل ما تجهّزه في هذا المجلد.'); } catch (e) { if (e.name !== 'AbortError') toast(e.message, true); } };
  const folderRow = h('div', { class: 'rs-row' }, h('span', {}, 'المجلد الحالي:'), folderName, pickBtn);
  if (dest !== 'folder') folderRow.classList.add('hidden');
  savedFolder().then(x => { if (x) { root = x; folderName.textContent = x.name; } });
  const destBox = h('div', { class: 'panel rs-dest' },
    h('h3', {}, ico('folder-down', 20), ' مكتبة خامات إتقان على جهازك'),
    h('p', { class: 'muted' }, `تُحفظ كل خامة في مجلد «${ROOT_NAME}» بداخلها مجلد لـ Corona وآخر لـ V-Ray، ومع كل منهما الخرائط وملف الشرح وسكربت ينشئ الخامة في 3ds Max بضغطة. وشغّل السكربت ITQAN_Materials_Setup.ms مرة واحدة في ماكس لتظهر الخامات في مكتبة «ITQAN» داخل البرنامج وتُحدَّث تلقائيًا.`),
    destSeg, folderRow,
    canPickFolder() ? null : h('p', { class: 'note info' }, 'متصفحك لا يدعم الحفظ في مجلد مباشرة (يدعمه Chrome و Edge على الحاسوب). ستُنزَّل الخامات في ملف ZIP بالبنية نفسها؛ فُكّه داخل مجلد مكتبتك.'),
    h('div', { class: 'opts' }, h('label', { class: 'field' }, h('span', {}, 'الدقة'), resSel, h('small', {}, 'إذا لم تتوفر الدقة المختارة لخامة ما تُنزَّل أعلى دقة متاحة دونها.')), h('label', { class: 'field' }, h('span', {}, 'صيغة الصور'), fmtSel)));

  /* ---------- سلة التجهيز ---------- */
  const cartList = h('div', { class: 'rs-cart' });
  const goBtn = h('button', { class: 'btn', type: 'button' }, ico('download', 18), 'تجهيز الخامات وحفظها');
  const cartBox = h('div', { class: 'panel' }, h('h3', {}, ico('boxes', 20), ' الخامات المختارة للتجهيز'), cartList, h('div', { class: 'actions' }, goBtn));
  const drawCart = () => {
    cartList.innerHTML = '';
    if (!cart.length) { cartList.append(h('p', { class: 'muted center' }, 'لم تختر أي خامة بعد. اختر من نتائج الشوت أو من المكتبة.')); goBtn.disabled = true; return; }
    goBtn.disabled = false; goBtn.lastChild.textContent = `تجهيز ${cart.length} ${cart.length === 1 ? 'خامة' : cart.length === 2 ? 'خامتين' : 'خامات'} وحفظها`;
    cart.forEach((it, i) => {
      const nameAr = h('input', { class: 'input', value: it.meta.name_ar || '', placeholder: 'الاسم بالعربية (اختياري)' }); nameAr.oninput = () => it.meta.name_ar = nameAr.value;
      const fin = select([['', 'التشطيب'], ['matte', 'مطفي'], ['satin', 'نصف لامع'], ['glossy', 'لامع']], it.meta.finish || ''); fin.onchange = () => it.meta.finish = fin.value;
      const cat = select(Object.entries(CAT_AR), it.meta.category || ''); cat.onchange = () => it.meta.category = cat.value;
      const met = h('input', { type: 'checkbox', checked: !!it.meta.metal }); met.onchange = () => it.meta.metal = met.checked;
      it.status = it.status || h('small', { class: 'muted' }, it.maps ? 'جاهزة (مولّدة)' : '');
      cartList.append(h('div', { class: 'rs-item' },
        h('img', { src: it.m.thumb || it.thumbUrl || '', alt: '', loading: 'lazy' }),
        h('div', { class: 'rs-item-main' },
          h('div', {}, h('b', {}, it.m.name), ' ', h('span', { class: 'rs-src' }, it.m.src === 'ph' ? 'Poly Haven' : it.m.src === 'acg' ? 'ambientCG' : 'مولّدة')),
          h('div', { class: 'rs-item-opts' }, nameAr, cat, fin, h('label', { class: 'check' }, met, 'معدنية')), it.status),
        h('button', { class: 'icon-btn', title: 'إزالة', onclick: () => { cart.splice(i, 1); drawCart(); } }, ico('trash-2', 16))));
    });
  };
  const addToCart = (m, meta = {}) => {
    if (cart.some(x => x.m.src === m.src && x.m.id === m.id)) return toast('هذه الخامة مضافة بالفعل.');
    cart.push({ m, meta: { category: meta.category || '', finish: meta.finish || '', metal: !!meta.metal, name_ar: meta.name_ar || '' }, maps: m.readyMaps || null, thumbUrl: m.thumb });
    drawCart(); toast('أُضيفت إلى الخامات المختارة.');
  };

  goBtn.onclick = async () => {
    if (!cart.length) return;
    let writer;
    if (dest === 'folder') {
      try { if (!root) root = await chooseFolder(); if (!(await ensurePermission(root))) throw new Error('لم يُمنح إذن الكتابة في المجلد.'); folderName.textContent = root.name; }
      catch (e) { if (e.name === 'AbortError') return; return toast(e.message, true); }
      writer = makeWriter('folder', root);
    } else writer = makeWriter('zip');
    goBtn.disabled = true; let ok = 0;
    const want = resSel.value, fmt = fmtSel.value;
    for (const it of cart) {
      const st = it.status; st.className = 'rs-st';
      try {
        let maps, ext, m = it.m;
        if (it.maps) { maps = it.maps; ext = 'jpg'; }
        else {
          st.textContent = 'جارٍ التحقق من الدقات المتاحة…';
          const avail = await resolutionsOf(m); if (!avail.length) throw new Error('لا توجد دقة متاحة.');
          const res = avail.includes(want) ? want : [...avail].reverse().find(r => RES_ORDER.indexOf(r) <= RES_ORDER.indexOf(want)) || avail[0];
          const got = await fetchMaps(m, res, fmt, p => { st.textContent = `جارٍ التنزيل بدقة ${RES_AR[res]}… ${Math.round(p * 100)}%`; });
          maps = got.maps; ext = got.ext;
          if (res !== want) st.dataset.note = `نُزّلت بدقة ${RES_AR[res]} لعدم توفر ${RES_AR[want]}.`;
        }
        st.textContent = 'جارٍ تجهيز المجلدات والسكربتات…';
        const info = makeInfo(m, it.meta, ext, maps);
        await writer.add(await materialFiles(info, maps));
        st.textContent = '✓ جُهّزت' + (st.dataset.note ? ' — ' + st.dataset.note : ''); st.classList.add('ok'); ok++;
      } catch (e) { console.error(e); st.textContent = 'تعذّر التجهيز: ' + e.message; st.classList.add('bad'); }
    }
    try {
      const r = ok ? await writer.finish(`${ROOT_NAME}_${new Date().toISOString().slice(0, 10)}.zip`) : null;
      if (r?.rejected) toast(`رفض المتصفح حفظ بعض الملفات مباشرة في المجلد، وعددها ${r.rejected.length} (${r.rejected.slice(0, 4).join('، ')}${r.rejected.length > 4 ? '…' : ''})، فنُزّلت في ملف ZIP صغير بالمسارات نفسها؛ فُكّه داخل مجلد المكتبة.`, true, 12000);
      if (ok) toast(dest === 'folder' ? `حُفظت ${ok} من ${cart.length} في مجلد «${root.name}». شغّل ITQAN_Materials_Setup.ms في ماكس لتحديث المكتبة.` : `نُزّل ملف ZIP يحوي ${ok} خامة.`, false, 8000);
    } catch (e) { toast('تعذّر الحفظ: ' + e.message, true); }
    goBtn.disabled = false;
  };

  /* ---------- بطاقة نتيجة ---------- */
  const card = (m, meta, onPick, sim) => h('button', { type: 'button', class: 'rs-card', title: m.name, onclick: () => onPick ? onPick(m) : addToCart(m, meta) },
    h('img', { src: m.thumb, alt: '', loading: 'lazy' }), h('span', {}, m.name), h('small', {}, m.src === 'ph' ? 'Poly Haven' : 'ambientCG'),
    sim != null ? h('em', { class: 'rs-sim ' + (sim >= 70 ? 'hi' : sim >= 55 ? 'mid' : 'lo') }, `تشابه ${sim}%`) : null);

  /* ---------- تبويب البحث في المكتبة ---------- */
  const q = h('input', { class: 'input', type: 'search', placeholder: 'ابحث بالعربية أو الإنجليزية: رخام أبيض مصقول، باركيه بلوط، طوب أحمر…' });
  const grid = h('div', { class: 'rs-grid' });
  const runSearch = async (text) => {
    grid.innerHTML = ''; grid.append(h('p', { class: 'muted center' }, 'جارٍ البحث في Poly Haven و ambientCG…'));
    try {
      const r = await searchMaterials(text);
      grid.innerHTML = '';
      if (!r.length) grid.append(h('p', { class: 'muted center' }, 'لا توجد نتائج. جرّب كلمات أخرى أو بالإنجليزية.'));
      r.forEach(m => grid.append(card(m, { category: '' })));
    } catch (e) { grid.innerHTML = ''; grid.append(h('p', { class: 'note err' }, e.message)); }
  };
  let tmr; q.oninput = () => { clearTimeout(tmr); tmr = setTimeout(() => runSearch(q.value), 450); };
  const chips = h('div', { class: 'rs-chips' }, CATS.map(([v, t]) => h('button', { type: 'button', onclick: () => { q.value = t === 'الكل' ? '' : t; runSearch(v); } }, t)));
  const libTab = h('div', {}, q, chips, grid);

  /* ---------- تبويب صورة الشوت ---------- */
  // الفكرة: اللقطة فيها خامات كثيرة، فلا تُحلَّل كاملة كخامة واحدة. يحدد المستخدم كل سطح (نقرة أو مستطيل)،
  // ثم تُقارن بصمته البصرية بصور خامات المكتبة نفسها. مع الذكاء الاصطناعي يُوصف الجزء المحدد بدقة أولًا ثم تُرتَّب النتائج بصريًا.
  const picker = aiPicker('mat-shot', { note: 'يُرسل الجزء الذي تحدده من اللقطة فقط ليصف الذكاء الاصطناعي خامته بدقة، ثم تُرتَّب خامات المكتبة حسب قربها البصري منه.' });
  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#14b8a6', '#a855f7', '#ef4444', '#84cc16', '#06b6d4', '#f97316'];
  let A = null, sels = [];
  const stage = h('div', { class: 'rs-stage' }), view = document.createElement('canvas'), over = document.createElement('canvas');
  stage.append(view, over);
  const tol = h('input', { type: 'range', min: 6, max: 30, step: 1, value: 14 });
  const fullAiBtn = h('button', { class: 'btn light sm', type: 'button' }, ico('sparkles', 16), 'تحليل اللقطة كاملة بالذكاء الاصطناعي');
  const clearBtn = h('button', { class: 'btn light sm', type: 'button' }, ico('trash-2', 16), 'مسح التحديدات');
  const toMapsShot = h('button', { class: 'btn light sm', type: 'button' }, ico('layers', 16), 'تحويل اللقطة إلى خرائط');
  const shotTools = h('div', { class: 'rs-shot-tools hidden' },
    h('div', { class: 'note info' }, h('b', {}, 'حدّد الخامة على الصورة: '), 'اضغط على السطح (الكنبة، الأرضية، الحائط…) فيُحدَّد تلقائيًا، أو اسحب لرسم مستطيل داخل الخامة. يمكنك تحديد أكثر من خامة، وتظهر نتائج كل واحدة أسفل الصورة.'),
    stage,
    h('div', { class: 'rs-row' }, h('label', { class: 'field', style: { minWidth: '220px' } }, h('span', {}, 'حساسية التحديد بالنقر'), tol, h('small', {}, 'قلّلها إن امتد التحديد إلى أسطح مجاورة، وزدها إن لم يغطِّ السطح')), clearBtn, toMapsShot, fullAiBtn));
  const shotResults = h('div');
  const shotPreview = h('div');

  function paintOverlay(tmp) {
    const x = over.getContext('2d'); x.clearRect(0, 0, over.width, over.height);
    const sx = over.width / A.w, sy = over.height / A.h;
    sels.forEach((s, i) => {
      const col = COLORS[i % COLORS.length], im = x.createImageData(A.w, A.h), [r, g, b] = [1, 3, 5].map(k => parseInt(col.slice(k, k + 2), 16));
      for (let j = 0; j < s.mask.length; j++) if (s.mask[j]) { const o = j * 4; im.data[o] = r; im.data[o + 1] = g; im.data[o + 2] = b; im.data[o + 3] = 95; }
      const t = document.createElement('canvas'); t.width = A.w; t.height = A.h; t.getContext('2d').putImageData(im, 0, 0);
      x.drawImage(t, 0, 0, over.width, over.height);
      const [bx, by, bw, bh] = s.bbox; x.strokeStyle = col; x.lineWidth = 2; x.strokeRect(bx * sx, by * sy, bw * sx, bh * sy);
      x.fillStyle = col; x.beginPath(); x.arc(bx * sx + 14, by * sy + 14, 12, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 14px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(i + 1), bx * sx + 14, by * sy + 15);
    });
    if (tmp) { x.setLineDash([6, 4]); x.strokeStyle = '#fff'; x.lineWidth = 2; x.strokeRect(...tmp); x.setLineDash([]); }
  }
  // التفاعل: نقرة = تحديد تلقائي للسطح، سحب = مستطيل
  let drag = null;
  const pos = (e) => { const r = over.getBoundingClientRect(); return [(e.clientX - r.left) * over.width / r.width, (e.clientY - r.top) * over.height / r.height]; };
  over.onpointerdown = (e) => { if (!A) return; drag = { p0: pos(e) }; over.setPointerCapture(e.pointerId); };
  over.onpointermove = (e) => { if (!drag) return; const [x, y] = pos(e), [x0, y0] = drag.p0; drag.rect = [Math.min(x, x0), Math.min(y, y0), Math.abs(x - x0), Math.abs(y - y0)]; paintOverlay(drag.rect); };
  over.onpointerup = (e) => {
    if (!drag) return; const d = drag; drag = null;
    const fx = A.w / over.width, fy = A.h / over.height;
    let sel;
    if (d.rect && d.rect[2] > 12 && d.rect[3] > 12) sel = rectMask(A, d.rect[0] * fx, d.rect[1] * fy, d.rect[2] * fx, d.rect[3] * fy);
    else {
      const px = Math.min(A.w - 1, Math.max(0, Math.round(d.p0[0] * fx))), py = Math.min(A.h - 1, Math.max(0, Math.round(d.p0[1] * fy)));
      sel = regionGrow(A, px, py, +tol.value);
      if (sel.count < 60) { toast('المنطقة المحددة صغيرة جدًا. زد حساسية التحديد أو اسحب مستطيلًا داخل الخامة.', true); paintOverlay(); return; }
    }
    sels.push(sel); paintOverlay(); shotResults.append(selectionRow(sel, sels.length - 1));
  };
  clearBtn.onclick = () => { sels = []; paintOverlay(); shotResults.innerHTML = ''; };
  toMapsShot.onclick = () => { window.__itqPendingTexture = shotImg; location.hash = '#/tool/tex-maps'; };
  fullAiBtn.onclick = () => analyzeFull();

  // قصّ منطقة محددة (بهامش بسيط) من اللقطة الأصلية
  const cropOf = (sel, pad = 0.06) => {
    const inv = 1 / A.k, [bx, by, bw, bh] = sel.bbox, px = bw * pad, py = bh * pad;
    const x0 = Math.max(0, (bx - px) * inv), y0 = Math.max(0, (by - py) * inv), w = Math.min(shotImg.width - x0, (bw + 2 * px) * inv), hh = Math.min(shotImg.height - y0, (bh + 2 * py) * inv);
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(hh)); c.getContext('2d').drawImage(shotImg, x0, y0, w, hh, 0, 0, c.width, c.height); return c;
  };
  // جمع المرشحين: بالكلمات (من الذكاء الاصطناعي أو من نوع الخامة)
  const CAT_WORDS = CATS.filter(c => c[0]).map(c => c[0]);
  async function poolFor(wordSets, per) {
    const seen = new Map();
    wordSets = wordSets.map(ws => Object.assign(ws.filter(Boolean), { _cat: ws._cat || '', _w: ws._w || 1 })).filter(ws => ws.length);
    const lists = await Promise.allSettled(wordSets.map(ws => searchMaterials('', { words: ws, limit: per })));
    lists.forEach((r, i) => { if (r.status === 'fulfilled') for (const m of r.value) { const k = m.src + m.id, w = wordSets[i]._w || 1; const o = seen.get(k); if (!o) seen.set(k, { ...m, _cat: wordSets[i]._cat || '', _w: w }); else if (w < o._w) o._w = w; } });
    return [...seen.values()];
  }
  const tagCat = (ws, cat) => Object.assign(ws, { _cat: cat });

  // صف نتائج تحديد واحد
  function selectionRow(sel, idx) {
    const col = COLORS[idx % COLORS.length], feat = regionFeatures(shotImg, A, sel), crop = cropOf(sel, 0);
    const thumb = h('canvas', { class: 'rs-sel-thumb' }); { const k = 72 / Math.max(crop.width, crop.height); thumb.width = Math.max(1, Math.round(crop.width * k)); thumb.height = Math.max(1, Math.round(crop.height * k)); thumb.getContext('2d').drawImage(crop, 0, 0, thumb.width, thumb.height); }
    const title = h('b', {}, `الخامة ${idx + 1}`), info = h('span', { class: 'rs-src' }, ''), status = h('p', { class: 'muted' }, 'جارٍ التحليل…');
    const chips = h('div', { class: 'rs-chips' }), grid = h('div', { class: 'rs-grid small' }), extra = h('div', { class: 'rs-row' });
    const removeBtn = h('button', { class: 'btn light sm', type: 'button', title: 'إزالة' }, ico('x', 14));
    const row = h('div', { class: 'panel rs-mat', style: { borderInlineStart: `5px solid ${col}` } },
      h('div', { class: 'rs-mat-head' }, thumb, h('div', { style: { flex: 1 } }, title, ' ', info), removeBtn), chips, status, grid, extra);
    removeBtn.onclick = () => { const i = sels.indexOf(sel); if (i >= 0) sels.splice(i, 1); row.remove(); paintOverlay(); };
    let meta = { category: '' }, desc = null;
    const show = (ranked, cat) => {
      grid.innerHTML = '';
      const list = cat ? ranked.filter(r => r.m._cat === cat) : ranked;
      list.slice(0, 8).forEach(({ m, d }) => grid.append(card(m, { ...meta, category: meta.category || CAT_FROM[m._cat] || '' }, null, similarity(d))));
      if (!list.length) grid.append(h('p', { class: 'muted' }, 'لا توجد نتائج لهذا النوع.'));
    };
    const finish = (best) => {
      extra.innerHTML = '';
      const toMaps = h('button', { class: 'btn light sm', type: 'button' }, ico('layers', 16), 'تحويل هذا الجزء إلى خرائط');
      toMaps.onclick = () => { window.__itqPendingTexture = cropOf(sel, 0); location.hash = '#/tool/tex-maps'; };
      extra.append(toMaps);
      if (desc) { const genBtn = h('button', { class: 'btn light sm', type: 'button' }, ico('sparkles', 16), 'توليدها بالذكاء الاصطناعي'); genBtn.onclick = () => generate(desc, meta, genBtn); extra.append(genBtn); }
      if (best < 55) extra.prepend(h('p', { class: 'note warn', style: { width: '100%' } }, 'التشابه البصري ضعيف: قد لا تكون هذه الخامة موجودة في المكتبات المجانية. جرّب «تحويل هذا الجزء إلى خرائط»' + (desc ? ' أو «توليدها بالذكاء الاصطناعي».' : '، أو استخدم وضع الذكاء الاصطناعي لوصفها بدقة.')));
    };
    (async () => {
      if (!feat) { status.textContent = 'تعذّر تحليل هذه المنطقة. حدّد مساحة أكبر من الخامة.'; return; }
      try {
        let pool;
        if (picker.isAi) {
          status.textContent = 'يصف الذكاء الاصطناعي الخامة المحددة…';
          desc = (await vision('mat', cropOf(sel), { provider: picker.value, maxSide: 900 })).data || {};
          meta = { category: desc.category, finish: desc.finish, metal: desc.metal, name_ar: desc.name_ar };
          title.textContent = `${idx + 1}. ${desc.name_ar || 'خامة'}`; info.textContent = [CAT_AR[desc.category], desc.pattern_ar].filter(Boolean).join(' — ');
          const kw = (desc.keywords || []).map(String), alt = (desc.alt_keywords || []).map(String);
          const base = (CAT_EN[desc.category] || '').split(' ').filter(Boolean);
          status.textContent = 'جارٍ البحث في المكتبات والمقارنة البصرية…';
          const wt = (ws, w) => Object.assign(ws, { _w: w });
          pool = await poolFor([wt(kw.join(' ').toLowerCase().split(/\s+/), 0.7), wt(alt.join(' ').toLowerCase().split(/\s+/), 0.85), [...base, ...colorWords(feat).join(' ').split(' ')], base], 24);
        } else {
          status.textContent = 'جارٍ المقارنة البصرية مع خامات المكتبات… (أول مرة أبطأ، ثم تُحفظ البصمات على جهازك)';
          pool = await poolFor(CAT_WORDS.map(c => tagCat(c.split(' '), c)), 14);
        }
        const ranked = (await rank(feat, pool, { onProgress: (p) => status.textContent = `جارٍ المقارنة البصرية… ${Math.round(p * 100)}%` })).map(r => ({ ...r, d: r.d * (r.m._w || 1) })).sort((a, b) => a.d - b.d);
        if (!ranked.length) { status.textContent = 'لم أجد مرشحين. استخدم تبويب «البحث في المكتبة».'; return; }
        // تقدير نوع الخامة من أقرب النتائج (في الوضع المحلي)، مع إمكانية تغييره
        if (!picker.isAi) {
          const votes = {}; ranked.slice(0, 6).forEach((r, i) => { if (r.m._cat) votes[r.m._cat] = (votes[r.m._cat] || 0) + (6 - i) ** 2; });
          const top = Object.entries(votes).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
          info.textContent = top.length ? 'تبدو أقرب إلى: ' + top.map(c => CATS.find(x => x[0] === c)?.[1]).join('، ') : '';
          chips.innerHTML = ''; chips.append(h('span', { class: 'muted', style: { alignSelf: 'center' } }, 'النوع:'));
          const all = h('button', { type: 'button', class: 'on' }, 'الأقرب بصريًا');
          const btns = [all];
          all.onclick = () => { btns.forEach(b => b.classList.remove('on')); all.classList.add('on'); meta.category = ''; show(ranked); };
          chips.append(all);
          for (const [v, t] of CATS.filter(c => c[0])) {
            const b = h('button', { type: 'button' }, t); btns.push(b);
            b.onclick = async () => {
              btns.forEach(x => x.classList.remove('on')); b.classList.add('on'); meta.category = CAT_FROM[v] || '';
              status.textContent = 'جارٍ البحث في هذا النوع…';
              const more = await poolFor([tagCat(v.split(' '), v), tagCat([...v.split(' '), ...colorWords(feat).join(' ').split(' ')], v)], 40);
              const r2 = await rank(feat, more); status.textContent = `أقرب خامات «${t}» بصريًا للجزء المحدد:`; show(r2, v); finish(r2[0] ? similarity(r2[0].d) : 0);
            };
            chips.append(b);
          }
        }
        status.textContent = picker.isAi ? 'نتائج البحث مرتبة حسب القرب البصري من الجزء المحدد (النسبة تقديرية):' : 'أقرب الخامات بصريًا للجزء المحدد (النسبة تقديرية). اختر النوع لتدقيق النتائج:';
        show(ranked); finish(similarity(ranked[0].d));
      } catch (e) { status.textContent = ''; status.append(h('span', { class: 'note err' }, e.message)); }
    })();
    return row;
  }

  // تحليل اللقطة كاملة بالذكاء الاصطناعي: يُعيد قائمة الخامات مع مستطيل لكل خامة، فتُضاف كتحديدات
  async function analyzeFull() {
    if (!picker.isAi) { toast('اختر Gemini أو Claude من «طريقة المعالجة» أعلاه أولًا.', true); return; }
    fullAiBtn.disabled = true; const info = h('p', { class: 'muted center' }, 'جارٍ تحليل اللقطة والتعرّف على خاماتها…'); shotResults.prepend(info);
    try {
      const d = (await vision('shot', shotImg, { provider: picker.value, maxSide: 1600 })).data || {};
      try { sessionStorage.setItem('itq-shot', JSON.stringify(d.shot || {})); } catch { }
      const s = d.shot || {}; info.remove();
      shotResults.prepend(h('div', { class: 'note info' }, `نوع اللقطة: ${s.type === 'exterior' ? 'خارجية' : 'داخلية'} — الوقت: ${({ day: 'نهار', sunset: 'غروب', night: 'ليل', overcast: 'غائم' })[s.time] || '—'}. ${s.lighting_ar || ''} يمكنك تجهيز إضاءتها من أداة «الإضاءة وإعدادات الريندر».`));
      for (const mat of (d.materials || []).slice(0, 12)) {
        const b = Array.isArray(mat.box) && mat.box.length === 4 ? mat.box.map(Number) : null;
        if (b && b.every(v => v >= 0 && v <= 1) && b[2] > 0.01 && b[3] > 0.01) {
          const sel = rectMask(A, b[0] * A.w, b[1] * A.h, b[2] * A.w, b[3] * A.h); sel.preset = mat; sels.push(sel);
          shotResults.append(presetRow(sel, sels.length - 1, mat));
        } else shotResults.append(presetRow(null, -1, mat));
      }
      paintOverlay();
    } catch (e) { info.remove(); shotResults.prepend(h('div', { class: 'note err' }, e.message)); }
    fullAiBtn.disabled = false;
  }
  // صف خامة من التحليل الكامل: بحث بالكلمات ثم ترتيب بصري إن وُجد مستطيلها
  function presetRow(sel, idx, mat) {
    const col = idx >= 0 ? COLORS[idx % COLORS.length] : '#94a3b8';
    const meta = { category: mat.category, finish: mat.finish, metal: mat.metal, name_ar: mat.name_ar };
    const grid = h('div', { class: 'rs-grid small' }, h('p', { class: 'muted' }, 'جارٍ البحث والمقارنة…')), extra = h('div', { class: 'rs-row' });
    const row = h('div', { class: 'panel rs-mat', style: { borderInlineStart: `5px solid ${col}` } },
      h('div', { class: 'rs-mat-head' }, h('b', {}, (idx >= 0 ? `${idx + 1}. ` : '') + (mat.name_ar || '')), h('span', { class: 'rs-src' }, mat.where_ar || ''), h('span', { class: 'rs-src' }, CAT_AR[mat.category] || '')), grid, extra);
    (async () => {
      try {
        const kw = [...new Set((mat.keywords || []).flatMap(k => String(k).toLowerCase().split(/\s+/)))], base = (CAT_EN[mat.category] || '').split(' ').filter(Boolean);
        const pool = await poolFor([kw, [...base, ...String(mat.color || '').toLowerCase().split(/\s+/)].filter(Boolean), base].filter(w => w.length), 20);
        const feat = sel ? regionFeatures(shotImg, A, sel) : null;
        const ranked = feat ? await rank(feat, pool) : pool.map(m => ({ m, d: NaN }));
        grid.innerHTML = '';
        ranked.slice(0, 8).forEach(({ m, d }) => grid.append(card(m, meta, null, Number.isFinite(d) ? similarity(d) : null)));
        if (!ranked.length) grid.append(h('p', { class: 'muted' }, 'لا توجد نتائج.'));
        if (sel) { const tm = h('button', { class: 'btn light sm', type: 'button' }, ico('layers', 16), 'تحويل هذا الجزء إلى خرائط'); tm.onclick = () => { window.__itqPendingTexture = cropOf(sel, 0); location.hash = '#/tool/tex-maps'; }; extra.append(tm); }
        const genBtn = h('button', { class: 'btn light sm', type: 'button' }, ico('sparkles', 16), 'توليدها بالذكاء الاصطناعي'); genBtn.onclick = () => generate(mat, meta, genBtn); extra.append(genBtn);
      } catch (e) { grid.innerHTML = ''; grid.append(h('p', { class: 'note err' }, e.message)); }
    })();
    return row;
  }

  // توليد خامة بالذكاء الاصطناعي ثم استخراج خرائطها على الجهاز
  const generate = async (mat, meta, btn) => {
    btn.disabled = true; const old = btn.lastChild.textContent; btn.lastChild.textContent = 'جارٍ التوليد…';
    try {
      const r = await fetch('/api/texgen', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ material: { keywords: mat.keywords, color: mat.color, finish: mat.finish, category: mat.category } }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'تعذّر التوليد.');
      const img = new Image(); img.src = `data:${d.image.mime};base64,${d.image.data}`; await img.decode();
      btn.lastChild.textContent = 'جارٍ استخراج الخرائط…';
      const mp = await imageToMaps(img, { size: 2048, finish: mat.finish, metal: mat.metal, strength: 2 });
      const maps = Object.fromEntries(Object.entries(mp).map(([k, v]) => [k, v.blob]));
      const m = { src: 'ai', id: 'ai-' + Date.now(), name: 'AI ' + (mat.keywords || []).slice(0, 3).join(' '), thumb: img.src, license: 'مولّدة', readyMaps: maps };
      addToCart(m, meta);
      toast('وُلّدت الخامة. دقتها الأصلية نحو 1K وكُبّرت إلى 2K، فاستخدمها للأسطح البعيدة أو الثانوية.', false, 7000);
    } catch (e) { toast(e.message, true, 6000); }
    btn.disabled = false; btn.lastChild.textContent = old;
  };

  const shotDz = dropzone({ accept: 'image/*', multiple: false, label: 'اختر صورة الشوت', hint: 'صورة ريندر أو صورة واقعية للمشروع (JPG أو PNG)', onFiles: async ([f]) => {
    const url = URL.createObjectURL(f); const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement('canvas'); const s = Math.min(1, 2000 / Math.max(img.width, img.height)); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    shotImg = c; A = analysisCanvas(c, 480); sels = []; shotResults.innerHTML = '';
    view.width = over.width = Math.min(1100, c.width); view.height = over.height = Math.round(c.height * view.width / c.width);
    view.getContext('2d').drawImage(c, 0, 0, view.width, view.height); paintOverlay();
    shotTools.classList.remove('hidden');
  } });
  const shotTab = h('div', {}, picker.el, shotDz, shotPreview, shotTools, shotResults);

  /* ---------- التبويبات ---------- */
  const tabs = h('div', { class: 'tabs' });
  const holder = h('div');
  const showTab = (k) => { holder.innerHTML = ''; holder.append(k === 'shot' ? shotTab : libTab); [...tabs.children].forEach(b => b.classList.toggle('on', b.dataset.k === k)); if (k === 'lib' && !grid.children.length) runSearch(''); };
  for (const [k, t, ic] of [['shot', 'من صورة الشوت', 'image'], ['lib', 'البحث في المكتبة', 'search']]) tabs.append(h('button', { type: 'button', 'data-k': k, onclick: () => showTab(k) }, ico(ic, 16), t));
  body.append(h('div', { class: 'rs' }, destBox, h('div', { class: 'panel' }, tabs, holder), cartBox));
  showTab('shot'); drawCart();
}
