// الحسابات الإنشائية المشتركة: الأحمال وتركيباتها، تصميم الأعمدة، تصميم القواعد المنفصلة، ورسم القطاعات
// الوحدات الداخلية: مم ونيوتن وميجاباسكال للقطاعات، وكيلونيوتن ومتر للأحمال
import { REBAR, barDia } from './data.js';

/* ================= الأحمال ================= */
// الأحمال الحية (كيلونيوتن/م²)
export const LIVE = {
  eg: {
    ref: 'الكود المصري لحساب الأحمال والقوى ECP 201',
    list: [['res', 'سكني (شقق وفيلات)', 2.0], ['res-st', 'سلالم وممرات المباني السكنية', 3.0], ['balc', 'بلكونات', 3.0], ['office', 'مكاتب إدارية', 2.5], ['class', 'فصول دراسية', 3.0], ['hosp', 'غرف المستشفيات', 2.5], ['shop', 'محلات تجارية', 4.0], ['hall-f', 'قاعات بمقاعد ثابتة', 4.0], ['hall', 'قاعات دون مقاعد ثابتة', 5.0], ['garage', 'جراجات السيارات الخفيفة', 3.0], ['store', 'مخازن خفيفة', 5.0], ['roof', 'سطح غير مستخدم', 1.0], ['roof-u', 'سطح مستخدم', 2.0]],
  },
  aci: {
    ref: 'ASCE 7 الجدول 4.3-1، ويعتمده كود الأحمال السعودي SBC 301',
    list: [['res', 'سكني (شقق وفيلات)', 1.92], ['res-st', 'سلالم المساكن الخاصة', 1.92], ['st', 'سلالم ومخارج المباني الأخرى', 4.79], ['balc', 'بلكونات سكنية (1.5 × حمل الاستخدام)', 2.87], ['office', 'مكاتب', 2.40], ['corr', 'ممرات المكاتب فوق الدور الأرضي', 3.83], ['class', 'فصول دراسية', 1.92], ['hosp', 'غرف المرضى', 1.92], ['shop', 'محلات تجارية (الدور الأرضي)', 4.79], ['shop-up', 'محلات تجارية (الأدوار العليا)', 3.59], ['hall-f', 'قاعات بمقاعد ثابتة', 2.87], ['hall', 'قاعات بمقاعد متحركة', 4.79], ['garage', 'جراجات سيارات الركاب', 1.92], ['store', 'مخازن خفيفة', 6.00], ['roof', 'سطح عادي', 0.96], ['roof-u', 'سطح حديقة أو تجمعات', 4.79]],
  },
};
export const liveFor = (code) => code === 'eg' ? LIVE.eg : LIVE.aci;

// أوزان وحدات الحوائط (كيلونيوتن/م³)
export const WALLS = [['brick-s', 'طوب أحمر مصمت', 18], ['brick-h', 'طوب أحمر مفرغ', 13], ['cblock-s', 'طوب أسمنتي مصمت', 20], ['cblock-h', 'بلوك أسمنتي مفرغ', 14], ['aac', 'خرسانة خلوية (AAC)', 7], ['stone', 'حجر طبيعي', 25]];

// تركيبات الأحمال
export function combo(code, D, L) {
  if (code === 'eg') {
    const a = 1.4 * D + 1.6 * L, b = L <= 0.75 * D ? 1.5 * (D + L) : 0;
    return { wu: Math.max(a, b), rule: b > a ? '1.5 (D + L) لأن الحي لا يزيد على 75% من الميت' : '1.4 D + 1.6 L', ref: 'ECP 203' };
  }
  const a = 1.4 * D, b = 1.2 * D + 1.6 * L;
  return { wu: Math.max(a, b), rule: a > b ? '1.4 D' : '1.2 D + 1.6 L', ref: code === 'sa' ? 'SBC 301 (ASCE 7)' : 'ASCE 7 و ACI 318' };
}

// القيم الافتراضية للأحمال لكل متر مربع من الطابق
export function defaultLoads(code) {
  const D = 0.15 * 25 + 1.5 + (code === 'eg' ? 1.5 : 1.0), L = code === 'eg' ? 2.0 : 1.92;
  const c = combo(code, D, L);
  return { D, L, ws: D + L, wu: c.wu };
}

