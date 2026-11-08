// مولّد رموز QR والباركود الخطي — رموز ثابتة (Static) تُخزَّن بياناتها داخل الرمز نفسه،
// فلا تعتمد على أي خادم ولا تنتهي صلاحيتها أبدًا.
import { supportNudge } from './profile.js';
import { h, $$, ico, toast, libs, download, field, select } from './ui.js';

const QR_TYPES = [
  ['url', 'رابط', 'link'], ['text', 'نص', 'file-text'], ['wifi', 'شبكة Wi-Fi', 'wifi'], ['whatsapp', 'واتساب', 'message-circle'],
  ['phone', 'اتصال', 'phone'], ['sms', 'رسالة نصية', 'message-circle'], ['email', 'بريد إلكتروني', 'mail'], ['vcard', 'بطاقة تواصل', 'user'], ['geo', 'موقع جغرافي', 'globe'],
];

function inputs(type) {
  const I = (ph, attrs = {}) => h('input', { class: 'input', placeholder: ph, ...attrs });
  const T = (ph) => h('textarea', { class: 'input', placeholder: ph });
  const f = {};
  const add = (k, label, el, hint) => { f[k] = el; return field(label, el, hint); };
  let els = [];
  switch (type) {
    case 'url': els = [add('url', 'الرابط', I('https://example.com', { dir: 'ltr', value: 'https://' }))]; break;
    case 'text': els = [add('text', 'النص', T('اكتب النص الذي تريد تحويله إلى رمز'))]; break;
    case 'wifi': els = [add('ssid', 'اسم الشبكة', I('اسم الشبكة', { dir: 'auto' })), add('pass', 'كلمة المرور', I('كلمة المرور', { dir: 'ltr' })), add('enc', 'نوع الحماية', select([['WPA', 'WPA/WPA2/WPA3'], ['WEP', 'WEP'], ['nopass', 'بدون كلمة مرور']], 'WPA')), h('label', { class: 'check' }, f.hidden = h('input', { type: 'checkbox' }), 'شبكة مخفية')]; break;
    case 'whatsapp': els = [add('phone', 'رقم الواتساب مع رمز الدولة', I('966500000000', { dir: 'ltr', inputmode: 'tel' }), 'اكتب الرقم دون علامة + أو أصفار في البداية'), add('msg', 'رسالة جاهزة (اختياري)', T('مرحبًا، أود الاستفسار عن ...'))]; break;
    case 'phone': els = [add('phone', 'رقم الهاتف', I('+966500000000', { dir: 'ltr', inputmode: 'tel' }))]; break;
    case 'sms': els = [add('phone', 'رقم الهاتف', I('+966500000000', { dir: 'ltr' })), add('msg', 'نص الرسالة', T('نص الرسالة'))]; break;
    case 'email': els = [add('to', 'البريد الإلكتروني', I('name@example.com', { dir: 'ltr', type: 'email' })), add('subject', 'الموضوع', I('موضوع الرسالة')), add('body', 'نص الرسالة', T('نص الرسالة'))]; break;
    case 'vcard': els = [add('name', 'الاسم الكامل', I('المهندس/ أحمد خالد')), add('org', 'الجهة أو الشركة', I('اسم الجهة')), add('title', 'المسمى الوظيفي', I('مهندس معماري')), add('phone', 'الجوال', I('+966500000000', { dir: 'ltr' })), add('email', 'البريد الإلكتروني', I('name@example.com', { dir: 'ltr' })), add('web', 'الموقع الإلكتروني', I('https://', { dir: 'ltr' })), add('addr', 'العنوان', I('المدينة، الدولة'))]; break;
    case 'geo': els = [add('lat', 'خط العرض', I('24.7136', { dir: 'ltr' })), add('lng', 'خط الطول', I('46.6753', { dir: 'ltr' })), h('small', { class: 'muted' }, 'يمكنك نسخ الإحداثيات من خرائط Google بالضغط المطوّل على الموقع.')]; break;
  }
  return { els, f };
}

