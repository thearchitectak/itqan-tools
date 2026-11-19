// تركيب طبقات العيوب فوق خرائط الخامة (للمعاينة على كرة العرض).
// لأن كل طبقة لها مقياس مستقل (tile)، يُبنى «مربع أكبر» يضم superN×superN تكرارًا للخامة حتى تتكرر الطبقات والخامة معًا بلا فواصل.

const tick = () => new Promise(r => setTimeout(r, 0));
function pixels(cv, maxS) {
  let c = cv;
  if (maxS && cv.width > maxS) { c = document.createElement('canvas'); c.width = c.height = maxS; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cv, 0, 0, maxS, maxS); }
  return { d: c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
}
const samp = (P, u, v) => { const x = Math.floor(u * P.w) % P.w, y = Math.floor(v * P.h) % P.h; return (y * P.w + x) * 4; };

// maps: { basecolor, roughness, normal } (لوحات)، layers: { id: {canvas} }، settings: [{ id, amount, tile, color, colorAmt, rough, signed, bump }]
export async function compose(maps, layers, settings, { size = 1024 } = {}) {
  const act = settings.filter(s => layers[s.id] && s.amount > 0);
  const minTile = Math.min(1, ...act.map(s => s.tile));
  const superN = Math.max(1, Math.min(4, Math.round(1 / minTile)));
  const S = Math.min(2048, size * superN), N = S * S;
  const B = pixels(maps.basecolor, 1024), R = pixels(maps.roughness, 1024), Nn = pixels(maps.normal, 1024);
  const L = act.map(s => ({ s, P: pixels(layers[s.id].canvas, 1024) }));
  const base = new ImageData(S, S), rough = new ImageData(S, S), bumpH = new Float32Array(N);
  const bd = base.data, rd = rough.data;
  for (let y = 0; y < S; y++) {
    if (!(y % 256)) await tick();
    const vm = (y / S * superN) % 1;
    for (let x = 0; x < S; x++) {
      const um = (x / S * superN) % 1, i = (y * S + x) * 4;
      const bi = samp(B, um, vm); let r = B.d[bi], g = B.d[bi + 1], b = B.d[bi + 2];
      let ro = R.d[samp(R, um, vm)] / 255, hb = 0;
      for (const { s, P } of L) {
        const u = (x / S * superN * s.tile) % 1, v = (y / S * superN * s.tile) % 1;
        const m = P.d[samp(P, u, v)] / 255 * s.amount;
        if (s.color && s.colorAmt) { const a = Math.min(1, m * s.colorAmt * 1.6); r += (s.color[0] - r) * a; g += (s.color[1] - g) * a; b += (s.color[2] - b) * a; }
        if (s.rough) { if (s.signed) ro += (P.d[samp(P, u, v)] / 255 - 0.5) * 2 * s.rough * s.amount; else ro += (1 - ro) * Math.min(1, m * s.rough * 1.8); }
        if (s.bump) hb += m * s.bump;
      }
      bd[i] = r; bd[i + 1] = g; bd[i + 2] = b; bd[i + 3] = 255;
      const rv = Math.max(0.02, Math.min(1, ro)) * 255; rd[i] = rd[i + 1] = rd[i + 2] = rv; rd[i + 3] = 255;
      bumpH[y * S + x] = hb;
    }
  }
  // Normal: خريطة الخامة + انحدار بروز الطبقات (بصيغة DirectX كما في maps.js)
  const nrm = new ImageData(S, S), nd = nrm.data, k = 2.2 * S / 1024 / superN;
  for (let y = 0; y < S; y++) {
    if (!(y % 256)) await tick();
    const vm = (y / S * superN) % 1;
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4, ni = samp(Nn, (x / S * superN) % 1, vm);
      let nx = Nn.d[ni] / 127.5 - 1, ny = Nn.d[ni + 1] / 127.5 - 1, nz = Nn.d[ni + 2] / 127.5 - 1;
      const g = (xx, yy) => bumpH[((yy + S) % S) * S + ((xx + S) % S)];
      const dx = g(x + 1, y) - g(x - 1, y), dy = g(x, y + 1) - g(x, y - 1);
      nx += -dx * k; ny += dy * k; const l = Math.hypot(nx, ny, nz) || 1;
      nd[i] = (nx / l * 0.5 + 0.5) * 255; nd[i + 1] = (ny / l * 0.5 + 0.5) * 255; nd[i + 2] = (nz / l * 0.5 + 0.5) * 255; nd[i + 3] = 255;
    }
  }
  const cv = (im) => { const c = document.createElement('canvas'); c.width = c.height = S; c.getContext('2d').putImageData(im, 0, 0); return c; };
  return { basecolor: cv(base), roughness: cv(rough), normal: cv(nrm), superN };
}
