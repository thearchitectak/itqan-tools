// عامل خلفي يشغّل محرك التصحيح دون تجميد الصفحة
importScripts('/assets/js/omr/engine.js');
self.onmessage = e => {
  const d = e.data;
  try {
    const r = self.OMR.gradeSheet(new Uint8ClampedArray(d.buf), d.w, d.h, d.opts, d.rtl, d.expect);
    delete r.img;
    self.postMessage({ id: d.id, ok: true, res: r });
  } catch (err) { self.postMessage({ id: d.id, ok: false, err: String((err && err.message) || err) }); }
};