function buildData(type, f) {
  const v = (k) => (f[k]?.value || '').trim();
  const escW = (s) => s.replace(/([\\;,:"])/g, '\\$1');
  switch (type) {
    case 'url': return v('url').replace(/^https?:\/\/$/, '');
    case 'text': return v('text');
    case 'wifi': return v('ssid') ? `WIFI:T:${v('enc')};S:${escW(v('ssid'))};${v('enc') !== 'nopass' ? `P:${escW(v('pass'))};` : ''}${f.hidden?.checked ? 'H:true;' : ''};` : '';
    case 'whatsapp': { const p = v('phone').replace(/\D/g, '').replace(/^00/, ''); return p ? `https://wa.me/${p}${v('msg') ? '?text=' + encodeURIComponent(v('msg')) : ''}` : ''; }
    case 'phone': return v('phone') ? `tel:${v('phone').replace(/\s/g, '')}` : '';
    case 'sms': return v('phone') ? `SMSTO:${v('phone').replace(/\s/g, '')}:${v('msg')}` : '';
    case 'email': { if (!v('to')) return ''; const q = []; if (v('subject')) q.push('subject=' + encodeURIComponent(v('subject'))); if (v('body')) q.push('body=' + encodeURIComponent(v('body'))); return `mailto:${v('to')}${q.length ? '?' + q.join('&') : ''}`; }
    case 'vcard': { if (!v('name')) return ''; const L = ['BEGIN:VCARD', 'VERSION:3.0', `FN;CHARSET=UTF-8:${v('name')}`, `N;CHARSET=UTF-8:${v('name')};;;;`]; if (v('org')) L.push(`ORG;CHARSET=UTF-8:${v('org')}`); if (v('title')) L.push(`TITLE;CHARSET=UTF-8:${v('title')}`); if (v('phone')) L.push(`TEL;TYPE=CELL:${v('phone')}`); if (v('email')) L.push(`EMAIL:${v('email')}`); if (v('web')) L.push(`URL:${v('web')}`); if (v('addr')) L.push(`ADR;CHARSET=UTF-8:;;${v('addr')};;;;`); L.push('END:VCARD'); return L.join('\n'); }
    case 'geo': return v('lat') && v('lng') ? `geo:${v('lat')},${v('lng')}` : '';
  }
  return '';
}

export async function renderQR(body, t) {
  const QRCodeStyling = await libs.qr();
  let type = 'url';
  const tabs = h('div', { class: 'tabs' });
  const form = h('div', { class: 'opts', style: { marginTop: 0 } });
  let cur = null;
  const fg = h('input', { type: 'color', value: '#000000', class: 'input', style: { height: '42px', padding: '4px' } });
  const fg2 = h('input', { type: 'color', value: '#0f766e', class: 'input', style: { height: '42px', padding: '4px' } });
  const grad = h('input', { type: 'checkbox' });
  const bg = h('input', { type: 'color', value: '#ffffff', class: 'input', style: { height: '42px', padding: '4px' } });
  const transparent = h('input', { type: 'checkbox' });
  const dots = select([['square', 'مربعات'], ['rounded', 'مستديرة'], ['dots', 'نقاط'], ['classy', 'أنيقة'], ['classy-rounded', 'أنيقة مستديرة'], ['extra-rounded', 'مستديرة جدًا']], 'square');
  const corners = select([['square', 'مربعة'], ['extra-rounded', 'مستديرة'], ['dot', 'دائرية']], 'square');
  const size = select([['512', '512 بكسل'], ['1024', '1024 بكسل'], ['2048', '2048 بكسل (للطباعة)']], '1024');
  const ec = select([['M', 'متوسط (15٪)'], ['Q', 'مرتفع (25٪)'], ['H', 'الأعلى (30٪) — موصى به مع الشعار'], ['L', 'منخفض (7٪)']], 'M');
  const logo = h('input', { type: 'file', accept: 'image/*', class: 'input' });
  const clearLogo = h('button', { class: 'btn light sm', type: 'button' }, 'إزالة الشعار');
  let logoUrl = '';
  logo.onchange = () => { const f = logo.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { logoUrl = r.result; ec.value = 'H'; update(); }; r.readAsDataURL(f); };
  clearLogo.onclick = () => { logoUrl = ''; logo.value = ''; update(); };

  const preview = h('div', { class: 'box' });
  const dataInfo = h('div', { class: 'muted', style: { fontSize: '13px', marginTop: '8px', wordBreak: 'break-all', direction: 'ltr' } });
  const qr = new QRCodeStyling({ width: 300, height: 300, type: 'canvas', data: ' ', margin: 10, qrOptions: { errorCorrectionLevel: 'M' } });
  qr.append(preview);

  const options = (w) => ({
    width: w, height: w, data: buildData(type, cur.f) || ' ', margin: Math.round(w / 30), image: logoUrl || undefined,
    qrOptions: { errorCorrectionLevel: ec.value },
    dotsOptions: { type: dots.value, ...(grad.checked ? { gradient: { type: 'linear', rotation: Math.PI / 4, colorStops: [{ offset: 0, color: fg.value }, { offset: 1, color: fg2.value }] }, color: undefined } : { color: fg.value, gradient: undefined }) },
    cornersSquareOptions: { type: corners.value, color: fg.value }, cornersDotOptions: { type: corners.value === 'square' ? 'square' : 'dot', color: fg.value },
    backgroundOptions: { color: transparent.checked ? 'transparent' : bg.value },
    imageOptions: { crossOrigin: 'anonymous', margin: Math.round(w / 60), imageSize: 0.35, hideBackgroundDots: true },
  });
  function update() { try { const d = buildData(type, cur.f); qr.update(options(300)); dataInfo.textContent = d ? (d.length > 160 ? d.slice(0, 160) + '…' : d) : 'أدخل البيانات لعرض الرمز'; } catch (e) { dataInfo.textContent = 'البيانات أطول من السعة القصوى للرمز.'; } }
  function setType(tp) {
    type = tp; $$('button', tabs).forEach(b => b.classList.toggle('on', b.dataset.t === tp));
    cur = inputs(tp); form.innerHTML = ''; cur.els.forEach(e => form.append(e));
    form.querySelectorAll('input,textarea,select').forEach(e => e.addEventListener('input', update));
    update();
  }
  QR_TYPES.forEach(([id, label, ic]) => { const b = h('button', { type: 'button', 'data-t': id }, ico(ic, 16), label); b.onclick = () => setType(id); tabs.append(b); });
  [fg, fg2, grad, bg, transparent, dots, corners, ec].forEach(e => e.addEventListener('input', update));

  async function dl(ext) {
    const d = buildData(type, cur.f); if (!d) return toast('أدخل بيانات الرمز أولًا.', true);
    const w = +size.value; const q = new QRCodeStyling({ ...options(w), type: ext === 'svg' ? 'svg' : 'canvas' });
    const blob = await q.getRawData(ext === 'jpeg' ? 'jpeg' : ext);
    download(blob, `qr-code.${ext === 'jpeg' ? 'jpg' : ext}`);
  }

  body.append(
    h('div', { class: 'note ok', style: { marginBottom: '16px' } }, 'رموز QR هنا ثابتة (Static): تُكتب البيانات داخل الرمز نفسه، فيعمل الرمز مدى الحياة دون اشتراك أو تجديد، ولا يتوقف حتى لو توقف هذا الموقع. احرص على صحة البيانات قبل الطباعة لأنه لا يمكن تعديلها بعد ذلك.'),
    h('div', { class: 'qr-layout' },
      h('div', {},
        h('div', { class: 'panel' }, h('h3', { style: { marginTop: 0 } }, '١. نوع المحتوى والبيانات'), tabs, form),
        h('div', { class: 'panel' }, h('h3', { style: { marginTop: 0 } }, '٢. التصميم'),
          h('div', { class: 'opts', style: { marginTop: 0 } },
            field('لون الرمز', fg), h('div', { class: 'field' }, h('label', { class: 'check' }, grad, 'تدرّج لوني'), fg2),
            field('لون الخلفية', bg), h('label', { class: 'check' }, transparent, 'خلفية شفافة (PNG و SVG)'),
            field('شكل النقاط', dots), field('شكل الزوايا', corners),
            field('شعار في المنتصف (اختياري)', logo), h('div', { class: 'field' }, h('span', {}, ' '), clearLogo),
            field('مستوى تصحيح الأخطاء', ec, 'كلما ارتفع، بقي الرمز مقروءًا حتى لو تلف جزء منه'), field('دقة التنزيل', size)))),
      h('div', { class: 'qr-preview' },
        h('div', { class: 'panel' }, preview, dataInfo,
          h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => dl('png') }, ico('download', 18), 'PNG'), h('button', { class: 'btn', onclick: () => dl('svg') }, ico('download', 18), 'SVG'), h('button', { class: 'btn light', onclick: () => dl('jpeg') }, 'JPG')),
          h('p', { class: 'muted', style: { fontSize: '13px' } }, 'صيغة SVG مناسبة للطباعة بأي حجم دون فقدان الجودة. اختبر الرمز بكاميرا الجوال قبل الطباعة.'), supportNudge(window.__ITQAN_CFG || {})))));
  setType('url');
}

