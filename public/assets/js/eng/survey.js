// أدوات المساحة: مساحة الأرض من الإحداثيات، تحويل UTM، حاسبة الميزانية
import { h, ico, select, field, toast } from '../ui.js';
import { N, fmt, num, nf, kpis, checks, table, rowsEditor, layout, sectionTitle, xlsxDownload } from './common.js';

const onAny = (els, fn) => els.forEach(e => { e.addEventListener('input', fn); e.addEventListener('change', fn); });

// قراءة نقاط ملصقة من Excel أو نص: "الاسم س ص" أو "س ص"
function parsePoints(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const parts = line.trim().split(/[\t;]+|\s{1,}|,(?=\s*-?\d)/).map(x => x.trim()).filter(Boolean);
    if (!parts.length) continue;
    const nums = parts.map(p => N(p, NaN));
    const idx = nums.map((v, i) => Number.isFinite(v) ? i : -1).filter(i => i >= 0);
    if (idx.length < 2) continue;
    const name = idx[0] > 0 ? parts.slice(0, idx[0]).join(' ') : (idx.length >= 3 ? String(nums[idx[0]]) : '');
    const [xi, yi] = idx.length >= 3 && idx[0] === 0 ? [idx[1], idx[2]] : [idx[0], idx[1]];
    out.push({ name, x: String(nums[xi]), y: String(nums[yi]) });
  }
  return out;
}

