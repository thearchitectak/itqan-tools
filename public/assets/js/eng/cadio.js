// تبادل الملفات مع برامج الرسم: قراءة DXF، وكتابة DXF (R12)، وتوليد AutoLISP وسكريبت Revit
// الإحداثيات داخل الأداة بالمتر ومحور ص للأسفل (مثل الصور)؛ وتُعكس عند التصدير

export const UNIT_M = { 1: 0.0254, 2: 0.3048, 4: 0.001, 5: 0.01, 6: 1, 14: 0.1 }; // رموز $INSUNITS
export const UNIT_NAME = { 0.001: 'مم', 0.01: 'سم', 1: 'م', 0.0254: 'بوصة', 0.3048: 'قدم', 0.1: 'ديسيمتر' };

/* ---------- قراءة DXF ---------- */
export function parseDxf(text) {
  const L = text.split(/\r?\n/); const pairs = [];
  for (let i = 0; i + 1 < L.length; i += 2) pairs.push([parseInt(L[i].trim(), 10), L[i + 1].trim()]);
  let units = 0, section = '', i = 0;
  const segs = [], texts = [], layers = new Map();
  const addSeg = (layer, x1, y1, x2, y2) => { if (![x1, y1, x2, y2].every(Number.isFinite)) return; if (x1 === x2 && y1 === y2) return; segs.push({ layer, x1, y1, x2, y2 }); layers.set(layer, (layers.get(layer) || 0) + 1); };
  while (i < pairs.length) {
    const [c, v] = pairs[i];
    if (c === 0 && v === 'SECTION') { section = pairs[i + 1]?.[1] || ''; i += 2; continue; }
    if (c === 0 && v === 'ENDSEC') { section = ''; i++; continue; }
    if (section === 'HEADER' && c === 9 && v === '$INSUNITS') { units = parseInt(pairs[i + 1]?.[1], 10) || 0; i += 2; continue; }
    if (section === 'ENTITIES' && c === 0) {
      const type = v; const ent = []; i++;
      while (i < pairs.length && pairs[i][0] !== 0) { ent.push(pairs[i]); i++; }
      const g = (code) => { const p = ent.find(e => e[0] === code); return p ? p[1] : undefined; };
      const layer = g(8) || '0';
      if (type === 'LINE') addSeg(layer, +g(10), +g(20), +g(11), +g(21));
      else if (type === 'LWPOLYLINE') {
        const xs = ent.filter(e => e[0] === 10).map(e => +e[1]), ys = ent.filter(e => e[0] === 20).map(e => +e[1]);
        const closed = (parseInt(g(70) || '0', 10) & 1) === 1;
        for (let k = 0; k + 1 < xs.length; k++) addSeg(layer, xs[k], ys[k], xs[k + 1], ys[k + 1]);
        if (closed && xs.length > 2) addSeg(layer, xs[xs.length - 1], ys[ys.length - 1], xs[0], ys[0]);
      } else if (type === 'POLYLINE') {
        const closed = (parseInt(g(70) || '0', 10) & 1) === 1; const pts = [];
        while (i < pairs.length) {
          const [c2, v2] = pairs[i];
          if (c2 === 0 && v2 === 'VERTEX') { i++; let x, y; while (i < pairs.length && pairs[i][0] !== 0) { if (pairs[i][0] === 10) x = +pairs[i][1]; if (pairs[i][0] === 20) y = +pairs[i][1]; i++; } pts.push([x, y]); continue; }
          if (c2 === 0 && v2 === 'SEQEND') { i++; while (i < pairs.length && pairs[i][0] !== 0) i++; break; }
          break;
        }
        for (let k = 0; k + 1 < pts.length; k++) addSeg(layer, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]);
        if (closed && pts.length > 2) addSeg(layer, pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1]);
      } else if (type === 'TEXT' || type === 'MTEXT') {
        const t = g(1); if (t) texts.push({ layer, x: +g(10), y: +g(20), t: t.replace(/\\[A-Za-z][^;]*;|[{}]/g, '').slice(0, 20) });
      }
      continue;
    }
    i++;
  }
  return { units, segs, texts, layers: [...layers].sort((a, b) => b[1] - a[1]) };
}

