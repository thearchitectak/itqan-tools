// مكتبات الخامات المجانية (CC0): Poly Haven و ambientCG — البحث والتنزيل بكل الدقات.
import { libs } from '../ui.js';

/* ---------- الجلب: مباشرة من المكتبة، ثم عبر وسيط الموقع إن منع المتصفح ذلك ---------- */
const viaProxy = new Set();
const proxied = (u) => '/api/asset?u=' + encodeURIComponent(u);
export async function smartFetch(url, { onProgress, signal } = {}) {
  const host = new URL(url).hostname;
  let r = null;
  if (!viaProxy.has(host)) {
    try { r = await fetch(url, { mode: 'cors', signal }); if (!r.ok) r = null; } catch (e) { if (e.name === 'AbortError') throw e; viaProxy.add(host); r = null; }
  }
  if (!r) { r = await fetch(proxied(url), { signal }); if (!r.ok) throw new Error('تعذّر تنزيل الملف من المكتبة (' + r.status + ').'); }
  if (!onProgress || !r.body) return r;
  const total = +r.headers.get('content-length') || 0, reader = r.body.getReader(), parts = []; let got = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length; onProgress(got, total); }
  return new Response(new Blob(parts, { type: r.headers.get('content-type') || '' }));
}
const getJson = async (u) => (await smartFetch(u)).json();

/* ---------- البحث بالعربية: قاموس مصطلحات الخامات ---------- */
const AR = {
  'رخام': 'marble', 'جرانيت': 'granite', 'حجر': 'stone', 'صخر': 'rock', 'خشب': 'wood', 'باركيه': 'parquet floor wood', 'أرضية': 'floor', 'ارضية': 'floor', 'بلوط': 'oak', 'جوز': 'walnut',
  'خرسانة': 'concrete', 'خرسانه': 'concrete', 'أسمنت': 'concrete', 'اسمنت': 'concrete', 'محارة': 'plaster', 'لياسة': 'plaster', 'بلاستر': 'plaster', 'جبس': 'plaster', 'دهان': 'paint', 'طلاء': 'paint',
  'طوب': 'brick', 'بلوك': 'block', 'بلاط': 'tiles', 'سيراميك': 'ceramic tiles', 'بورسلين': 'porcelain tiles', 'موزاييك': 'mosaic', 'تيرازو': 'terrazzo', 'موزايكو': 'terrazzo',
  'معدن': 'metal', 'حديد': 'iron metal', 'صدأ': 'rust', 'نحاس': 'copper', 'ذهبي': 'gold', 'ألومنيوم': 'aluminium', 'ستانلس': 'steel', 'فولاذ': 'steel',
  'قماش': 'fabric', 'كتان': 'linen', 'قطن': 'cotton', 'مخمل': 'velvet', 'جلد': 'leather', 'سجاد': 'carpet', 'موكيت': 'carpet', 'ورق حائط': 'wallpaper',
  'أسفلت': 'asphalt', 'اسفلت': 'asphalt', 'تراب': 'soil ground', 'أرض': 'ground', 'رمل': 'sand', 'عشب': 'grass', 'نجيل': 'grass', 'حصى': 'gravel', 'زلط': 'gravel', 'طين': 'mud',
  'سقف': 'roof', 'قرميد': 'roof tiles', 'زجاج': 'glass', 'بلاستيك': 'plastic', 'فلين': 'cork', 'بامبو': 'bamboo', 'خيزران': 'rattan wicker', 'لحاء': 'bark',
  'أبيض': 'white', 'ابيض': 'white', 'أسود': 'black', 'اسود': 'black', 'رمادي': 'grey', 'بيج': 'beige', 'بني': 'brown', 'أحمر': 'red', 'أخضر': 'green', 'أزرق': 'blue', 'كريمي': 'cream',
  'مصقول': 'polished', 'لامع': 'glossy', 'مطفي': 'matte', 'خشن': 'rough', 'قديم': 'old weathered', 'متشقق': 'cracked', 'نظيف': 'clean', 'مكشوف': 'exposed', 'مقلم': 'striped',
};
export function toQuery(text) {
  const words = String(text || '').toLowerCase().replace(/[،,]/g, ' ').split(/\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < words.length; i++) {
    const two = words[i] + ' ' + (words[i + 1] || '');
    if (AR[two]) { out.push(...AR[two].split(' ')); i++; continue; }
    const w = words[i].replace(/^ال/, '');
    if (AR[words[i]]) out.push(...AR[words[i]].split(' '));
    else if (AR[w]) out.push(...AR[w].split(' '));
    else if (/[a-z0-9]/.test(w)) out.push(w);
  }
  return [...new Set(out)];
}