/* ================= أدوات مساعدة ================= */
const up = (x, s) => Math.ceil(x / s - 1e-9) * s;
const down = (x, s) => Math.floor(x / s + 1e-9) * s;
export const area = (d) => Math.PI * d * d / 4;
export function colBars(code) { return REBAR[code].bars.filter(b => b.d >= 12 && b.d <= 32).map(b => ({ id: b.d, d: barDia(code, b.d), label: b.label })); }
export function slabBars(code) { return REBAR[code].bars.filter(b => b.d >= 12 && b.d <= 25).map(b => ({ id: b.d, d: barDia(code, b.d), label: b.label })); }
const isEg = (c) => c === 'eg';

/* ================= تصميم العمود (محوري) ================= */
// يعيد مقاومة القطاع: الخرسانة لكل مم² والحديد لكل مم²
function colCoef(code, fc, fy) {
  return isEg(code) ? { c: 0.35 * fc, s: 0.67 * fy } : { c: 0.65 * 0.8 * 0.85 * fc, s: 0.65 * 0.8 * fy };
}
export function designColumn({ code, Pu, fc, fy, b = 250, shape = 'rect', rho = 1, cover = 40, H = 2.7, minDim = 250 }) {
  if (isEg(code)) fy = Math.min(fy, 420); // ECP 203-2025: لا يزيد إجهاد خضوع الحديد الطولي للأعمدة المحسوب على 420
  const k = colCoef(code, fc, fy), N = Pu * 1000;
  const rmin = isEg(code) ? 0.006 : 0.01, rmax = 0.04; // المصري: 4% للأعمدة الداخلية (5% طرفية و6% ركنية)، و ACI يسمح حتى 8%
  const r0 = Math.max(rho / 100, rmin);
  const perArea = k.c * (1 - r0) + k.s * r0;
  const Agr = N / perArea;
  let B, Hh, Ag;
  if (shape === 'circ') { B = Hh = Math.max(up(Math.sqrt(4 * Agr / Math.PI), 50), Math.max(minDim, 300)); Ag = area(B); }
  else if (shape === 'sq') { B = Hh = Math.max(up(Math.sqrt(Agr), 50), minDim); Ag = B * Hh; }
  else { B = Math.max(b, 200); Hh = Math.max(up(Agr / B, 50), B, minDim); Ag = B * Hh; }
  // مساحة الحديد: الأكبر من الحد الأدنى وما تتطلبه المقاومة
  // الكود المصري (6-4-7): الحد الأدنى 0.8% من المساحة المطلوبة حسابيًا، وبما لا يقل عن 0.6% من المساحة الفعلية
  const Asmin = isEg(code) ? Math.max(0.008 * Agr, 0.006 * Ag) : rmin * Ag;
  const Asr = Math.max(Asmin, (N - k.c * Ag) / (k.s - k.c));
  // اختيار القطر وعدد الأسياخ
  const tie = isEg(code) ? 8 : 10;
  const opts = [];
  for (const bar of colBars(code)) {
    const a1 = area(bar.d); let n = Math.ceil(Asr / a1);
    if (shape === 'circ') n = Math.max(6, n); else { n = Math.max(4, n); if (n % 2) n++; }
    let lay;
    for (let tries = 0; tries < 20; tries++) {
      lay = arrange(shape, B, Hh, n, bar.d, cover + (bar.d >= 25 && !isEg(code) ? 13 : tie), isEg(code));
      if (lay.ok) break;
      n += shape === 'circ' ? 1 : 2;
      if (n * a1 > rmax * Ag) break;
    }
    if (!lay?.ok || n * a1 > rmax * Ag) continue;
    opts.push({ bar, n, As: n * a1, lay, waste: n * a1 - Asr });
  }
  // نفضّل أقل زيادة في الحديد، مع تجنب الأعداد الكبيرة جدًا
  opts.sort((a, b2) => (a.waste + (a.n > 12 ? a.As * 0.2 : 0)) - (b2.waste + (b2.n > 12 ? b2.As * 0.2 : 0)));
  const pick = opts[0] || null;
  const dt = isEg(code) ? Math.max(8, pick ? Math.ceil(pick.bar.d / 4 / 2) * 2 : 8) : (pick && pick.bar.d > 32 ? 13 : 10); // المصري: لا يقل عن 8 مم ولا عن ربع قطر أكبر سيخ
  let s = 0, sRule = '';
  if (pick) {
    const least = Math.min(B, Hh);
    if (isEg(code)) {
      // (6-4-7): التباعد لا يزيد على 15 × أصغر قطر طولي ولا على 200 مم، وحجم الكانات لا يقل عن 0.25% من حجم الخرسانة
      const per = shape === 'circ' ? Math.PI * (B - 2 * cover) : 2 * (B + Hh - 4 * cover), sVol = area(dt) * per / (0.0025 * (shape === 'circ' ? area(B) : B * Hh));
      s = down(Math.min(200, 15 * pick.bar.d, sVol), 25); sRule = 'الأقل من 200 مم و 15 × قطر الحديد الطولي، مع ألا يقل حجم الكانات عن 0.25% من حجم الخرسانة';
    }
    else { s = down(Math.min(16 * pick.bar.d, 48 * dt, least), 25); sRule = 'الأقل من 16 × قطر الحديد الطولي و 48 × قطر الكانة وأصغر بُعد للعمود'; }
  }
  const As = pick ? pick.As : Asr;
  const cap = (k.c * (Ag - As) + k.s * As) / 1000;
  // النحافة (عمود مقيد جانبيًا، k = 1)
  const least = Math.min(B, Hh), lu = H * 1000;
  const slender = isEg(code) ? { val: lu / least, lim: shape === 'circ' ? 12 : 15, txt: shape === 'circ' ? 'نسبة النحافة He/D' : 'نسبة النحافة He/t' } : { val: lu / (0.3 * least), lim: 34, txt: 'نسبة النحافة kℓu/r' };
  return {
    code, b: B, h: Hh, shape, Ag, Asr, As, rho: As / Ag, pick, dt, s, sRule, cap, Pu, ok: !!pick && cap >= Pu - 1e-6,
    slender, rmin, rmax, crossTies: pick ? pick.lay.cross : false, cover,
    formula: isEg(code) ? 'Pu = 0.35 fcu Ac + 0.67 fy As' : "φPn = 0.65 × 0.80 [0.85 f'c (Ag − Ast) + fy Ast]",
  };
}
// توزيع الأسياخ على المحيط والتحقق من المسافات الصافية
function arrange(shape, B, H, n, d, c, eg = false) {
  const minClear = Math.max(40, 1.5 * d), maxCtr = eg ? 250 : Infinity;
  if (shape === 'circ') {
    const R = B / 2 - c - d / 2, arc = 2 * Math.PI * R / n - d;
    return { ok: arc >= minClear && (!eg || arc + d <= 250), clear: arc, cross: false, pts: Array.from({ length: n }, (_, i) => [B / 2 + R * Math.cos(2 * Math.PI * i / n), H / 2 + R * Math.sin(2 * Math.PI * i / n)]) };
  }
  // nb على الوجه B، و nh على الوجه H (شاملة الأركان)
  let best = null;
  for (let nb = 2; nb <= n / 2; nb++) {
    const nh = n / 2 - nb + 2; if (nh < 2) continue;
    const cb = (B - 2 * c - nb * d) / (nb - 1), chh = (H - 2 * c - nh * d) / (nh - 1);
    const score = Math.abs(cb - chh);
    const okMax = (nb > 2 || B <= 300 || !eg) && (nh > 2 || H <= 300 || !eg) && cb + d <= maxCtr && chh + d <= maxCtr;
    if (cb >= minClear && chh >= minClear && okMax && (!best || score < best.score)) best = { nb, nh, cb, ch: chh, score };
  }
  if (!best) return { ok: false };
  const pts = [], x0 = c + d / 2, y0 = c + d / 2, x1 = B - c - d / 2, y1 = H - c - d / 2;
  for (let i = 0; i < best.nb; i++) { const x = x0 + (x1 - x0) * i / (best.nb - 1); pts.push([x, y0], [x, y1]); }
  for (let j = 1; j < best.nh - 1; j++) { const y = y0 + (y1 - y0) * j / (best.nh - 1); pts.push([x0, y], [x1, y]); }
  return { ok: true, ...best, clear: Math.min(best.cb, best.ch), cross: Math.max(best.cb, best.ch) > 150, pts };
}

