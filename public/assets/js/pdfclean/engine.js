// محرك إزالة العلامات المائية والعناصر المكررة من ملفات PDF.
// يحلّل محتوى الصفحات (Content streams) إلى أوامر، ويعدّل الأوامر المستهدفة فقط،
// ويعيد بناء المحتوى من البايتات الأصلية حتى لا يتأثر أي شيء آخر في الصفحة.
// يعمل في المتصفح وفي Node (يُمرَّر كائن PDFLib).

/* ======================= القارئ (Tokenizer) ======================= */
const WS = new Set([0, 9, 10, 12, 13, 32]);
const DELIM = new Set([40, 41, 60, 62, 91, 93, 123, 125, 47, 37]); // ( ) < > [ ] { } / %
const isWS = (c) => WS.has(c), isDelim = (c) => DELIM.has(c);
const dec = new TextDecoder('latin1');

// يعيد قائمة أوامر: { op, args: [token], start, end } — start بداية أول معامل، end نهاية الأمر
export function parseOps(b) {
  const ops = []; let args = [], argStart = -1, i = 0; const n = b.length; let depth = 0;
  const push = (t) => { if (argStart < 0) argStart = t.s; args.push(t); };
  while (i < n) {
    const c = b[i];
    if (isWS(c)) { i++; continue; }
    if (c === 37) { while (i < n && b[i] !== 10 && b[i] !== 13) i++; continue; } // تعليق
    const s = i;
    if (c === 40) { // نص حرفي (…)
      let lvl = 1; i++; const out = [];
      while (i < n && lvl > 0) {
        const ch = b[i];
        if (ch === 92) { const nx = b[i + 1]; const map = { 110: 10, 114: 13, 116: 9, 98: 8, 102: 12, 40: 40, 41: 41, 92: 92 };
          if (nx in map) { out.push(map[nx]); i += 2; continue; }
          if (nx >= 48 && nx <= 55) { let v = 0, k = 0; i++; while (k < 3 && b[i] >= 48 && b[i] <= 55) { v = v * 8 + b[i] - 48; i++; k++; } out.push(v & 255); continue; }
          if (nx === 13 || nx === 10) { i += 2; if (nx === 13 && b[i] === 10) i++; continue; }
          i++; continue; }
        if (ch === 40) lvl++; else if (ch === 41) { lvl--; if (!lvl) { i++; break; } }
        out.push(ch); i++;
      }
      push({ t: 'str', v: Uint8Array.from(out), s, e: i }); continue;
    }
    if (c === 60 && b[i + 1] === 60) { push({ t: 'dict<', s, e: i + 2 }); depth++; i += 2; continue; }
    if (c === 62 && b[i + 1] === 62) { push({ t: 'dict>', s, e: i + 2 }); depth--; i += 2; continue; }
    if (c === 60) { // نص سداسي <…>
      i++; let hx = ''; while (i < n && b[i] !== 62) { if (!isWS(b[i])) hx += String.fromCharCode(b[i]); i++; } i++;
      if (hx.length % 2) hx += '0'; const v = new Uint8Array(hx.length / 2); for (let k = 0; k < v.length; k++) v[k] = parseInt(hx.substr(k * 2, 2), 16) || 0;
      push({ t: 'str', v, s, e: i }); continue;
    }
    if (c === 91) { push({ t: '[', s, e: i + 1 }); depth++; i++; continue; }
    if (c === 93) { push({ t: ']', s, e: i + 1 }); depth--; i++; continue; }
    if (c === 47) { i++; while (i < n && !isWS(b[i]) && !isDelim(b[i])) i++; push({ t: 'name', v: dec.decode(b.subarray(s + 1, i)), s, e: i }); continue; }
    if (c === 123 || c === 125) { i++; continue; }
    // رقم أو كلمة (أمر أو true/false/null)
    while (i < n && !isWS(b[i]) && !isDelim(b[i])) i++;
    if (i === s) { i++; continue; }
    const w = dec.decode(b.subarray(s, i));
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(w)) { push({ t: 'num', v: parseFloat(w), s, e: i }); continue; }
    if (w === 'true' || w === 'false' || w === 'null') { push({ t: 'kw', v: w, s, e: i }); continue; }
    if (depth > 0) { push({ t: 'kw', v: w, s, e: i }); continue; }
    if (w === 'BI') { // صورة مضمّنة: تُتجاوز حتى EI
      let j = i;
      while (j < n - 1) { if (b[j] === 73 && b[j + 1] === 68 && isWS(b[j - 1] ?? 32) && isWS(b[j + 2] ?? 32)) break; j++; }
      j += 3;
      while (j < n - 1) { if (b[j] === 69 && b[j + 1] === 73 && isWS(b[j - 1]) && (j + 2 >= n || isWS(b[j + 2]) || isDelim(b[j + 2]))) break; j++; }
      i = Math.min(n, j + 2);
      ops.push({ op: 'BI', args: [], start: argStart >= 0 ? argStart : s, end: i }); args = []; argStart = -1; continue;
    }
    ops.push({ op: w, args, start: argStart >= 0 ? argStart : s, end: i }); args = []; argStart = -1;
  }
  return ops;
}