/* ---------- كتابة DXF R12 ---------- */
// items: { layers: [[name, color, ltype]], polys: [{layer, pts:[[x,y]], closed}], solids: [{layer, pts:4}], texts: [{layer, x, y, h, t}], lines: [{layer,x1,y1,x2,y2}] }
export function writeDxf({ layers, polys = [], solids = [], texts = [], lines = [] }) {
  const o = []; const p = (c, v) => o.push(String(c), String(v));
  const n = (v) => (Math.round(v * 1e6) / 1e6).toString();
  p(0, 'SECTION'); p(2, 'HEADER'); p(9, '$ACADVER'); p(1, 'AC1009'); p(0, 'ENDSEC');
  p(0, 'SECTION'); p(2, 'TABLES');
  p(0, 'TABLE'); p(2, 'LTYPE'); p(70, 2);
  p(0, 'LTYPE'); p(2, 'CONTINUOUS'); p(70, 0); p(3, 'Solid line'); p(72, 65); p(73, 0); p(40, '0.0');
  p(0, 'LTYPE'); p(2, 'DASHED'); p(70, 0); p(3, 'Dashed __ __ __'); p(72, 65); p(73, 2); p(40, '750.0'); p(49, '500.0'); p(49, '-250.0');
  p(0, 'ENDTAB');
  p(0, 'TABLE'); p(2, 'LAYER'); p(70, layers.length + 1);
  p(0, 'LAYER'); p(2, '0'); p(70, 0); p(62, 7); p(6, 'CONTINUOUS');
  for (const [name, color, lt] of layers) { p(0, 'LAYER'); p(2, name); p(70, 0); p(62, color); p(6, lt || 'CONTINUOUS'); }
  p(0, 'ENDTAB');
  p(0, 'TABLE'); p(2, 'STYLE'); p(70, 1); p(0, 'STYLE'); p(2, 'STANDARD'); p(70, 0); p(40, '0.0'); p(41, '1.0'); p(50, '0.0'); p(71, 0); p(42, '2.5'); p(3, 'txt'); p(4, ''); p(0, 'ENDTAB');
  p(0, 'ENDSEC');
  p(0, 'SECTION'); p(2, 'ENTITIES');
  for (const l of lines) { p(0, 'LINE'); p(8, l.layer); p(10, n(l.x1)); p(20, n(l.y1)); p(30, '0.0'); p(11, n(l.x2)); p(21, n(l.y2)); p(31, '0.0'); }
  for (const s of solids) { const [a, b, c, d] = s.pts; p(0, 'SOLID'); p(8, s.layer); p(10, n(a[0])); p(20, n(a[1])); p(30, '0.0'); p(11, n(b[0])); p(21, n(b[1])); p(31, '0.0'); p(12, n(d[0])); p(22, n(d[1])); p(32, '0.0'); p(13, n(c[0])); p(23, n(c[1])); p(33, '0.0'); }
  for (const pl of polys) {
    p(0, 'POLYLINE'); p(8, pl.layer); p(66, 1); p(10, '0.0'); p(20, '0.0'); p(30, '0.0'); p(70, pl.closed ? 1 : 0);
    for (const [x, y] of pl.pts) { p(0, 'VERTEX'); p(8, pl.layer); p(10, n(x)); p(20, n(y)); p(30, '0.0'); }
    p(0, 'SEQEND'); p(8, pl.layer);
  }
  for (const t of texts) { p(0, 'TEXT'); p(8, t.layer); p(10, n(t.x)); p(20, n(t.y)); p(30, '0.0'); p(40, n(t.h)); p(1, String(t.t).replace(/[^\x20-\x7E]/g, '')); p(72, 1); p(11, n(t.x)); p(21, n(t.y)); p(31, '0.0'); p(73, 2); }
  p(0, 'ENDSEC'); p(0, 'EOF');
  return o.join('\n') + '\n';
}

/* ---------- AutoLISP ---------- */
export function writeLisp({ unitName, cols, foots, grid, textH }) {
  const f = (v) => (Math.round(v * 1000) / 1000).toFixed(3);
  const pt = ([x, y]) => `'(${f(x)} ${f(y)} 0.0)`;
  let s = `;;; ITQAN Tools - Columns & footings layout\n;;; Units: ${unitName}. Load with APPLOAD, then type ITQCOLS\n`;
  s += `(defun itq-layer (n c) (if (not (tblsearch "LAYER" n)) (entmake (list '(0 . "LAYER") '(100 . "AcDbSymbolTableRecord") '(100 . "AcDbLayerTableRecord") (cons 2 n) '(70 . 0) (cons 62 c) '(6 . "Continuous")))))\n`;
  s += `(defun itq-pl (lay pts) (entmake (append (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") (cons 8 lay) '(100 . "AcDbPolyline") (cons 90 (length pts)) '(70 . 1)) (mapcar '(lambda (p) (cons 10 p)) pts))))\n`;
  s += `(defun itq-solid (lay a b c d) (entmake (list '(0 . "SOLID") (cons 8 lay) (cons 10 a) (cons 11 b) (cons 12 d) (cons 13 c))))\n`;
  s += `(defun itq-txt (lay p h str) (entmake (list '(0 . "TEXT") (cons 8 lay) (cons 10 p) (cons 11 p) (cons 40 h) (cons 1 str) '(72 . 1) '(73 . 2))))\n`;
  s += `(defun itq-line (lay a b) (entmake (list '(0 . "LINE") (cons 8 lay) (cons 10 a) (cons 11 b))))\n`;
  s += `(defun c:ITQCOLS ( / oldce)\n  (setq oldce (getvar "CMDECHO")) (setvar "CMDECHO" 0)\n  (command "_.UNDO" "_BE")\n`;
  s += `  (itq-layer "ITQ-COLUMNS" 1) (itq-layer "ITQ-COL-TAGS" 2) (itq-layer "ITQ-FOOTINGS" 8) (itq-layer "ITQ-FTG-TAGS" 3) (itq-layer "ITQ-GRID" 9)\n`;
  if (grid) for (const g of grid.lines) s += `  (itq-line "ITQ-GRID" ${pt(g[0])} ${pt(g[1])}) (itq-txt "ITQ-GRID" ${pt(g[2])} ${f(textH * 1.5)} "${g[3]}")\n`;
  for (const ft of foots) s += `  (itq-pl "ITQ-FOOTINGS" (list ${ft.pts.map(pt).join(' ')}))\n`;
  for (const c of cols) { const [a, b, cc, d] = c.pts; s += `  (itq-pl "ITQ-COLUMNS" (list ${c.pts.map(pt).join(' ')})) (itq-solid "ITQ-COLUMNS" ${pt(a)} ${pt(b)} ${pt(cc)} ${pt(d)}) (itq-txt "ITQ-COL-TAGS" ${pt(c.tagAt)} ${f(textH)} "${c.tag}")\n`; if (c.ftag) s += `  (itq-txt "ITQ-FTG-TAGS" ${pt(c.ftagAt)} ${f(textH * 0.8)} "${c.ftag}")\n`; }
  s += `  (command "_.UNDO" "_E") (setvar "CMDECHO" oldce)\n  (princ "\\nITQAN: ${cols.length} columns drawn on layers ITQ-*.") (princ))\n(princ "\\nType ITQCOLS to draw the columns.") (princ)\n`;
  return s;
}

