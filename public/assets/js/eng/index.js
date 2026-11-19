// موجّه الأدوات الهندسية: يحمّل كل مجموعة عند الحاجة فقط
const MAP = {
  loads: ['civil2', 'loads'], 'col-design': ['civil2', 'colDesign'], footings: ['civil2', 'footings'], 'col-layout': ['layout', 'colLayout'],
  rebar: ['civil', 'rebar'], concrete: ['civil', 'concrete'], excavation: ['civil', 'excavation'], sizing: ['civil', 'sizing'], pipes: ['civil', 'pipes'],
  boq: ['qty', 'boq'], 'build-cost': ['qty', 'buildCost'],
  stairs: ['arch', 'stairs'], 'ramp-slope': ['arch', 'rampSlope'], openings: ['arch', 'openings'], scale: ['arch', 'scale'], units: ['arch', 'units'],
  'coord-area': ['survey', 'coordArea'], utm: ['survey', 'utm'], leveling: ['survey', 'leveling'],
  'pdf-compare': ['pdf', 'pdfCompare'], 'pdf-measure': ['pdf', 'pdfMeasure'],
};
export const ENG_IDS = Object.keys(MAP);
export async function renderEngTool(id, body) {
  const [file, fn] = MAP[id];
  const m = await import(`./${file}.js`);
  m[fn](body);
}
