// أداة «تحويل صورة الخامة إلى خرائط»:
// 1) التكرار دون فواصل: البحث عن أفضل جزء قابل للتكرار، أو معالجة الحواف، أو إعادة التوليد بالذكاء الاصطناعي.
// 2) تحسين الدقة: على الجهاز أو بالذكاء الاصطناعي (كأنها ممسوحة بماسح خامات).
// 3) الخرائط PBR، ثم التحقق الفعلي من التكرار.
// 4) طبقات الواقعية الاختيارية، ومعاينتها على كرة عرض ثلاثية الأبعاد بالمقاس الحقيقي.
// 5) الحفظ في مكتبة إتقان (Corona و V-Ray) مع دليل التركيب.
import { h, ico, toast, select, seg, dropzone, download } from '../ui.js';
import { aiStatus } from '../ai-tools.js';
import { imageToMaps } from './maps.js';
import { makeInfo, materialFiles, keyOf } from './pack.js';
import { destination } from './dest.js';
import { findTileableCrop, cropTo, seamScore, tilePreview } from './seam.js';
import { enhanceLocal, enhanceAI } from './enhance.js';
import { LAYERS, makeImperfections } from './imperfections.js';
import { compose } from './composite.js';

const LABELS = { basecolor: 'اللون (BaseColor)', normal: 'Normal', roughness: 'Roughness', height: 'Displacement', ao: 'AO', metal: 'Metalness' };
const CAT = [['marble', 'رخام'], ['wood', 'خشب'], ['floor_wood', 'أرضية خشبية'], ['stone', 'حجر'], ['concrete', 'خرسانة'], ['plaster', 'محارة ودهان'], ['brick', 'طوب'], ['tiles', 'بلاط'], ['metal', 'معدن'], ['fabric', 'قماش'], ['leather', 'جلد'], ['carpet', 'سجاد'], ['ground', 'أرض'], ['other', 'أخرى']];
const TILES = [[0.25, '¼'], [0.5, '½'], [1, '1'], [2, '2'], [3, '3']];
const hex = (c) => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const unhex = (s) => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
const setSeg = (w, v) => [...w.querySelectorAll('button')][w._vals.indexOf(v)]?.click();
function segV(opts, v, on) { const w = seg(opts, v, on); w._vals = opts.map(o => o[0]); return w; }
const badge = (g) => h('span', { class: 'tm-badge ' + g.id }, g.ar);

