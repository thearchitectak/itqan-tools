// طبقة «العناصر» مثل Edit All في Foxit: التعرّف على كل عنصر في الصفحة وحدوده (بما فيها العناصر
// الموجودة داخل العناصر المركّبة)، ثم حذفه أو تحريكه أو تغيير حجمه، وتطبيق ذلك على العنصر نفسه
// في كل الصفحات التي يتكرر فيها.
import { parseOps, mul, contentBytes, setContent, applyEdits, xobjects, walk } from './engine.js';

const nums = (a) => a.filter(t => t.t === 'num').map(t => t.v);
const ap = (m, x, y) => [x * m[0] + y * m[2] + m[4], x * m[1] + y * m[3] + m[5]];
export function inv(m) { const d = m[0] * m[3] - m[1] * m[2] || 1e-9; return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d]; }
const bboxOf = (pts) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; };
const unit = (m) => bboxOf([ap(m, 0, 0), ap(m, 1, 0), ap(m, 0, 1), ap(m, 1, 1)]);
const PAINT = new Set(['S', 's', 'f', 'F', 'f*', 'B', 'B*', 'b', 'b*']);
export const TYPE_AR = { image: 'صورة', inline: 'صورة مضمّنة', form: 'عنصر مركّب', path: 'شكل', text: 'نص' };
const latin = new TextDecoder('latin1');

function formXobjects(P, doc, dict) {
  const r = dict?.get?.(P.PDFName.of('Resources')); const res = r && doc.context.lookup(r);
  const x = res?.get?.(P.PDFName.of('XObject')); const d = x && doc.context.lookup(x);
  const o = {}; if (d?.entries) for (const [k, v] of d.entries()) o[k.asString().slice(1)] = v; return o;
}
function streamBytes(P, s) { try { return s instanceof P.PDFRawStream ? P.decodePDFRawStream(s).decode() : (s?.getContents?.() || null); } catch { return null; } }

