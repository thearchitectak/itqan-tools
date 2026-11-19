// مولّد طبقات العيوب الواقعية (Imperfections) — إجرائي على الجهاز، وكل الطبقات متكررة دون فواصل.
// الناتج قناع رمادي: الأبيض = موضع العيب، الأسود = لا عيب.

const tick = () => new Promise(r => setTimeout(r, 0));
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; }; }

// ضوضاء قيمية متكررة (tileable) مع fbm
function valueNoise(R, cells, rnd) {
  const g = new Float32Array(cells * cells); for (let i = 0; i < g.length; i++) g[i] = rnd();
  const out = new Float32Array(R * R), k = cells / R, sm = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < R; y++) { const fy = y * k, y0 = Math.floor(fy), ty = sm(fy - y0), r0 = (y0 % cells) * cells, r1 = ((y0 + 1) % cells) * cells;
    for (let x = 0; x < R; x++) { const fx = x * k, x0 = Math.floor(fx), tx = sm(fx - x0), c0 = x0 % cells, c1 = (x0 + 1) % cells;
      const a = g[r0 + c0] + (g[r0 + c1] - g[r0 + c0]) * tx, b = g[r1 + c0] + (g[r1 + c1] - g[r1 + c0]) * tx; out[y * R + x] = a + (b - a) * ty; } }
  return out;
}
function fbm(R, base, oct, rnd, gain = 0.5) {
  const out = new Float32Array(R * R); let amp = 1, tot = 0, cells = base;
  for (let o = 0; o < oct && cells <= R; o++, cells *= 2, amp *= gain) { const n = valueNoise(R, cells, rnd); for (let i = 0; i < out.length; i++) out[i] += n[i] * amp; tot += amp; }
  for (let i = 0; i < out.length; i++) out[i] /= tot; return out;
}
const norm = (a) => { let mn = Infinity, mx = -Infinity; for (const v of a) { if (v < mn) mn = v; if (v > mx) mx = v; } const d = mx - mn || 1; for (let i = 0; i < a.length; i++) a[i] = (a[i] - mn) / d; return a; };
const curve = (a, lo, hi, gamma = 1) => { for (let i = 0; i < a.length; i++) { let v = (a[i] - lo) / (hi - lo); v = v < 0 ? 0 : v > 1 ? 1 : v; a[i] = gamma === 1 ? v : Math.pow(v, gamma); } return a; };

// رسم على لوحة مع التكرار: كل شكل يُرسم 9 مرات بالإزاحة لضمان التكرار عند الحواف
function tiledCanvas(R, drawFn) {
  const c = document.createElement('canvas'); c.width = c.height = R; const x = c.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#000'; x.fillRect(0, 0, R, R);
  for (const dx of [-R, 0, R]) for (const dy of [-R, 0, R]) { x.save(); x.translate(dx, dy); drawFn(x); x.restore(); }
  const d = x.getImageData(0, 0, R, R).data, out = new Float32Array(R * R); for (let i = 0; i < out.length; i++) out[i] = d[i * 4] / 255; return out;
}
// ملاحظة: الرسم 9 مرات يكرر نفس الأشكال بنفس البذرة، لذلك تُولَّد بيانات الأشكال مرة واحدة خارج drawFn

/* ---------------- الطبقات ---------------- */
// لكل طبقة تأثيرها الافتراضي: color = لون العيب ومقدار مزجه، rough = مقدار زيادة الخشونة (signed = تفاوت حول القيمة)،
// bump = بروز (+) أو غور (−)، tile = عدد مرات تكرار الطبقة لكل تكرار للخامة (أقل من 1 = الطبقة أكبر من الخامة).
export const LAYERS = [
  { id: 'dust', ar: 'غبار', en: 'Dust', use: 'لون + لمعان', def: true, amount: 0.45, tile: 1, color: [208, 202, 192], colorAmt: 0.35, rough: 0.35, bump: 0 },
  { id: 'dirt', ar: 'أوساخ متراكمة (Grime)', en: 'Dirt', use: 'لون + لمعان', def: true, amount: 0.5, tile: 0.5, color: [72, 60, 46], colorAmt: 0.5, rough: 0.25, bump: 0 },
  { id: 'scratches', ar: 'خدوش دقيقة', en: 'Scratches', use: 'لمعان + بروز', def: true, amount: 0.5, tile: 1, color: [235, 235, 235], colorAmt: 0.1, rough: 0.3, bump: -0.5 },
  { id: 'fingerprints', ar: 'بصمات أصابع', en: 'Fingerprints', use: 'لمعان', def: false, amount: 0.6, tile: 1, color: null, colorAmt: 0, rough: 0.35, bump: 0 },
  { id: 'smudges', ar: 'آثار مسح ولطخات', en: 'Smudges', use: 'لمعان', def: false, amount: 0.6, tile: 1, color: null, colorAmt: 0, rough: 0.3, bump: 0 },
  { id: 'cracks', ar: 'تشققات', en: 'Cracks', use: 'لون + بروز', def: false, amount: 0.6, tile: 0.5, color: [38, 32, 27], colorAmt: 0.65, rough: 0.2, bump: -1 },
  { id: 'stains', ar: 'بقع ماء', en: 'WaterStains', use: 'لون + لمعان', def: false, amount: 0.5, tile: 0.5, color: [95, 88, 80], colorAmt: 0.25, rough: 0.15, bump: 0 },
  { id: 'wear', ar: 'تآكل وبهتان (Grunge)', en: 'Grunge', use: 'لون + لمعان', def: false, amount: 0.5, tile: 0.5, color: [200, 195, 185], colorAmt: 0.3, rough: 0.15, bump: 0 },
  { id: 'breakup', ar: 'تفاوت اللمعان (Roughness breakup)', en: 'RoughnessBreakup', use: 'لمعان', def: true, amount: 0.5, tile: 0.5, color: null, colorAmt: 0, rough: 0.25, signed: true, bump: 0 },
];