/* ======================= تتبّع المواضع ======================= */
const mul = (m, n) => [m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3], m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3], m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5]];
const nums = (a) => a.filter(t => t.t === 'num').map(t => t.v);
const TEXT_SHOW = new Set(['Tj', 'TJ', "'", '"']);

// يمر على الأوامر ويحسب لكل أمر عرض نص موضع بدايته في إحداثيات الصفحة، وحالة Tr الحالية،
// ولكل Do اسم الكائن ومصفوفة التحويل، ولكل BDC/BMC المقطع الكامل حتى EMC المطابق
export function walk(ops) {
  let ctm = [1, 0, 0, 1, 0, 0], tm = [1, 0, 0, 1, 0, 0], tlm = [1, 0, 0, 1, 0, 0], TL = 0, Tr = 0, Ts = 0;
  const stack = [], marks = [], open = [];
  ops.forEach((o, idx) => {
    const a = nums(o.args);
    switch (o.op) {
      case 'q': stack.push({ ctm, Tr, TL, Ts }); break;
      case 'Q': { const s = stack.pop(); if (s) ({ ctm, Tr, TL, Ts } = s); break; }
      case 'cm': if (a.length === 6) ctm = mul(a, ctm); break;
      case 'BT': tm = [1, 0, 0, 1, 0, 0]; tlm = [1, 0, 0, 1, 0, 0]; break;
      case 'Tm': if (a.length === 6) { tm = a.slice(); tlm = a.slice(); } break;
      case 'Td': if (a.length === 2) { tlm = mul([1, 0, 0, 1, a[0], a[1]], tlm); tm = tlm.slice(); } break;
      case 'TD': if (a.length === 2) { TL = -a[1]; tlm = mul([1, 0, 0, 1, a[0], a[1]], tlm); tm = tlm.slice(); } break;
      case 'T*': tlm = mul([1, 0, 0, 1, 0, -TL], tlm); tm = tlm.slice(); break;
      case 'TL': if (a.length) TL = a[0]; break;
      case 'Tr': if (a.length) Tr = a[0]; break;
      case 'Ts': if (a.length) Ts = a[0]; break;
      case "'": case '"': tlm = mul([1, 0, 0, 1, 0, -TL], tlm); tm = tlm.slice(); break;
      case 'BDC': case 'BMC': open.push({ idx, start: o.start, args: o.args }); break;
      case 'EMC': { const m = open.pop(); if (m) marks.push({ ...m, end: o.end, endIdx: idx }); break; }
    }
    if (TEXT_SHOW.has(o.op)) { const m = mul(mul([1, 0, 0, 1, 0, Ts], tm), ctm); o.pos = [m[4], m[5]]; o.Tr = Tr; }
    if (o.op === 'Do') { o.xname = o.args.find(t => t.t === 'name')?.v; o.ctm = ctm.slice(); }
  });
  return { marks };
}