/* ================= تصميم القاعدة المنفصلة ================= */
export function designFooting({ code, c1, c2, P, Pu, q, fc, fy, cover = 75, pcT = 0.2, pcProj = 0.15, minH = 300, colBar = 16, colN = 8, selfPct = 10 }) {
  // c1 و c2 بالمليمتر، P و Pu بالكيلونيوتن، q بالكيلونيوتن/م²
  const A = P * (1 + selfPct / 100) / q; // المساحة اللازمة (م²)
  const a1 = c1 / 1000, a2 = c2 / 1000;
  const usePC = isEg(code) && pcT > 0;
  // بروز متساوٍ من الجهات الأربع: (a1 + 2e)(a2 + 2e) = A
  const solveE = (Area) => (-(a1 + a2) + Math.sqrt((a1 + a2) ** 2 - 4 * (a1 * a2 - Area))) / 4;
  let Bx, By, pcBx = 0, pcBy = 0;
  if (usePC) {
    const e = Math.max(solveE(A), 0); pcBx = up(a1 + 2 * e, 0.05); pcBy = up(a2 + 2 * e, 0.05);
    Bx = Math.max(pcBx - 2 * pcProj, a1 + 0.3); By = Math.max(pcBy - 2 * pcProj, a2 + 0.3);
  } else { const e = Math.max(solveE(A), 0.15); Bx = up(a1 + 2 * e, 0.05); By = up(a2 + 2 * e, 0.05); }
  // أقل بُعد عملي للقاعدة المسلحة 1.0 م
  if (Bx < 1) { if (usePC) pcBx += 1 - Bx; Bx = 1; }
  if (By < 1) { if (usePC) pcBy += 1 - By; By = 1; }
  Bx = +Bx.toFixed(2); By = +By.toFixed(2); pcBx = +pcBx.toFixed(2); pcBy = +pcBy.toFixed(2);
  const qu = Pu / (Bx * By); // كيلونيوتن/م² (صافي مصعّد على الخرسانة المسلحة)
  const ox = (Bx - a1) / 2, oy = (By - a2) / 2; // البروز (م)
  const bars = slabBars(code);
  let res = null;
  const hMin = isEg(code) ? Math.max(minH, 300, Math.min(c1, c2)) : Math.max(minH, 250); // المصري: لا يقل عن 300 مم ولا عن أصغر بُعد للعمود
  for (let h = hMin; h <= 2500; h += 50) {
    const dbG = 16, d = h - cover - dbG; // عمق فعال تقريبي (متوسط الاتجاهين)
    const dm = d / 1000;
    // الثقب
    const bo = 2 * (c1 + d) + 2 * (c2 + d);
    const Vp = Pu - qu * (a1 + dm) * (a2 + dm); // كيلونيوتن
    let vp, vpCap, pRule;
    const sq = Math.sqrt(fc);
    if (isEg(code)) {
      const g = Math.sqrt(fc / 1.5), ab = Math.min(c1, c2) / Math.max(c1, c2);
      const lsE = Math.min(1, Math.pow(1000 / d, 0.25)); vpCap = Math.min(lsE * Math.min(0.316 * (0.5 + ab) * g, 0.8 * (4 * d / bo + 0.2) * g, 0.316 * g), 1.7);
      vp = Vp * 1000 / (bo * d); pRule = 'مقاومة الثقب حسب ECP 203-2025 المعادلات (4-46) عند d/2 من وجه العمود، بحد أقصى 1.7 ن/مم²';
    } else {
      const ls = Math.min(1, Math.sqrt(2 / (1 + 0.004 * d))), beta = Math.max(c1, c2) / Math.min(c1, c2);
      vpCap = 0.75 * ls * Math.min(0.33, 0.17 * (1 + 2 / beta), 0.083 * (2 + 40 * d / bo)) * sq;
      vp = Vp * 1000 / (bo * d); pRule = 'مقاومة الثقب حسب ACI 318-19 مع معامل الحجم λs عند d/2 من وجه العمود';
    }
    if (vp > vpCap) continue;
    // الانحناء في الاتجاهين (عند وجه العمود)
    const flex = (L, b, o) => { // L طول القاعدة في اتجاه الحديد، b العرض العمودي، o البروز
      const Mu = qu * b * o * o / 2; // كيلونيوتن.م
      const bmm = b * 1000, M = Mu * 1e6;
      let As;
      if (isEg(code)) {
        const fyd = fy / 1.15, fcd = 0.67 * fc / 1.5, kk = fyd * fyd / (2 * fcd * bmm);
        const disc = (fyd * d) ** 2 - 4 * kk * M; if (disc < 0) return null;
        As = ((fyd * d) - Math.sqrt(disc)) / (2 * kk);
        As = Math.max(As, M / (fyd * 0.95 * d)); // ذراع العزم لا يزيد على 0.95d (البند 4-2-1-2)
        // (6-7-1): 0.25% للصلب الطري، و0.15% (fcu ≤ 30) إلى 0.18% (fcu ≥ 40) للصلب عالي المقاومة من المقطع الخرساني الفعلي
        const rMin = fy <= 280 ? 0.0025 : 0.0015 + 0.0003 * Math.min(Math.max((fc - 30) / 10, 0), 1);
        As = Math.max(As, rMin * bmm * h);
      } else {
        const Rn = M / (0.9 * bmm * d * d), t = 1 - 2 * Rn / (0.85 * fc); if (t < 0) return null;
        As = Math.max(0.85 * fc / fy * (1 - Math.sqrt(t)) * bmm * d, Math.max(0.0018 * 420 / fy, 0.0014) * bmm * h);
      }
      return { Mu, As, b };
    };
    const fx = flex(Bx, By, ox), fyy = flex(By, Bx, oy);
    if (!fx || !fyy) continue;
    // القص في اتجاه واحد عند d (أو d/2 في الكود المصري) من وجه العمود
    const shear1 = (b, o, As) => {
      const dist = isEg(code) ? o - dm / 2 : o - dm; if (dist <= 0) return { ok: true, v: 0, cap: 1 };
      const V = qu * b * dist, bmm = b * 1000;
      const v = V * 1000 / (bmm * d);
      let cap;
      if (isEg(code)) cap = 0.16 * Math.sqrt(fc / 1.5);
      else { const ls = Math.min(1, Math.sqrt(2 / (1 + 0.004 * d))), rw = As / (bmm * d); cap = 0.75 * Math.min(0.66 * ls * Math.cbrt(rw) * sq, 0.42 * sq); }
      return { ok: v <= cap, v, cap };
    };
    const sx = shear1(By, ox, fx.As), sy = shear1(Bx, oy, fyy.As);
    if (!sx.ok || !sy.ok) continue;
    // اختيار الأسياخ
    const maxS = isEg(code) ? 200 : Math.min(3 * h, 450);
    const pickBars = (As, b) => {
      for (const bar of bars) {
        const a = area(bar.d); let n = Math.max(Math.ceil(As / a), Math.ceil(b * 5)); // لا يقل عن 5 أسياخ في المتر
        let s = (b * 1000 - 2 * cover - bar.d) / (n - 1);
        while (s > maxS) { n++; s = (b * 1000 - 2 * cover - bar.d) / (n - 1); }
        if (s >= 125) return { bar, n, s: down(s, 5), As: n * a };
      }
      const bar = bars[bars.length - 1], a = area(bar.d), n = Math.ceil(As / a);
      return { bar, n, s: down((b * 1000 - 2 * cover - bar.d) / (n - 1), 5), As: n * a };
    };
    const rx = pickBars(fx.As, By), ry = pickBars(fyy.As, Bx);
    // طول التماسك في الضغط للأشاير (ACI)، وفي الكود المصري يُتحقق من العمق فقط
    const ldc = isEg(code) ? null : Math.max(0.24 * fy * colBar / sq, 0.043 * fy * colBar, 200);
    const okDev = ldc ? d - 25 >= ldc : true;
    if (!okDev) continue;
    res = { h, d, bo, Vp, vp, vpCap, pRule, fx, fy: fyy, sx, sy, rx, ry, ldc };
    break;
  }
  return {
    code, A, Bx, By, pcBx, pcBy, usePC, pcT, pcProj, qu, ox, oy, c1, c2, P, Pu, q, fc, fy, cover, colBar, colN,
    qs: P * (1 + selfPct / 100) / ((usePC ? pcBx * pcBy : Bx * By)), ...res, ok: !!res,
  };
}

