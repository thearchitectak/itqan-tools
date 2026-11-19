// توزيع الأعمدة على اللوحة المعمارية وتصميمها مع القواعد
// ثلاثة مصادر: صورة دون محاور (كشف تلقائي للحوائط)، صورة أو PDF بمحاور، ملف CAD بصيغة DXF
import { h, ico, select, field, toast, libs, download, dropzone, readArrayBuffer, baseName } from '../ui.js';
import { codeBar, getCode, N, fmt, num, nf, kpis, checks, table, sectionTitle, xlsxDownload, store, sendToBoq } from './common.js';
import { barKg } from './data.js';
import { combo, defaultLoads, designColumn, designFooting, columnSvg, footingSvg } from './struct.js';
import { parseDxf, writeDxf, writeLisp, writeRevit, UNIT_M, UNIT_NAME } from './cadio.js';
import { svgBlock } from './civil2.js';
import { supportNudge } from '../profile.js';

const onAny = (els, fn) => els.forEach(e => { e.addEventListener('input', fn); e.addEventListener('change', fn); });
const up = (x, s) => Math.ceil(x / s - 1e-9) * s;

/* ================= الكشف الآلي من صورة اللوحة ================= */
function otsu(gray) {
  const hist = new Array(256).fill(0); for (const g of gray) hist[g]++;
  const total = gray.length; let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sB = 0, wB = 0, best = 0, th = 128;
  for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = total - wB; if (!wF) break; sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) ** 2; if (v > best) { best = v; th = t; } }
  return th;
}
// تآكل بمربع k×k: يبقى البكسل إذا كانت النافذة كلها داكنة (يحذف الخطوط الرفيعة والنصوص والأبعاد)
function erode(mask, W, H, k) {
  if (k <= 1) return mask;
  const tmp = new Uint8Array(W * H), out = new Uint8Array(W * H), r = Math.floor(k / 2);
  for (let y = 0; y < H; y++) { let run = 0; const row = y * W; const cnt = new Int32Array(W + 1); for (let x = 0; x < W; x++) cnt[x + 1] = cnt[x] + mask[row + x]; for (let x = 0; x < W; x++) { const a = Math.max(0, x - r), b = Math.min(W, x - r + k); tmp[row + x] = (b - a === k && cnt[b] - cnt[a] === k) ? 1 : 0; } }
  const col = new Int32Array(H + 1);
  for (let x = 0; x < W; x++) { col[0] = 0; for (let y = 0; y < H; y++) col[y + 1] = col[y] + tmp[y * W + x]; for (let y = 0; y < H; y++) { const a = Math.max(0, y - r), b = Math.min(H, y - r + k); out[y * W + x] = (b - a === k && col[b] - col[a] === k) ? 1 : 0; } }
  return out;
}
// استخراج قطع الحوائط الأفقية (أو الرأسية عند transpose)
function wallBands(mask, W, H, minLen, maxThick, transpose) {
  const at = transpose ? (i, j) => mask[i * W + j] : (i, j) => mask[j * W + i]; // i: على طول الخط، j: العمق
  const nI = transpose ? H : W, nJ = transpose ? W : H;
  const bands = []; let active = [];
  for (let j = 0; j < nJ; j++) {
    const runs = []; let s = -1;
    for (let i = 0; i <= nI; i++) { const v = i < nI ? at(i, j) : 0; if (v && s < 0) s = i; else if (!v && s >= 0) { if (i - s >= minLen) runs.push([s, i - 1]); s = -1; } }
    const next = [];
    for (const [a, b] of runs) {
      const hit = active.find(B => B.j2 === j - 1 && Math.min(b, B.b) - Math.max(a, B.a) > 0.5 * Math.min(b - a, B.b - B.a));
      if (hit) { hit.j2 = j; hit.a = Math.min(hit.a, a); hit.b = Math.max(hit.b, b); next.push(hit); active = active.filter(x => x !== hit); }
      else next.push({ j1: j, j2: j, a, b });
    }
    bands.push(...active); active = next;
  }
  bands.push(...active);
  return bands.filter(B => B.j2 - B.j1 + 1 <= maxThick).map(B => ({ pos: (B.j1 + B.j2) / 2, a: B.a, b: B.b, thick: B.j2 - B.j1 + 1 }));
}
// الأعمدة من قطع الحوائط: عند التقاطعات والأركان، مع إضافة أعمدة وسطية إذا زاد البحر
export function columnsFromSegments(hs, vs, { maxSpan = 5, minDist = 2, tol = 0.35 }) {
  let nodes = [];
  for (const a of hs) for (const b of vs) {
    if (b.pos >= a.a - tol && b.pos <= a.b + tol && a.pos >= b.a - tol && a.pos <= b.b + tol) nodes.push({ x: b.pos, y: a.pos, dir: 'both', w: 2 });
  }
  // دمج النقاط المتقاربة
  const merge = (list, d) => { const out = []; for (const p of list.sort((a, b) => b.w - a.w)) { const q = out.find(o => Math.hypot(o.x - p.x, o.y - p.y) < d); if (q) { q.x = (q.x * q.n + p.x) / (q.n + 1); q.y = (q.y * q.n + p.y) / (q.n + 1); q.n++; } else out.push({ ...p, n: 1 }); } return out; };
  nodes = merge(nodes, minDist);
  // ملء البحور الطويلة على كل حائط
  const add = [];
  const fill = (seg, horiz) => {
    const on = nodes.concat(add).filter(p => horiz ? Math.abs(p.y - seg.pos) <= tol && p.x >= seg.a - tol && p.x <= seg.b + tol : Math.abs(p.x - seg.pos) <= tol && p.y >= seg.a - tol && p.y <= seg.b + tol).map(p => horiz ? p.x : p.y).sort((a, b) => a - b);
    for (let k = 0; k + 1 < on.length; k++) {
      const gap = on[k + 1] - on[k];
      if (gap > maxSpan) { const n = Math.ceil(gap / maxSpan) - 1; for (let m = 1; m <= n; m++) { const t = on[k] + gap * m / (n + 1); add.push(horiz ? { x: t, y: seg.pos, dir: 'h', w: 1 } : { x: seg.pos, y: t, dir: 'v', w: 1 }); } }
    }
  };
  hs.forEach(s => fill(s, true)); vs.forEach(s => fill(s, false));
  return merge(nodes.concat(add), minDist * 0.75).map(p => ({ x: p.x, y: p.y, rot: p.dir === 'v' ? 90 : 0, on: true }));
}
// تحويل خطوط DXF (حوائط بخطين) إلى محاور حوائط
function wallsFromLines(segs, maxThick = 0.45, minLen = 0.8) {
  const H = [], V = [];
  for (const s of segs) {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L = Math.hypot(dx, dy); if (L < minLen) continue;
    const ang = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI) % 180;
    if (ang < 3 || ang > 177) H.push({ pos: (s.y1 + s.y2) / 2, a: Math.min(s.x1, s.x2), b: Math.max(s.x1, s.x2) });
    else if (Math.abs(ang - 90) < 3) V.push({ pos: (s.x1 + s.x2) / 2, a: Math.min(s.y1, s.y2), b: Math.max(s.y1, s.y2) });
  }
  const pair = (list) => {
    list.sort((p, q) => p.pos - q.pos); const used = new Set(), out = [];
    for (let i = 0; i < list.length; i++) {
      if (used.has(i)) continue;
      for (let j = i + 1; j < list.length && list[j].pos - list[i].pos <= maxThick; j++) {
        if (used.has(j) || list[j].pos - list[i].pos < 0.05) continue;
        const a = Math.max(list[i].a, list[j].a), b = Math.min(list[i].b, list[j].b);
        if (b - a >= minLen) { out.push({ pos: (list[i].pos + list[j].pos) / 2, a: Math.min(list[i].a, list[j].a), b: Math.max(list[i].b, list[j].b) }); used.add(i); used.add(j); break; }
      }
    }
    // دمج القطع المتتابعة على المحور نفسه
    out.sort((p, q) => p.pos - q.pos || p.a - q.a); const m = [];
    for (const s of out) { const last = m.find(x => Math.abs(x.pos - s.pos) < 0.05 && s.a <= x.b + 0.3); if (last) last.b = Math.max(last.b, s.b); else m.push({ ...s }); }
    return m;
  };
  return { hs: pair(H), vs: pair(V) };
}
function axesFromLines(segs) {
  const H = [], V = [];
  for (const s of segs) {
    const ang = Math.abs(Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180 / Math.PI) % 180;
    if (ang < 3 || ang > 177) H.push({ pos: (s.y1 + s.y2) / 2, a: Math.min(s.x1, s.x2), b: Math.max(s.x1, s.x2) });
    else if (Math.abs(ang - 90) < 3) V.push({ pos: (s.x1 + s.x2) / 2, a: Math.min(s.y1, s.y2), b: Math.max(s.y1, s.y2) });
  }
  const uniq = (l) => { l.sort((p, q) => p.pos - q.pos); const o = []; for (const s of l) { const x = o.find(q => Math.abs(q.pos - s.pos) < 0.05); if (x) { x.a = Math.min(x.a, s.a); x.b = Math.max(x.b, s.b); } else o.push({ ...s }); } return o; };
  return { hs: uniq(H), vs: uniq(V) };
}
function hull(pts) {
  const p = pts.map(q => [q.x, q.y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  const hi = []; for (const q of p.slice().reverse()) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { if (((P[i][1] > y) !== (P[j][1] > y)) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; } return c; };
// مساحة التحميل لكل عمود: أقرب عمود لكل نقطة داخل المضلع المحيط بالأعمدة
function tributary(cols) {
  const act = cols.filter(c => c.on); if (act.length < 3) return act.map(() => 0);
  const P = hull(act); const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const step = Math.max(0.1, Math.sqrt((maxX - minX) * (maxY - minY) / 150000));
  const area = new Array(act.length).fill(0);
  for (let y = minY + step / 2; y < maxY; y += step) for (let x = minX + step / 2; x < maxX; x += step) {
    if (!inPoly(x, y, P)) continue;
    let bi = 0, bd = Infinity; for (let i = 0; i < act.length; i++) { const d = (act[i].x - x) ** 2 + (act[i].y - y) ** 2; if (d < bd) { bd = d; bi = i; } }
    area[bi] += step * step;
  }
  return area;
}


/* اختيار تقاطعات المحاور التي تُوضع عليها الأعمدة
   cands: [{x, y, i, j}] حيث i رقم المحور الرأسي و j رقم المحور الأفقي
   score(c) يعيد { a: حائط على امتداد المحور الأفقي, b: حائط على امتداد المحور الرأسي }
   1) التقاطعات التي تلتقي عندها حوائط في الاتجاهين (أركان وتقاطعات حوائط)
   2) ثم تُملأ البحور الأطول من الحد بأفضل تقاطع وسطي، فقط إذا كان بين العمودين حائط على المحور نفسه */
export function selectGrid(cands, score, maxSpan, along = () => 1) {
  cands.forEach(c => { const s = score(c); c.sc = (s.a ? 1 : 0) + (s.b ? 1 : 0); c.keep = c.sc === 2; });
  const nI = Math.max(...cands.map(c => c.i)) + 1, nJ = Math.max(...cands.map(c => c.j)) + 1;
  const at = (i, j) => cands.find(c => c.i === i && c.j === j);
  // صفوف أو أعمدة لا تحمل أي حائط لا تُعامل كخط أعمدة
  const lineHas = (fixed, isRow) => cands.some(c => (isRow ? c.j : c.i) === fixed && c.sc > 0);
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    const scan = (fixed, isRow) => {
      if (!lineHas(fixed, isRow)) return;
      const line = []; for (let k = 0; k < (isRow ? nI : nJ); k++) { const c = isRow ? at(k, fixed) : at(fixed, k); if (c) line.push(c); }
      const kept = line.filter(c => c.keep);
      if (kept.length === 1 && line.length > 1) { // خط يحمل حائطًا وعليه عمود واحد: أضف أبعد نقطة على حائط
        const far = line.filter(c => c.sc > 0 && c !== kept[0]).sort((p, q) => Math.hypot(q.x - kept[0].x, q.y - kept[0].y) - Math.hypot(p.x - kept[0].x, p.y - kept[0].y))[0];
        if (far && Math.hypot(far.x - kept[0].x, far.y - kept[0].y) > 1) { far.keep = true; changed = true; }
      }
      const ks = line.filter(c => c.keep);
      for (let k = 0; k + 1 < ks.length; k++) {
        const A = ks[k], B = ks[k + 1], gap = Math.hypot(B.x - A.x, B.y - A.y);
        if (gap <= maxSpan + 1e-6) continue;
        if (along(A, B) < 0.5) continue; // لا يوجد حائط (كمرة) بين العمودين على هذا المحور، فلا داعي لعمود وسطي
        const ia = line.indexOf(A), ib = line.indexOf(B), mid = line.slice(ia + 1, ib);
        if (!mid.length) continue;
        const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
        mid.sort((p, q) => (q.sc - p.sc) || (Math.hypot(p.x - mx, p.y - my) - Math.hypot(q.x - mx, q.y - my)));
        mid[0].keep = true; changed = true;
      }
    };
    for (let j = 0; j < nJ; j++) scan(j, true);
    for (let i = 0; i < nI; i++) scan(i, false);
    if (!changed) break;
  }
  return cands.filter(c => c.keep).map(c => ({ x: c.x, y: c.y, rot: 0, on: true, warn: c.sc === 0 }));
}

/* ================= الأداة ================= */
export function colLayout(body) {
  let code = getCode();
  let src = null; // { kind: 'img'|'dxf', canvas?, mpp?, dxf?, u?, name }
  let mode = 'auto', tool = 'move', cols = [], grid = null, design = null;
  const view = { s: 1, ox: 0, oy: 0 };
  let tmp = [], drag = null, hover = null;

  // --- عناصر الواجهة ---
  const modeSeg = h('div', { class: 'seg' });
  const MODES = [['auto', 'صورة دون محاور (كشف تلقائي)'], ['axes', 'صورة أو PDF بمحاور'], ['cad', 'ملف CAD أو Revit (DXF)']];
  MODES.forEach(([v, t]) => { const b = h('button', { type: 'button', class: v === mode ? 'on' : '', 'data-m': v }, t); b.onclick = () => setMode(v); modeSeg.append(b); });
  const modeNote = h('div', { class: 'note', style: { marginTop: '12px' } });
  const fileInfo = h('div', { class: 'muted', style: { fontWeight: 700, margin: '8px 0' } });
  const dz = dropzone({ accept: 'image/*,application/pdf,.pdf,.dxf', label: 'اختر اللوحة', hint: 'صورة (JPG أو PNG) أو PDF أو DXF', onFiles: ([f]) => load(f) });
  // المقياس
  const calInfo = h('small', { class: 'muted' }), pdfScale = num(100), pdfScaleF = nf('مقياس رسم PDF 1 :', pdfScale, null, 'صحيح عند تصدير اللوحة بحجم الورقة الفعلي');
  const calBtn = h('button', { type: 'button', class: 'btn light sm' }, ico('ruler', 16), 'معايرة بخط معلوم الطول');
  calBtn.onclick = () => setTool('cal');
  const unitSel = select([['0.001', 'مليمتر'], ['0.01', 'سنتيمتر'], ['1', 'متر'], ['0.0254', 'بوصة'], ['0.3048', 'قدم']], '0.001'), unitF = field('وحدة الرسم في ملف DXF', unitSel);
  const scaleBox = h('div', {}, h('div', { class: 'toolbar' }, calBtn, pdfScaleF), calInfo);
  // الكشف التلقائي
  const maxSpan = num(5), minDist = num(2), minWall = num(12), threshold = h('input', { type: 'range', min: 0, max: 255, value: 0 });
  const autoBtn = h('button', { type: 'button', class: 'btn' }, ico('wand-sparkles', 18), 'اقترح الأعمدة تلقائيًا');
  autoBtn.onclick = () => runAuto();
  const autoBox = h('div', {}, h('div', { class: 'opts', style: { marginTop: 0 } }, nf('أقصى بحر بين عمودين', maxSpan, 'م'), nf('أقل مسافة بين عمودين', minDist, 'م'), nf('أقل سماكة للحائط في اللوحة', minWall, 'سم', 'لتمييز الحوائط عن خطوط الأبعاد والنصوص'), h('label', { class: 'field' }, h('span', {}, 'حد اللون الداكن (0 = تلقائي)'), threshold)), h('div', { class: 'actions' }, autoBtn));
  // المحاور
  const axX = h('input', { class: 'input', dir: 'ltr', value: '4, 4.5, 4' }), axY = h('input', { class: 'input', dir: 'ltr', value: '4, 5' });
  const axBtn = h('button', { type: 'button', class: 'btn' }, ico('crosshair', 18), 'محاذاة المحاور على اللوحة');
  axBtn.onclick = () => { if (!src) return toast('ارفع اللوحة أولًا.', true); setTool('align'); toast('انقر تقاطع المحور الأول (1-A)، ثم تقاطع آخر محور رأسي على الصف نفسه.', false, 6000); };
  const axNoImg = h('button', { type: 'button', class: 'btn light' }, 'إنشاء الشبكة دون لوحة');
  axNoImg.onclick = () => { src = src || { kind: 'none', name: 'grid' }; buildGrid([0, 0], 0); fit(); };
  const axSpan = num(5), allInt = h('input', { type: 'checkbox' });
  const axesBox = h('div', {}, h('div', { class: 'opts', style: { marginTop: 0 } }, field('المسافات بين المحاور الرأسية 1، 2، 3… (م)', axX, 'افصل بفاصلة، مثل: 4, 4.5, 4'), field('المسافات بين المحاور الأفقية A، B، C… (م)', axY), nf('أقصى بحر بين عمودين', axSpan, 'م')),
    h('label', { class: 'check', style: { marginTop: '10px' } }, allInt, 'ضع عمودًا عند كل تقاطع (دون مراعاة الحوائط)'),
    h('p', { class: 'eng-sub', style: { marginTop: '6px' } }, 'بدون هذا الخيار يحلل الموقع حوائط اللوحة: يضع الأعمدة عند أركان الحوائط وتقاطعاتها، ويتجنب الفتحات ومنتصف الفراغات، ثم يضيف عمودًا وسطيًا فقط حيث يزيد البحر على الحد.'),
    h('div', { class: 'actions' }, axBtn, axNoImg));
  // CAD
  const layerSel = h('select', { class: 'input' }), cadKind = select([['axes', 'طبقة المحاور (Grid)'], ['walls', 'طبقة الحوائط']], 'walls');
  const cadBtn = h('button', { type: 'button', class: 'btn' }, ico('wand-sparkles', 18), 'استخرج الأعمدة من الطبقة');
  cadBtn.onclick = () => runCad();
  const wallLayerSel = h('select', { class: 'input' }), wallLayerF = field('طبقة الحوائط لاختيار التقاطعات المناسبة', wallLayerSel, 'اتركها «دون» لوضع عمود عند كل تقاطع');
  const cadBox = h('div', {}, h('div', { class: 'opts', style: { marginTop: 0 } }, unitF, field('الطبقة', layerSel), field('محتوى الطبقة', cadKind), wallLayerF, nf('أقصى بحر بين عمودين', maxSpan.cloneNode(), 'م')), h('div', { class: 'actions' }, cadBtn));
  cadKind.onchange = () => { wallLayerF.style.display = cadKind.value === 'axes' ? '' : 'none'; };
  const cadMax = cadBox.querySelector('input.num'); cadMax.value = 5;
  unitSel.onchange = () => { if (src?.kind === 'dxf') { src.u = +unitSel.value; rebuildDxfWorld(); fit(); } };

  // اللوحة
  const cv = h('canvas', { style: { width: '100%', height: '560px', display: 'block', touchAction: 'none', cursor: 'crosshair' } });
  const toolSeg = h('div', { class: 'seg' });
  [['move', 'تحريك', 'move'], ['add', 'إضافة عمود', 'square-plus'], ['del', 'حذف', 'square-x'], ['rot', 'تدوير', 'rotate-cw'], ['pan', 'تحريك اللوحة', 'hand']].forEach(([v, t, ic]) => { const b = h('button', { type: 'button', 'data-t': v, class: v === tool ? 'on' : '', title: t }, ico(ic, 15), ' ' + t); b.onclick = () => setTool(v); toolSeg.append(b); });
  const zin = h('button', { type: 'button', class: 'btn light sm', title: 'تكبير', onclick: () => zoom(1.3) }, ico('zoom-in', 16)), zout = h('button', { type: 'button', class: 'btn light sm', title: 'تصغير', onclick: () => zoom(1 / 1.3) }, ico('zoom-out', 16)), fitB = h('button', { type: 'button', class: 'btn light sm', onclick: () => fit() }, ico('maximize', 16), 'ملاءمة');
  const clearB = h('button', { type: 'button', class: 'btn light sm', onclick: () => { cols = []; grid = null; recalc(); } }, ico('trash-2', 16), 'مسح الأعمدة');
  const stat = h('small', { class: 'muted' });

  // التصميم
  const L0 = store.get('loads', null);
  const typeTol = num(20), floors = num(L0?.floors || 4), ws = num(), wu = num(), fc = num(), fy = h('select', { class: 'input' }), bCol = num(), qAll = num(150), fcF = nf('', fc, 'ميجاباسكال'), Hc = num(2.7);
  const ui = { res: h('div', { class: 'panel eng-res' }) };
  function setCode(c) {
    code = c; const l = store.get('loads', null), d = l && l.code === c ? l : defaultLoads(c);
    ws.value = (+d.ws).toFixed(2); wu.value = (+d.wu).toFixed(2); fc.value = c === 'eg' ? 25 : 28; bCol.value = c === 'eg' ? 250 : 300;
    fy.innerHTML = ''; (c === 'eg' ? [['400', 'B400'], ['420', 'B420DWR'], ['500', 'B500']] : [['420', 'Grade 60 (420)'], ['520', 'Grade 75 (520)']]).forEach(([v, t]) => fy.append(h('option', { value: v }, t)));
    fcF.firstChild.textContent = c === 'eg' ? 'مقاومة الخرسانة المكعبية fcu' : "مقاومة الخرسانة الأسطوانية f'c";
    recalc();
  }
  const designBox = h('div', { class: 'opts', style: { marginTop: 0 } }, nf('عدد الأسقف المحمولة', floors), nf('حمل التشغيل للمتر (D + L)', ws, 'كن/م²'), nf('الحمل المصعّد للمتر', wu, 'كن/م²', 'من أداة حساب الأحمال'), fcF, field('رتبة الصلب', fy), nf('عرض العمود الثابت', bCol, 'مم'), nf('ارتفاع الطابق الصافي', Hc, 'م'), nf('جهد التربة المسموح', qAll, 'كن/م²'), nf('فرق الحمل داخل النوع الواحد', typeTol, '%', 'كلما زاد قلّ عدد الأنواع'));
  onAny([floors, ws, wu, fc, fy, bCol, qAll, Hc, typeTol], () => recalc());

  body.append(
    codeBar(setCode),
    h('div', { class: 'panel' }, sectionTitle('١. مصدر اللوحة', 'file-text'), modeSeg, modeNote, h('div', { style: { marginTop: '14px' } }, dz), fileInfo),
    h('div', { class: 'panel', style: { marginTop: '16px' } }, sectionTitle('٢. المقياس وتوليد الأعمدة', 'grid-3x3'), scaleBox, autoBox, axesBox, cadBox),
    h('div', { class: 'panel', style: { marginTop: '16px' } }, sectionTitle('٣. مراجعة الأعمدة وتعديلها', 'mouse-pointer-2'), h('div', { class: 'toolbar' }, toolSeg, zout, zin, fitB, clearB, stat), h('div', { class: 'cv-wrap', style: { maxHeight: 'none', background: '#f8fafc' } }, cv), h('p', { class: 'eng-sub', style: { margin: '8px 0 0' } }, 'استخدم عجلة الفأرة للتكبير، واسحب بأداة «تحريك اللوحة» للتنقل. في أداة التحريك اسحب العمود إلى موضعه الصحيح.')),
    h('div', { class: 'panel', style: { marginTop: '16px' } }, sectionTitle('٤. الأحمال والتصميم', 'weight'), designBox),
    h('div', { style: { marginTop: '16px' } }, ui.res),
    h('p', { class: 'muted eng-disc' }, 'التوزيع والتصميم مبدئيان للمساعدة في التخطيط، ويجب مراجعتهما واعتمادهما من مهندس إنشائي، وخاصة الأعمدة الطرفية والركنية المعرضة للعزوم.'));

  function setMode(m) {
    mode = m; [...modeSeg.children].forEach(b => b.classList.toggle('on', b.dataset.m === m));
    autoBox.style.display = m === 'auto' ? '' : 'none'; axesBox.style.display = m === 'axes' ? '' : 'none'; cadBox.style.display = m === 'cad' ? '' : 'none';
    scaleBox.style.display = m === 'cad' ? 'none' : '';
    modeNote.className = 'note' + (m === 'auto' ? '' : ' info');
    modeNote.textContent = m === 'auto' ? 'تنبيه: الكشف التلقائي من صورة دون محاور تقريبي؛ يتعرف على الحوائط السميكة ويضع الأعمدة عند تقاطعاتها وأركانها، ثم يضيف أعمدة وسطية في البحور الطويلة. يجب مراجعة كل الأعمدة وتعديلها قبل الاعتماد.'
      : m === 'axes' ? 'أدخل المسافات بين المحاور كما في اللوحة، ثم حاذِ الشبكة بنقرتين. يختار الموقع من التقاطعات ما يتوافق مع الحوائط والتقسيم المعماري، ولا يضع عمودًا عند كل تقاطع إلا إذا طلبت ذلك.'
        : 'من AutoCAD احفظ الرسم بصيغة DXF (Save As ← DXF)، ومن Revit صدّر المسقط بصيغة DXF. اختر طبقة المحاور أو الحوائط، فتُستخرج الأعمدة بالإحداثيات الحقيقية، ثم تُنزّل ملف DXF وسكريبت AutoLISP يرسم الأعمدة في ملفك، وسكريبت Revit.';
    dz.querySelector('input').accept = m === 'cad' ? '.dxf' : 'image/*,application/pdf,.pdf';
  }
  function setTool(t) { tool = t; tmp = []; [...toolSeg.children].forEach(b => b.classList.toggle('on', b.dataset.t === t)); cv.style.cursor = t === 'pan' ? 'grab' : 'crosshair'; draw(); }

  /* --- تحميل الملفات --- */
  async function load(f) {
    try {
      cols = []; grid = null; design = null;
      if (/\.dxf$/i.test(f.name)) {
        const d = parseDxf(await f.text());
        if (!d.segs.length) return toast('لم يُعثر على خطوط في الملف.', true);
        const u = UNIT_M[d.units] || 0.001; unitSel.value = String(u);
        src = { kind: 'dxf', dxf: d, u, name: baseName(f.name) };
        layerSel.innerHTML = ''; d.layers.forEach(([n, c]) => layerSel.append(h('option', { value: n }, `${n} (${c})`)));
        wallLayerSel.innerHTML = ''; wallLayerSel.append(h('option', { value: '' }, 'دون')); d.layers.forEach(([n, c]) => wallLayerSel.append(h('option', { value: n }, `${n} (${c})`)));
        const wg = d.layers.find(([n]) => /wall|حائط|حوائط/i.test(n)); if (wg) wallLayerSel.value = wg[0];
        const guess = d.layers.find(([n]) => /grid|axis|axes|محور/i.test(n)) || d.layers.find(([n]) => /wall|حائط|حوائط/i.test(n));
        if (guess) { layerSel.value = guess[0]; cadKind.value = /grid|axis|axes|محور/i.test(guess[0]) ? 'axes' : 'walls'; }
        rebuildDxfWorld(); setMode('cad'); cadKind.onchange();
        fileInfo.textContent = `${f.name} — ${d.segs.length} خطًا في ${d.layers.length} طبقة، والوحدة ${UNIT_NAME[u] || 'غير محددة'}`;
      } else if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) {
        const pdfjs = await libs.pdfjs(); const doc = await pdfjs.getDocument({ data: await readArrayBuffer(f), isEvalSupported: false }).promise;
        const page = await doc.getPage(1); const vp1 = page.getViewport({ scale: 1 }); const rs = Math.min(4, 3000 / Math.max(vp1.width, vp1.height));
        const vp = page.getViewport({ scale: rs }); const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); await page.render({ canvasContext: g, viewport: vp }).promise;
        src = { kind: 'img', canvas: c, pdfPx: rs, name: baseName(f.name) };
        src.mpp = 0.0254 / 72 * N(pdfScale.value, 100) / rs; pdfScaleF.style.display = '';
        fileInfo.textContent = `${f.name} — الصفحة الأولى`; if (mode === 'cad') setMode('axes');
      } else {
        const bmp = await createImageBitmap(f); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0);
        src = { kind: 'img', canvas: c, mpp: null, name: baseName(f.name) }; pdfScaleF.style.display = 'none';
        fileInfo.textContent = `${f.name} — ${bmp.width} × ${bmp.height} بكسل`; if (mode === 'cad') setMode('auto');
      }
      updCal(); fit(); recalc();
    } catch (e) { console.error(e); toast('تعذّر فتح الملف: ' + e.message, true); }
  }
  pdfScale.oninput = () => { if (src?.pdfPx) { src.mpp = 0.0254 / 72 * N(pdfScale.value, 100) / src.pdfPx; updCal(); draw(); recalc(); } };
  function rebuildDxfWorld() { const u = src.u; src.world = src.dxf.segs.map(s => ({ layer: s.layer, x1: s.x1 * u, y1: -s.y1 * u, x2: s.x2 * u, y2: -s.y2 * u })); }
  function updCal() { calInfo.textContent = src?.kind === 'img' ? (src.mpp ? `المقياس الحالي: 1 بكسل = ${fmt(src.mpp * 1000, 2)} مم في الطبيعة` : 'لم يُضبط المقياس بعد: انقر «معايرة» ثم ارسم خطًا على بُعد معلوم في اللوحة (مثل عرض غرفة مكتوب).') : ''; }

  /* --- العرض --- */
  const worldBounds = () => {
    if (src?.kind === 'img' && src.mpp) return [0, 0, src.canvas.width * src.mpp, src.canvas.height * src.mpp];
    if (src?.kind === 'img') return [0, 0, src.canvas.width, src.canvas.height];
    const pts = []; (src?.world || []).forEach(s => pts.push([s.x1, s.y1], [s.x2, s.y2])); cols.forEach(c => pts.push([c.x, c.y]));
    if (!pts.length) return [0, 0, 20, 15];
    return [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
  };
  const imgScale = () => src?.kind === 'img' ? (src.mpp || 1) : 1; // متر لكل بكسل للصورة (أو 1 قبل المعايرة)
  function fit() { const r = cv.getBoundingClientRect(); const [x0, y0, x1, y1] = worldBounds(); const W = r.width || 900, H = r.height || 560; view.s = Math.min(W / (x1 - x0 || 1), H / (y1 - y0 || 1)) * 0.92; view.ox = (W - (x1 - x0) * view.s) / 2 - x0 * view.s; view.oy = (H - (y1 - y0) * view.s) / 2 - y0 * view.s; draw(); }
  function zoom(k, cx, cy) { const r = cv.getBoundingClientRect(); cx ??= r.width / 2; cy ??= r.height / 2; view.ox = cx - (cx - view.ox) * k; view.oy = cy - (cy - view.oy) * k; view.s *= k; draw(); }
  const toW = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left - view.ox) / view.s, y: (e.clientY - r.top - view.oy) / view.s }; };
  const toS = (x, y) => [x * view.s + view.ox, y * view.s + view.oy];
  function colDims(i) { const d = design?.cols?.[i]; const b = (d?.b || N(bCol.value, 250)) / 1000, hh = (d?.h || N(bCol.value, 250) * 2) / 1000; return cols[i].rot === 90 ? [b, hh] : [hh, b]; }
  function draw() {
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
    if (src?.kind === 'img') { const k = imgScale(); g.imageSmoothingQuality = 'high'; g.drawImage(src.canvas, view.ox, view.oy, src.canvas.width * k * view.s, src.canvas.height * k * view.s); }
    if (src?.kind === 'dxf') {
      const sel = layerSel.value; g.lineWidth = 1;
      for (const s of src.world) { g.strokeStyle = s.layer === sel ? '#0f766e' : '#94a3b8'; g.beginPath(); g.moveTo(...toS(s.x1, s.y1)); g.lineTo(...toS(s.x2, s.y2)); g.stroke(); }
    }
    if (grid) {
      g.setLineDash([8, 5]); g.strokeStyle = '#b45309'; g.lineWidth = 1; g.font = 'bold 12px Cairo, Arial'; g.fillStyle = '#b45309'; g.textAlign = 'center';
      for (const l of grid.lines) { g.beginPath(); g.moveTo(...toS(...l[0])); g.lineTo(...toS(...l[1])); g.stroke(); const [tx, ty] = toS(...l[2]); g.beginPath(); g.arc(tx, ty, 11, 0, 7); g.stroke(); g.fillText(l[3], tx, ty + 4); }
      g.setLineDash([]);
    }
    // القواعد ثم الأعمدة
    cols.forEach((c, i) => {
      if (!c.on) return; const f = design?.foots?.[i];
      if (f?.ok) { const fx = (c.rot === 90 ? f.By : f.Bx), fy2 = (c.rot === 90 ? f.Bx : f.By); const [x, y] = toS(c.x - fx / 2, c.y - fy2 / 2); g.setLineDash([5, 4]); g.strokeStyle = '#64748b'; g.lineWidth = 1; g.strokeRect(x, y, fx * view.s, fy2 * view.s); g.setLineDash([]); if (design.overlap?.has(i)) { g.fillStyle = 'rgba(220,38,38,.12)'; g.fillRect(x, y, fx * view.s, fy2 * view.s); } }
    });
    cols.forEach((c, i) => {
      if (!c.on) return; const [w, hh] = colDims(i); const [x, y] = toS(c.x - w / 2, c.y - hh / 2);
      const sz = Math.max(w * view.s, 6), sy = Math.max(hh * view.s, 6);
      g.fillStyle = hover === i ? '#dc2626' : c.warn ? '#ea580c' : '#111827'; g.fillRect(x + (w * view.s - sz) / 2, y + (hh * view.s - sy) / 2, sz, sy);
      const tag = design?.cols?.[i]?.tag; if (tag) { g.font = 'bold 11px Cairo, Arial'; g.fillStyle = '#b91c1c'; g.textAlign = 'center'; g.fillText(tag, x + w * view.s / 2, y - 4); }
    });
    if (tmp.length) { g.strokeStyle = '#2563eb'; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); const p0 = toS(tmp[0].x, tmp[0].y); g.moveTo(...p0); if (hover && hover.x != null) g.lineTo(...toS(hover.x, hover.y)); g.stroke(); g.setLineDash([]); g.fillStyle = '#2563eb'; g.beginPath(); g.arc(...p0, 4, 0, 7); g.fill(); }
    stat.textContent = cols.filter(c => c.on).length ? `${cols.filter(c => c.on).length} عمودًا` : '';
  }
  const nearest = (w) => { let bi = -1, bd = 14 / view.s; cols.forEach((c, i) => { if (!c.on) return; const d = Math.hypot(c.x - w.x, c.y - w.y); if (d < bd) { bd = d; bi = i; } }); return bi; };
  cv.addEventListener('wheel', (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  cv.addEventListener('pointerdown', (e) => {
    const w = toW(e);
    if (tool === 'pan' || e.button === 1) { drag = { pan: true, x: e.clientX, y: e.clientY, ox: view.ox, oy: view.oy }; cv.setPointerCapture(e.pointerId); return; }
    if (tool === 'cal' || tool === 'align') {
      tmp.push(w);
      if (tmp.length === 2) { const [a, b] = tmp; tmp = []; tool === 'cal' ? finishCal(a, b) : finishAlign(a, b); setTool('move'); }
      draw(); return;
    }
    if (!requireScale()) return;
    const i = nearest(w);
    if (tool === 'add') { cols.push({ x: w.x, y: w.y, rot: 0, on: true }); recalc(); }
    else if (tool === 'del' && i >= 0) { cols.splice(i, 1); recalc(); }
    else if (tool === 'rot' && i >= 0) { cols[i].rot = cols[i].rot === 90 ? 0 : 90; draw(); }
    else if (tool === 'move' && i >= 0) { drag = { i }; cv.setPointerCapture(e.pointerId); }
  });
  cv.addEventListener('pointermove', (e) => {
    if (drag?.pan) { view.ox = drag.ox + e.clientX - drag.x; view.oy = drag.oy + e.clientY - drag.y; draw(); return; }
    const w = toW(e);
    if (drag && drag.i != null) { cols[drag.i].x = w.x; cols[drag.i].y = w.y; draw(); return; }
    if (tmp.length) { hover = w; draw(); return; }
    const i = nearest(w); if (i !== hover) { hover = i >= 0 ? i : null; draw(); }
  });
  cv.addEventListener('pointerup', () => { if (drag && drag.i != null) { cols[drag.i].warn = false; recalc(); } drag = null; });
  window.addEventListener('resize', () => { if (cv.isConnected) draw(); });

  function requireScale() { if (src?.kind === 'img' && !src.mpp) { toast('اضبط مقياس اللوحة أولًا بخط معلوم الطول.', true); return false; } return true; }
  function finishCal(a, b) {
    const box = h('div', { class: 'note info', style: { marginTop: '10px' } });
    const inp = num('', { placeholder: 'مثال: 4.5' });
    box.append(h('b', {}, 'كم يساوي الخط الذي رسمته في الطبيعة؟ '), h('div', { class: 'unit-in', style: { maxWidth: '200px', margin: '8px 0' } }, inp, h('em', {}, 'م')), h('button', { type: 'button', class: 'btn sm', onclick: () => {
      const v = N(inp.value, 0); if (!(v > 0)) return toast('أدخل طولًا صحيحًا.', true);
      const k = imgScale(), px = Math.hypot(b.x - a.x, b.y - a.y) / k; const old = src.mpp || 1; src.mpp = v / px;
      cols.forEach(c => { c.x = c.x / old * src.mpp; c.y = c.y / old * src.mpp; }); box.remove(); updCal(); fit(); recalc(); toast('ضُبط المقياس.');
    } }, 'اعتماد'));
    calInfo.after(box); setTimeout(() => inp.focus(), 50);
  }
  const parseList = (s) => String(s).split(/[,،\s]+/).map(x => N(x, NaN)).filter(x => x > 0);
  function buildGrid(o, ang) {
    const sx = parseList(axX.value), sy = parseList(axY.value); if (!sx.length || !sy.length) return toast('أدخل المسافات بين المحاور.', true);
    const X = [0], Y = [0]; sx.forEach(v => X.push(X[X.length - 1] + v)); sy.forEach(v => Y.push(Y[Y.length - 1] + v));
    const cs = Math.cos(ang), sn = Math.sin(ang), P = (u, v) => [o[0] + u * cs - v * sn, o[1] + u * sn + v * cs];
    const ext = 1.2, lines = [];
    X.forEach((u, i) => lines.push([P(u, -ext), P(u, Y[Y.length - 1] + ext), P(u, -ext - 0.6), String(i + 1)]));
    Y.forEach((v, j) => lines.push([P(-ext, v), P(X[X.length - 1] + ext, v), P(-ext - 0.6, v), String.fromCharCode(65 + j)]));
    grid = { lines, X, Y };
    const cands = []; X.forEach((u, i) => Y.forEach((v, j) => { const [x, y] = P(u, v); cands.push({ x, y, i, j }); }));
    if (allInt.checked || src?.kind !== 'img' || !src.mpp) {
      cols = cands.map(c => ({ x: c.x, y: c.y, rot: 0, on: true }));
      if (!allInt.checked && src?.kind !== 'img') toast('لا توجد لوحة لتحليل الحوائط، فوُضعت الأعمدة على كل التقاطعات؛ احذف ما يتعارض مع الفراغات.', false, 6000);
    } else {
      const wall = imgWallScore(wallMask());
      // اتجاه المحور الأفقي (u) والرأسي (v) بعد التدوير
      cols = selectGrid(cands, (c) => ({ a: wall(c.x, c.y, cs, sn), b: wall(c.x, c.y, -sn, cs) }), N(axSpan.value, 5), wall.along);
      const w = cols.filter(c => c.warn).length;
      toast(`وُضع ${cols.length} عمودًا من ${cands.length} تقاطعًا: عند التقاء الحوائط أولًا، ثم في البحور الطويلة.${w ? ` ${w} منها داخل فراغات (بلون برتقالي) فراجعها.` : ''}`, false, 7000);
    }
    recalc();
  }
  function finishAlign(a, b) {
    const sx = parseList(axX.value); const tot = sx.reduce((s, v) => s + v, 0); if (!tot) return toast('أدخل المسافات بين المحاور.', true);
    if (src?.kind === 'img') { const k = imgScale(); const px = Math.hypot(b.x - a.x, b.y - a.y) / k; const mppNew = tot / px; const ax = a.x / k * mppNew, ay = a.y / k * mppNew, bx = b.x / k * mppNew, by = b.y / k * mppNew; src.mpp = mppNew; updCal(); buildGrid([ax, ay], Math.atan2(by - ay, bx - ax)); fit(); }
    else buildGrid([a.x, a.y], Math.atan2(b.y - a.y, b.x - a.x));
    toast('تمت المحاذاة؛ راجع مواضع الأعمدة.');
  }
  function wallMask() {
    const res = 0.04; const f = Math.min(src.mpp / res, 1, 2600 / Math.max(src.canvas.width, src.canvas.height));
    const W = Math.round(src.canvas.width * f), H = Math.round(src.canvas.height * f), mppW = src.mpp / f;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(src.canvas, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data, gray = new Uint8Array(W * H);
    for (let i = 0, p = 0; p < W * H; p++, i += 4) gray[p] = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
    const th = +threshold.value || Math.min(otsu(gray), 200);
    const mask = new Uint8Array(W * H); for (let p = 0; p < W * H; p++) mask[p] = gray[p] < th ? 1 : 0;
    const k = Math.max(2, Math.round(N(minWall.value, 12) / 100 / mppW * 0.8));
    return { er: erode(mask, W, H, k), W, H, mppW, k };
  }
  // هل يمتد حائط من النقطة في الاتجاه (ux, uy) أو عكسه؟ يُفحص شريط عرضه ±25 سم وطوله 60 سم
  function imgWallScore(M) {
    const at = (x, y) => { const px = Math.round(x / M.mppW), py = Math.round(y / M.mppW); return px >= 0 && py >= 0 && px < M.W && py < M.H ? M.er[py * M.W + px] : 0; };
    const side = (x, y, ux, uy, sgn) => {
      let best = 0;
      for (let off = -0.25; off <= 0.25001; off += M.mppW) {
        const nx = x - uy * off, ny = y + ux * off; let hit = 0, n = 0;
        for (let t = 0.05; t <= 0.6; t += M.mppW) { hit += at(nx + sgn * ux * t, ny + sgn * uy * t); n++; }
        best = Math.max(best, hit / n);
      }
      return best >= 0.7;
    };
    const fn = (x, y, ux, uy) => side(x, y, ux, uy, 1) || side(x, y, ux, uy, -1);
    // نسبة طول المسافة بين نقطتين التي يمتد عليها حائط
    fn.along = (A, B) => {
      const L = Math.hypot(B.x - A.x, B.y - A.y), ux = (B.x - A.x) / L, uy = (B.y - A.y) / L; let hit = 0, n = 0;
      for (let t = 0.3; t < L - 0.3; t += 0.2) { const x = A.x + ux * t, y = A.y + uy * t; let ok = 0; for (let off = -0.25; off <= 0.25001; off += M.mppW) if (at(x - uy * off, y + ux * off)) { ok = 1; break; } hit += ok; n++; }
      return n ? hit / n : 1;
    };
    return fn;
  }
  function runAuto() {
    if (!src || src.kind !== 'img') return toast('ارفع صورة اللوحة أولًا.', true);
    if (!src.mpp) return toast('اضبط المقياس أولًا بخط معلوم الطول.', true);
    const { er, W, H, mppW, k } = wallMask();
    const minLen = Math.round(0.9 / mppW), maxThick = Math.round(0.7 / mppW);
    const hb = wallBands(er, W, H, minLen, maxThick, false).map(b => ({ pos: b.pos * mppW, a: b.a * mppW, b: b.b * mppW }));
    const vb = wallBands(er, W, H, minLen, maxThick, true).map(b => ({ pos: b.pos * mppW, a: b.a * mppW, b: b.b * mppW }));
    if (!hb.length || !vb.length) return toast('لم تُكتشف حوائط واضحة. جرّب تقليل «أقل سماكة للحائط» أو رفع حد اللون الداكن.', true, 6000);
    // تحويل إلى إحداثيات العالم (الصورة × المقياس)
    cols = columnsFromSegments(hb, vb, { maxSpan: N(maxSpan.value, 5), minDist: N(minDist.value, 2), tol: Math.max(0.3, k * mppW) });
    grid = null; recalc(); draw();
    toast(`اقتُرح ${cols.length} عمودًا من ${hb.length + vb.length} حائطًا. راجعها قبل الاعتماد.`, false, 5000);
  }
  function runCad() {
    if (src?.kind !== 'dxf') return toast('ارفع ملف DXF أولًا.', true);
    const segs = src.world.filter(s => s.layer === layerSel.value);
    const span = N(cadMax.value, 5);
    if (cadKind.value === 'axes') {
      const { hs, vs } = axesFromLines(segs); if (!hs.length || !vs.length) return toast('لم يُعثر على محاور أفقية ورأسية في هذه الطبقة.', true);
      const cands = []; hs.forEach((a, j) => vs.forEach((b, i) => { if (b.pos >= a.a - 0.3 && b.pos <= a.b + 0.3 && a.pos >= b.a - 0.3 && a.pos <= b.b + 0.3) cands.push({ x: b.pos, y: a.pos, i, j }); }));
      if (wallLayerSel.value) {
        const W2 = wallsFromLines(src.world.filter(s2 => s2.layer === wallLayerSel.value));
        const onH = (x, y) => W2.hs.some(w => Math.abs(w.pos - y) <= 0.3 && x >= w.a - 0.15 && x <= w.b + 0.15);
        const onV = (x, y) => W2.vs.some(w => Math.abs(w.pos - x) <= 0.3 && y >= w.a - 0.15 && y <= w.b + 0.15);
        const alongD = (A, B) => { const horiz = Math.abs(B.y - A.y) < Math.abs(B.x - A.x), L = Math.hypot(B.x - A.x, B.y - A.y); let hit = 0, n = 0; for (let t = 0.3; t < L - 0.3; t += 0.2) { const x = A.x + (B.x - A.x) * t / L, y = A.y + (B.y - A.y) * t / L; hit += (horiz ? onH(x, y) : onV(x, y)) ? 1 : 0; n++; } return n ? hit / n : 1; };
        cols = selectGrid(cands, (c) => ({ a: onH(c.x, c.y), b: onV(c.x, c.y) }), span, alongD);
        const w = cols.filter(c => c.warn).length;
        toast(`وُضع ${cols.length} عمودًا من ${cands.length} تقاطعًا وفق الحوائط.${w ? ` ${w} منها داخل فراغات فراجعها.` : ''}`, false, 6000);
      } else cols = cands.map(c => ({ x: c.x, y: c.y, rot: 0, on: true }));
      grid = { lines: [...vs.map((v, i) => [[v.pos, v.a], [v.pos, v.b], [v.pos, v.a - 0.8], String(i + 1)]), ...hs.map((a, j) => [[a.a, a.pos], [a.b, a.pos], [a.a - 0.8, a.pos], String.fromCharCode(65 + j)])], X: [], Y: [] };
    } else {
      const { hs, vs } = wallsFromLines(segs); if (!hs.length || !vs.length) return toast('لم تُكتشف حوائط مزدوجة الخطوط في هذه الطبقة.', true);
      cols = columnsFromSegments(hs, vs, { maxSpan: span, minDist: N(minDist.value, 2), tol: 0.35 }); grid = null;
    }
    recalc(); fit(); toast(`استُخرج ${cols.length} عمودًا.`);
  }
  layerSel.onchange = () => draw();

  /* --- التصميم والجداول --- */
  let tmr = null;
  function recalc() { clearTimeout(tmr); tmr = setTimeout(doDesign, 120); draw(); }
  function doDesign() {
    const act = cols.map((c, i) => ({ c, i })).filter(o => o.c.on);
    if (!act.length || !requireScaleSilent()) { design = null; ui.res.innerHTML = ''; ui.res.append(h('div', { class: 'note info' }, src ? 'وزّع الأعمدة أولًا بإحدى الطرق السابقة.' : 'ارفع اللوحة واختر طريقة التوزيع.')); draw(); return; }
    const areas = tributary(cols);
    const nF = N(floors.value, 1), wS = N(ws.value, 8), wU = N(wu.value, 12), fcv = N(fc.value, 25), fyv = +fy.value, b = N(bCol.value, 250);
    const out = { cols: [], foots: [] };
    // تجميع الأعمدة في أنواع حسب الحمل: كل نوع يُصمَّم على أكبر حمل فيه (فرق لا يزيد على 20%)
    const items = act.map((o, k) => ({ i: o.i, A: areas[k], Pu: Math.max(areas[k] * nF * wU * 1.05, 50), P: Math.max(areas[k] * nF * wS * 1.05, 35) })).sort((a, b2) => b2.Pu - a.Pu);
    const groups = [];
    for (const it of items) { const g = groups[groups.length - 1]; if (g && it.Pu >= g.max * (1 - N(typeTol.value, 20) / 100)) g.list.push(it); else groups.push({ max: it.Pu, Pmax: it.P, list: [it] }); }
    groups.reverse(); // من الأصغر إلى الأكبر
    out.ctypes = []; out.ftypes = [];
    groups.forEach((g, gi) => {
      const Pmax = Math.max(...g.list.map(x => x.P));
      const cd = designColumn({ code, Pu: g.max, fc: fcv, fy: fyv, b, H: N(Hc.value, 2.7) });
      const fd = designFooting({ code, c1: cd.h, c2: cd.b, P: Pmax, Pu: g.max, q: N(qAll.value, 150), fc: fcv, fy: fyv, colBar: cd.pick?.bar.d || 16, colN: cd.pick?.n || 8, minH: code === 'eg' ? 400 : 300 });
      const ct = 'C' + (gi + 1), ft = 'F' + (gi + 1);
      const cItems = g.list.map(x => (out.cols[x.i] = { ...cd, A: x.A, Pu: x.Pu, P: x.P, tag: ct }));
      const fItems = g.list.map(x => (out.foots[x.i] = { ...fd, tag: ft }));
      out.ctypes.push({ tag: ct, items: cItems }); out.ftypes.push({ tag: ft, items: fItems });
    });
    // تداخل القواعد
    out.overlap = new Set();
    act.forEach((o, k) => act.forEach((p, m) => { if (m <= k) return; const f1 = out.foots[o.i], f2 = out.foots[p.i]; if (!f1?.ok || !f2?.ok) return; const w1 = o.c.rot === 90 ? f1.By : f1.Bx, h1 = o.c.rot === 90 ? f1.Bx : f1.By, w2 = p.c.rot === 90 ? f2.By : f2.Bx, h2 = p.c.rot === 90 ? f2.Bx : f2.By; if (Math.abs(o.c.x - p.c.x) < (w1 + w2) / 2 && Math.abs(o.c.y - p.c.y) < (h1 + h2) / 2) { out.overlap.add(o.i); out.overlap.add(p.i); } }));
    design = out; draw(); show(act, areas);
  }
  function requireScaleSilent() { return !(src?.kind === 'img' && !src.mpp); }
  let detailSel = null;
  function show(act) {
    const d = design, failC = act.filter(o => !d.cols[o.i].ok).length, failF = act.filter(o => !d.foots[o.i].ok).length;
    const totA = act.reduce((s, o) => s + d.cols[o.i].A, 0);
    const vCol = act.reduce((s, o) => s + d.cols[o.i].b * d.cols[o.i].h / 1e6 * (N(Hc.value, 2.7) + 0.5), 0) * N(floors.value, 1);
    const vFt = act.reduce((s, o) => { const f = d.foots[o.i]; return s + (f.ok ? f.Bx * f.By * f.h / 1000 : 0); }, 0);
    const stCol = act.reduce((s, o) => { const c = d.cols[o.i]; return s + (c.pick ? c.pick.n * barKg(code, c.pick.bar.id) * (N(Hc.value, 2.7) + 1.3) : 0); }, 0) * N(floors.value, 1);
    const stFt = act.reduce((s, o) => { const f = d.foots[o.i]; return s + (f.ok ? f.rx.n * (f.Bx + 0.25) * barKg(code, f.rx.bar.id) + f.ry.n * (f.By + 0.25) * barKg(code, f.ry.bar.id) : 0); }, 0);
    detailSel = h('select', { class: 'input', style: { maxWidth: '260px' } }, ...d.ctypes.map((t, i) => h('option', { value: t.tag }, `العمود ${t.tag} والقاعدة F${i + 1}`)));
    const detail = h('div');
    const drawDetail = () => {
      detail.innerHTML = '';
      const ct = d.ctypes.find(t => t.tag === detailSel.value) || d.ctypes[0]; if (!ct) return;
      const ci = d.cols.indexOf(ct.items[0]); const f = d.foots[ci];
      detail.append(h('div', { class: 'eng-layout', style: { gridTemplateColumns: '1fr 1.6fr' } }, svgBlock(columnSvg(ct.items[0], ct.tag), 'column-' + ct.tag), f?.ok ? svgBlock(footingSvg(f, f.tag, ct.tag), 'footing-' + f.tag) : h('div', { class: 'note err' }, 'تعذّر تصميم القاعدة.')));
    };
    detailSel.onchange = drawDetail;
    // قائمة الأعمدة مرتبة بالاسم
    const rows = act.map(o => ({ o, c: d.cols[o.i], f: d.foots[o.i] }));
    ui.res.innerHTML = '';
    ui.res.append(...[
      kpis([['عدد الأعمدة', fmt(act.length, 0), '', 'main'], ['أنواع الأعمدة', fmt(d.ctypes.length, 0)], ['أنواع القواعد', fmt(d.ftypes.length, 0)], ['مساحة الطابق المحمولة', fmt(totA, 1), 'م²'], ['أكبر حمل على عمود', fmt(Math.max(...rows.map(r => r.c.Pu)), 0), 'كن'], failC || failF ? ['عناصر تحتاج مراجعة', fmt(failC + failF, 0), '', 'bad'] : null]),
      d.overlap.size ? h('div', { class: 'note err', style: { marginBottom: '12px' } }, `تتداخل قواعد ${d.overlap.size} أعمدة (مظللة بالأحمر في اللوحة)؛ يُقترح لها قاعدة مشتركة أو لبشة.`) : null,
      sectionTitle('جدول الأعمدة', 'columns-3'),
      table(['النوع', 'العدد', 'القطاع (مم)', 'الحديد الطولي', 'الكانات', 'أكبر حمل مصعّد (كن)'], d.ctypes.map(t => { const c = t.items[0]; return [t.tag, String(t.items.length), `${c.b} × ${c.h}`, c.pick ? `${c.pick.n} ${c.pick.bar.label}` : 'تحتاج مراجعة', c.pick ? `Φ${c.dt} كل ${c.s} مم` : '—', fmt(Math.max(...t.items.map(x => x.Pu)), 0)]; })),
      sectionTitle('جدول القواعد', 'square-dashed-bottom'),
      table(code === 'eg' ? ['النوع', 'العدد', 'المسلحة (م)', 'السماكة (مم)', 'العادية (م)', 'الحديد السفلي'] : ['النوع', 'العدد', 'الأبعاد (م)', 'السماكة (مم)', 'الحديد في الاتجاه الأول', 'الحديد في الاتجاه الثاني'],
        d.ftypes.map(t => { const f = t.items[0]; if (!f.ok) return [t.tag, String(t.items.length), 'تحتاج مراجعة', '', '', '']; return code === 'eg' ? [t.tag, String(t.items.length), `${f.Bx.toFixed(2)} × ${f.By.toFixed(2)}`, String(f.h), `${f.pcBx.toFixed(2)} × ${f.pcBy.toFixed(2)}`, `${f.rx.n} ${f.rx.bar.label} / ${f.ry.n} ${f.ry.bar.label}`] : [t.tag, String(t.items.length), `${f.Bx.toFixed(2)} × ${f.By.toFixed(2)}`, String(f.h), `${f.rx.n} ${f.rx.bar.label} كل ${f.rx.s}`, `${f.ry.n} ${f.ry.bar.label} كل ${f.ry.s}`]; })),
      sectionTitle('القطاعات التوضيحية', 'pencil-ruler'), h('div', { class: 'toolbar' }, h('b', {}, 'النوع: '), detailSel), detail,
      sectionTitle('الكميات التقريبية', 'cuboid'),
      table(['البند', 'الكمية'], [['خرسانة الأعمدة لكل الطوابق', fmt(vCol, 2) + ' م³'], ['خرسانة القواعد المسلحة', fmt(vFt, 2) + ' م³'], ['حديد الأعمدة الطولي', fmt(stCol / 1000, 2) + ' طن'], ['حديد القواعد', fmt(stFt / 1000, 2) + ' طن']]),
      checks([
        { ok: null, text: 'مساحة التحميل محسوبة بتقسيم مسطح المبنى (المضلع المحيط بالأعمدة) على أقرب عمود، مع زيادة 5% للوزن الذاتي للأعمدة.' },
        { ok: null, text: 'الأعمدة مصممة محوريًا؛ تُراجع الأعمدة الطرفية والركنية والأعمدة الحاملة لحوائط خارجية أو بروزات.' },
        failC ? { ok: false, text: `${failC} أعمدة لم يمكن تصميمها بالعرض الحالي؛ زِد العرض الثابت.` } : null,
      ]),
      sectionTitle('التصدير', 'download'),
      h('div', { class: 'actions', style: { justifyContent: 'flex-start' } },
        h('button', { type: 'button', class: 'btn', onclick: exportDxf }, ico('file-code', 18), 'ملف DXF للأوتوكاد'),
        h('button', { type: 'button', class: 'btn', onclick: exportLisp }, ico('file-code', 18), 'سكريبت AutoLISP'),
        h('button', { type: 'button', class: 'btn light', onclick: exportRevit }, ico('file-code', 18), 'سكريبت Revit (pyRevit)'),
        h('button', { type: 'button', class: 'btn light', onclick: exportXlsx }, ico('download', 18), 'الجداول Excel'),
        h('button', { type: 'button', class: 'btn light', onclick: exportPng }, ico('download', 18), 'اللوحة PNG'),
        h('button', { type: 'button', class: 'btn light', onclick: () => sendToBoq([{ section: 'أعمال الخرسانة', desc: 'خرسانة مسلحة للأعمدة (جميع الطوابق)', unit: 'م³', qty: vCol }, { section: 'أعمال الخرسانة', desc: 'خرسانة مسلحة للقواعد', unit: 'م³', qty: vFt }, { section: 'أعمال حديد التسليح', desc: 'حديد الأعمدة والقواعد', unit: 'طن', qty: (stCol + stFt) / 1000 }]) }, ico('clipboard-list', 18), 'أضِف إلى جدول الكميات')),
      h('div', { class: 'note info', style: { marginTop: '12px' } }, src?.kind === 'dxf' ? 'ملف DXF وسكريبت AutoLISP بإحداثيات ملفك الأصلي نفسها: شغّل السكريبت داخل ملفك (APPLOAD ثم الأمر ITQCOLS) فتُرسم الأعمدة والقواعد في طبقات ITQ-* فوق المعماري مباشرة. وسكريبت Revit يضع أعمدة إنشائية بالأبعاد المحسوبة؛ جرّبه على نسخة من الملف أولًا.' : 'الإحداثيات في الملفات المصدّرة بالمليمتر، ونقطة الأصل هي الركن العلوي الأيسر من الصورة. أدرج الملف في لوحتك ثم انقله ليطابق المحاور.'),
      supportNudge(window.__ITQAN_CFG || {})].filter(Boolean));
    drawDetail();
  }

  /* --- التصدير --- */
  function exportGeom(unitM) {
    // يعيد الأشكال بوحدة الرسم المطلوبة، مع عكس محور ص
    const k = 1 / unitM, T = (x, y) => [x * k, -y * k];
    const colsOut = [], footsOut = [];
    cols.forEach((c, i) => {
      if (!c.on || !design?.cols[i]) return; const cd = design.cols[i], f = design.foots[i];
      const [w, hh] = colDims(i);
      const pts = [T(c.x - w / 2, c.y - hh / 2), T(c.x + w / 2, c.y - hh / 2), T(c.x + w / 2, c.y + hh / 2), T(c.x - w / 2, c.y + hh / 2)];
      colsOut.push({ pts, tag: cd.tag, tagAt: T(c.x, c.y - hh / 2 - 0.35), ftag: f?.tag, ftagAt: T(c.x, c.y + hh / 2 + 0.45), x: c.x * k, y: -c.y * k, b: (cd.b), h: (cd.h), rot: c.rot });
      if (f?.ok) { const fw = c.rot === 90 ? f.By : f.Bx, fh = c.rot === 90 ? f.Bx : f.By; footsOut.push({ pts: [T(c.x - fw / 2, c.y - fh / 2), T(c.x + fw / 2, c.y - fh / 2), T(c.x + fw / 2, c.y + fh / 2), T(c.x - fw / 2, c.y + fh / 2)] }); }
    });
    const g = grid ? { lines: grid.lines.map(l => [T(...l[0]), T(...l[1]), T(...l[2]), l[3]]) } : null;
    return { colsOut, footsOut, g, textH: 0.25 * k };
  }
  const outUnit = () => src?.kind === 'dxf' ? src.u : 0.001;
  function exportDxf() {
    if (!design) return toast('لا توجد أعمدة.', true);
    const u = outUnit(), { colsOut, footsOut, g, textH } = exportGeom(u);
    const txt = writeDxf({
      layers: [['ITQ-COLUMNS', 1], ['ITQ-COL-TAGS', 2], ['ITQ-FOOTINGS', 8, 'DASHED'], ['ITQ-FTG-TAGS', 3], ['ITQ-GRID', 9, 'DASHED']],
      polys: [...footsOut.map(f => ({ layer: 'ITQ-FOOTINGS', pts: f.pts, closed: true })), ...colsOut.map(c => ({ layer: 'ITQ-COLUMNS', pts: c.pts, closed: true }))],
      solids: colsOut.map(c => ({ layer: 'ITQ-COLUMNS', pts: c.pts })),
      texts: [...colsOut.map(c => ({ layer: 'ITQ-COL-TAGS', x: c.tagAt[0], y: c.tagAt[1], h: textH, t: c.tag })), ...colsOut.filter(c => c.ftag).map(c => ({ layer: 'ITQ-FTG-TAGS', x: c.ftagAt[0], y: c.ftagAt[1], h: textH * 0.8, t: c.ftag })), ...(g ? g.lines.map(l => ({ layer: 'ITQ-GRID', x: l[2][0], y: l[2][1], h: textH * 1.5, t: l[3] })) : [])],
      lines: g ? g.lines.map(l => ({ layer: 'ITQ-GRID', x1: l[0][0], y1: l[0][1], x2: l[1][0], y2: l[1][1] })) : [],
    });
    download(new Blob([txt], { type: 'application/dxf' }), `${src?.name || 'layout'}-columns.dxf`);
  }
  function exportLisp() {
    if (!design) return toast('لا توجد أعمدة.', true);
    const u = outUnit(), { colsOut, footsOut, g, textH } = exportGeom(u);
    download(new Blob([writeLisp({ unitName: UNIT_NAME[u] === 'مم' ? 'mm' : UNIT_NAME[u] === 'م' ? 'm' : UNIT_NAME[u] === 'سم' ? 'cm' : 'drawing units', cols: colsOut, foots: footsOut, grid: g, textH })], { type: 'text/plain' }), `${src?.name || 'layout'}-ITQCOLS.lsp`);
  }
  function exportRevit() {
    if (!design) return toast('لا توجد أعمدة.', true);
    const { colsOut } = exportGeom(0.001);
    download(new Blob([writeRevit({ cols: colsOut.map(c => ({ ...c, b: c.rot === 90 ? c.b : c.h, h: c.rot === 90 ? c.h : c.b, rot: 0 })) })], { type: 'text/x-python' }), `${src?.name || 'layout'}-revit-columns.py`);
  }
  function exportXlsx() {
    if (!design) return;
    const act = cols.map((c, i) => ({ c, i })).filter(o => o.c.on);
    const r1 = act.map(o => { const c = design.cols[o.i], f = design.foots[o.i]; return [c.tag, f.tag || '', +(o.c.x).toFixed(3), +(o.c.y).toFixed(3), +c.A.toFixed(2), +c.Pu.toFixed(0), `${c.b}×${c.h}`, c.pick ? `${c.pick.n} ${c.pick.bar.label}` : '', c.pick ? `Φ${c.dt}@${c.s}` : '', f.ok ? `${f.Bx.toFixed(2)}×${f.By.toFixed(2)}×${(f.h / 1000).toFixed(2)}` : '']; });
    const r2 = design.ftypes.map(t => { const f = t.items[0]; return [t.tag, t.items.length, f.ok ? +f.Bx.toFixed(2) : '', f.ok ? +f.By.toFixed(2) : '', f.ok ? f.h : '', f.ok ? `${f.rx.n} ${f.rx.bar.label} @${f.rx.s}` : '', f.ok ? `${f.ry.n} ${f.ry.bar.label} @${f.ry.s}` : '', f.usePC ? `${f.pcBx.toFixed(2)}×${f.pcBy.toFixed(2)}×${f.pcT}` : '']; });
    const r3 = design.ctypes.map(t => { const c = t.items[0]; return [t.tag, t.items.length, c.b, c.h, c.pick ? `${c.pick.n} ${c.pick.bar.label}` : '', c.pick ? `Φ${c.dt}@${c.s}` : '', +Math.max(...t.items.map(x => x.Pu)).toFixed(0)]; });
    xlsxDownload(`${src?.name || 'layout'}-columns-footings.xlsx`, [
      { name: 'الأعمدة', title: 'جدول مواضع الأعمدة وأحمالها', freeze: true, columns: [{ header: 'العمود', width: 9 }, { header: 'القاعدة', width: 9 }, { header: 'X (م)', width: 11 }, { header: 'Y (م)', width: 11 }, { header: 'مساحة التحميل (م²)', width: 16 }, { header: 'Pu (كن)', width: 11 }, { header: 'القطاع (مم)', width: 13 }, { header: 'الحديد', width: 14 }, { header: 'الكانات', width: 12 }, { header: 'القاعدة (م)', width: 18 }], rows: r1 },
      { name: 'أنواع الأعمدة', columns: [{ header: 'النوع', width: 9 }, { header: 'العدد', width: 8 }, { header: 'b (مم)', width: 9 }, { header: 'h (مم)', width: 9 }, { header: 'الحديد الطولي', width: 16 }, { header: 'الكانات', width: 12 }, { header: 'أكبر Pu (كن)', width: 13 }], rows: r3 },
      { name: 'القواعد', columns: [{ header: 'النوع', width: 9 }, { header: 'العدد', width: 8 }, { header: 'الطول (م)', width: 10 }, { header: 'العرض (م)', width: 10 }, { header: 'السماكة (مم)', width: 12 }, { header: 'الحديد (1)', width: 20 }, { header: 'الحديد (2)', width: 20 }, { header: 'الخرسانة العادية', width: 18 }], rows: r2 },
    ]);
  }
  function exportPng() {
    if (!src) return; const W = cv.width, H = cv.height; cv.toBlob(b => download(b, `${src.name || 'layout'}-columns.png`), 'image/png');
  }

  setMode('auto'); setCode(code); setTimeout(fit, 50);
}