/* ================= مساحة الأرض من الإحداثيات ================= */
export function coordArea(body) {
  const ed = rowsEditor({
    numbered: true,
    columns: [{ key: 'name', label: 'اسم النقطة', type: 'text', def: (d) => 'P' + (d.length + 1) }, { key: 'x', label: 'الشرقيات X (م)', type: 'num' }, { key: 'y', label: 'الشماليات Y (م)', type: 'num' }],
    rows: [{ name: 'P1', x: '500000', y: '2700000' }, { name: 'P2', x: '500030', y: '2700000' }, { name: 'P3', x: '500034', y: '2700025' }, { name: 'P4', x: '500002', y: '2700028' }],
    onChange: calc, addLabel: 'إضافة نقطة', min: 3,
  });
  const paste = h('textarea', { class: 'input', dir: 'ltr', placeholder: 'P1\t500000\t2700000\nP2\t500030\t2700000\n…', style: { minHeight: '80px' } });
  const pBtn = h('button', { type: 'button', class: 'btn light sm' }, ico('upload', 16), 'استيراد النقاط الملصقة');
  pBtn.onclick = () => { const pts = parsePoints(paste.value); if (pts.length < 3) return toast('تعذّر التعرف على ثلاث نقاط على الأقل.', true); ed.set(pts.map((p, i) => ({ ...p, name: p.name || 'P' + (i + 1) }))); paste.value = ''; toast(`استُوردت ${pts.length} نقطة.`); };
  const ui = layout(body, {
    inputs: [sectionTitle('نقاط القطعة بالترتيب حول المحيط', 'land-plot'), ed.el, sectionTitle('أو الصق من Excel', 'copy'), h('p', { class: 'eng-sub' }, 'انسخ الأعمدة (الاسم، X، Y) أو (X، Y) من Excel أو من ملف نصي، والصقها هنا.'), paste, h('div', { style: { marginTop: '8px' } }, pBtn)],
  });
  let res = null;
  function calc() {
    const P = ed.data.map(r => ({ name: r.name, x: N(r.x, NaN), y: N(r.y, NaN) })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (P.length < 3) return ui.show(h('div', { class: 'note info' }, 'أدخل ثلاث نقاط على الأقل.'));
    // نقل الأصل إلى أول نقطة لتحسين الدقة مع الإحداثيات الكبيرة
    const x0 = P[0].x, y0 = P[0].y, Q = P.map(p => ({ ...p, X: p.x - x0, Y: p.y - y0 }));
    let A2 = 0, cx = 0, cy = 0, per = 0; const sides = [];
    for (let i = 0; i < Q.length; i++) {
      const a = Q[i], b = Q[(i + 1) % Q.length], cr = a.X * b.Y - b.X * a.Y;
      A2 += cr; cx += (a.X + b.X) * cr; cy += (a.Y + b.Y) * cr;
      const L = Math.hypot(b.X - a.X, b.Y - a.Y); per += L;
      let az = Math.atan2(b.X - a.X, b.Y - a.Y) * 180 / Math.PI; if (az < 0) az += 360;
      sides.push({ from: a.name, to: b.name, L, az });
    }
    const A = Math.abs(A2) / 2, Cx = cx / (3 * A2) + x0, Cy = cy / (3 * A2) + y0;
    const cross = selfIntersects(Q);
    const fd = A / 4200.83, F = Math.floor(fd + 1e-9), qr = (fd - F) * 24, Qt = Math.floor(qr + 1e-9), S = (qr - Qt) * 24;
    res = { P, A, per, sides, Cx, Cy };
    ui.show(
      kpis([['المساحة', fmt(A, 2), 'م²', 'main'], ['المحيط', fmt(per, 2), 'م'], ['بالتقسيم المصري', `${F} ف ${Qt} ط ${fmt(S, 1)} س`], ['بالدونم', fmt(A / 1000, 4), 'دونم'], ['بالهكتار', fmt(A / 1e4, 4), 'هكتار']]),
      cross ? h('div', { class: 'note err' }, 'تتقاطع أضلاع المضلع؛ تأكد من ترتيب النقاط حول المحيط (مع عقارب الساعة أو عكسها).') : null,
      polySvg(Q, sides),
      table(['الضلع', 'الطول (م)', 'الانحراف من الشمال'], sides.map(s => [`${s.from} ← ${s.to}`, fmt(s.L, 3), h('span', { dir: 'ltr' }, dms(s.az))])),
      checks([{ ok: null, text: `مركز ثقل القطعة: X = ${fmt(Cx, 3)} ، Y = ${fmt(Cy, 3)}` }, { ok: null, text: 'تُحسب المساحة بطريقة شوليس (المحددات)، وهي صحيحة لأي مضلع بسيط غير متقاطع، مهما كان عدد أضلاعه.' }]),
      h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: exportX }, ico('download', 18), 'تنزيل Excel'), h('button', { type: 'button', class: 'btn light', onclick: dlSvg }, 'تنزيل الرسم SVG')));
  }
  function exportX() {
    if (!res) return;
    const n = res.P.length, f = 4, l = f + n - 1;
    const rows = res.P.map((p, i) => [p.name, p.x, p.y, (row) => ({ formula: `B${row}*C${i === n - 1 ? f : row + 1}-B${i === n - 1 ? f : row + 1}*C${row}` }), (row) => ({ formula: `SQRT((B${i === n - 1 ? f : row + 1}-B${row})^2+(C${i === n - 1 ? f : row + 1}-C${row})^2)` })]);
    rows.push(['المساحة (م²)', '', '', { formula: `ABS(SUM(D${f}:D${l}))/2` }, '']);
    rows.push(['المحيط (م)', '', '', '', { formula: `SUM(E${f}:E${l})` }]);
    xlsxDownload('plot-area.xlsx', [{ name: 'المساحة', title: 'حساب مساحة قطعة أرض من الإحداثيات', columns: [{ header: 'النقطة', width: 12 }, { header: 'X', width: 16, fmt: '0.000' }, { header: 'Y', width: 16, fmt: '0.000' }, { header: 'Xi·Yi+1 − Xi+1·Yi', width: 22, fmt: '#,##0.000' }, { header: 'طول الضلع (م)', width: 15, fmt: '0.000' }], rows, boldRows: [n, n + 1] }]);
  }
  function dlSvg() { const s = body.querySelector('.eng-res svg'); if (!s) return; const b = new Blob([new XMLSerializer().serializeToString(s)], { type: 'image/svg+xml' }); const a = h('a', { href: URL.createObjectURL(b), download: 'plot.svg' }); document.body.append(a); a.click(); a.remove(); }
  calc();
}
function selfIntersects(Q) {
  const n = Q.length, seg = (i) => [Q[i], Q[(i + 1) % n]];
  const ccw = (a, b, c) => (c.Y - a.Y) * (b.X - a.X) - (b.Y - a.Y) * (c.X - a.X);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
    const [a, b] = seg(i), [c, d] = seg(j);
    if (ccw(a, b, c) * ccw(a, b, d) < 0 && ccw(c, d, a) * ccw(c, d, b) < 0) return true;
  }
  return false;
}
function dms(deg) { const d = Math.floor(deg), mF = (deg - d) * 60, m = Math.floor(mF), s = (mF - m) * 60; return `${d}° ${String(m).padStart(2, '0')}′ ${s.toFixed(1).padStart(4, '0')}″`; }
function polySvg(Q, sides) {
  const xs = Q.map(p => p.X), ys = Q.map(p => p.Y), minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const W = 420, H = 300, pad = 40, s = Math.min((W - 2 * pad) / (maxX - minX || 1), (H - 2 * pad) / (maxY - minY || 1));
  const tx = (p) => pad + (p.X - minX) * s + ((W - 2 * pad) - (maxX - minX) * s) / 2, ty = (p) => H - pad - (p.Y - minY) * s - ((H - 2 * pad) - (maxY - minY) * s) / 2;
  const pts = Q.map(p => `${tx(p).toFixed(1)},${ty(p).toFixed(1)}`).join(' ');
  let labels = '', lens = '';
  Q.forEach((p, i) => { labels += `<circle cx="${tx(p)}" cy="${ty(p)}" r="4" fill="#047857"/><text x="${tx(p) + 6}" y="${ty(p) - 6}" font-size="12" font-weight="700" fill="#111">${String(p.name).replace(/[<&]/g, '')}</text>`; const q = Q[(i + 1) % Q.length]; lens += `<text x="${(tx(p) + tx(q)) / 2}" y="${(ty(p) + ty(q)) / 2}" font-size="11" fill="#b45309" text-anchor="middle">${fmt(sides[i].L, 2)}</text>`; });
  const wrap = h('div', { style: { margin: '6px 0 12px' } });
  wrap.innerHTML = `<svg class="eng-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Cairo, Arial"><rect width="${W}" height="${H}" fill="#fff"/><polygon points="${pts}" fill="rgba(4,120,87,.12)" stroke="#047857" stroke-width="2"/>${lens}${labels}<g transform="translate(${W - 22},28)"><path d="M0 12 L0 -12 M-5 -5 L0 -12 L5 -5" stroke="#111" fill="none" stroke-width="1.5"/><text y="24" font-size="11" text-anchor="middle">N</text></g></svg>`;
  return wrap;
}