/* ---------- Revit (pyRevit / RevitPythonShell) ---------- */
export function writeRevit({ cols }) {
  const rows = cols.map(c => `    (${c.x.toFixed(1)}, ${c.y.toFixed(1)}, ${Math.round(c.b)}, ${Math.round(c.h)}, ${c.rot}, "${c.tag}"),`).join('\n');
  return `# -*- coding: utf-8 -*-
# ITQAN Tools - place structural columns in Revit
# Run with pyRevit or RevitPythonShell on a COPY of the model first.
# Requirements: a rectangular concrete column family loaded (e.g. "M_Concrete-Rectangular-Column")
# with type parameters named "b" and "h". Coordinates are in mm relative to the project internal origin.
import math
from Autodesk.Revit.DB import (FilteredElementCollector, Level, BuiltInCategory, BuiltInParameter,
                               Transaction, XYZ, Line, ElementTransformUtils)
from Autodesk.Revit.DB.Structure import StructuralType

doc = __revit__.ActiveUIDocument.Document
MM = 1.0 / 304.8
LEVEL_NAME = None          # None = lowest level, or write the level name between quotes
FAMILY_HINT = "Rectangular" # part of the family name to use

# x_mm, y_mm, b_mm, h_mm, rotation_deg, mark
COLS = [
${rows}
]

def sym_name(s):
    p = s.get_Parameter(BuiltInParameter.SYMBOL_NAME_PARAM)
    return p.AsString() if p else ""

levels = sorted(FilteredElementCollector(doc).OfClass(Level).ToElements(), key=lambda l: l.Elevation)
base = levels[0]
if LEVEL_NAME:
    base = [l for l in levels if l.Name == LEVEL_NAME][0]
top = None
for l in levels:
    if l.Elevation > base.Elevation + 0.01:
        top = l
        break

symbols = list(FilteredElementCollector(doc).OfCategory(BuiltInCategory.OST_StructuralColumns).WhereElementIsElementType().ToElements())
cands = [s for s in symbols if FAMILY_HINT.lower() in s.FamilyName.lower()]
if not cands:
    raise Exception("Load a rectangular concrete column family first.")
base_sym = cands[0]

def get_type(b, h):
    name = "ITQ %dx%d" % (b, h)
    for s in symbols:
        if s.FamilyName == base_sym.FamilyName and sym_name(s) == name:
            return s
    t = base_sym.Duplicate(name)
    for pname, val in (("b", b), ("h", h)):
        prm = t.LookupParameter(pname)
        if prm and not prm.IsReadOnly:
            prm.Set(val * MM)
    symbols.append(t)
    return t

t = Transaction(doc, "ITQAN Tools - columns")
t.Start()
count = 0
for x, y, b, h, rot, mark in COLS:
    sym = get_type(b, h)
    if not sym.IsActive:
        sym.Activate()
        doc.Regenerate()
    pt = XYZ(x * MM, y * MM, 0)
    inst = doc.Create.NewFamilyInstance(pt, sym, base, StructuralType.Column)
    if top:
        inst.get_Parameter(BuiltInParameter.FAMILY_TOP_LEVEL_PARAM).Set(top.Id)
    mk = inst.get_Parameter(BuiltInParameter.ALL_MODEL_MARK)
    if mk:
        mk.Set(mark)
    if rot:
        axis = Line.CreateBound(pt, XYZ(pt.X, pt.Y, pt.Z + 1))
        ElementTransformUtils.RotateElement(doc, inst.Id, axis, math.radians(rot))
    count += 1
t.Commit()
print("ITQAN: placed %d columns." % count)
`;
}