const BAR_FORMATS = [
  ['CODE128', 'Code 128 (نص وأرقام — الأكثر استخدامًا)', 'ITQAN-2026'], ['EAN13', 'EAN-13 (باركود المنتجات)', '6281234567895'], ['EAN8', 'EAN-8', '96385074'],
  ['UPC', 'UPC-A', '123456789999'], ['CODE39', 'Code 39', 'ITQAN39'], ['ITF14', 'ITF-14 (كراتين الشحن)', '10012345000017'], ['codabar', 'Codabar', 'A12345B'], ['MSI', 'MSI', '123456'], ['pharmacode', 'Pharmacode', '1234'],
];

export async function renderBarcode(body) {
  const JsBarcode = await libs.barcode();
  const fmt = select(BAR_FORMATS.map(f => [f[0], f[1]]), 'CODE128');
  const val = h('input', { class: 'input', dir: 'ltr', value: BAR_FORMATS[0][2] });
  const width = h('input', { class: 'input', type: 'number', value: 2, min: 1, max: 6 });
  const height = h('input', { class: 'input', type: 'number', value: 100, min: 20, max: 400 });
  const showText = h('input', { type: 'checkbox', checked: true });
  const fg = h('input', { type: 'color', value: '#000000', class: 'input', style: { height: '42px', padding: '4px' } });
  const bg = h('input', { type: 'color', value: '#ffffff', class: 'input', style: { height: '42px', padding: '4px' } });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const msg = h('div', { class: 'muted center', style: { marginTop: '8px' } });
  let valid = false;
  const opts = () => ({ format: fmt.value, width: +width.value || 2, height: +height.value || 100, displayValue: showText.checked, lineColor: fg.value, background: bg.value, margin: 14, font: 'monospace', fontSize: 20, valid: v => valid = v });
  function update() { valid = false; try { JsBarcode(svg, val.value.trim(), opts()); } catch { valid = false; } msg.textContent = valid ? '' : 'القيمة غير صالحة لهذا النوع من الباركود. تحقّق من عدد الأرقام وصيغتها.'; msg.style.color = valid ? '' : 'var(--danger)'; }
  fmt.onchange = () => { val.value = BAR_FORMATS.find(f => f[0] === fmt.value)[2]; update(); };
  [val, width, height, showText, fg, bg].forEach(e => e.addEventListener('input', update));
  function dl(kind) {
    if (!valid) return toast('القيمة غير صالحة.', true);
    if (kind === 'svg') return download(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }), `barcode-${val.value.trim()}.svg`);
    const c = document.createElement('canvas'); JsBarcode(c, val.value.trim(), { ...opts(), width: (+width.value || 2) * 2, height: (+height.value || 100) * 2, fontSize: 40, margin: 28 });
    c.toBlob(b => download(b, `barcode-${val.value.trim()}.png`), 'image/png');
  }
  body.append(h('div', { class: 'qr-layout' },
    h('div', { class: 'panel' }, h('div', { class: 'opts', style: { marginTop: 0 } }, field('نوع الباركود', fmt), field('القيمة', val, 'في EAN-13 يُحسب رقم التحقق الأخير تلقائيًا إذا أدخلت 12 رقمًا'), field('عرض الخط', width), field('الارتفاع', height), field('لون الخطوط', fg), field('لون الخلفية', bg), h('label', { class: 'check' }, showText, 'إظهار القيمة أسفل الباركود'))),
    h('div', { class: 'qr-preview' }, h('div', { class: 'panel' }, h('div', { class: 'box', style: { minHeight: '200px' } }, svg), msg,
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => dl('png') }, ico('download', 18), 'PNG'), h('button', { class: 'btn', onclick: () => dl('svg') }, ico('download', 18), 'SVG'))))));
  update();
}