/* ================= تحويل UTM (WGS84) ================= */
const WGS = { a: 6378137, f: 1 / 298.257223563, k0: 0.9996 };
function toUTM(lat, lon, forceZone) {
  const { a, f, k0 } = WGS, e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const zone = forceZone || Math.floor((lon + 180) / 6) + 1, lon0 = (zone - 1) * 6 - 180 + 3;
  const φ = lat * Math.PI / 180, λ = (lon - lon0) * Math.PI / 180;
  const Nn = a / Math.sqrt(1 - e2 * Math.sin(φ) ** 2), T = Math.tan(φ) ** 2, C = ep2 * Math.cos(φ) ** 2, A = Math.cos(φ) * λ;
  const M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * φ - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * φ) + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * φ) - (35 * e2 ** 3 / 3072) * Math.sin(6 * φ));
  const E = k0 * Nn * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5 / 120) + 500000;
  let Nr = k0 * (M + Nn * Math.tan(φ) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6 / 720));
  if (lat < 0) Nr += 10000000;
  return { E, N: Nr, zone, hemi: lat >= 0 ? 'N' : 'S' };
}
function fromUTM(E, Nr, zone, hemi) {
  const { a, f, k0 } = WGS, e2 = f * (2 - f), ep2 = e2 / (1 - e2), e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const x = E - 500000, y = hemi === 'S' ? Nr - 10000000 : Nr, lon0 = (zone - 1) * 6 - 180 + 3;
  const M = y / k0, mu = M / (a * (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256));
  const φ1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + (151 * e1 ** 3 / 96) * Math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const N1 = a / Math.sqrt(1 - e2 * Math.sin(φ1) ** 2), T1 = Math.tan(φ1) ** 2, C1 = ep2 * Math.cos(φ1) ** 2, R1 = a * (1 - e2) / (1 - e2 * Math.sin(φ1) ** 2) ** 1.5, D = x / (N1 * k0);
  const lat = φ1 - (N1 * Math.tan(φ1) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4 / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6 / 720);
  const lon = (D - (1 + 2 * T1 + C1) * D ** 3 / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5 / 120) / Math.cos(φ1);
  return { lat: lat * 180 / Math.PI, lon: lon0 + lon * 180 / Math.PI };
}
// قراءة الدرجات: عشرية أو درجات ودقائق وثوانٍ
export function parseDeg(s) {
  const t = String(s || '').trim().replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٫/g, '.');
  if (!t) return NaN;
  const neg = /[SWجغ]/i.test(t) || /^-/.test(t);
  const p = t.match(/\d+(?:\.\d+)?/g); if (!p) return NaN;
  const v = (+p[0]) + (p[1] ? +p[1] / 60 : 0) + (p[2] ? +p[2] / 3600 : 0);
  return neg ? -v : v;
}
const dmsLat = (v, pos, neg) => { const a = Math.abs(v), d = Math.floor(a), mF = (a - d) * 60, m = Math.floor(mF), s = (mF - m) * 60; return `${d}° ${m}′ ${s.toFixed(3)}″ ${v >= 0 ? pos : neg}`; };
export function utm(body) {
  let mode = 'g2u';
  const seg = h('div', { class: 'seg' });
  [['g2u', 'جغرافي ← UTM'], ['u2g', 'UTM ← جغرافي'], ['batch', 'قائمة نقاط']].forEach(([v, t]) => { const b = h('button', { type: 'button', class: v === mode ? 'on' : '' }, t); b.onclick = () => { mode = v; [...seg.children].forEach(x => x.classList.toggle('on', x === b)); draw(); calc(); }; seg.append(b); });
  const lat = h('input', { class: 'input', dir: 'ltr', value: "24°42'49.3\"N" }), lon = h('input', { class: 'input', dir: 'ltr', value: "46°40'31.6\"E" }), zoneF = num('', { placeholder: 'تلقائي' });
  const E = num(668000), Nn = num(2733000), zone = num(38), hemi = select([['N', 'الشمالي'], ['S', 'الجنوبي']], 'N');
  const bDir = select([['g2u', 'من جغرافي (خط العرض، خط الطول) إلى UTM'], ['u2g', 'من UTM (الشرقيات، الشماليات) إلى جغرافي']], 'g2u'), bZone = num(38), bHemi = select([['N', 'الشمالي'], ['S', 'الجنوبي']], 'N');
  const bText = h('textarea', { class: 'input', dir: 'ltr', style: { minHeight: '140px' }, placeholder: 'P1  24.7137  46.6754\nP2  24.7201  46.6810' });
  const g = h('div', { class: 'opts' }, field('خط العرض', lat, 'عشري مثل 24.7137 أو بالدرجات 24°42\'49"N'), field('خط الطول', lon, 'عشري مثل 46.6754 أو 46°40\'31"E'), nf('فرض نطاق محدد (اختياري)', zoneF));
  const u = h('div', { class: 'opts' }, nf('الشرقيات Easting', E, 'م'), nf('الشماليات Northing', Nn, 'م'), nf('رقم النطاق Zone', zone), field('نصف الكرة', hemi));
  const b = h('div', {}, h('div', { class: 'opts' }, field('اتجاه التحويل', bDir), nf('النطاق (للتحويل من UTM أو لفرضه)', bZone), field('نصف الكرة', bHemi)), h('label', { class: 'field', style: { marginTop: '12px' } }, h('span', {}, 'النقاط (اسم اختياري ثم قيمتان في كل سطر)'), bText));
  function draw() { g.style.display = mode === 'g2u' ? '' : 'none'; u.style.display = mode === 'u2g' ? '' : 'none'; b.style.display = mode === 'batch' ? '' : 'none'; }
  const ui = layout(body, { intro: 'التحويل على مرجع WGS84 ونطاقات UTM القياسية. مصر تقع في النطاقات 35 إلى 37 شمالًا، والسعودية في النطاقات 36 إلى 40 شمالًا.', inputs: [seg, g, u, b] });
  onAny([lat, lon, zoneF, E, Nn, zone, hemi, bDir, bZone, bHemi, bText], calc); draw();
  let batchOut = [];
  function calc() {
    if (mode === 'g2u') {
      const φ = parseDeg(lat.value), λ = parseDeg(lon.value);
      if (!(Math.abs(φ) <= 84 && Math.abs(λ) <= 180)) return ui.show(h('div', { class: 'note err' }, 'أدخل خط عرض بين 84− و 84، وخط طول بين 180− و 180.'));
      const r = toUTM(φ, λ, N(zoneF.value, 0) || 0);
      ui.show(kpis([['الشرقيات E', fmt(r.E, 3), 'م', 'main'], ['الشماليات N', fmt(r.N, 3), 'م', 'main'], ['النطاق', `${r.zone}${r.hemi}`]]),
        table(['الصيغة', 'القيمة'], [['عشري', `${φ.toFixed(7)}, ${λ.toFixed(7)}`], ['درجات ودقائق وثوانٍ', `${dmsLat(φ, 'N', 'S')} — ${dmsLat(λ, 'E', 'W')}`], ['رمز EPSG', String((r.hemi === 'N' ? 32600 : 32700) + r.zone)]]),
        mapLink(φ, λ));
    } else if (mode === 'u2g') {
      const z = N(zone.value, 0); if (!(z >= 1 && z <= 60)) return ui.show(h('div', { class: 'note err' }, 'رقم النطاق بين 1 و 60.'));
      const r = fromUTM(N(E.value, 0), N(Nn.value, 0), z, hemi.value);
      ui.show(kpis([['خط العرض', r.lat.toFixed(7), '°', 'main'], ['خط الطول', r.lon.toFixed(7), '°', 'main']]),
        table(['الصيغة', 'القيمة'], [['درجات ودقائق وثوانٍ', `${dmsLat(r.lat, 'N', 'S')} — ${dmsLat(r.lon, 'E', 'W')}`]]), mapLink(r.lat, r.lon));
    } else {
      const pts = parsePoints(bText.value);
      batchOut = pts.map((p, i) => {
        const a = N(p.x), c = N(p.y), name = p.name || 'P' + (i + 1);
        if (bDir.value === 'g2u') { const r = toUTM(a, c, N(bZone.value, 0) || 0); return [name, a, c, +r.E.toFixed(3), +r.N.toFixed(3), r.zone + r.hemi]; }
        const r = fromUTM(a, c, N(bZone.value, 38), bHemi.value); return [name, a, c, +r.lat.toFixed(8), +r.lon.toFixed(8), N(bZone.value, 38) + bHemi.value];
      });
      const hd = bDir.value === 'g2u' ? ['النقطة', 'خط العرض', 'خط الطول', 'E', 'N', 'النطاق'] : ['النقطة', 'E', 'N', 'خط العرض', 'خط الطول', 'النطاق'];
      ui.show(batchOut.length ? table(hd, batchOut.map(r => r.map(String))) : h('div', { class: 'note info' }, 'الصق النقاط في المربع.'),
        batchOut.length ? h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: () => xlsxDownload('utm-points.xlsx', [{ name: 'النقاط', columns: hd.map(x => ({ header: x, width: 16 })), rows: batchOut }]) }, ico('download', 18), 'تنزيل Excel')) : null);
    }
  }
  calc();
}
const mapLink = (lat, lon) => h('div', { class: 'actions' }, h('a', { class: 'btn light', href: `https://www.google.com/maps?q=${lat.toFixed(7)},${lon.toFixed(7)}`, target: '_blank', rel: 'noopener' }, ico('external-link', 16), 'عرض على الخريطة'));