/* ======================= أدوات pdf-lib ======================= */
function contentBytes(P, doc, page) {
  const { PDFArray, PDFRawStream, decodePDFRawStream, PDFName } = P;
  const c = page.node.get(PDFName.of('Contents')); if (!c) return new Uint8Array();
  const refs = c instanceof PDFArray ? c.asArray() : [c];
  const parts = [];
  for (const r of refs) {
    const s = doc.context.lookup(r);
    if (!s) continue;
    let bytes;
    if (s instanceof PDFRawStream) bytes = decodePDFRawStream(s).decode();
    else if (typeof s.getContentsString === 'function') bytes = new TextEncoder().encode(s.getContentsString());
    else if (typeof s.getContents === 'function') bytes = s.getContents();
    else continue;
    parts.push(bytes, new Uint8Array([10]));
  }
  const len = parts.reduce((a, p) => a + p.length, 0), out = new Uint8Array(len); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
function setContent(P, doc, page, bytes) {
  const s = doc.context.flateStream(bytes);
  page.node.set(P.PDFName.of('Contents'), doc.context.register(s));
}
// تطبيق تعديلات: [{ start, end, text }] — تُستبدل المقاطع بالنص (فارغ = حذف)
function applyEdits(bytes, edits) {
  edits.sort((a, b) => a.start - b.start);
  const enc = new TextEncoder(), out = []; let pos = 0;
  for (const e of edits) { if (e.start < pos) continue; out.push(bytes.subarray(pos, e.start), enc.encode(e.text ?? ' ')); pos = e.end; }
  out.push(bytes.subarray(pos));
  const len = out.reduce((a, p) => a + p.length, 0), r = new Uint8Array(len); let o = 0; for (const p of out) { r.set(p, o); o += p.length; }
  return r;
}
function xobjects(P, doc, page) {
  const { PDFName, PDFDict } = P;
  let res = page.node.Resources ? page.node.Resources() : null;
  if (!res) return {};
  res = doc.context.lookup(res) || res;
  const xo = res.get(PDFName.of('XObject')); const d = xo ? doc.context.lookup(xo) : null;
  const out = {};
  if (d instanceof PDFDict) for (const [k, v] of d.entries()) out[k.asString().slice(1)] = v;
  return out;
}
const isWatermarkMark = (P, doc, page, m) => {
  const a = m.args;
  if (!a.length || a[0].t !== 'name' || a[0].v !== 'Artifact') return false;
  // خصائص مضمّنة: << /Subtype /Watermark >>
  for (let i = 0; i < a.length - 1; i++) if (a[i].t === 'name' && a[i].v === 'Subtype' && a[i + 1].t === 'name' && /watermark/i.test(a[i + 1].v)) return true;
  // أو اسم خاصية في Resources/Properties
  const pn = a.find((t, i) => i > 0 && t.t === 'name');
  if (pn) {
    try {
      const res = doc.context.lookup(page.node.Resources()); const props = res && doc.context.lookup(res.get(P.PDFName.of('Properties')));
      const pd = props && doc.context.lookup(props.get(P.PDFName.of(pn.v)));
      const st = pd && pd.get(P.PDFName.of('Subtype'));
      if (st && /watermark/i.test(st.asString())) return true;
    } catch { }
  }
  return false;
};

/* ======================= التحليل ======================= */
// textByPage: (اختياري) نتائج pdf.js لكل صفحة: [{ str, transform, width, height }]
export async function analyze(P, bytes, textByPage) {
  const doc = await P.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages(), N = pages.length;
  const res = { pages: N, acrobat: 0, annots: {}, xobj: [], text: [], textChars: 0, imagePages: 0 };
  const xCount = new Map();
  pages.forEach((page, pi) => {
    const b = contentBytes(P, doc, page), ops = parseOps(b), { marks } = walk(ops);
    if (marks.some(m => isWatermarkMark(P, doc, page, m))) res.acrobat++;
    // التعليقات
    const an = page.node.get(P.PDFName.of('Annots')); const arr = an ? doc.context.lookup(an) : null;
    if (arr?.asArray) for (const r of arr.asArray()) { const d = doc.context.lookup(r); const st = d?.get?.(P.PDFName.of('Subtype'))?.asString?.().slice(1); if (st && !['Link', 'Widget', 'Popup'].includes(st)) res.annots[st] = (res.annots[st] || 0) + 1; }
    // الكائنات المرسومة (صور ونماذج)
    const xo = xobjects(P, doc, page); const seen = new Set();
    let bigImage = false;
    for (const o of ops) if (o.op === 'Do' && o.xname && xo[o.xname]) {
      const ref = xo[o.xname], key = ref.toString();
      const obj = doc.context.lookup(ref); const dict = obj?.dict || obj;
      const sub = dict?.get?.(P.PDFName.of('Subtype'))?.asString?.().slice(1) || '';
      const w = dict?.get?.(P.PDFName.of('Width'))?.asNumber?.() || 0, hh = dict?.get?.(P.PDFName.of('Height'))?.asNumber?.() || 0;
      const sig = sub === 'Image' ? `img:${w}x${hh}:${obj?.contents?.length || 0}` : `form:${key}`;
      const area = Math.abs(o.ctm[0] * o.ctm[3] - o.ctm[1] * o.ctm[2]);
      const pv = page.getSize(); if (sub === 'Image' && area > pv.width * pv.height * 0.6) bigImage = true;
      if (seen.has(sig)) continue; seen.add(sig);
      const e = xCount.get(sig) || { sig, kind: sub, w, h: hh, pages: [], ref: key, preview: null, area: 0 };
      e.pages.push(pi); e.area = Math.max(e.area, area);
      if (!e.preview && sub === 'Image') { const f = dict.get(P.PDFName.of('Filter')); if (f && /DCTDecode/.test(f.toString()) && obj.contents) e.preview = obj.contents; }
      xCount.set(sig, e);
    }
    if (bigImage) res.imagePages++;
  });
  const minP = Math.max(2, Math.ceil(N * 0.6));
  res.xobj = [...xCount.values()].filter(e => N >= 2 && e.pages.length >= minP).map(e => ({ ...e, count: e.pages.length }));
  // النصوص المكررة (من pdf.js)
  if (textByPage) {
    const groups = new Map();
    textByPage.forEach((items, pi) => {
      const seen = new Set();
      for (const it of items) {
        const s = (it.str || '').trim(); res.textChars += s.length; if (s.length < 2) continue;
        const t = it.transform, key = s + '|' + Math.round(t[4] / 6) + '|' + Math.round(t[5] / 6);
        if (seen.has(key)) continue; seen.add(key);
        const g = groups.get(key) || { key, str: s, pages: [], items: [] }; g.pages.push(pi); g.items.push(it); groups.set(key, g);
      }
    });
    res.text = [...groups.values()].filter(g => N >= 2 && g.pages.length >= minP).map(g => ({ key: g.key, str: g.str, count: g.pages.length, rotated: Math.abs(g.items[0].transform[1]) > 0.01 })).sort((a, b) => b.count - a.count || b.str.length - a.str.length).slice(0, 40);
    res.textByPage = textByPage;
  }
  res.scanned = res.imagePages >= Math.ceil(N * 0.6) && res.textChars < N * 20;
  return res;
}

/* ======================= التنظيف ======================= */
// opts: { acrobat, annots: [Subtype], xobj: [sig], text: [key], regions: [{ x, y, w, h, color: [r,g,b], hideText }], pages: Set|null, textByPage }
export async function clean(P, bytes, opts) {
  const doc = await P.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const textKeys = new Set(opts.text || []), xsigs = new Set(opts.xobj || []), annSet = new Set(opts.annots || []);
  const stats = { acrobat: 0, annots: 0, xobj: 0, text: 0, regions: 0, hiddenUnderRegion: 0 };
  pages.forEach((page, pi) => {
    if (opts.pages && !opts.pages.has(pi)) return;
    const b = contentBytes(P, doc, page), ops = parseOps(b), { marks } = walk(ops);
    const edits = [];
    // 1) علامات Acrobat
    if (opts.acrobat) for (const m of marks) if (isWatermarkMark(P, doc, page, m)) { edits.push({ start: m.start, end: m.end, text: ' ' }); stats.acrobat++; }
    // 2) الصور والنماذج المكررة
    if (xsigs.size) {
      const xo = xobjects(P, doc, page);
      for (const o of ops) if (o.op === 'Do' && o.xname && xo[o.xname]) {
        const ref = xo[o.xname], obj = doc.context.lookup(ref), dict = obj?.dict || obj;
        const sub = dict?.get?.(P.PDFName.of('Subtype'))?.asString?.().slice(1) || '';
        const w = dict?.get?.(P.PDFName.of('Width'))?.asNumber?.() || 0, hh = dict?.get?.(P.PDFName.of('Height'))?.asNumber?.() || 0;
        const sig = sub === 'Image' ? `img:${w}x${hh}:${obj?.contents?.length || 0}` : `form:${ref.toString()}`;
        if (xsigs.has(sig)) { edits.push({ start: o.start, end: o.end, text: ' ' }); stats.xobj++; }
      }
    }
    // 3) النصوص المكررة، و 4) النص تحت المناطق المغطاة: يُجعل غير مرئي (Tr 3) مع الحفاظ على مواضع ما بعده
    const targets = [];
    if (textKeys.size && opts.textByPage?.[pi]) for (const it of opts.textByPage[pi]) {
      const s = (it.str || '').trim(), t = it.transform; if (!textKeys.has(s + '|' + Math.round(t[4] / 6) + '|' + Math.round(t[5] / 6))) continue;
      const len = Math.hypot(t[0], t[1]) || 1, ux = t[0] / len, uy = t[1] / len, vx = -uy, vy = ux;
      targets.push({ ox: t[4], oy: t[5], ux, uy, vx, vy, w: it.width || len * s.length * 0.5, h: it.height || Math.hypot(t[2], t[3]) || 10 });
    }
    const regs = (opts.regions || []).filter(r => r.hideText);
    // حذف آمن: يُحذف أمر النص نهائيًا إذا لم يأتِ بعده نص يعتمد على موضع نهايته (أي قبل أمر تموضع أو ET)
    const safeDelete = (k) => { for (let j = k + 1; j < ops.length; j++) { const op = ops[j].op; if (op === 'ET' || op === 'Td' || op === 'TD' || op === 'T*' || op === 'Tm' || op === "'" || op === '"') return true; if (TEXT_SHOW.has(op)) return false; } return true; };
    if (targets.length || regs.length) for (let k = 0; k < ops.length; k++) { const o = ops[k]; if (!o.pos) continue;
      const [px, py] = o.pos;
      let hit = targets.some(T => { const dx = px - T.ox, dy = py - T.oy; const al = dx * T.ux + dy * T.uy, ac = dx * T.vx + dy * T.vy; return al >= -3 && al <= T.w + 3 && ac >= -T.h * 0.45 && ac <= T.h; });
      let reg = false; if (!hit) reg = regs.some(r => px >= r.x - 1 && px <= r.x + r.w + 1 && py >= r.y - 1 && py <= r.y + r.h + 1);
      if (hit || reg) {
        if ((o.op === 'Tj' || o.op === 'TJ') && safeDelete(k)) edits.push({ start: o.start, end: o.end, text: ' ' });
        else { const src = new TextDecoder('latin1').decode(b.subarray(o.start, o.end)); edits.push({ start: o.start, end: o.end, text: ` 3 Tr ${src} ${o.Tr} Tr ` }); }
        hit ? stats.text++ : stats.hiddenUnderRegion++;
      }
    }
    if (edits.length) setContent(P, doc, page, applyEdits(b, edits));
    // 5) التعليقات
    if (annSet.size) {
      const key = P.PDFName.of('Annots'), an = page.node.get(key), arr = an ? doc.context.lookup(an) : null;
      if (arr?.asArray) {
        const keep = arr.asArray().filter(r => { const st = doc.context.lookup(r)?.get?.(P.PDFName.of('Subtype'))?.asString?.().slice(1); const rm = st && annSet.has(st); if (rm) stats.annots++; return !rm; });
        page.node.set(key, doc.context.obj(keep));
      }
    }
    // 6) تغطية المناطق
    for (const r of opts.regions || []) { page.drawRectangle({ x: r.x, y: r.y, width: r.w, height: r.h, color: P.rgb(r.color[0], r.color[1], r.color[2]), borderWidth: 0 }); stats.regions++; }
  });
  return { bytes: await doc.save({ useObjectStreams: true }), stats };
}