// يمر على محتوى (صفحة أو عنصر مركّب) ويجمع العناصر. host = مرجع العنصر المركّب إن كان المحتوى داخله
function scan(P, doc, b, xo, ctm0, host, out, depth, hosts) {
  const ops = parseOps(b);
  let ctm = ctm0.slice(); const st = [];
  let pStart = -1, pts = [], clip = false;
  for (const o of ops) {
    const a = nums(o.args);
    switch (o.op) {
      case 'q': st.push(ctm); break;
      case 'Q': ctm = st.pop() || ctm; break;
      case 'cm': if (a.length === 6) ctm = mul(a, ctm); break;
      case 'm': case 'l': if (pStart < 0) pStart = o.start; pts.push(ap(ctm, a[0], a[1])); break;
      case 'c': if (pStart < 0) pStart = o.start; for (let k = 0; k < 6; k += 2) pts.push(ap(ctm, a[k], a[k + 1])); break;
      case 'v': case 'y': if (pStart < 0) pStart = o.start; for (let k = 0; k < 4; k += 2) pts.push(ap(ctm, a[k], a[k + 1])); break;
      case 're': if (pStart < 0) pStart = o.start; { const [x, y, w, hh] = a; pts.push(ap(ctm, x, y), ap(ctm, x + w, y), ap(ctm, x, y + hh), ap(ctm, x + w, y + hh)); } break;
      case 'W': case 'W*': clip = true; break;
      case 'n': pStart = -1; pts = []; clip = false; break;
      case 'Do': {
        const name = o.args.find(t => t.t === 'name')?.v, ref = name && xo[name]; if (!ref) break;
        const obj = doc.context.lookup(ref), dict = obj?.dict || obj; const g = (k) => dict?.get?.(P.PDFName.of(k));
        const sub = g('Subtype')?.asString?.().slice(1) || '';
        if (sub === 'Image') {
          const w = g('Width')?.asNumber?.() || 0, hh = g('Height')?.asNumber?.() || 0;
          out.push({ type: 'image', sig: `img:${w}x${hh}:${obj?.contents?.length || 0}`, bbox: unit(ctm), start: o.start, end: o.end, ctm: ctm.slice(), host });
        } else if (sub === 'Form') {
          const bb = g('BBox')?.asArray?.().map(x => x.asNumber?.() ?? 0) || [0, 0, 1, 1];
          const fm = g('Matrix')?.asArray?.().map(x => x.asNumber?.() ?? 0) || [1, 0, 0, 1, 0, 0];
          const M = mul(fm, ctm);
          out.push({ type: 'form', sig: `form:${Math.round(bb[2] - bb[0])}x${Math.round(bb[3] - bb[1])}:${obj?.contents?.length || 0}`, bbox: bboxOf([ap(M, bb[0], bb[1]), ap(M, bb[2], bb[1]), ap(M, bb[0], bb[3]), ap(M, bb[2], bb[3])]), start: o.start, end: o.end, ctm: ctm.slice(), host });
          // العناصر داخل العنصر المركّب: صور وأشكال يمكن تحديدها منفردة
          if (depth < 2) { const fb = streamBytes(P, obj); if (fb) { const fops = scan(P, doc, fb, formXobjects(P, doc, dict), M, ref, out, depth + 1, hosts); hosts?.push({ ref, ops: fops, b: fb, ctm0: M }); } }
        }
        break;
      }
      case 'BI': out.push({ type: 'inline', sig: `bi:${o.end - o.start}`, bbox: unit(ctm), start: o.start, end: o.end, ctm: ctm.slice(), host }); break;
    }
    if (PAINT.has(o.op)) {
      if (pStart >= 0 && pts.length && !clip) out.push({ type: 'path', sig: `path:${pts.length}:${o.op}`, bbox: bboxOf(pts), start: pStart, end: o.end, ctm: ctm.slice(), host });
      pStart = -1; pts = []; clip = false;
    }
  }
  return ops;
}

// كل عناصر الصفحة: { type, sig, bbox:[x0,y0,x1,y1], start, end, ctm, host }
export function pageObjects(P, doc, page, textItems) {
  const b = contentBytes(P, doc, page), out = [], hosts = [];
  const ops = scan(P, doc, b, xobjects(P, doc, page), [1, 0, 0, 1, 0, 0], null, out, 0, hosts);
  // النصوص من pdf.js (حدود دقيقة)، ويُحذف أمرها المطابق عند التطبيق
  for (const it of textItems || []) {
    const s = (it.str || '').trim(); if (!s) continue; const t = it.transform;
    const len = Math.hypot(t[0], t[1]) || 1, ux = t[0] / len, uy = t[1] / len, hgt = it.height || len, w = it.width || 0;
    const c = [[t[4], t[5]], [t[4] + ux * w, t[5] + uy * w], [t[4] - uy * hgt, t[5] + ux * hgt], [t[4] + ux * w - uy * hgt, t[5] + uy * w + ux * hgt]];
    out.push({ type: 'text', sig: 'text:' + s, str: s, bbox: bboxOf(c), item: it });
  }
  out.forEach((o, i) => o.id = i);
  return { b, ops, objects: out, hosts };
}

// هل العنصر o هو نفس العنصر النموذجي p (في صفحة أخرى)؟
export function same(p, o, tol = 4) {
  if (p.type !== o.type || p.sig !== o.sig) return false;
  for (let k = 0; k < 4; k++) if (Math.abs(p.bbox[k] - o.bbox[k]) > tol) return false;
  return true;
}