async function gen(id, R, seed, k) {
  const rnd = rng(seed), s = R / 2048; // s: مقياس الرسم مع الدقة
  switch (id) {
    case 'dust': {
      const base = curve(fbm(R, 8, 6, rnd), 0.45, 0.9, 1.6);
      const specks = []; const n = Math.round(9000 * k); for (let i = 0; i < n; i++) specks.push([rnd() * R, rnd() * R, (0.4 + rnd() * 1.6) * s, 0.25 + rnd() * 0.75]);
      const dots = tiledCanvas(R, (x) => { for (const [px, py, r, a] of specks) { x.fillStyle = `rgba(255,255,255,${a})`; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); } });
      for (let i = 0; i < base.length; i++) base[i] = Math.min(1, base[i] * 0.55 + dots[i] * 0.8);
      return base;
    }
    case 'dirt': {
      const a = fbm(R, 4, 7, rnd, 0.55), b = fbm(R, 16, 5, rnd);
      for (let i = 0; i < a.length; i++) a[i] = a[i] * 0.75 + b[i] * 0.25;
      return curve(norm(a), 0.38 - 0.1 * k, 0.95, 1.4);
    }
    case 'scratches': {
      const lines = []; const n = Math.round(380 * k);
      const dir = rnd() * Math.PI;
      for (let i = 0; i < n; i++) { const ang = rnd() < 0.7 ? dir + (rnd() - 0.5) * 0.5 : rnd() * Math.PI, len = (20 + rnd() * rnd() * 420) * s, x = rnd() * R, y = rnd() * R, bend = (rnd() - 0.5) * len * 0.15;
        lines.push([x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len, bend, (0.3 + rnd() * 1.4) * s, 0.25 + rnd() * 0.75]); }
      return tiledCanvas(R, (x) => { x.lineCap = 'round'; for (const [x0, y0, x1, y1, bd, w, a] of lines) { x.strokeStyle = `rgba(255,255,255,${a})`; x.lineWidth = w; x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo((x0 + x1) / 2 + bd, (y0 + y1) / 2 - bd, x1, y1); x.stroke(); } });
    }
    case 'fingerprints': {
      const prints = []; const n = Math.round(14 * k);
      for (let i = 0; i < n; i++) prints.push({ x: rnd() * R, y: rnd() * R, r: (55 + rnd() * 35) * s, rot: rnd() * Math.PI, sq: 0.62 + rnd() * 0.15, ph: rnd() * 6, a: 0.35 + rnd() * 0.5, w: rnd() });
      return tiledCanvas(R, (x) => {
        for (const p of prints) {
          x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.scale(p.sq, 1);
          const g = x.createRadialGradient(0, 0, 0, 0, 0, p.r); g.addColorStop(0, `rgba(255,255,255,${p.a})`); g.addColorStop(0.75, `rgba(255,255,255,${p.a * 0.6})`); g.addColorStop(1, 'rgba(255,255,255,0)');
          x.strokeStyle = g; x.lineWidth = 1.6 * s;
          for (let rr = 3 * s; rr < p.r; rr += 3.4 * s) { x.beginPath(); for (let t = 0; t <= 6.3; t += 0.08) { const wob = 1 + 0.06 * Math.sin(t * 3 + p.ph + rr * 0.05) + 0.03 * Math.sin(t * 7 + p.w * 9); const px = Math.cos(t) * rr * wob, py = Math.sin(t) * rr * wob * (1 + 0.15 * (py0(t))); t === 0 ? x.moveTo(px, py) : x.lineTo(px, py); } x.stroke(); }
          x.restore();
        }
        function py0(t) { return Math.max(0, Math.sin(t)); }
      });
    }
    case 'smudges': {
      const strokes = []; const n = Math.round(60 * k), dir = rnd() * Math.PI;
      for (let i = 0; i < n; i++) strokes.push([rnd() * R, rnd() * R, (120 + rnd() * 320) * s, (30 + rnd() * 70) * s, dir + (rnd() - 0.5) * 0.9, 0.08 + rnd() * 0.16]);
      const m = tiledCanvas(R, (x) => { x.filter = `blur(${Math.max(4, 16 * s)}px)`; for (const [px, py, l, w, ang, a] of strokes) { x.save(); x.translate(px, py); x.rotate(ang); x.fillStyle = `rgba(255,255,255,${a})`; x.beginPath(); x.ellipse(0, 0, l / 2, w / 2, 0, 0, 7); x.fill(); x.restore(); } });
      const n2 = fbm(R, 32, 3, rnd); for (let i = 0; i < m.length; i++) m[i] *= 0.6 + 0.6 * n2[i];
      return curve(norm(m), 0, 0.85);
    }
    case 'cracks': {
      // فورونوي متكرر: الحواف (F2 − F1 صغيرة) مع تشويه بالضوضاء
      const pts = []; const n = Math.round(26 * k) + 6; for (let i = 0; i < n; i++) pts.push([rnd() * R, rnd() * R]);
      const warp = fbm(R, 8, 4, rnd), warp2 = fbm(R, 8, 4, rnd), out = new Float32Array(R * R), W = 40 * s, th = 2.2 * s;
      const cell = R / Math.sqrt(n), gridN = Math.max(1, Math.floor(R / cell)), buckets = Array.from({ length: gridN * gridN }, () => []);
      pts.forEach(p => buckets[Math.min(gridN - 1, Math.floor(p[1] / R * gridN)) * gridN + Math.min(gridN - 1, Math.floor(p[0] / R * gridN))].push(p));
      for (let y = 0; y < R; y++) { if (!(y % 256)) await tick();
        for (let x = 0; x < R; x++) {
          const i = y * R + x, qx = x + (warp[i] - 0.5) * W, qy = y + (warp2[i] - 0.5) * W; let f1 = 1e18, f2 = 1e18;
          const gx = Math.floor(((qx % R) + R) % R / R * gridN), gy = Math.floor(((qy % R) + R) % R / R * gridN);
          for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) for (const p of buckets[(((gy + a) % gridN) + gridN) % gridN * gridN + (((gx + b) % gridN) + gridN) % gridN]) {
            let dx = Math.abs(qx - p[0]) % R, dy = Math.abs(qy - p[1]) % R; if (dx > R / 2) dx = R - dx; if (dy > R / 2) dy = R - dy;
            const d = dx * dx + dy * dy; if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d; }
          const e = Math.sqrt(f2) - Math.sqrt(f1); out[i] = Math.max(0, 1 - e / th);
        } }
      const fine = fbm(R, 64, 3, rnd); for (let i = 0; i < out.length; i++) out[i] *= 0.55 + 0.45 * fine[i];
      return out;
    }
    case 'stains': {
      const rings = []; const n = Math.round(10 * k);
      for (let i = 0; i < n; i++) rings.push([rnd() * R, rnd() * R, (40 + rnd() * 160) * s, 0.15 + rnd() * 0.35]);
      const m = tiledCanvas(R, (x) => { for (const [px, py, r, a] of rings) {
        const g = x.createRadialGradient(px, py, r * 0.2, px, py, r); g.addColorStop(0, `rgba(255,255,255,${a * 0.25})`); g.addColorStop(0.86, `rgba(255,255,255,${a * 0.35})`); g.addColorStop(0.95, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); } });
      const dist = fbm(R, 16, 4, rnd); for (let i = 0; i < m.length; i++) m[i] *= 0.5 + dist[i];
      return curve(m, 0, 0.9);
    }
    case 'wear': {
      const a = fbm(R, 6, 7, rnd, 0.6); return curve(norm(a), 0.55 - 0.1 * k, 0.75, 1);
    }
    case 'breakup': {
      const a = fbm(R, 4, 6, rnd, 0.55); return norm(a);
    }
  }
  return new Float32Array(R * R);
}

// يولّد الطبقات المختارة. intensity: 0.5..2. يعيد { id: { canvas, blob } }
export async function makeImperfections(ids, R, { intensity = 1, seed = 1234, onStep } = {}) {
  const out = {};
  for (const id of ids) {
    const L = LAYERS.find(l => l.id === id); onStep?.(`توليد طبقة ${L.ar}…`); await tick();
    const a = await gen(id, R, seed + id.length * 7919, intensity);
    const c = document.createElement('canvas'); c.width = c.height = R; const x = c.getContext('2d'); const im = x.createImageData(R, R);
    for (let i = 0; i < a.length; i++) { const v = Math.max(0, Math.min(255, a[i] * 255)); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0);
    out[id] = { canvas: c, blob: await new Promise(r => c.toBlob(r, 'image/jpeg', 0.93)) };
  }
  return out;
}
