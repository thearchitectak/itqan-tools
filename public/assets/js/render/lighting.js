// أداة «الإضاءة وإعدادات الريندر»: HDRI مناسب للقطة، وملفات IES مولّدة، وسكربت يضبط الإضاءة والريندر حسب نوع اللقطة.
import { h, ico, toast, select, seg, dropzone } from '../ui.js';
import { aiPicker, vision } from '../ai-tools.js';
import { hdris, hdriFile, hdriResolutions, smartFetch } from './lib.js';
import { IES_PROFILES, iesFile, polarSvg } from './ies.js';
import { renderScript, SCENES } from './maxscript.js';
import { destination } from './dest.js';

const BOM = '﻿';
const HDRI_CATS = {
  interior_day: ['skies', 'partly cloudy', 'clear', 'midday'], interior_night: ['night'], exterior_day: ['midday', 'partly cloudy', 'clear', 'skies', 'outdoor'],
  exterior_sunset: ['sunrise-sunset'], exterior_night: ['night'], studio: ['studio'],
};
const RES_SIZE = { '1k': '1K', '2k': '2K', '4k': '4K', '8k': '8K', '16k': '16K' };

export function renderLighting(body) {
  const dest = destination();
  let scene = 'interior_day', pickedHdri = null;

  /* ---------- نوع اللقطة: تلقائي من الصورة أو يدوي ---------- */
  const sceneSeg = seg(Object.entries(SCENES).map(([k, v]) => [k, v.ar]), scene, v => { scene = v; loadHdris(); });
  const setScene = (k) => { scene = k; [...sceneSeg.children].forEach((b, i) => b.classList.toggle('on', Object.keys(SCENES)[i] === k)); sceneSeg.value = k; loadHdris(); };
  const picker = aiPicker('light-shot', { note: 'يتعرّف الذكاء الاصطناعي على نوع اللقطة (داخلية أو خارجية) ووقتها وطبيعة إضاءتها، ويختار الإعدادات المناسبة.' });
  const shotInfo = h('div');
  const fromShot = (s) => {
    if (!s || !s.type) return;
    const k = s.type === 'exterior' ? ({ sunset: 'exterior_sunset', night: 'exterior_night' })[s.time] || 'exterior_day' : (s.time === 'night' ? 'interior_night' : 'interior_day');
    setScene(k);
    shotInfo.innerHTML = ''; shotInfo.append(h('div', { class: 'note info' }, `تعرّفت على اللقطة: ${SCENES[k].ar}. ${s.lighting_ar || ''} يمكنك تغيير الاختيار يدويًا.`));
  };
  try { const s = JSON.parse(sessionStorage.getItem('itq-shot') || 'null'); if (s) fromShot(s); } catch { }
  const shotDz = dropzone({ accept: 'image/*', label: 'ارفع صورة الشوت للتعرّف عليها', hint: 'اختياري — أو اختر نوع اللقطة يدويًا', onFiles: async ([f]) => {
    if (!picker.isAi) {
      try {
        const img = new Image(); img.src = URL.createObjectURL(f); await img.decode();
        const g = guessScene(img); setScene(g.scene);
        shotInfo.innerHTML = ''; shotInfo.append(h('div', { class: 'note info' }, `تقدير على جهازك (دون ذكاء اصطناعي): ${SCENES[g.scene].ar}. ${g.why} هذا تقدير تقريبي من ألوان الصورة وإضاءتها؛ غيّره يدويًا من الأزرار إن لم يكن صحيحًا.`));
      } catch { shotInfo.innerHTML = ''; shotInfo.append(h('div', { class: 'note err' }, 'تعذّر فتح الصورة.')); }
      return;
    }
    shotInfo.innerHTML = ''; shotInfo.append(h('p', { class: 'muted' }, 'جارٍ تحليل اللقطة…'));
    try {
      const img = new Image(); img.src = URL.createObjectURL(f); await img.decode();
      const c = document.createElement('canvas'); const s = Math.min(1, 1600 / Math.max(img.width, img.height)); c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const d = (await vision('shot', c, { provider: picker.value })).data;
      try { sessionStorage.setItem('itq-shot', JSON.stringify(d.shot || {})); } catch { }
      fromShot(d.shot);
    } catch (e) { shotInfo.innerHTML = ''; shotInfo.append(h('div', { class: 'note err' }, e.message)); }
  } });

  /* ---------- HDRI ---------- */
  const hGrid = h('div', { class: 'rs-grid hdri' });
  const hRes = select(['1k', '2k', '4k', '8k', '16k'].map(r => [r, RES_SIZE[r] + (r === '2k' ? ' (افتراضي)' : '')]), '2k');
  const hNone = h('label', { class: 'check' }, h('input', { type: 'checkbox' }), 'دون HDRI (سماء وشمس المحرك)');
  const hSearch = h('input', { class: 'input', type: 'search', placeholder: 'بحث بالإنجليزية: sunset, overcast, city, forest…' });
  async function loadHdris() {
    hGrid.innerHTML = ''; hGrid.append(h('p', { class: 'muted' }, 'جارٍ تحميل خرائط HDRI…'));
    try {
      const all = await hdris(), q = hSearch.value.trim().toLowerCase(), cats = HDRI_CATS[scene];
      let list = all.filter(x => q ? (x.name.toLowerCase().includes(q) || x.tags.some(t => t.includes(q)) || x.cats.some(c => c.includes(q))) : cats.some(c => x.cats.includes(c)));
      if (scene === 'interior_day' && !q) list = list.filter(x => !x.cats.includes('indoor'));
      list.sort((a, b) => b.pop - a.pop); list = list.slice(0, 24);
      hGrid.innerHTML = '';
      if (!list.length) hGrid.append(h('p', { class: 'muted' }, 'لا توجد نتائج.'));
      list.forEach(x => {
        const b = h('button', { type: 'button', class: 'rs-card wide' + (pickedHdri?.id === x.id ? ' on' : ''), title: x.name }, h('img', { src: x.thumb, alt: '', loading: 'lazy' }), h('span', {}, x.name));
        b.onclick = () => { pickedHdri = x; [...hGrid.children].forEach(c => c.classList.remove('on')); b.classList.add('on'); hNone.firstChild.checked = false; };
        hGrid.append(b);
      });
      if (!pickedHdri && list[0] && !hNone.firstChild.checked) { pickedHdri = list[0]; hGrid.firstChild.classList.add('on'); }
    } catch (e) { hGrid.innerHTML = ''; hGrid.append(h('p', { class: 'note err' }, e.message)); }
  }
  let ht; hSearch.oninput = () => { clearTimeout(ht); ht = setTimeout(loadHdris, 400); };
  hNone.firstChild.onchange = () => { if (hNone.firstChild.checked) { pickedHdri = null; [...hGrid.children].forEach(c => c.classList.remove('on')); } };

  /* ---------- IES ---------- */
  const iesRows = IES_PROFILES.map(p => {
    const on = h('input', { type: 'checkbox', checked: ['spot24', 'down90', 'washer'].includes(p.id) });
    const lm = h('input', { class: 'input', type: 'number', min: 50, max: 20000, value: p.lm, dir: 'ltr' });
    const cct = select([[2700, '2700K دافئ جدًا'], [3000, '3000K دافئ'], [3500, '3500K'], [4000, '4000K محايد'], [5000, '5000K'], [6500, '6500K بارد']], 3000);
    return { p, on, lm, cct, el: h('div', { class: 'ies-row' }, h('span', { html: polarSvg(p) }), h('label', { class: 'check' }, on, h('b', {}, p.ar)), h('label', { class: 'field' }, h('span', {}, 'الفيض (لومن)'), lm), h('label', { class: 'field' }, h('span', {}, 'درجة اللون'), cct)) };
  });

  /* ---------- الريندر ---------- */
  const rC = h('input', { type: 'checkbox', checked: true }), rV = h('input', { type: 'checkbox', checked: true });
  const resPreset = select([['1920x1080', 'Full HD ‏1920×1080'], ['2560x1440', '2K ‏2560×1440'], ['3840x2160', '4K ‏3840×2160'], ['3000x2000', '3000×2000 (3:2)'], ['2480x3508', 'A4 رأسي 300dpi'], ['3508x2480', 'A4 أفقي 300dpi'], ['1080x1350', 'إنستغرام 1080×1350']], '1920x1080');
  const qSeg = seg([['preview', 'معاينة سريعة'], ['final', 'نهائي عالي الجودة']], 'final');

  const goBtn = h('button', { class: 'btn', type: 'button' }, ico('download', 18), 'تجهيز حزمة الإضاءة');
  const status = h('p', { class: 'muted' });
  goBtn.onclick = async () => {
    if (!rC.checked && !rV.checked) return toast('اختر محرك ريندر واحدًا على الأقل.', true);
    let w; try { w = await dest.writer(); } catch (e) { if (e.name !== 'AbortError') toast(e.message, true); return; }
    goBtn.disabled = true;
    try {
      const files = [], ies = [];
      for (const r of iesRows) if (r.on.checked) {
        const lm = Math.max(50, +r.lm.value || r.p.lm), cct = +r.cct.value, name = `ITQ_${r.p.id}_${lm}lm_${cct}K.ies`;
        files.push([`IES/${name}`, new Blob([iesFile(r.p, lm, cct)], { type: 'text/plain' })]); ies.push({ file: `IES/${name}`, lm, cct, ar: r.p.ar });
      }
      let hdriPath = null;
      if (pickedHdri) {
        const avail = await hdriResolutions(pickedHdri.id);
        const res = avail.includes(hRes.value) ? hRes.value : avail.filter(r => parseInt(r) <= parseInt(hRes.value)).pop() || avail[0];
        const x = await hdriFile(pickedHdri.id, res, 'hdr');
        const resp = await smartFetch(x.url, { onProgress: (g, t) => { status.textContent = `جارٍ تنزيل HDRI بدقة ${RES_SIZE[res]}… ${Math.round(100 * g / (t || x.size || 1))}%`; } });
        hdriPath = `HDRI/${pickedHdri.id}_${res}.hdr`; files.push([hdriPath, await resp.blob()]);
      }
      const [wd, hg] = resPreset.value.split('x').map(Number);
      const rends = [rC.checked && 'corona', rV.checked && 'vray'].filter(Boolean);
      for (const r of rends) files.push([`Scripts/ITQAN_Render_${scene}_${r === 'corona' ? 'Corona' : 'VRay'}.ms`, new Blob([BOM + renderScript({ renderer: r, scene, hdri: hdriPath, ies, width: wd, height: hg, quality: qSeg.value }).replace(/\r?\n/g, '\r\n')], { type: 'text/plain' })]);
      files.push([`Scripts/Lighting_Guide_${scene}.txt`, new Blob([BOM + lightGuide(scene, pickedHdri, ies, rends).replace(/\n/g, '\r\n')], { type: 'text/plain' })]);
      status.textContent = 'جارٍ الحفظ…';
      await w.add(files); const r = await w.finish(`ITQAN_Lighting_${scene}.zip`);
      if (r?.rejected) toast(`رفض المتصفح حفظ بعض الملفات مباشرة في المجلد، وعددها ${r.rejected.length} (${r.rejected.slice(0, 4).join('، ')}${r.rejected.length > 4 ? '…' : ''})، فنُزّلت في ملف ZIP صغير بالمسارات نفسها؛ فُكّه داخل مجلد المكتبة.`, true, 12000);
      status.textContent = dest.kind === 'folder' ? `حُفظت الحزمة في «${dest.name}»: مجلدات Scripts و IES${hdriPath ? ' و HDRI' : ''}.` : 'نُزّل ملف ZIP بحزمة الإضاءة.';
    } catch (e) { console.error(e); toast('تعذّر التجهيز: ' + e.message, true); status.textContent = ''; }
    goBtn.disabled = false;
  };

  body.append(h('div', { class: 'rs' }, dest.el,
    h('div', { class: 'panel' }, h('h3', {}, ico('image', 20), ' ١. نوع اللقطة'), picker.el, shotDz, shotInfo, h('div', { class: 'field' }, h('span', {}, 'أو اختر يدويًا'), sceneSeg)),
    h('div', { class: 'panel' }, h('h3', {}, ico('sun', 20), ' ٢. خريطة الإضاءة البيئية HDRI'), h('p', { class: 'muted' }, 'خرائط مجانية من Poly Haven مقترحة حسب نوع اللقطة. للخلفيات الظاهرة في اللقطة اختر 8K أو أعلى.'),
      h('div', { class: 'opts' }, h('label', { class: 'field' }, h('span', {}, 'الدقة'), hRes), hSearch, hNone), hGrid),
    h('div', { class: 'panel' }, h('h3', {}, ico('lamp-ceiling', 20), ' ٣. ملفات IES للسبوتات'), h('p', { class: 'muted' }, 'ملفات توزيع ضوئي مولّدة ومعايرة باللومن. ضع عناصر Point مكان السبوتات في ماكس وحددها قبل تشغيل السكربت لتُنشأ الإضاءات تلقائيًا.'), ...iesRows.map(r => r.el)),
    h('div', { class: 'panel' }, h('h3', {}, ico('settings', 20), ' ٤. إعدادات الريندر'),
      h('div', { class: 'opts' }, h('div', { class: 'field' }, h('span', {}, 'المحرك'), h('label', { class: 'check' }, rC, 'Corona'), h('label', { class: 'check' }, rV, 'V-Ray')), h('label', { class: 'field' }, h('span', {}, 'مقاس الصورة'), resPreset), h('div', { class: 'field' }, h('span', {}, 'الجودة'), qSeg)),
      h('div', { class: 'actions' }, goBtn), status)));
  loadHdris();
}

