// تجهيز الخامة: ترتيب الخرائط في مجلدي Corona و V-Ray مع الشرح والنصائح والسكربتات،
// ثم الحفظ في مجلد «مكتبة خامات إتقان» على الجهاز مباشرة، أو في ملف ZIP بالبنية نفسها.
import { libs, download } from '../ui.js';
import { materialScript, setupScript } from './maxscript.js';
import { coronaGuide, vrayGuide, tipsText, readmeText } from './guides.js';

export const ROOT_NAME = 'ITQAN_Materials';
const BOM = '﻿';
const txt = (s) => new Blob([BOM + s.replace(/\n/g, '\r\n')], { type: 'text/plain;charset=utf-8' });
const ms = (s) => new Blob([BOM + s.replace(/\r?\n/g, '\r\n')], { type: 'text/plain;charset=utf-8' });

export const keyOf = (name) => (String(name || 'Material').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s-]+/g, '_').replace(/_+/g, '_').slice(0, 48) || 'Material');
const DISPLACE = { stone: 1, brick: 1, gravel: 1.5, ground: 1, terrazzo: 0, tiles: 0.3, roofing: 1 };
const C_SFX = { basecolor: 'BaseColor', roughness: 'Roughness', normal: 'Normal', ao: 'AO', height: 'Displacement', metal: 'Metalness', opacity: 'Opacity' };
const V_SFX = { ...C_SFX, basecolor: 'Diffuse' };

// معلومات الخامة الموحّدة التي تستخدمها السكربتات والشروح
export function makeInfo(m, meta, ext, maps) {
  const key = keyOf(m.key || m.name);
  const size = m.size_m;
  return {
    key, title: m.name, titleAr: meta.name_ar || '', source: m.src === 'ph' ? 'Poly Haven' : m.src === 'acg' ? 'ambientCG' : m.src === 'ai' ? 'مولّدة بالذكاء الاصطناعي (Gemini)' : 'صورة المستخدم',
    license: m.license || (m.src === 'ai' ? 'مولّدة للمستخدم' : 'CC0'), url: m.url || '', ext,
    category: meta.category || guessCat(m), finish: meta.finish || '', metal: !!(meta.metal || maps.metal), ai: m.src === 'ai',
    displaceCm: DISPLACE[meta.category || guessCat(m)] || 0,
    sizeW: size ? +size[0].toFixed(3) : (+meta.size_m || 0), sizeH: size ? +size[1].toFixed(3) : (+meta.size_m || 0),
    maps: Object.keys(C_SFX).filter(k => maps[k]),
  };
}
function guessCat(m) {
  const t = (m.tags || []).join(' ') + ' ' + (m.name || '').toLowerCase();
  for (const [c, re] of [['floor_wood', /parquet|plank|floor.*wood|wood.*floor/], ['wood', /wood|oak|walnut/], ['marble', /marble/], ['brick', /brick/], ['tiles', /tile/], ['concrete', /concrete/], ['plaster', /plaster|stucco/], ['metal', /metal|steel|iron|rust|copper/], ['fabric', /fabric|cloth|linen|velvet/], ['leather', /leather/], ['carpet', /carpet|rug/], ['gravel', /gravel|pebble/], ['grass', /grass/], ['asphalt', /asphalt/], ['ground', /ground|soil|dirt|sand|mud/], ['stone', /stone|rock|granite|cobble/]]) if (re.test(t)) return c;
  return 'other';
}

async function previewOf(blob) {
  try {
    const bmp = await createImageBitmap(blob); const s = 512 / Math.max(bmp.width, bmp.height);
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
  } catch { return null; }
}