/* ================= الميزانية والمناسيب ================= */
export function leveling(body) {
  const method = select([['hi', 'طريقة سطح الميزان (منسوب خط النظر)'], ['rf', 'طريقة الارتفاع والانخفاض']], 'hi');
  const start = num(100), close = num(''), dist = num(''), tolK = num(12);
  const ed = rowsEditor({
    numbered: true,
    columns: [{ key: 'st', label: 'النقطة', type: 'text', placeholder: 'BM1' }, { key: 'bs', label: 'مؤخرة BS', type: 'num' }, { key: 'is', label: 'متوسطة IS', type: 'num' }, { key: 'fs', label: 'مقدمة FS', type: 'num' }],
    rows: [{ st: 'BM1', bs: '1.525' }, { st: 'A', is: '2.110' }, { st: 'B', is: '1.875' }, { st: 'CP1', bs: '0.985', fs: '2.640' }, { st: 'C', is: '1.320' }, { st: 'BM2', fs: '1.105' }],
    onChange: calc, addLabel: 'إضافة قراءة', min: 2,
  });
  const ui = layout(body, {
    wide: true, intro: 'نقطة الدوران (CP) تُسجَّل في صف واحد بقراءتيها: المقدمة قبل نقل الجهاز، والمؤخرة بعد نقله.',
    inputs: [h('div', { class: 'opts', style: { marginTop: 0 } }, field('طريقة الحساب', method), nf('منسوب نقطة البداية', start, 'م'), nf('المنسوب المعلوم لنقطة النهاية (اختياري)', close, 'م', 'لحساب خطأ القفل وتوزيعه'), nf('طول خط الميزانية', dist, 'كم'), nf('معامل الخطأ المسموح', tolK, 'مم × √كم')), sectionTitle('دفتر الميزانية', 'mountain'), ed.el],
  });
  onAny([method, start, close, dist, tolK], calc);
  function calc() {
    const rows = ed.data.map(r => ({ st: r.st || '', bs: N(r.bs, NaN), is: N(r.is, NaN), fs: N(r.fs, NaN) }));
    let HI = NaN, prev = NaN, rl = N(start.value, 0), sBS = 0, sFS = 0, sR = 0, sF = 0, setup = 0; const out = [];
    rows.forEach((r, i) => {
      let rise = '', fall = '', hi = '';
      const fore = Number.isFinite(r.fs) ? r.fs : r.is;
      if (i > 0 && Number.isFinite(fore)) {
        const d = prev - fore; if (d >= 0) { rise = d; sR += d; } else { fall = -d; sF += -d; }
        rl = HI - fore;
      }
      if (Number.isFinite(r.fs) && i > 0) sFS += r.fs;
      const sAt = setup; // رقم نصبة الجهاز التي قيست فيها قراءة المقدمة أو المتوسطة
      if (Number.isFinite(r.bs)) { sBS += r.bs; HI = rl + r.bs; prev = r.bs; hi = HI; setup++; } else if (Number.isFinite(fore)) prev = fore;
      out.push({ ...r, rise, fall, hi, rl, setup: sAt });
    });
    const lastRL = out.length ? out[out.length - 1].rl : NaN;
    const checkA = sBS - sFS, checkB = lastRL - N(start.value, 0), checkC = sR - sF;
    const known = N(close.value, NaN), err = Number.isFinite(known) ? lastRL - known : NaN;
    const tol = N(dist.value, NaN) > 0 ? N(tolK.value, 12) * Math.sqrt(N(dist.value)) / 1000 : NaN;
    const totalSetups = setup;
    out.forEach(r => { r.adj = Number.isFinite(err) ? r.rl - err * (r.setup / totalSetups) : NaN; });
    const rf = method.value === 'rf';
    const f3 = (v) => v === '' || !Number.isFinite(v) ? '' : v.toFixed(3);
    const hd = ['النقطة', 'BS', 'IS', 'FS', rf ? 'ارتفاع' : 'منسوب خط النظر', rf ? 'انخفاض' : null, 'المنسوب', Number.isFinite(err) ? 'المنسوب المصحح' : null].filter(Boolean);
    ui.show(
      kpis([['منسوب آخر نقطة', fmt(lastRL, 3), 'م', 'main'], ['∑BS − ∑FS', fmt(checkA, 3), 'م'], ['آخر منسوب − أول منسوب', fmt(checkB, 3), 'م'], Number.isFinite(err) ? ['خطأ القفل', fmt(err * 1000, 1), 'مم', Number.isFinite(tol) && Math.abs(err) > tol ? 'bad' : ''] : null]),
      table(hd, out.map(r => [r.st, f3(r.bs), f3(r.is), f3(r.fs), ...(rf ? [f3(r.rise), f3(r.fall)] : [f3(r.hi)]), f3(r.rl), ...(Number.isFinite(err) ? [f3(r.adj)] : [])])),
      checks([
        { ok: Math.abs(checkA - checkB) < 5e-4, text: `التحقق الحسابي: ∑BS − ∑FS = ${checkA.toFixed(3)} ، وآخر منسوب − أول منسوب = ${checkB.toFixed(3)}` },
        rf ? { ok: Math.abs(checkC - checkB) < 5e-4, text: `∑الارتفاع − ∑الانخفاض = ${checkC.toFixed(3)}` } : null,
        Number.isFinite(err) && Number.isFinite(tol) ? { ok: Math.abs(err) <= tol, text: `خطأ القفل ${fmt(err * 1000, 1)} مم، والمسموح ±${fmt(tol * 1000, 1)} مم`, ref: `الخطأ المسموح = ${N(tolK.value, 12)} مم × √(الطول بالكيلومتر)` } : null,
        Number.isFinite(err) ? { ok: null, text: 'وُزّع التصحيح تراكميًا بالتناسب مع عدد مرات نصب الجهاز حتى كل نقطة.' } : null,
      ]),
      h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: () => xlsxDownload('leveling.xlsx', [{ name: 'الميزانية', title: 'دفتر الميزانية', columns: hd.map(x => ({ header: x, width: 14, fmt: x === 'النقطة' ? undefined : '0.000' })), rows: out.map(r => [r.st, num0(r.bs), num0(r.is), num0(r.fs), ...(rf ? [num0(r.rise), num0(r.fall)] : [num0(r.hi)]), +r.rl.toFixed(4), ...(Number.isFinite(err) ? [+r.adj.toFixed(4)] : [])]) }]) }, ico('download', 18), 'تنزيل Excel')));
  }
  const num0 = (v) => v === '' || !Number.isFinite(v) ? '' : +v.toFixed(4);
  calc();
}