// تقدير نوع اللقطة على الجهاز من إحصاءات الألوان والإضاءة (تقريبي)
function guessScene(img) {
  const W = 160, H = Math.max(40, Math.round(160 * img.height / img.width));
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, W, H); const d = x.getImageData(0, 0, W, H).data;
  const stat = (y0, y1) => { let r = 0, g = 0, b = 0, n = 0, ed = 0, hi = 0;
    for (let y = Math.floor(y0 * H); y < Math.floor(y1 * H); y++) for (let k = 0; k < W; k++) { const i = (y * W + k) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; if (l > 235) hi++;
      if (k) { const j = i - 4; ed += Math.abs(l - (0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2])); } }
    r /= n; g /= n; b /= n; return { r, g, b, l: 0.2126 * r + 0.7152 * g + 0.0722 * b, edge: ed / n, hi: hi / n }; };
  const all = stat(0, 1), top = stat(0, 0.3), bot = stat(0.6, 1);
  const skyBlue = top.b > top.r + 8 && top.b >= top.g - 4, skyWarm = top.r > top.b + 25 && top.r >= top.g, smoothTop = top.edge <= all.edge * 0.75 + 1.5;
  if (all.l < 55) {
    if (top.b > top.r + 4 && top.l < 70) return { scene: 'exterior_night', why: 'الصورة داكنة وأعلاها سماء زرقاء ليلية.' };
    return { scene: 'interior_night', why: 'الصورة داكنة وإضاءتها صناعية في الغالب.' };
  }
  if (skyWarm && smoothTop && top.l > 90) return { scene: 'exterior_sunset', why: 'أعلى الصورة سماء دافئة برتقالية ناعمة.' };
  if (skyBlue && smoothTop && top.l > 130) return { scene: 'exterior_day', why: 'أعلى الصورة سماء فاتحة ناعمة.' };
  if (Math.abs(all.r - all.b) < 8 && all.edge < 4 && bot.l > 150) return { scene: 'studio', why: 'خلفية محايدة متجانسة تشبه الاستوديو.' };
  return { scene: 'interior_day', why: 'لم تظهر سماء واضحة أعلى الصورة، والإضاءة نهارية.' };
}