/* ================= الرسومات ================= */
const esc = (s) => String(s).replace(/[<&"]/g, c => ({ '<': '&lt;', '&': '&amp;', '"': '&quot;' }[c]));
const SVG = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" font-family="Cairo, Arial, sans-serif" style="background:#fff">${body}</svg>`;
function dimH(x1, x2, y, txt, off = 18) { return `<line x1="${x1}" y1="${y + off}" x2="${x2}" y2="${y + off}" stroke="#555" stroke-width="1" marker-start="url(#ar)" marker-end="url(#ar)"/><line x1="${x1}" y1="${y + 3}" x2="${x1}" y2="${y + off + 5}" stroke="#999"/><line x1="${x2}" y1="${y + 3}" x2="${x2}" y2="${y + off + 5}" stroke="#999"/><text x="${(x1 + x2) / 2}" y="${y + off - 4}" font-size="12" text-anchor="middle" fill="#333">${esc(txt)}</text>`; }
function dimV(y1, y2, x, txt, off = 18) { return `<line x1="${x - off}" y1="${y1}" x2="${x - off}" y2="${y2}" stroke="#555" stroke-width="1" marker-start="url(#ar)" marker-end="url(#ar)"/><line x1="${x - 3}" y1="${y1}" x2="${x - off - 5}" y2="${y1}" stroke="#999"/><line x1="${x - 3}" y1="${y2}" x2="${x - off - 5}" y2="${y2}" stroke="#999"/><text x="${x - off - 6}" y="${(y1 + y2) / 2}" font-size="12" text-anchor="middle" fill="#333" transform="rotate(-90 ${x - off - 6} ${(y1 + y2) / 2})">${esc(txt)}</text>`; }
const DEFS = '<defs><marker id="ar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 2 L10 5 L0 8 z" fill="#555"/></marker><pattern id="hc" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#94a3b8" stroke-width="1"/></pattern><pattern id="soil" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0 14 L14 0" stroke="#c4a484" stroke-width="1"/></pattern></defs>';

export function columnSvg(c, tag = 'C1') {
  if (!c.pick) return '';
  const W = 420, H = 380, m = 70, s = Math.min((W - 2 * m) / c.b, (H - 2 * m - 30) / c.h);
  const w = c.b * s, hh = c.h * s, x = (W - w) / 2, y = 50;
  let body = DEFS + `<text x="${W / 2}" y="26" font-size="16" font-weight="800" text-anchor="middle">قطاع العمود ${esc(tag)}</text>`;
  if (c.shape === 'circ') body += `<circle cx="${W / 2}" cy="${y + hh / 2}" r="${w / 2}" fill="url(#hc)" stroke="#111" stroke-width="2"/>`;
  else body += `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="url(#hc)" stroke="#111" stroke-width="2"/>`;
  const ci = (c.cover) * s;
  if (c.shape === 'circ') body += `<circle cx="${W / 2}" cy="${y + hh / 2}" r="${w / 2 - ci}" fill="none" stroke="#2563eb" stroke-width="2"/>`;
  else body += `<rect x="${x + ci}" y="${y + ci}" width="${w - 2 * ci}" height="${hh - 2 * ci}" rx="4" fill="none" stroke="#2563eb" stroke-width="2"/>`;
  const r = Math.max(c.pick.bar.d * s / 2, 3.5);
  for (const [px, py] of c.pick.lay.pts) body += `<circle cx="${x + px * s}" cy="${y + py * s}" r="${r}" fill="#dc2626" stroke="#7f1d1d"/>`;
  if (c.crossTies && c.shape !== 'circ') {
    const L = c.pick.lay; if (L.nb > 2) { const xm = x + w / 2; body += `<line x1="${xm}" y1="${y + ci}" x2="${xm}" y2="${y + hh - ci}" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="5 3"/>`; }
    if (L.nh > 2) { const ym = y + hh / 2; body += `<line x1="${x + ci}" y1="${ym}" x2="${x + w - ci}" y2="${ym}" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="5 3"/>`; }
  }
  body += dimH(x, x + w, y + hh, `${c.b} مم`) + (c.shape === 'circ' ? '' : dimV(y, y + hh, x, `${c.h} مم`));
  body += `<text x="${W / 2}" y="${H - 30}" font-size="13" font-weight="700" text-anchor="middle" fill="#7f1d1d">${c.pick.n} ${esc(c.pick.bar.label)} طولي</text><text x="${W / 2}" y="${H - 10}" font-size="13" font-weight="700" text-anchor="middle" fill="#1d4ed8">كانات Φ${c.dt} كل ${c.s} مم${c.crossTies ? ' + روابط داخلية' : ''}</text>`;
  return SVG(W, H, body);
}

export function footingSvg(f, tag = 'F1', colTag = 'C1') {
  if (!f.ok) return '';
  const W = 760, H = 430;
  // المسقط
  const pw = 330, ph = 300, Lx = f.usePC ? f.pcBx : f.Bx, Ly = f.usePC ? f.pcBy : f.By;
  const s = Math.min((pw - 70) / Lx, (ph - 70) / Ly), ox = 30 + (pw - Lx * s) / 2 + 20, oy = 60 + (ph - 60 - Ly * s) / 2;
  let b = DEFS + `<text x="${W - 20}" y="26" font-size="16" font-weight="800" text-anchor="end">القاعدة ${esc(tag)} — العمود ${esc(colTag)}</text>`;
  b += `<text x="${30 + pw / 2}" y="50" font-size="13" font-weight="700" text-anchor="middle">مسقط أفقي</text>`;
  if (f.usePC) b += `<rect x="${ox}" y="${oy}" width="${Lx * s}" height="${Ly * s}" fill="#f1f5f9" stroke="#64748b" stroke-dasharray="6 4"/>`;
  const rx0 = ox + (Lx - f.Bx) / 2 * s, ry0 = oy + (Ly - f.By) / 2 * s;
  b += `<rect x="${rx0}" y="${ry0}" width="${f.Bx * s}" height="${f.By * s}" fill="#fff" stroke="#111" stroke-width="2"/>`;
  const nX = Math.min(f.rx.n, 14), nY = Math.min(f.ry.n, 14), cv = Math.max(f.cover / 1000 * s, 4);
  for (let i = 0; i < nX; i++) { const yy = ry0 + cv + (f.By * s - 2 * cv) * i / (nX - 1); b += `<line x1="${rx0 + cv}" y1="${yy}" x2="${rx0 + f.Bx * s - cv}" y2="${yy}" stroke="#dc2626" stroke-width="1"/>`; }
  for (let i = 0; i < nY; i++) { const xx = rx0 + cv + (f.Bx * s - 2 * cv) * i / (nY - 1); b += `<line x1="${xx}" y1="${ry0 + cv}" x2="${xx}" y2="${ry0 + f.By * s - cv}" stroke="#2563eb" stroke-width="1"/>`; }
  const cx = rx0 + (f.Bx * s - f.c1 / 1000 * s) / 2, cy = ry0 + (f.By * s - f.c2 / 1000 * s) / 2;
  b += `<rect x="${cx}" y="${cy}" width="${f.c1 / 1000 * s}" height="${f.c2 / 1000 * s}" fill="#111"/>`;
  b += dimH(rx0, rx0 + f.Bx * s, ry0 + f.By * s + (f.usePC ? (Ly - f.By) / 2 * s : 0), `${fmtM(f.Bx)} م`) + dimV(ry0, ry0 + f.By * s, ox, `${fmtM(f.By)} م`, 14);
  b += `<text x="${30 + pw / 2}" y="${H - 34}" font-size="12" fill="#b91c1c" text-anchor="middle">${f.rx.n} ${esc(f.rx.bar.label)} كل ${f.rx.s} مم (الاتجاه الطويل الأفقي)</text><text x="${30 + pw / 2}" y="${H - 16}" font-size="12" fill="#1d4ed8" text-anchor="middle">${f.ry.n} ${esc(f.ry.bar.label)} كل ${f.ry.s} مم (الاتجاه الرأسي)</text>`;
  // القطاع
  const sx0 = 400, sw = 330;
  b += `<text x="${sx0 + sw / 2}" y="50" font-size="13" font-weight="700" text-anchor="middle">قطاع أ — أ</text>`;
  const hs = f.h / 1000, pc = f.usePC ? f.pcT : 0.1, colH = 0.6, totH = hs + pc + colH;
  const k = Math.min((sw - 60) / Lx, 250 / totH), baseY = 60 + 40 + totH * k;
  const left = sx0 + (sw - Lx * k) / 2;
  b += `<rect x="${sx0}" y="${baseY - (pc + hs) * k - 0.25 * k}" width="${sw}" height="${(pc + hs + 0.25) * k + 10}" fill="url(#soil)" opacity=".5"/>`;
  b += `<rect x="${left}" y="${baseY - pc * k}" width="${Lx * k}" height="${pc * k}" fill="#e2e8f0" stroke="#64748b"/>`;
  const rl = left + (Lx - f.Bx) / 2 * k, ry = baseY - (pc + hs) * k;
  b += `<rect x="${rl}" y="${ry}" width="${f.Bx * k}" height="${hs * k}" fill="url(#hc)" stroke="#111" stroke-width="2"/>`;
  const cwid = f.c1 / 1000 * k, cl = rl + (f.Bx * k - cwid) / 2;
  b += `<rect x="${cl}" y="${ry - colH * k}" width="${cwid}" height="${colH * k}" fill="url(#hc)" stroke="#111" stroke-width="2"/>`;
  const cvk = Math.max(f.cover / 1000 * k, 5), yb = ry + hs * k - cvk;
  b += `<path d="M${rl + cvk} ${yb - 18} L${rl + cvk} ${yb} L${rl + f.Bx * k - cvk} ${yb} L${rl + f.Bx * k - cvk} ${yb - 18}" fill="none" stroke="#dc2626" stroke-width="2"/>`;
  for (let i = 0; i < Math.min(f.ry.n, 12); i++) { const xx = rl + cvk + (f.Bx * k - 2 * cvk) * i / (Math.min(f.ry.n, 12) - 1); b += `<circle cx="${xx}" cy="${yb - 4}" r="2.5" fill="#2563eb"/>`; }
  const dx1 = cl + 6, dx2 = cl + cwid - 6;
  for (const xx of [dx1, dx2]) b += `<path d="M${xx} ${ry - colH * k + 4} L${xx} ${yb - 6} L${xx + (xx === dx1 ? -22 : 22)} ${yb - 6}" fill="none" stroke="#7c3aed" stroke-width="2"/>`;
  b += `<line x1="${sx0}" y1="${ry - 0.25 * k}" x2="${sx0 + sw}" y2="${ry - 0.25 * k}" stroke="#8b5e34" stroke-dasharray="8 4"/><text x="${sx0 + 4}" y="${ry - 0.25 * k - 4}" font-size="10" fill="#8b5e34">منسوب الردم</text>`;
  b += dimV(ry, ry + hs * k, rl, `${f.h} مم`, 12) + (f.usePC ? dimV(baseY - pc * k, baseY, left, `${Math.round(pc * 1000)}`, 34) : '');
  b += `<text x="${sx0 + sw / 2}" y="${H - 34}" font-size="12" fill="#7c3aed" text-anchor="middle">أشاير العمود: ${f.colN} أسياخ Φ${f.colBar} تُثنى على الشبكة السفلية</text><text x="${sx0 + sw / 2}" y="${H - 16}" font-size="12" fill="#475569" text-anchor="middle">${f.usePC ? `خرسانة عادية ${Math.round(f.pcT * 1000)} مم ببروز ${Math.round(f.pcProj * 1000)} مم — ` : 'خرسانة نظافة 100 مم — '}الغطاء ${f.cover} مم</text>`;
  return SVG(W, H, b);
}
const fmtM = (v) => Number(v.toFixed(2)).toString();
