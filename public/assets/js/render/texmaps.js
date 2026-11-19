// أداة «تحويل صورة الخامة إلى خرائط»: على الجهاز، ثم الحفظ بالبنية نفسها (Corona و V-Ray) في مكتبة إتقان.
import { h, ico, toast, select, seg, dropzone } from '../ui.js';
import { imageToMaps } from './maps.js';
import { makeInfo, materialFiles, keyOf } from './pack.js';
import { destination } from './dest.js';

const LABELS = { basecolor: 'اللون (BaseColor)', normal: 'Normal', roughness: 'Roughness', height: 'Displacement', ao: 'AO', metal: 'Metalness' };
const CAT = [['marble', 'رخام'], ['wood', 'خشب'], ['floor_wood', 'أرضية خشبية'], ['stone', 'حجر'], ['concrete', 'خرسانة'], ['plaster', 'محارة ودهان'], ['brick', 'طوب'], ['tiles', 'بلاط'], ['metal', 'معدن'], ['fabric', 'قماش'], ['leather', 'جلد'], ['carpet', 'سجاد'], ['ground', 'أرض'], ['other', 'أخرى']];

export function renderTexMaps(body) {
  const dest = destination();
  let img = null, result = null, file = null;
  const name = h('input', { class: 'input', placeholder: 'مثال: Client Marble Calacatta', dir: 'ltr' });
  const nameAr = h('input', { class: 'input', placeholder: 'مثال: رخام كلكتا للعميل' });
  const cat = select(CAT, 'marble'), fin = select([['matte', 'مطفي'], ['satin', 'نصف لامع'], ['glossy', 'لامع']], 'satin');
  const size = select([[1024, '1K'], [2048, '2K (افتراضي)'], [4096, '4K']], 2048);
  const realW = h('input', { class: 'input', type: 'number', min: 0, step: 0.05, value: '', placeholder: 'مثال: 0.6', dir: 'ltr' });
  const strength = h('input', { type: 'range', min: 0.5, max: 5, step: 0.5, value: 2 });
  const seam = h('input', { type: 'checkbox', checked: true }), del = h('input', { type: 'checkbox', checked: true }), inv = h('input', { type: 'checkbox' }), metal = h('input', { type: 'checkbox' });
  const preview = h('div', { class: 'rs-maps' });
  const status = h('p', { class: 'muted' });
  const genBtn = h('button', { class: 'btn', type: 'button', disabled: true }, ico('wand-sparkles', 18), 'استخراج الخرائط');
  const saveBtn = h('button', { class: 'btn', type: 'button', disabled: true }, ico('download', 18), 'حفظ الخامة');

  const dz = dropzone({ accept: 'image/*', label: 'اختر صورة الخامة', hint: 'صورة مواجهة للخامة، بإضاءة متساوية ودون ظلال أو انعكاسات قوية', onFiles: async ([f]) => {
    try { const im = new Image(); im.src = URL.createObjectURL(f); await im.decode(); img = im; file = f; if (!name.value) name.value = f.name.replace(/\.[^.]+$/, ''); genBtn.disabled = false; result = null; saveBtn.disabled = true; preview.innerHTML = ''; preview.append(h('figure', {}, h('img', { src: im.src, alt: '' }), h('figcaption', {}, 'الصورة الأصلية'))); }
    catch { toast('تعذّر فتح الصورة.', true); }
  } });

  genBtn.onclick = async () => {
    if (!img) return; genBtn.disabled = true; saveBtn.disabled = true;
    try {
      result = await imageToMaps(img, { size: +size.value, seamless: seam.checked, delight: del.checked, invertHeight: inv.checked, strength: +strength.value, finish: fin.value, metal: metal.checked }, (m) => status.textContent = m);
      preview.innerHTML = '';
      for (const [k, v] of Object.entries(result)) { const u = URL.createObjectURL(v.blob); preview.append(h('figure', {}, h('img', { src: u, alt: LABELS[k] }), h('figcaption', {}, LABELS[k]))); }
      // معاينة التكرار 2×2 للتأكد من اختفاء الفواصل
      const t = document.createElement('canvas'); t.width = t.height = 512; const cx = t.getContext('2d'); const bc = result.basecolor.canvas;
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) cx.drawImage(bc, x * 256, y * 256, 256, 256);
      preview.append(h('figure', {}, h('img', { src: t.toDataURL('image/jpeg', 0.85), alt: '' }), h('figcaption', {}, 'معاينة التكرار 2×2')));
      status.textContent = 'اكتملت الخرائط. راجعها ثم احفظ الخامة.'; saveBtn.disabled = false;
    } catch (e) { console.error(e); toast('تعذّر الاستخراج: ' + e.message, true); status.textContent = ''; }
    genBtn.disabled = false;
  };

  saveBtn.onclick = async () => {
    if (!result) return;
    let w; try { w = await dest.writer(); } catch (e) { if (e.name !== 'AbortError') toast(e.message, true); return; }
    saveBtn.disabled = true;
    try {
      const maps = Object.fromEntries(Object.entries(result).map(([k, v]) => [k, v.blob]));
      const rw = +realW.value;
      const m = { src: 'user', id: 'u' + Date.now(), name: name.value || 'Custom Material', key: 'Custom_' + keyOf(name.value || 'Material'), size_m: rw > 0 ? [rw, rw] : null, license: 'صورة المستخدم' };
      const info = makeInfo(m, { category: cat.value, finish: fin.value, metal: metal.checked, name_ar: nameAr.value }, 'jpg', maps);
      await w.add(await materialFiles(info, maps)); const r = await w.finish(`${info.key}.zip`);
      if (r?.rejected) toast(`رفض المتصفح حفظ بعض الملفات مباشرة في المجلد، وعددها ${r.rejected.length} (${r.rejected.slice(0, 4).join('، ')}${r.rejected.length > 4 ? '…' : ''})، فنُزّلت في ملف ZIP صغير بالمسارات نفسها؛ فُكّه داخل مجلد المكتبة.`, true, 12000);
      status.textContent = dest.kind === 'folder' ? `حُفظت الخامة ${info.key} في «${dest.name}». شغّل ITQAN_Materials_Setup.ms في ماكس لتظهر في مكتبة ITQAN.` : 'نُزّل ملف ZIP بالخامة.';
    } catch (e) { toast('تعذّر الحفظ: ' + e.message, true); }
    saveBtn.disabled = false;
  };

  body.append(h('div', { class: 'rs' }, dest.el,
    h('div', { class: 'panel' }, h('h3', {}, ico('image', 20), ' صورة الخامة'), dz,
      h('div', { class: 'note warn' }, 'تُستخرج الخرائط حسابيًا من صورة واحدة، فجودتها أقل من الخامات الممسوحة ضوئيًا في المكتبات. هذه الأداة مناسبة للخامات الخاصة غير الموجودة في المكتبات، مثل رخام بعينه أو قماش اختاره العميل.'),
      h('div', { class: 'opts' },
        h('label', { class: 'field' }, h('span', {}, 'اسم الخامة (بالإنجليزية للملفات)'), name), h('label', { class: 'field' }, h('span', {}, 'الاسم بالعربية'), nameAr),
        h('label', { class: 'field' }, h('span', {}, 'النوع'), cat), h('label', { class: 'field' }, h('span', {}, 'التشطيب'), fin),
        h('label', { class: 'field' }, h('span', {}, 'الدقة'), size), h('label', { class: 'field' }, h('span', {}, 'المقاس الحقيقي للصورة (متر)'), realW, h('small', {}, 'عرض المساحة الظاهرة في الصورة، ويُستخدم لضبط UVW Map')),
        h('label', { class: 'field' }, h('span', {}, 'قوة البروز (Normal)'), strength),
        h('div', { class: 'field' }, h('span', {}, 'خيارات'), h('label', { class: 'check' }, seam, 'جعلها متكررة دون فواصل'), h('label', { class: 'check' }, del, 'إزالة الإضاءة غير المتساوية'), h('label', { class: 'check' }, inv, 'عكس الارتفاع (للخامات الداكنة البارزة)'), h('label', { class: 'check' }, metal, 'خامة معدنية'))),
      h('div', { class: 'actions' }, genBtn, saveBtn), status, preview)));
}