export function renderTexMaps(body) {
  const dest = destination();
  let img = null, crop = null, result = null, layerImgs = {}, seed = 1234, ball = null, srcUsed = null, aiOk = false;
  const name = h('input', { class: 'input', placeholder: 'مثال: Client Marble Calacatta', dir: 'ltr' });
  const nameAr = h('input', { class: 'input', placeholder: 'مثال: رخام كلكتا للعميل' });
  const cat = select(CAT, 'marble'), fin = select([['matte', 'مطفي'], ['satin', 'نصف لامع'], ['glossy', 'لامع']], 'satin');
  const size = select([[1024, '1K'], [2048, '2K (افتراضي)'], [4096, '4K']], 2048);
  const realW = h('input', { class: 'input', type: 'number', min: 0, step: 0.05, value: '', placeholder: 'مثال: 0.6', dir: 'ltr' });
  const strength = h('input', { type: 'range', min: 0.5, max: 5, step: 0.5, value: 2 });
  const del = h('input', { type: 'checkbox', checked: true }), inv = h('input', { type: 'checkbox' }), metal = h('input', { type: 'checkbox' });
  const status = h('p', { class: 'muted' });

  /* ---------- ١) التكرار ---------- */
  const seamView = h('div', { class: 'tm-seam' }), seamMsg = h('div', {});
  let tileMode = 'crop';
  const tileSeg = segV([['crop', 'أفضل جزء متكرر من الصورة'], ['whole', 'الصورة كاملة + معالجة الحواف'], ['ai', 'إعادة التوليد بالذكاء الاصطناعي']], 'crop', v => { tileMode = v; paintSeam(); syncEnh(); });
  const seamPanel = h('div', { class: 'panel hidden' }, h('h3', {}, ico('grid-3x3', 20), ' ١) التكرار دون فواصل'), seamMsg, tileSeg, seamView);

  function paintSeam() {
    seamView.innerHTML = '';
    if (!img || !crop) return;
    const W = img.naturalWidth, H = img.naturalHeight, k = Math.min(1, 520 / Math.max(W, H));
    const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k); const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
    if (tileMode === 'crop') { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, crop.x, crop.y, crop.side, crop.side, crop.x * k, crop.y * k, crop.side * k, crop.side * k); x.strokeStyle = '#22c55e'; x.lineWidth = 3; x.strokeRect(crop.x * k, crop.y * k, crop.side * k, crop.side * k); }
    const tile = tileMode === 'crop' ? cropTo(img, crop) : img;
    seamView.append(
      h('figure', {}, c, h('figcaption', {}, tileMode === 'crop' ? `الجزء المختار (${Math.round(crop.frac * 100)}% من الصورة) — ` : 'الصورة كاملة — ', badge(tileMode === 'crop' ? crop.grade : crop.whole.grade))),
      h('figure', {}, tilePreview(tile, 3, 520), h('figcaption', {}, tileMode === 'ai' ? 'سيُعاد توليدها متكررة؛ هذه معاينة الصورة الحالية مكررة 3×3' : tileMode === 'whole' ? 'معاينة قبل معالجة الحواف (3×3)' : 'معاينة التكرار 3×3 للجزء المختار')));
  }

  async function analyze() {
    seamPanel.classList.remove('hidden'); seamMsg.innerHTML = ''; seamMsg.append(h('p', { class: 'muted' }, 'جارٍ تحليل الصورة للبحث عن جزء يتكرر دون فواصل…'));
    crop = await findTileableCrop(img);
    seamMsg.innerHTML = '';
    if (crop.grade.ok) {
      seamMsg.append(h('div', { class: 'note ok' }, ico('circle-check', 18), ` وُجد جزء يتكرر دون فواصل ظاهرة بتقييم «${crop.grade.ar}»، واختير تلقائيًا. يمكنك تغيير الطريقة أدناه.`));
      setSeg(tileSeg, 'crop');
    } else {
      const aiBtn = h('button', { class: 'btn', type: 'button', disabled: !aiOk }, ico('sparkles', 16), 'إعادة التوليد بالذكاء الاصطناعي (مستحسن)');
      const edgeBtn = h('button', { class: 'btn ghost', type: 'button' }, ico('blend', 16), 'معالجة الحواف على جهازي');
      aiBtn.onclick = () => setSeg(tileSeg, 'ai'); edgeBtn.onclick = () => setSeg(tileSeg, 'whole');
      seamMsg.append(h('div', { class: 'note warn' },
        h('p', {}, `لم يُعثر في هذه الصورة على جزء يتكرر دون فواصل بشكل مقنع (أفضل تقييم: «${crop.grade.ar}»). الأسباب المعتادة: إضاءة غير متساوية، أو منظور مائل، أو عناصر مميزة لا تتكرر.`),
        h('p', {}, aiOk ? 'الحل الأفضل: إعادة توليد الخامة بالذكاء الاصطناعي من الصورة نفسها بشرط أن تتكرر دون فواصل. البديل: مزج الحواف على جهازك، وقد يترك أثرًا ضبابيًا خفيفًا قرب الحواف.' : 'إعادة التوليد بالذكاء الاصطناعي غير متاحة حاليًا، فاستخدم معالجة الحواف على جهازك، أو التقط صورة أخرى مواجهة للخامة بإضاءة متساوية.'),
        h('div', { class: 'actions' }, aiBtn, edgeBtn)));
      setSeg(tileSeg, aiOk ? 'ai' : 'whole');
    }
    paintSeam();
  }

  /* ---------- ٢) تحسين الدقة ---------- */
  let enhMode = 'local';
  const enhSeg = segV([['none', 'دون تحسين'], ['local', 'توضيح وتكبير على جهازي'], ['ai', 'إعادة توليد كأنها ممسوحة ضوئيًا (ذكاء اصطناعي)']], 'local', v => { enhMode = v; syncEnh(); });
  const enhNote = h('p', { class: 'muted' });
  function syncEnh() {
    const aiBtn = enhSeg.querySelectorAll('button')[2]; aiBtn.disabled = !aiOk;
    enhNote.textContent = tileMode === 'ai' || enhMode === 'ai'
      ? 'سيُعاد توليد الخامة بالذكاء الاصطناعي (Gemini) من صورتك: إضاءة مسطحة دون ظلال أو انعكاسات، بزاوية عمودية، وتفاصيل حادة، ومتكررة دون فواصل. تُخرج النماذج نحو 1K، ثم تُكبَّر محليًا إلى الدقة المختارة. الطلب الواحد يُحسب 3 صور من الحد اليومي.'
      : enhMode === 'local' ? 'تكبير تدريجي عالي الجودة حتى الدقة المختارة (حتى 4K)، ثم زيادة الحدة وإبراز التفاصيل الدقيقة. هذا يحسّن الوضوح لكنه لا يخترع تفاصيل غير موجودة في الصورة.'
      : 'تُستخدم الصورة كما هي (تُكبَّر أو تُصغَّر فقط إلى الدقة المختارة).';
  }
  aiStatus().then(st => { aiOk = !!(st && st.enabled !== false && st.status?.gemini?.available); syncEnh(); if (crop) analyze(); });
  syncEnh();

  /* ---------- الاستخراج ---------- */
  const preview = h('div', { class: 'rs-maps' }), verify = h('div', {});
  const genBtn = h('button', { class: 'btn', type: 'button', disabled: true }, ico('wand-sparkles', 18), 'استخراج الخرائط');
  const saveBtn = h('button', { class: 'btn', type: 'button', disabled: true }, ico('download', 18), 'حفظ الخامة');

  const dz = dropzone({ accept: 'image/*', label: 'اختر صورة الخامة', hint: 'صورة مواجهة للخامة، بإضاءة متساوية ودون ظلال أو انعكاسات قوية', onFiles: async ([f]) => {
    try { const im = new Image(); im.src = URL.createObjectURL(f); await im.decode(); setImage(im); if (!name.value) name.value = f.name.replace(/\.[^.]+$/, ''); }
    catch { toast('تعذّر فتح الصورة.', true); }
  } });
  function setImage(im) { img = im; result = null; saveBtn.disabled = true; preview.innerHTML = ''; verify.innerHTML = ''; impPanel.classList.add('hidden'); ballPanel.classList.add('hidden'); genBtn.disabled = false; analyze(); }

  genBtn.onclick = async () => {
    if (!img || !crop) return; genBtn.disabled = true; saveBtn.disabled = true; const S = +size.value;
    const step = (m) => status.textContent = m;
    try {
      let src = tileMode === 'crop' ? cropTo(img, crop) : img, blend = tileMode === 'whole';
      if (tileMode === 'ai' || enhMode === 'ai') {
        step('إعادة توليد الخامة بالذكاء الاصطناعي… (قد يستغرق نصف دقيقة)');
        try {
          src = await enhanceAI(src, { seamless: true, category: cat.value, finish: fin.value });
          const sc = seamScore(src); if (!sc.grade.ok) { blend = true; toast(`الصورة المولّدة تقييم تكرارها «${sc.grade.ar}»، فطُبّقت معالجة الحواف عليها أيضًا.`, false, 7000); }
        } catch (e) {
          if (tileMode !== 'ai' && !e.unavailable && !e.limit) throw e;
          toast(e.message + ' — سيُكمل التحويل على جهازك بمعالجة الحواف.', true, 8000);
          if (tileMode === 'ai') { src = img; blend = true; }
        }
      }
      if (enhMode !== 'none' || Math.max(src.width || src.naturalWidth, src.height || src.naturalHeight) < S) src = await enhanceLocal(src, S, enhMode === 'none' ? { sharpen: 0.25, clarity: 0 } : {}, step);
      srcUsed = src;
      result = await imageToMaps(src, { size: S, seamless: blend, delight: del.checked, invertHeight: inv.checked, strength: +strength.value, finish: fin.value, metal: metal.checked }, step);
      preview.innerHTML = '';
      for (const [k, v] of Object.entries(result)) { const u = URL.createObjectURL(v.blob); preview.append(h('figure', {}, h('img', { src: u, alt: LABELS[k] }), h('figcaption', {}, LABELS[k]))); }
      // التحقق الفعلي من التكرار على خريطة اللون النهائية
      const sc = seamScore(result.basecolor.canvas);
      verify.innerHTML = '';
      verify.append(h('div', { class: 'note ' + (sc.grade.ok ? 'ok' : 'warn') }, ico(sc.grade.ok ? 'circle-check' : 'triangle-alert', 18),
        sc.grade.ok ? (blend ? ` تحقّق التكرار: الحواف متصلة (${sc.grade.ar}). لكن معالجة الحواف تمزج أجزاء من الصورة، فقد تظهر مناطق المزج في الخامات ذات الخطوط أو النقوش الواضحة؛ راجع معاينة 3×3، وإن لم تعجبك فالأفضل «إعادة التوليد بالذكاء الاصطناعي».` : ` تحقّق التكرار: سليم (${sc.grade.ar}). لا تظهر فواصل عند تكرار الخامة.`) : ` تحقّق التكرار: ما زال هناك فاصل ظاهر («${sc.grade.ar}»). جرّب «إعادة التوليد بالذكاء الاصطناعي» أو «الصورة كاملة + معالجة الحواف».`),
        h('div', { class: 'tm-seam' }, h('figure', {}, tilePreview(result.basecolor.canvas, 3, 520), h('figcaption', {}, 'الخامة النهائية مكررة 3×3'))));
      status.textContent = 'اكتملت الخرائط. أضف طبقات الواقعية إن أردت، وعاين الخامة على الكرة، ثم احفظها.';
      saveBtn.disabled = false; impPanel.classList.remove('hidden'); ballPanel.classList.remove('hidden');
      await ensureLayers(); await refreshBall();
    } catch (e) { console.error(e); toast('تعذّر الاستخراج: ' + e.message, true); status.textContent = ''; }
    genBtn.disabled = false;
  };

  /* ---------- ٣) طبقات الواقعية ---------- */
  const rows = {}, impList = h('div', { class: 'tm-layers' });
  for (const L of LAYERS) {
    const on = h('input', { type: 'checkbox', checked: L.def });
    const amt = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: L.amount });
    const til = select(TILES, L.tile);
    const col = L.color ? h('input', { type: 'color', value: hex(L.color), title: 'لون العيب' }) : null;
    const thumb = h('div', { class: 'tm-thumb' }), realTxt = h('small', { class: 'muted' });
    const r = { L, on, amt, til, col, thumb, realTxt };
    rows[L.id] = r;
    const row = h('div', { class: 'tm-layer' }, thumb,
      h('div', { class: 'tm-l-main' }, h('label', { class: 'check' }, on, h('b', {}, L.ar)), h('small', { class: 'muted' }, 'يؤثر في: ' + L.use)),
      h('label', { class: 'tm-l-f' }, h('span', {}, 'القوة'), amt),
      h('label', { class: 'tm-l-f' }, h('span', {}, 'التكرار لكل تكرار للخامة'), til, realTxt),
      col ? h('label', { class: 'tm-l-f' }, h('span', {}, 'اللون'), col) : h('span'));
    on.onchange = async () => { row.classList.toggle('off', !on.checked); await ensureLayers(); refreshBallSoon(); };
    for (const el of [amt, til, col]) if (el) el.oninput = el.onchange = () => { paintReal(); refreshBallSoon(); };
    row.classList.toggle('off', !L.def);
    impList.append(row);
  }
  function paintReal() { const w = +realW.value || 0.6; for (const r of Object.values(rows)) r.realTxt.textContent = `مقاس الطبقة الحقيقي ≈ ${Math.round(w * 100 / +r.til.value)} سم`; }
  realW.oninput = () => { paintReal(); refreshBallSoon(); }; paintReal();
  const autoMs = h('input', { type: 'checkbox', checked: true });
  const reseed = h('button', { class: 'btn ghost', type: 'button' }, ico('shuffle', 16), 'تنويع شكل الطبقات');
  reseed.onclick = async () => { seed = Math.floor(Math.random() * 1e6); layerImgs = {}; await ensureLayers(); refreshBall(); };
  const impPanel = h('div', { class: 'panel hidden' }, h('h3', {}, ico('layers', 20), ' ٣) طبقات الواقعية (اختيارية)'),
    h('p', { class: 'muted' }, 'طبقات إجرائية متكررة دون فواصل تكسر «الكمال الرقمي» للخامة. ابدأ بقوة منخفضة؛ الواقعية تأتي من عيوب بالكاد تُلاحظ. التغييرات تظهر مباشرة على كرة المعاينة.'),
    impList, h('div', { class: 'actions' }, reseed, h('label', { class: 'check' }, autoMs, 'تركيب الطبقات تلقائيًا (اللون والخشونة) عند تشغيل سكربت الخامة في ماكس')));

  const selected = () => Object.values(rows).filter(r => r.on.checked);
  async function ensureLayers() {
    const need = selected().map(r => r.L.id).filter(id => !layerImgs[id]);
    if (!need.length || !result) return;
    const R = Math.min(+size.value, 2048);
    const out = await makeImperfections(need, R, { seed, onStep: (m) => status.textContent = m });
    Object.assign(layerImgs, out);
    for (const id of need) { const t = rows[id].thumb; t.innerHTML = ''; t.append(h('img', { src: URL.createObjectURL(out[id].blob), alt: '' })); }
    status.textContent = 'الطبقات جاهزة.';
  }
  const settings = () => selected().map(({ L, amt, til, col }) => ({ id: L.id, en: L.en, ar: L.ar, amount: +amt.value, tile: +til.value, color: col ? unhex(col.value) : L.color, colorAmt: L.colorAmt, rough: L.rough, signed: !!L.signed, bump: L.bump }));

  /* ---------- ٤) كرة العرض ---------- */
  const ballBox = h('div', { class: 'tm-ball' }), ballMsg = h('p', { class: 'muted' });
  const rot = h('input', { type: 'checkbox' }), env = h('input', { type: 'range', min: 0.2, max: 2, step: 0.1, value: 0.9 }), light = h('input', { type: 'range', min: 0, max: 6.28, step: 0.05, value: 2.3 });
  const nStr = h('input', { type: 'range', min: 0, max: 3, step: 0.1, value: 1 }), expo = h('input', { type: 'range', min: 0.4, max: 2, step: 0.05, value: 1 });
  const showImp = h('input', { type: 'checkbox', checked: true });
  const snapBtn = h('button', { class: 'btn ghost', type: 'button' }, ico('camera', 16), 'حفظ صورة المعاينة');
  const ballPanel = h('div', { class: 'panel hidden' }, h('h3', {}, ico('circle', 20), ' ٤) المعاينة على كرة العرض'),
    h('p', { class: 'muted' }, 'كرة بقطر 20 سم على أرضية شبكية مربعاتها 10 سم، والخامة بمقاسها الحقيقي المُدخل (أو 60 سم إن لم تُدخله). اسحب للتدوير، واستخدم العجلة للتقريب.'),
    ballBox, ballMsg,
    h('div', { class: 'opts' },
      h('label', { class: 'field' }, h('span', {}, 'شدة إضاءة البيئة'), env), h('label', { class: 'field' }, h('span', {}, 'اتجاه الضوء الرئيسي'), light),
      h('label', { class: 'field' }, h('span', {}, 'قوة البروز في المعاينة'), nStr), h('label', { class: 'field' }, h('span', {}, 'التعريض (Exposure)'), expo),
      h('div', { class: 'field' }, h('span', {}, 'عرض'), h('label', { class: 'check' }, showImp, 'إظهار طبقات الواقعية'), h('label', { class: 'check' }, rot, 'تدوير تلقائي'))),
    h('div', { class: 'actions' }, snapBtn));
  rot.onchange = () => ball?.setAuto(rot.checked); env.oninput = () => ball?.setEnv(+env.value); light.oninput = () => ball?.setLightAngle(+light.value);
  for (const el of [nStr, expo, showImp]) el.oninput = el.onchange = () => refreshBallSoon();
  snapBtn.onclick = async () => { if (ball) download(await ball.snapshot(), `${keyOf(name.value || 'Material')}_preview.png`, 'image/png'); };

  let busy = false, again = false, tmr = 0;
  const refreshBallSoon = () => { clearTimeout(tmr); tmr = setTimeout(refreshBall, 350); };
  async function refreshBall() {
    if (!result) return;
    if (busy) { again = true; return; } busy = true;
    try {
      if (!ball) {
        ballMsg.textContent = 'جارٍ تجهيز كرة العرض…';
        const { createShaderBall } = await import('./shaderball.js');
        ball = await createShaderBall(ballBox); ball.setEnv(+env.value); ball.setLightAngle(+light.value);
      }
      await ensureLayers();
      const st = showImp.checked ? settings().filter(s => layerImgs[s.id]) : [];
      const m = st.length ? await compose({ basecolor: result.basecolor.canvas, roughness: result.roughness.canvas, normal: result.normal.canvas }, layerImgs, st)
        : { basecolor: result.basecolor.canvas, roughness: result.roughness.canvas, normal: result.normal.canvas, superN: 1 };
      ball.setMaterial({ ...m, ao: result.ao?.canvas, metal: result.metal?.canvas, metalness: metal.checked, sizeCm: (+realW.value || 0.6) * 100, normalStrength: +nStr.value, exposure: +expo.value });
      ballMsg.textContent = st.length ? `تظهر ${st.length} من طبقات الواقعية على الكرة.` : '';
    } catch (e) { console.error(e); ballMsg.textContent = e.message || 'تعذّر عرض كرة المعاينة في هذا المتصفح.'; }
    busy = false; if (again) { again = false; refreshBall(); }
  }

  /* ---------- الحفظ ---------- */
  saveBtn.onclick = async () => {
    if (!result) return;
    let w; try { w = await dest.writer(); } catch (e) { if (e.name !== 'AbortError') toast(e.message, true); return; }
    saveBtn.disabled = true;
    try {
      await ensureLayers();
      const maps = Object.fromEntries(Object.entries(result).map(([k, v]) => [k, v.blob]));
      const rw = +realW.value;
      const m = { src: 'user', id: 'u' + Date.now(), name: name.value || 'Custom Material', key: 'Custom_' + keyOf(name.value || 'Material'), size_m: rw > 0 ? [rw, rw] : null, license: 'صورة المستخدم' };
      const info = makeInfo(m, { category: cat.value, finish: fin.value, metal: metal.checked, name_ar: nameAr.value }, 'jpg', maps);
      const st = settings().filter(s => layerImgs[s.id]);
      info.imperf = st.map(s => ({ ...s, colorAmt: s.color && s.colorAmt ? Math.min(1, s.amount * s.colorAmt * 1.6) : 0, roughAmt: s.rough ? Math.min(1, s.amount * s.rough * (s.signed ? 1 : 1.8)) : 0, auto: autoMs.checked }));
      const imp = st.length ? Object.fromEntries(st.map(s => [s.en, layerImgs[s.id].blob])) : null;
      await w.add(await materialFiles(info, maps, imp)); const r = await w.finish(`${info.key}.zip`);
      if (r?.rejected) toast(`رفض المتصفح حفظ بعض الملفات مباشرة في المجلد، وعددها ${r.rejected.length} (${r.rejected.slice(0, 4).join('، ')}${r.rejected.length > 4 ? '…' : ''})، فنُزّلت في ملف ZIP صغير بالمسارات نفسها؛ فُكّه داخل مجلد المكتبة.`, true, 12000);
      status.textContent = (dest.kind === 'folder' ? `حُفظت الخامة ${info.key} في «${dest.name}». شغّل ITQAN_Materials_Setup.ms في ماكس لتظهر في مكتبة ITQAN.` : 'نُزّل ملف ZIP بالخامة.') + (imp ? ' طبقات الواقعية في مجلد Imperfections، وشرح تركيبها في Imperfections_Guide.txt.' : '');
    } catch (e) { toast('تعذّر الحفظ: ' + e.message, true); }
    saveBtn.disabled = false;
  };

  // صورة محوّلة من أداة «خامات الريندر»
  if (window.__itqPendingTexture) {
    const src = window.__itqPendingTexture; window.__itqPendingTexture = null;
    const im = new Image(); im.src = src.toDataURL('image/jpeg', 0.95);
    im.decode().then(() => { setImage(im); status.textContent = 'الصورة جاهزة. أدخل اسمها ونوعها ثم اضغط «استخراج الخرائط».'; });
  }
  body.append(h('div', { class: 'rs tm' }, dest.el,
    h('div', { class: 'panel' }, h('h3', {}, ico('image', 20), ' صورة الخامة'), dz,
      h('div', { class: 'opts' },
        h('label', { class: 'field' }, h('span', {}, 'اسم الخامة (بالإنجليزية للملفات)'), name), h('label', { class: 'field' }, h('span', {}, 'الاسم بالعربية'), nameAr),
        h('label', { class: 'field' }, h('span', {}, 'النوع'), cat), h('label', { class: 'field' }, h('span', {}, 'التشطيب'), fin),
        h('label', { class: 'field' }, h('span', {}, 'الدقة النهائية'), size), h('label', { class: 'field' }, h('span', {}, 'المقاس الحقيقي للصورة (متر)'), realW, h('small', {}, 'عرض المساحة الظاهرة في الصورة؛ يضبط UVW Map وكرة المعاينة')))),
    seamPanel,
    h('div', { class: 'panel' }, h('h3', {}, ico('scan', 20), ' ٢) تحسين الدقة والوضوح'), enhSeg, enhNote,
      h('div', { class: 'opts' },
        h('label', { class: 'field' }, h('span', {}, 'قوة البروز (Normal)'), strength),
        h('div', { class: 'field' }, h('span', {}, 'خيارات'), h('label', { class: 'check' }, del, 'إزالة الإضاءة غير المتساوية'), h('label', { class: 'check' }, inv, 'عكس الارتفاع (للخامات الداكنة البارزة)'), h('label', { class: 'check' }, metal, 'خامة معدنية'))),
      h('div', { class: 'actions' }, genBtn, saveBtn), status, verify, preview),
    impPanel, ballPanel));
}