// قائمة الملفات لخامة واحدة (المسارات نسبية إلى المجلد الرئيسي)
export async function materialFiles(info, maps) {
  const base = `Materials/${info.key}/`, out = [];
  for (const [r, sfx, folder] of [['corona', C_SFX, `${info.key}_Corona`], ['vray', V_SFX, `${info.key}_VRay`]]) {
    for (const k of info.maps) out.push([`${base}${folder}/${info.key}_${sfx[k]}.${info.ext}`, maps[k]]);
    out.push([`${base}${folder}/${info.key}_${r === 'corona' ? 'Corona' : 'VRay'}.ms`, ms(materialScript(info, r))]);
    out.push([`${base}${folder}/${r === 'corona' ? 'Setup_Guide_Corona' : 'Setup_Guide_VRay'}.txt`, txt(r === 'corona' ? coronaGuide(info) : vrayGuide(info))]);
  }
  out.push([`${base}Realism_Tips.txt`, txt(tipsText(info))]);
  const ini = ['[material]', `key=${info.key}`, `title=${info.title.replace(/[^\x20-\x7e]/g, '')}`, `source=${info.source.replace(/[^\x20-\x7e]/g, '') || 'user'}`, `url=${info.url}`, `ext=${info.ext}`,
    `category=${info.category}`, `metal=${info.metal ? 1 : 0}`, `displace_cm=${info.displaceCm}`, `size_w_m=${info.sizeW || 0}`, `size_h_m=${info.sizeH || 0}`, `maps=${info.maps.join(',')}`].join('\r\n');
  out.push([`${base}material.ini`, new Blob([ini + '\r\n'], { type: 'text/plain' })]);
  const pv = await previewOf(maps.basecolor); if (pv) out.push([`${base}preview.jpg`, pv]);
  return out;
}
export const rootFiles = () => [['ITQAN_Materials_Setup.ms', ms(setupScript())], ['README.txt', txt(readmeText())]];

/* ---------- الحفظ في مجلد على الجهاز (Chrome و Edge على الحاسوب) ---------- */
export const canPickFolder = () => typeof window.showDirectoryPicker === 'function' && window.isSecureContext;
const DB = 'itq-render', ST = 'handles';
function idb() { return new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function idbGet(k) { try { const d = await idb(); return await new Promise(res => { const t = d.transaction(ST).objectStore(ST).get(k); t.onsuccess = () => res(t.result); t.onerror = () => res(null); }); } catch { return null; } }
async function idbSet(k, v) { try { const d = await idb(); await new Promise(res => { const t = d.transaction(ST, 'readwrite'); t.objectStore(ST).put(v, k); t.oncomplete = res; t.onerror = res; }); } catch { } }

export async function savedFolder() { return idbGet('root'); }
export async function chooseFolder() {
  const h = await window.showDirectoryPicker({ id: 'itqan-materials', mode: 'readwrite', startIn: 'documents' });
  // إن اختار المستخدم مجلدًا عامًا يُنشأ داخله مجلد المكتبة
  const root = h.name === ROOT_NAME ? h : await h.getDirectoryHandle(ROOT_NAME, { create: true });
  await idbSet('root', root);
  return root;
}
export async function ensurePermission(h) {
  if (!h) return false;
  if ((await h.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
  return (await h.requestPermission({ mode: 'readwrite' })) === 'granted';
}
async function writePath(root, path, blob) {
  const parts = path.split('/'); const name = parts.pop(); let d = root;
  for (const p of parts) d = await d.getDirectoryHandle(p, { create: true });
  const f = await d.getFileHandle(name, { create: true }); const w = await f.createWritable();
  await w.write(blob); await w.close();
}

// كاتب موحّد: folder (مجلد الجهاز) أو zip
export function makeWriter(kind, root) {
  if (kind === 'folder') return {
    kind, async add(files) { for (const [p, b] of files) await writePath(root, p, b); },
    async finish() { for (const [p, b] of rootFiles()) await writePath(root, p, b); return null; },
  };
  let zip = null;
  return {
    kind, async add(files) { if (!zip) zip = new (await libs.jszip())(); for (const [p, b] of files) zip.file(`${ROOT_NAME}/${p}`, b); },
    async finish(name) { if (!zip) return; for (const [p, b] of rootFiles()) zip.file(`${ROOT_NAME}/${p}`, b); const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }); download(blob, name || `${ROOT_NAME}.zip`); },
  };
}
