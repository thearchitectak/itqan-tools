// مولّد ملفات IES (IESNA LM-63-2002) لأنواع السبوتات الشائعة، مع معايرة الفيض الضوئي باللومن.

export const IES_PROFILES = [
  { id: 'spot15', ar: 'سبوت ضيق 15°', beam: 15, kind: 'gauss', lm: 450 },
  { id: 'spot24', ar: 'سبوت 24°', beam: 24, kind: 'gauss', lm: 600 },
  { id: 'spot36', ar: 'سبوت 36°', beam: 36, kind: 'gauss', lm: 700 },
  { id: 'flood60', ar: 'كشاف عريض 60°', beam: 60, kind: 'gauss', lm: 900 },
  { id: 'down90', ar: 'داون لايت 90°', beam: 90, kind: 'cos', lm: 1000 },
  { id: 'down120', ar: 'داون لايت عريض 120°', beam: 120, kind: 'cos', lm: 1200 },
  { id: 'washer', ar: 'غاسل جدران (غير متماثل)', beam: 50, kind: 'washer', lm: 800 },
  { id: 'uplight', ar: 'إضاءة لأعلى (أبلايت) 30°', beam: 30, kind: 'up', lm: 500 },
];

const rad = (d) => d * Math.PI / 180;
function shape(p, th, ph) { // الشدة النسبية عند الزاوية الرأسية th (0 = للأسفل) والأفقية ph
  const half = p.beam / 2;
  if (p.kind === 'gauss') return Math.exp(-Math.LN2 * (th / half) ** 2) + (th < 85 ? 0.004 * Math.cos(rad(th)) : 0);
  if (p.kind === 'cos') { const n = Math.log(0.5) / Math.log(Math.cos(rad(half))); return th < 90 ? Math.cos(rad(th)) ** n : 0; }
  if (p.kind === 'up') { const t = 180 - th; return Math.exp(-Math.LN2 * (t / half) ** 2); }
  if (p.kind === 'washer') { // مركز الحزمة مائل 35° نحو الجدار (ph = 0)
    const lobe = Math.exp(-Math.LN2 * ((th - 35) / 28) ** 2); const dir = 0.25 + 0.75 * Math.max(0, Math.cos(rad(ph))) ** 2;
    return th < 95 ? lobe * dir : 0;
  }
  return 0;
}

export function iesFile(p, lumens, cct) {
  const V = []; for (let a = 0; a <= 180; a += 1) V.push(a);
  const Hs = p.kind === 'washer' ? Array.from({ length: 25 }, (_, i) => i * 15) : [0];
  const I = Hs.map(ph => V.map(th => shape(p, th, ph)));
  // الفيض = متوسط على الزاوية الأفقية لـ 2π∫I sinθ dθ
  let flux = 0;
  for (let k = 0; k < Hs.length; k++) { let s = 0; for (let i = 1; i < V.length; i++) { const t0 = rad(V[i - 1]), t1 = rad(V[i]); s += (I[k][i - 1] * Math.sin(t0) + I[k][i] * Math.sin(t1)) / 2 * (t1 - t0); } flux += 2 * Math.PI * s; }
  flux /= Hs.length;
  const sc = lumens / flux;
  const lines = [
    'IESNA:LM-63-2002', `[TEST] ITQAN Tools generated photometry`, '[MANUFAC] ITQAN Tools (itqan-tools.pages.dev)', `[LUMCAT] ITQ-${p.id.toUpperCase()}-${lumens}LM`,
    `[LUMINAIRE] ${p.id} beam ${p.beam} deg`, `[LAMP] LED ${lumens} lm ${cct}K`, `[_COLORTEMP] ${cct}K`, 'TILT=NONE',
    `1 ${lumens} 1 ${V.length} ${Hs.length} 1 2 0 0 0`, `1.0 1.0 ${Math.round(lumens / 90)}`,
  ];
  const wrap = (arr) => { const out = []; for (let i = 0; i < arr.length; i += 10) out.push(arr.slice(i, i + 10).join(' ')); return out; };
  lines.push(...wrap(V.map(String)), ...wrap(Hs.map(String)));
  for (const row of I) lines.push(...wrap(row.map(v => (v * sc).toFixed(1))));
  return lines.join('\r\n') + '\r\n';
}

// رسم قطبي لتوزيع الشدة (للمعاينة)
export function polarSvg(p) {
  const pts = []; for (let a = -180; a <= 180; a += 2) { const th = Math.abs(a); const r = shape(p, th, a >= 0 ? 0 : 180); pts.push([r * Math.sin(rad(a)), r * Math.cos(rad(a))]); }
  const mx = Math.max(...pts.map(([x, y]) => Math.hypot(x, y))) || 1;
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(50 + 44 * x / mx).toFixed(1)},${(50 + 44 * y / mx).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 100 100" width="84" height="84" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="none" stroke="#d0d5dd" stroke-width=".6"/><circle cx="50" cy="50" r="22" fill="none" stroke="#e4e7ec" stroke-width=".6"/><line x1="6" y1="50" x2="94" y2="50" stroke="#e4e7ec" stroke-width=".6"/><line x1="50" y1="6" x2="50" y2="94" stroke="#e4e7ec" stroke-width=".6"/><path d="${d}Z" fill="rgba(245,158,11,.25)" stroke="#d97706" stroke-width="1.2"/></svg>`;
}