function lightGuide(scene, hdri, ies, rends) {
  const S = SCENES[scene];
  return `أدوات إتقان — شرح حزمة الإضاءة (${S.ar})
────────────────────────────────────────
المحتويات
  • Scripts\\ : ${rends.map(r => `ITQAN_Render_${scene}_${r === 'corona' ? 'Corona' : 'VRay'}.ms`).join(' و ')}
  • ${hdri ? `HDRI\\ : خريطة ${hdri.name} من Poly Haven (CC0)` : 'دون HDRI: يستخدم السكربت سماء المحرك وشمسه'}
  • IES\\ : ${ies.length ? ies.map(x => `${x.ar} (${x.lm} لومن، ${x.cct}K)`).join('، ') : 'لا يوجد'}

طريقة الاستخدام
  1) افتح المشهد في 3ds Max 2025.
  2) لإضافة السبوتات: أنشئ Point من Create ← Helpers ← Point في مكان كل سبوت (أسفل السقف بقليل)، ثم حددها كلها.
  3) اسحب سكربت المحرك المناسب إلى نافذة العرض. يضبط السكربت:
     • المحرك وجودة الريندر وحد الضوضاء ومزيل الضوضاء.
     • البيئة (HDRI أو سماء وشمس) ${S.sun ? `مع شمس بارتفاع ${S.sun.alt}° تقريبًا` : 'دون شمس'}.
     • إضاءات IES في أماكن العناصر المحددة باستخدام أول ملف IES في الحزمة.
  4) إن ظهرت ملاحظات في MAXScript Listener (F11) فهي إعدادات لم يدعمها إصدارك؛ اضبطها يدويًا من إعدادات الريندر.

نصائح لهذا النوع من اللقطات
${{
    interior_day: '  • أضف بوابات ضوء (Portals) على النوافذ لتسريع الريندر وتقليل الضوضاء.\n  • اترك الشمس تدخل بزاوية تصنع بقعًا ضوئية على الأرض، فهي من أقوى عناصر الواقعية.\n  • استخدم كاميرا Physical بقيمة EV بين 9 و 11، و Highlight compression لمنع احتراق النوافذ.',
    interior_night: '  • الإضاءة الصناعية الدافئة (2700K إلى 3000K) مع خلفية ليلية زرقاء خفيفة تصنع تباينًا جميلًا.\n  • لا تعتمد على سبوتات فقط: أضف إضاءة مخفية (LED strips) بإضاءة ذاتية خافتة.\n  • قيمة EV بين 5 و 7 تقريبًا.',
    exterior_day: '  • ارتفاع الشمس بين 30° و 50° يعطي ظلالًا واضحة دون قسوة.\n  • استخدم HDRI بدقة 8K أو أعلى إذا ظهرت السماء في اللقطة، أو صورة سماء منفصلة للخلفية.\n  • قيمة EV بين 13 و 15.',
    exterior_sunset: '  • اجعل الشمس منخفضة جدًا (5° إلى 10°) لتطول الظلال ويدفأ اللون.\n  • أشعل إضاءات الواجهة الداخلية بلون دافئ لتعطي حياة للمبنى.\n  • قيمة EV بين 10 و 12.',
    exterior_night: '  • الإضاءة من الداخل (النوافذ المضيئة) هي العنصر الأهم في اللقطات الليلية.\n  • استخدم الأبلايت وغاسلات الجدران لإبراز ملامس الواجهة.\n  • قيمة EV بين 3 و 6.',
    studio: '  • استخدم HDRI استوديو مع إضاءة رئيسية ومساعدة وخلفية (Three-point lighting).\n  • خلفية ممتدة بلا زوايا (Cyclorama) لعرض المنتجات.',
  }[scene]}
`;
}
