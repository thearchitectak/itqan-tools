// محرك قراءة ورق التظليل (OMR) — JavaScript خالص دون مكتبات ودون ذكاء اصطناعي.
// يعمل في المتصفح وداخل Web Worker وفي Node.
(function (root) {
  'use strict';
  const TW = 1200; // normalized width

  function resizeRGBA(src, w, h, tw) {
    const s = w / tw, th = Math.round(h / s), out = new Uint8ClampedArray(tw * th * 4);
    for (let y = 0; y < th; y++) {
      const sy = Math.min(h - 1.001, (y + 0.5) * s - 0.5), y0 = Math.max(0, Math.floor(sy)), fy = sy - y0, y1 = Math.min(h - 1, y0 + 1);
      for (let x = 0; x < tw; x++) {
        const sx = Math.min(w - 1.001, (x + 0.5) * s - 0.5), x0 = Math.max(0, Math.floor(sx)), fx = sx - x0, x1 = Math.min(w - 1, x0 + 1);
        const o = (y * tw + x) * 4, a = (y0 * w + x0) * 4, b = (y0 * w + x1) * 4, c = (y1 * w + x0) * 4, d = (y1 * w + x1) * 4;
        for (let k = 0; k < 3; k++)
          out[o + k] = (src[a + k] * (1 - fx) + src[b + k] * fx) * (1 - fy) + (src[c + k] * (1 - fx) + src[d + k] * fx) * fy;
        out[o + 3] = 255;
      }
    }
    return { data: out, w: tw, h: th };
  }

  function toGray(img) {
    const n = img.w * img.h, g = new Float32Array(n), d = img.data;
    for (let i = 0; i < n; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    return g;
  }

  function boxBlur(g, w, h, rad) {
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h), n = 2 * rad + 1;
    for (let y = 0; y < h; y++) {
      let acc = 0;
      for (let x = -rad; x <= rad; x++) acc += g[y * w + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[y * w + x] = acc / n;
        acc += g[y * w + Math.min(w - 1, x + rad + 1)] - g[y * w + Math.max(0, x - rad)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -rad; y <= rad; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc / n;
        acc += tmp[Math.min(h - 1, y + rad + 1) * w + x] - tmp[Math.max(0, y - rad) * w + x];
      }
    }
    return out;
  }

  // Edge pixels with unit gradient direction (computed once per sheet)
  function edges(g, w, h) {
    const b = boxBlur(g, w, h, 1), xs = [], ys = [], ux = [], uy = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = (b[i - w + 1] + 2 * b[i + 1] + b[i + w + 1]) - (b[i - w - 1] + 2 * b[i - 1] + b[i + w - 1]);
      const gy = (b[i + w - 1] + 2 * b[i + w] + b[i + w + 1]) - (b[i - w - 1] + 2 * b[i - w] + b[i - w + 1]);
      const m = Math.hypot(gx, gy);
      if (m > 70) { xs.push(x); ys.push(y); ux.push(gx / m); uy.push(gy / m); }
    }
    return { xs, ys, ux, uy };
  }

  function houghCircles(E, w, h, r) {
    const acc = new Float32Array(w * h), n = E.xs.length;
    for (let i = 0; i < n; i++) {
      for (let d = r - 2; d <= r + 2; d++) for (let s = -1; s <= 1; s += 2) {
        const cx = Math.round(E.xs[i] + s * d * E.ux[i]), cy = Math.round(E.ys[i] + s * d * E.uy[i]);
        if (cx >= 0 && cy >= 0 && cx < w && cy < h) acc[cy * w + cx] += 1;
      }
    }
    const sm = boxBlur(acc, w, h, 1);
    const T = 1.1 * r; // empirical vote threshold
    const cand = [];
    for (let i = 0; i < w * h; i++) if (sm[i] >= T) cand.push(i);
    cand.sort((a, b) => sm[b] - sm[a]);
    const cell = Math.max(4, Math.round(r * 1.4)), grid = new Map(), out = [];
    const md2 = (r * 1.4) * (r * 1.4);
    for (const i of cand) {
      const x = i % w, y = (i / w) | 0, gx = Math.floor(x / cell), gy = Math.floor(y / cell);
      let ok = true;
      for (let a = -1; a <= 1 && ok; a++) for (let b = -1; b <= 1 && ok; b++) {
        const L = grid.get((gx + a) + ',' + (gy + b));
        if (L) for (const p of L) if ((p[0] - x) ** 2 + (p[1] - y) ** 2 < md2) { ok = false; break; }
      }
      if (ok) {
        const k = gx + ',' + gy; if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push([x, y]); out.push({ x, y, v: sm[i] });
      }
    }
    return out;
  }

  const median = a => { const s = [...a].sort((p, q) => p - q), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  function linfit(xs, ys) {
    const n = xs.length; let mx = 0, my = 0; for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; } mx /= n; my /= n;
    let sxx = 0, sxy = 0; for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); }
    const a = sxx > 1e-9 ? sxy / sxx : 0; return [a, my - a * mx];
  }
  function clusterBy(vals, gap) {
    const o = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b]); const groups = [[o[0]]];
    for (const i of o.slice(1)) { const g = groups[groups.length - 1]; if (vals[i] - vals[g[g.length - 1]] > gap) groups.push([i]); else g.push(i); }
    return groups;
  }

  function buildGrid(circ, r, opts) {
    if (circ.length < opts * 6) return null;
    const xm = circ.reduce((s, c) => s + c.x, 0) / circ.length;
    // initial skew from horizontal nearest neighbours
    const sl0 = [];
    for (const a of circ) {
      let bd = 1e9, bs = null;
      for (const b of circ) {
        const dx = b.x - a.x, dy = b.y - a.y;
        if (dx > r * 1.5 && dx < r * 6 && Math.abs(dy) < dx * 0.2 && dx < bd) { bd = dx; bs = dy / dx; }
      }
      if (bs !== null) sl0.push(bs);
    }
    let s = sl0.length ? median(sl0) : 0, rows = [];
    for (let it = 0; it < 3; it++) {
      const y2 = circ.map(c => c.y - s * (c.x - xm));
      rows = clusterBy(y2, r * 0.9).filter(g => g.length >= opts * 2);
      if (!rows.length) return null;
      s = median(rows.map(g => linfit(g.map(i => circ[i].x), g.map(i => circ[i].y))[0]));
    }
    // most common row length (prefer the larger on ties)
    const cnt = {}; rows.forEach(g => cnt[g.length] = (cnt[g.length] || 0) + 1);
    const M = +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || b - a)[0];
    let kept = rows.filter(g => g.length >= M - 3 && g.length <= M + 1)
      .map(g => ({ g, y: median(g.map(i => circ[i].y - s * (circ[i].x - xm))) })).sort((a, b) => a.y - b.y);
    if (kept.length < 2) return null;
    const sp = median(kept.slice(1).map((k, i) => k.y - kept[i].y));
    // longest run of rows; a gap of 2-3 row spacings means rows the detector missed (faint print / light shading)
    const runs = []; let cur = [kept[0]];
    for (let i = 1; i < kept.length; i++) {
      const gap = (kept[i].y - kept[i - 1].y) / sp, k = Math.round(gap);
      if (gap < 1.6) cur.push(kept[i]);
      else if (k <= 3 && Math.abs(gap - k) < 0.3 && kept[i].g.length >= M - 1 && kept[i - 1].g && kept[i - 1].g.length >= M - 1) { for (let j = 1; j < k; j++) cur.push({ g: null, y: kept[i - 1].y + j * (kept[i].y - kept[i - 1].y) / k }); cur.push(kept[i]); }
      else { runs.push(cur); cur = [kept[i]]; }
    }
    runs.push(cur);
    kept = runs.reduce((a, b) => (b.length > a.length ? b : a));
    const full = kept.filter(k => k.g && k.g.length === M).map(k => k.g.map(i => circ[i]).sort((a, b) => a.x - b.x));
    if (full.length < 2 || M % opts !== 0) return { rows: kept.length, M, bad: true };
    if (M > 48) return { rows: kept.length, M, bad: true };
    const cols = []; for (let k = 0; k < M; k++) cols.push(linfit(full.map(f => f[k].y), full.map(f => f[k].x)));
    const ym = median(full.map(f => f[0].y)), xs = cols.map(cl => cl[0] * ym + cl[1]);
    for (let k = 1; k < M; k++) if (xs[k] - xs[k - 1] < r * 1.8) return { rows: kept.length, M, bad: true };
    // row lines y = a*x + b; virtual rows take the slope of the page and the interpolated offset
    kept.forEach(k => {
      if (k.g && k.g.length >= 3) { const cs = k.g.map(i => circ[i]); k.pa = linfit(cs.map(c => c.x), cs.map(c => c.y)); k.y0 = median(cs.map(c => c.y)); }
    });
    kept.forEach((k, i) => {
      if (k.pa) return;
      let a = i - 1; while (a >= 0 && !kept[a].pa) a--;
      let b = i + 1; while (b < kept.length && !kept[b].pa) b++;
      const A = a >= 0 ? kept[a] : null, B = b < kept.length ? kept[b] : null;
      if (A && B) { const t = (k.y - A.y) / (B.y - A.y); k.pa = [A.pa[0] + t * (B.pa[0] - A.pa[0]), A.pa[1] + t * (B.pa[1] - A.pa[1])]; }
      else { const R = A || B; k.pa = [R.pa[0], R.pa[1] + (k.y - R.y)]; }
      k.y0 = k.pa[0] * xm + k.pa[1];
    });
    const pts = kept.map(k => cols.map(cl => { let x = cl[0] * k.y0 + cl[1], y = k.pa[0] * x + k.pa[1]; x = cl[0] * y + cl[1]; y = k.pa[0] * x + k.pa[1]; return [Math.round(x), Math.round(y)]; }));
    return { rows: kept.length, M, pts, bad: false, real: kept.reduce((a, k) => a + (k.g ? Math.min(M, k.g.length) : 0), 0), virt: kept.filter(k => !k.g).length };
  }

  function inkMask(img, g) {
    const w = img.w, h = img.h, f = 4, sw = Math.ceil(w / f), sh = Math.ceil(h / f), small = new Float32Array(sw * sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) small[y * sw + x] = g[Math.min(h - 1, y * f) * w + Math.min(w - 1, x * f)];
    const bg = new Float32Array(sw * sh), R = 4, buf = [];
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      buf.length = 0;
      for (let b = -R; b <= R; b++) for (let a = -R; a <= R; a++) buf.push(small[Math.min(sh - 1, Math.max(0, y + b)) * sw + Math.min(sw - 1, Math.max(0, x + a))]);
      buf.sort((p, q) => p - q); bg[y * sw + x] = buf[buf.length >> 1];
    }
    const m = new Uint8Array(w * h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, bv = bg[Math.min(sh - 1, (y / f) | 0) * sw + Math.min(sw - 1, (x / f) | 0)];
      const R_ = d[i * 4], G_ = d[i * 4 + 1], B_ = d[i * 4 + 2];
      m[i] = (bv - g[i] > 40) || (B_ - R_ > 45 && B_ - G_ > 15 && g[i] < 170) ? 1 : (bv - g[i] > 16 || (B_ - R_ > 25 && B_ - G_ > 8)) ? 2 : 0;
    }
    return m;
  }

  function measure(m, g, w, h, x, y, r) {
    let ni = 0, ii = 0, il = 0, nr = 0, ir = 0, gs = 0; const R = Math.ceil(r * 1.75);
    for (let b = -R; b <= R; b++) for (let a = -R; a <= R; a++) {
      const X = x + a, Y = y + b; if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      const dd = Math.hypot(a, b), v = m[Y * w + X];
      if (dd < r * 0.72) { ni++; gs += g[Y * w + X]; if (v === 1) ii++; if (v) il++; } else if (dd > r * 1.25 && dd < r * 1.75) { nr++; if (v === 1) ir++; }
    }
    return [ni ? ii / ni : 0, nr ? ir / nr : 0, ni ? il / ni : 0, ni ? gs / ni : 255];
  }

  // Decide one question. Returns {ans: option index or -1, flag}
  function decide(inner, ring, light, gray) {
    const marked = inner.map((v, i) => i).filter(i => inner[i] > 0.12);
    if (!marked.length) {
      // faint pencil: compare each bubble's darkness with the other bubbles of the same question
      if (gray) {
        const o = gray.map((v, i) => i).sort((a, b) => gray[a] - gray[b]);
        const rest = o.slice(1).map(i => gray[i]), ref = median(rest), c1 = ref - gray[o[0]], c2 = ref - gray[o[1]];
        if (c1 > 14 && c2 < c1 * 0.4) return { ans: o[0], flag: 'faint' };
        if (c1 > 14) return { ans: o[0], flag: 'review' };
      }
      if (light) {
        const o = light.map((v, i) => i).sort((a, b) => light[b] - light[a]);
        if (light[o[0]] > 0.3) return { ans: o[0], flag: 'review' };
      }
      return { ans: -1, flag: 'blank' };
    }
    if (marked.length === 1) return { ans: marked[0], flag: '' };
    const solid = marked.filter(i => inner[i] > 0.6);
    if (solid.length === 1) return { ans: solid[0], flag: 'crossed' };
    const clean = marked.filter(i => ring[i] <= 0.08);
    if (clean.length === 1) return { ans: clean[0], flag: 'crossed' };
    let b = marked[0]; marked.forEach(i => { if (inner[i] > inner[b]) b = i; });
    return { ans: b, flag: 'review' };
  }

  // Main entry. rgba: Uint8ClampedArray, opts: options per question, rtl: Arabic sheet
  function gradeSheet(rgba, w, h, opts, rtl, expect) {
    opts = opts || 4; if (rtl === undefined) rtl = true;
    const img = resizeRGBA(rgba, w, h, TW), g = toGray(img), E = edges(g, img.w, img.h);
    const valid = [];
    for (let r = 6; r <= 34; r += 2) {
      const c = houghCircles(E, img.w, img.h, r);
      const G = buildGrid(c, r, opts);
      if (!G || G.bad || G.rows < 3) continue;
      valid.push({ score: G.real - 2 * G.M * G.virt, r, G });
    }
    if (!valid.length) throw new Error('GRID_NOT_FOUND');
    const match = expect ? valid.filter(v => v.G.rows === expect.rows && v.G.M === expect.cols) : [];
    const pool = match.length ? match : valid;
    const top = Math.max(...pool.map(v => v.score)), tops = pool.filter(v => v.score === top);
    const best = tops[(tops.length - 1) >> 1];
    const { r, G } = best, m = inkMask(img, g), groups = G.M / opts, R = G.rows;
    const questions = [];
    for (let ri = 0; ri < R; ri++) for (let gi = 0; gi < groups; gi++) {
      const gIdx = rtl ? groups - 1 - gi : gi; // group number (0 = first questions)
      const q = gIdx * R + ri + 1;
      const pos = [], inner = [], ring = [], light = [], gray = [];
      for (let k = 0; k < opts; k++) {
        const col = gi * opts + k, opt = rtl ? opts - 1 - k : k; // option index (0 = أ / A)
        const p = G.pts[ri][col]; pos[opt] = p;
        const [a, b, c, d] = measure(m, g, img.w, img.h, p[0], p[1], r); inner[opt] = a; ring[opt] = b; light[opt] = c; gray[opt] = d;
      }
      questions.push({ q, pos, inner, ring, ...decide(inner, ring, light, gray) });
    }
    questions.sort((a, b) => a.q - b.q);
    return { img, r, rows: R, cols: G.M, groups, opts, questions };
  }

  const api = { gradeSheet, decide, TW };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.OMR = api;
})(typeof self !== "undefined" ? self : this);
