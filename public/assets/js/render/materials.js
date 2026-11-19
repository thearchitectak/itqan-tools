// أداة «خامات الريندر»: من صورة الشوت أو بالبحث في المكتبة، ثم التجهيز والحفظ في مكتبة خامات إتقان.
import { h, ico, toast, select, seg, dropzone } from '../ui.js';
import { aiPicker, vision } from '../ai-tools.js';
import { searchMaterials, resolutionsOf, fetchMaps, RES_ORDER } from './lib.js';
import { makeInfo, materialFiles, makeWriter, canPickFolder, savedFolder, chooseFolder, ensurePermission, ROOT_NAME } from './pack.js';
import { imageToMaps } from './maps.js';

const CATS = [['', 'الكل'], ['marble', 'رخام'], ['wood', 'خشب'], ['parquet floor', 'باركيه'], ['tiles', 'بلاط'], ['concrete', 'خرسانة'], ['plaster', 'محارة ودهان'], ['brick', 'طوب'], ['stone', 'حجر'], ['metal', 'معادن'], ['fabric', 'أقمشة'], ['leather', 'جلد'], ['carpet', 'سجاد'], ['asphalt', 'أسفلت'], ['ground', 'أرض وتربة'], ['grass', 'نجيل'], ['gravel', 'حصى'], ['roof', 'أسقف']];
const CAT_AR = { wood: 'خشب', floor_wood: 'أرضية خشبية', marble: 'رخام', stone: 'حجر', concrete: 'خرسانة', plaster: 'محارة', paint: 'دهان', brick: 'طوب', tiles: 'بلاط', ceramic: 'سيراميك', terrazzo: 'تيرازو', metal: 'معدن', fabric: 'قماش', leather: 'جلد', carpet: 'سجاد', wallpaper: 'ورق حائط', glass: 'زجاج', plastic: 'بلاستيك', asphalt: 'أسفلت', ground: 'أرض', grass: 'نجيل', gravel: 'حصى', sand: 'رمل', roofing: 'سقف', other: 'أخرى' };
const CAT_EN = { floor_wood: 'wood floor', wood: 'wood', marble: 'marble', stone: 'stone', concrete: 'concrete', plaster: 'plaster', paint: 'plaster', brick: 'brick', tiles: 'tiles', ceramic: 'tiles', terrazzo: 'terrazzo', metal: 'metal', fabric: 'fabric', leather: 'leather', carpet: 'carpet', wallpaper: 'fabric', asphalt: 'asphalt', ground: 'ground', grass: 'grass', gravel: 'gravel', sand: 'sand', roofing: 'roof' };
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
  const card = (m, meta, onPick) => h('button', { type: 'button', class: 'rs-card', title: m.name, onclick: () => onPick ? onPick(m) : addToCart(m, meta) },
    h('img', { src: m.thumb, alt: '', loading: 'lazy' }), h('span', {}, m.name), h('small', {}, m.src === 'ph' ? 'Poly Haven' : 'ambientCG'));

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
  const picker = aiPicker('mat-shot', { note: 'يحلّل الذكاء الاصطناعي اللقطة ويتعرّف على خاماتها ونوع إضاءتها، ثم يبحث عن خامات مطابقة في المكتبات.' });
  const shotPreview = h('div', { class: 'rs-shot' });
  const shotResults = h('div');
  const analyze = async () => {
    shotResults.innerHTML = '';
    if (!picker.isAi) {
      shotResults.append(h('div', { class: 'note info' }, 'وضع «على جهازك»: لا يُحلَّل الشوت تلقائيًا. انظر إلى الصورة واختر الخامات المطابقة من تبويب «البحث في المكتبة»، أو اختر طريقة بالذكاء الاصطناعي لتحليلها.'));
      return;
    }
    shotResults.append(h('p', { class: 'muted center' }, 'جارٍ تحليل اللقطة والتعرّف على الخامات…'));
    let d;
    try { d = (await vision('shot', shotImg, { provider: picker.value, maxSide: 1600 })).data; }
    catch (e) { shotResults.innerHTML = ''; shotResults.append(h('div', { class: 'note err' }, e.message)); return; }
    try { sessionStorage.setItem('itq-shot', JSON.stringify(d.shot || {})); } catch { }
    shotResults.innerHTML = '';
    const s = d.shot || {};
    shotResults.append(h('div', { class: 'note info' }, `نوع اللقطة: ${s.type === 'exterior' ? 'خارجية' : 'داخلية'} — الوقت: ${({ day: 'نهار', sunset: 'غروب', night: 'ليل', overcast: 'غائم' })[s.time] || '—'}. ${s.lighting_ar || ''} يمكنك تجهيز إضاءتها من أداة «الإضاءة وإعدادات الريندر».`));
    for (const mat of (d.materials || []).slice(0, 12)) shotResults.append(materialRow(mat));
  };

  // صف خامة مكتشفة: مرشحات من المكتبة، أو بديل مشابه، أو توليد
  const materialRow = (mat) => {
    const meta = { category: mat.category, finish: mat.finish, metal: mat.metal, name_ar: mat.name_ar };
    const cands = h('div', { class: 'rs-grid small' }, h('p', { class: 'muted' }, 'جارٍ البحث عن خامات مطابقة…'));
    const extra = h('div', { class: 'rs-row' });
    const row = h('div', { class: 'panel rs-mat' },
      h('div', { class: 'rs-mat-head' }, h('b', {}, mat.name_ar), h('span', { class: 'rs-src' }, mat.where_ar || ''), h('span', { class: 'rs-src' }, CAT_AR[mat.category] || '')),
      cands, extra);
    const words = [...new Set((mat.keywords || []).flatMap(k => String(k).toLowerCase().split(/\s+/)))];
    const show = (list, title) => { cands.innerHTML = ''; if (title) cands.append(h('p', { class: 'muted', style: { gridColumn: '1/-1', margin: 0 } }, title)); list.forEach(m => cands.append(card(m, meta))); };
    (async () => {
      try {
        const r = await searchMaterials('', { words, limit: 8 });
        const best = r[0]?._s || 0, strong = r.filter(x => x._s >= Math.max(4, best * 0.6));
        if (strong.length && best >= Math.min(6, words.length * 2)) show(strong.slice(0, 6), 'اضغط الخامة المناسبة لإضافتها:');
        else {
          cands.innerHTML = ''; cands.append(h('p', { class: 'note warn', style: { gridColumn: '1/-1' } }, 'لم أجد خامة مطابقة تمامًا في المكتبات المجانية. اختر أحد الاقتراحين:'));
          const simBtn = h('button', { class: 'btn light sm', type: 'button' }, ico('search', 16), 'عرض خامات مشابهة');
          simBtn.onclick = async () => {
            simBtn.disabled = true;
            try {
              const base = (CAT_EN[mat.category] || mat.category || '').split(' ');
              const r2 = await searchMaterials('', { words: [...new Set([...base, ...String(mat.color || '').toLowerCase().split(/\s+/)].filter(Boolean))], limit: 8 });
              show(r2.slice(0, 8), 'خامات مشابهة (أقرب ما في المكتبة):');
            } catch (e) { toast(e.message, true); }
            simBtn.disabled = false;
          };
          const genBtn = h('button', { class: 'btn light sm', type: 'button' }, ico('sparkles', 16), 'توليدها بالذكاء الاصطناعي');
          genBtn.onclick = () => generate(mat, meta, genBtn);
          extra.append(simBtn, genBtn);
        }
      } catch (e) { cands.innerHTML = ''; cands.append(h('p', { class: 'note err' }, e.message)); }
    })();
    return row;
  };

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
    const c = document.createElement('canvas'); const s = Math.min(1, 2000 / Math.max(img.width, img.height)); c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    shotImg = c; shotPreview.innerHTML = ''; shotPreview.append(h('img', { src: url, alt: 'صورة الشوت' }), h('button', { class: 'btn sm', type: 'button', onclick: analyze }, ico('wand-sparkles', 16), 'تحليل اللقطة من جديد'));
    analyze();
  } });
  const shotTab = h('div', {}, picker.el, shotDz, shotPreview, shotResults);

  /* ---------- التبويبات ---------- */
  const tabs = h('div', { class: 'tabs' });
  const holder = h('div');
  const showTab = (k) => { holder.innerHTML = ''; holder.append(k === 'shot' ? shotTab : libTab); [...tabs.children].forEach(b => b.classList.toggle('on', b.dataset.k === k)); if (k === 'lib' && !grid.children.length) runSearch(''); };
  for (const [k, t, ic] of [['shot', 'من صورة الشوت', 'image'], ['lib', 'البحث في المكتبة', 'search']]) tabs.append(h('button', { type: 'button', 'data-k': k, onclick: () => showTab(k) }, ico(ic, 16), t));
  body.append(h('div', { class: 'rs' }, destBox, h('div', { class: 'panel' }, tabs, holder), cartBox));
  showTab('shot'); drawCart();
}