/* ---------- Poly Haven ---------- */
let phList = null;
async function phAll() {
  if (!phList) phList = getJson('https://api.polyhaven.com/assets?t=textures').then(o => Object.entries(o).map(([id, a]) => ({
    src: 'ph', id, name: a.name, thumb: `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=256&height=256`,
    tags: [...(a.tags || []), ...(a.categories || []), ...String(a.category || '').toLowerCase().split(/[\/&,\s]+/)].map(t => String(t).toLowerCase()),
    desc: (a.description || '').toLowerCase(), size_m: Array.isArray(a.dimensions) && a.dimensions[0] ? [a.dimensions[0] / 1000, a.dimensions[1] / 1000] : null,
    pop: a.download_count || 0, url: `https://polyhaven.com/a/${id}`, license: 'CC0 — Poly Haven',
  }))).catch(e => { phList = null; throw e; });
  return phList;
}
function score(item, words) {
  if (!words.length) return 1;
  const hay = item.name.toLowerCase() + ' ' + item.tags.join(' ') + ' ' + (item.desc || '');
  let s = 0;
  for (const w of words) { if (item.tags.includes(w)) s += 3; else if (item.name.toLowerCase().includes(w)) s += 3; else if (hay.includes(w)) s += 1; }
  return s;
}

/* ---------- ambientCG ---------- */
async function acgSearch(words, limit = 40) {
  const q = encodeURIComponent(words.join(' '));
  const d = await getJson(`https://ambientcg.com/api/v2/full_json?type=Material&limit=${limit}&sort=Popular&include=tagData,displayData,downloadData,previewData,dimensionsData${q ? '&q=' + q : ''}`);
  return (d.foundAssets || []).map(a => {
    const dl = a.downloadFolders?.default?.downloadFiletypeCategories?.zip?.downloads || [];
    return { src: 'acg', id: a.assetId, name: a.displayName || a.assetId, thumb: a.previewImage?.['256-JPG-FFFFFF'] || a.previewImage?.['256-PNG'] || '',
      tags: (a.tags || []).map(t => String(t).toLowerCase()).concat(String(a.displayCategory || '').toLowerCase()), desc: '',
      size_m: a.dimensionX ? [a.dimensionX / 100, (a.dimensionY || a.dimensionX) / 100] : null, pop: a.downloadCount || 0,
      url: a.shortLink || `https://ambientcg.com/a/${a.assetId}`, license: 'CC0 — ambientCG',
      downloads: dl.map(x => ({ attr: x.attribute, url: x.fullDownloadPath || x.downloadLink, size: x.size })) };
  });
}

// بحث موحّد في المكتبتين، مرتب بالتطابق ثم الشهرة
export async function searchMaterials(text, { limit = 48, words } = {}) {
  words = words || toQuery(text);
  const [ph, acg] = await Promise.allSettled([phAll(), acgSearch(words)]);
  let out = [];
  if (ph.status === 'fulfilled') out.push(...ph.value.map(x => ({ ...x, _s: score(x, words) })).filter(x => !words.length || x._s > 0));
  if (acg.status === 'fulfilled') out.push(...acg.value.map(x => ({ ...x, _s: Math.max(1, score(x, words)) })));
  if (!out.length && ph.status === 'rejected' && acg.status === 'rejected') throw new Error('تعذّر الوصول إلى مكتبات الخامات. تحقّق من الاتصال بالإنترنت.');
  out.sort((a, b) => b._s - a._s || b.pop - a.pop);
  return out.slice(0, limit);
}

/* ---------- الدقات المتاحة ---------- */
export const RES_ORDER = ['2k', '4k', '8k', '16k'];
export async function resolutionsOf(m) {
  if (m.src === 'ph') { const f = await phFiles(m.id); return RES_ORDER.filter(r => f.Diffuse?.[r]); }
  if (m.src === 'acg') return RES_ORDER.filter(r => m.downloads.some(d => d.attr.toLowerCase().startsWith(r + '-')));
  return ['2k'];
}
const phCache = {};
const phFiles = (id) => (phCache[id] = phCache[id] || getJson('https://api.polyhaven.com/files/' + id).catch(e => { delete phCache[id]; throw e; }));