// تطبيق التعديلات: edits = [{ proto, scope: 'all'|'page', page, del, G }] على الملف الأصلي
export async function applyObjectEdits(P, bytes, edits, textByPage) {
  const doc = await P.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages(); let count = 0; const touched = new Set(); const formEdits = new Map();
  pages.forEach((page, pi) => {
    const rel = edits.filter(e => e.scope === 'all' || e.page === pi); if (!rel.length) return;
    const { b, ops, objects, hosts } = pageObjects(P, doc, page, textByPage?.[pi]);
    walk(ops); hosts.forEach(hh => walk(hh.ops, hh.ctm0));
    const textSrcs = [{ ops, b, host: null }, ...hosts.map(hh => ({ ops: hh.ops, b: hh.b, host: hh.ref }))];
    const ed = [];
    for (const o of objects) {
      const e = rel.find(x => same(x.proto, o)); if (!e || (!e.del && !e.G)) continue;
      if (o.type === 'text') {
        if (!e.del) continue;
        const T = o.item.transform, len = Math.hypot(T[0], T[1]) || 1, ux = T[0] / len, uy = T[1] / len, w = o.item.width || 0, hh = o.item.height || len;
        for (const src of textSrcs) src.ops.forEach((op, k) => {
          if (!op.pos) return;
          const dx = op.pos[0] - T[4], dy = op.pos[1] - T[5], al = dx * ux + dy * uy, ac = -dx * uy + dy * ux;
          if (!(al >= -2 && al <= w + 2 && ac >= -hh * 0.45 && ac <= hh)) return;
          // حذف نهائي إن لم يعتمد ما بعده على موضع نهايته، وإلا يُجعل غير مرئي
          let safe = true; for (let j = k + 1; j < src.ops.length; j++) { const n = src.ops[j].op; if (['ET', 'Td', 'TD', 'T*', 'Tm', "'", '"'].includes(n)) break; if (n === 'Tj' || n === 'TJ') { safe = false; break; } }
          const edit = { start: op.start, end: op.end, text: safe && (op.op === 'Tj' || op.op === 'TJ') ? ' ' : ` 3 Tr ${latin.decode(src.b.subarray(op.start, op.end))} ${op.Tr} Tr ` };
          if (!src.host) ed.push(edit);
          else { const key = src.host.toString(); if (!formEdits.has(key)) formEdits.set(key, { ref: src.host, list: [], src: src.b }); const fe = formEdits.get(key); if (!fe.list.some(x => x.start === op.start)) fe.list.push(edit); }
          count++;
        });
        continue;
      }
      // العنصر داخل عنصر مركّب: يُعدَّل محتوى العنصر المركّب (مرة واحدة حتى لو تكرر في عدة صفحات)
      let list = ed, src = b;
      if (o.host) {
        const key = o.host.toString();
        if (!formEdits.has(key)) formEdits.set(key, { ref: o.host, list: [], src: streamBytes(P, doc.context.lookup(o.host)) });
        const fe = formEdits.get(key); if (!fe.src || fe.list.some(x => x.start === o.start)) continue;
        list = fe.list; src = fe.src;
      }
      if (e.del) { list.push({ start: o.start, end: o.end, text: ' ' }); count++; continue; }
      const M = mul(mul(o.ctm, e.G), inv(o.ctm)); // تحويل في فضاء الصفحة مطبّق داخل سياق العنصر
      list.push({ start: o.start, end: o.end, text: ` q ${M.map(v => +v.toFixed(5)).join(' ')} cm ${latin.decode(src.subarray(o.start, o.end))} Q ` }); count++;
    }
    if (ed.length) { setContent(P, doc, page, applyEdits(b, ed)); touched.add(pi); }
  });
  for (const { ref, list, src } of formEdits.values()) {
    if (!list.length) continue;
    const obj = doc.context.lookup(ref), ns = doc.context.flateStream(applyEdits(src, list));
    for (const [k, v] of obj.dict.entries()) if (!['/Length', '/Filter', '/DecodeParms'].includes(k.asString())) ns.dict.set(k, v);
    doc.context.assign(ref, ns);
  }
  return { bytes: await doc.save({ useObjectStreams: true }), count, pages: touched.size };
}