/* ---------- تنزيل الخرائط ---------- */
// يعيد { maps: { basecolor, normal, roughness, ao, height, metal, opacity }, ext }
export async function fetchMaps(m, res, fmt, onProgress) {
  const ext = fmt === 'png' ? 'png' : 'jpg';
  if (m.src === 'ph') {
    const f = await phFiles(m.id);
    const pick = (k) => f[k]?.[res]?.[ext] || f[k]?.[res]?.jpg || f[k]?.[res]?.png;
    const want = { basecolor: 'Diffuse', normal: 'nor_dx', roughness: 'Rough', ao: 'AO', height: 'Displacement' };
    for (const k of Object.keys(f)) { if (/^metal/i.test(k)) want.metal = k; if (/alpha|opacity|mask/i.test(k)) want.opacity = k; }
    const jobs = Object.entries(want).map(([k, key]) => [k, pick(key)]).filter(([, x]) => x);
    const total = jobs.reduce((a, [, x]) => a + (x.size || 0), 0) || 1; const got = {};
    const maps = {};
    await Promise.all(jobs.map(async ([k, x]) => {
      const r = await smartFetch(x.url, { onProgress: (g) => { got[k] = g; onProgress?.(Object.values(got).reduce((a, b) => a + b, 0) / total); } });
      maps[k] = await r.blob();
    }));
    if (!maps.basecolor) throw new Error('لا تتوفر خريطة اللون لهذه الدقة.');
    return { maps, ext };
  }
  if (m.src === 'acg') {
    const want = `${res.toUpperCase()}-${ext.toUpperCase()}`;
    const d = m.downloads.find(x => x.attr.toUpperCase() === want) || m.downloads.find(x => x.attr.toUpperCase().startsWith(res.toUpperCase() + '-'));
    if (!d) throw new Error('هذه الدقة غير متاحة لهذه الخامة.');
    const r = await smartFetch(d.url, { onProgress: (g, t) => onProgress?.(g / (t || d.size || 1)) });
    const JSZip = await libs.jszip(); const z = await JSZip.loadAsync(await r.blob());
    const maps = {}; let e2 = ext;
    const rules = [['basecolor', /_Color\./i], ['normal', /_NormalDX\./i], ['roughness', /_Roughness\./i], ['ao', /_AmbientOcclusion\./i], ['height', /_Displacement\./i], ['metal', /_Metalness\./i], ['opacity', /_Opacity\./i]];
    for (const name of Object.keys(z.files)) {
      if (z.files[name].dir || !/\.(jpe?g|png)$/i.test(name)) continue;
      for (const [k, re] of rules) if (re.test(name) && !maps[k]) { maps[k] = await z.files[name].async('blob'); e2 = name.split('.').pop().toLowerCase().replace('jpeg', 'jpg'); }
    }
    if (!maps.normal) for (const name of Object.keys(z.files)) if (/_NormalGL\./i.test(name)) { maps.normal = await z.files[name].async('blob'); maps._normalGL = true; }
    if (!maps.basecolor) throw new Error('لم تُعثر على خريطة اللون في ملف الخامة.');
    return { maps, ext: e2 };
  }
  throw new Error('مصدر غير معروف.');
}

/* ---------- HDRI ---------- */
let hdriList = null;
export async function hdris() {
  if (!hdriList) hdriList = getJson('https://api.polyhaven.com/assets?t=hdris').then(o => Object.entries(o).map(([id, a]) => ({
    id, name: a.name, cats: (a.categories || []).map(c => c.toLowerCase()), tags: (a.tags || []).map(t => t.toLowerCase()), pop: a.download_count || 0,
    thumb: `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=320&height=160`, url: `https://polyhaven.com/a/${id}`,
  }))).catch(e => { hdriList = null; throw e; });
  return hdriList;
}
export async function hdriFile(id, res, fmt = 'hdr') {
  const f = await getJson('https://api.polyhaven.com/files/' + id);
  const x = f.hdri?.[res]?.[fmt] || f.hdri?.[res]?.hdr; if (!x) throw new Error('هذه الدقة غير متاحة.');
  return x;
}
export async function hdriResolutions(id) { const f = await getJson('https://api.polyhaven.com/files/' + id); return Object.keys(f.hdri || {}).sort((a, b) => parseInt(a) - parseInt(b)); }
