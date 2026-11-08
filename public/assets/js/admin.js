import { h, $, $$, ico, toast, download, field } from './ui.js';
import { ICONS, icon } from './icons.js';
import { BRANDS, BRAND_ORDER } from './brands.js';
import { BUILTIN_TOOLS, CATEGORIES, DEFAULT_CONFIG, DEFAULT_FEASIBILITY_SECTIONS, DEFAULT_MODELS, MODE_IDS, MODE_INFO, mergeConfig, deepMerge } from './defaults.js';

const root = $('#admin');
let cfg, envS, usage, dirty = false, tab = 'overview';

async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: 'same-origin', headers: { 'content-type': 'application/json' }, ...opts });
  let d = {}; try { d = await r.json(); } catch { }
  if (!r.ok) { const e = new Error(d.error || 'حدث خطأ (' + r.status + ')'); e.status = r.status; throw e; }
  return d;
}

async function boot() {
  try { const d = await api('/api/admin/config'); cfg = mergeConfig(d.config); envS = d.env; usage = d.usage; render(); }
  catch (e) { if (e.status === 401) loginView(); else root.innerHTML = `<div class="container"><div class="note err" style="margin-top:40px">${e.status === 404 ? 'واجهة الخادم غير متاحة. تأكد أن الموقع منشور على Cloudflare Pages مع مجلد functions.' : e.message}</div></div>`; }
}

function loginView(msg) {
  root.innerHTML = '';
  const user = h('input', { class: 'input', autocomplete: 'username', dir: 'ltr' });
  const pass = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', dir: 'ltr' });
  const btn = h('button', { class: 'btn block', type: 'submit' }, ico('lock', 18), 'دخول');
  const form = h('form', { class: 'panel login' }, h('h2', { style: { marginTop: 0 } }, 'دخول المالك'), h('p', { class: 'muted' }, 'هذه الصفحة مخصصة لمالك الموقع فقط.'),
    msg ? h('div', { class: 'note err' }, msg) : null,
    field('اسم المستخدم (إن ضبطته)', user), h('div', { style: { height: '10px' } }), field('كلمة المرور', pass), h('div', { style: { height: '16px' } }), btn);
  form.onsubmit = async (e) => {
    e.preventDefault(); btn.disabled = true;
    try { await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ username: user.value, password: pass.value }) }); boot(); }
    catch (x) { btn.disabled = false; toast(x.message, true, 5000); }
  };
  root.append(h('div', { class: 'container' }, form));
  pass.focus();
}

const markDirty = () => { dirty = true; $('#save-state') && ($('#save-state').textContent = 'توجد تغييرات غير محفوظة'); };
window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

function bind(input, obj, key, kind) {
  const read = () => kind === 'bool' ? input.checked : kind === 'num' ? Number(input.value) : input.value;
  if (kind === 'bool') input.checked = !!obj[key]; else input.value = obj[key] ?? '';
  input.addEventListener('input', () => { obj[key] = read(); markDirty(); });
  input.addEventListener('change', () => { obj[key] = read(); markDirty(); });
  return input;
}
const inp = (attrs = {}) => h('input', { class: 'input', ...attrs });
const ta = (rows = 4) => h('textarea', { class: 'input', rows });
const sw = (checked, on) => { const i = h('input', { type: 'checkbox', checked }); i.onchange = () => { on(i.checked); markDirty(); }; return h('label', { class: 'switch' }, i, h('span')); };
const sel = (opts, v) => h('select', { class: 'input' }, opts.map(([a, b]) => h('option', { value: a, selected: a === v }, b)));

const TABS = [['overview', 'نظرة عامة', 'gauge'], ['site', 'هوية الموقع', 'globe'], ['profile', 'الملف التعريفي والدعم', 'hand-heart'], ['tools', 'الأدوات المدمجة', 'layout-grid'], ['services', 'الخدمات الإضافية', 'plus'], ['feas', 'دراسة الجدوى', 'sparkles'], ['backup', 'النسخ الاحتياطي', 'save']];

function render() {
  root.innerHTML = '';
  const side = h('div', { class: 'side' }, TABS.map(([id, t, ic]) => h('button', { class: id === tab ? 'on' : '', onclick: () => { tab = id; render(); } }, ico(ic, 18), t)),
    h('button', { onclick: async () => { await api('/api/admin/logout', { method: 'POST' }); location.reload(); } }, ico('log-out', 18), 'تسجيل الخروج'));
  const main = h('div');
  ({ overview, site, profile, tools, services, feas, backup })[tab](main);
  const saveBtn = h('button', { class: 'btn' }, ico('save', 18), 'حفظ التغييرات');
  saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    try { const d = await api('/api/admin/config', { method: 'PUT', body: JSON.stringify(cfg) }); cfg = mergeConfig(d.config); dirty = false; toast('تم حفظ التغييرات، وستظهر في الموقع خلال دقيقة على الأكثر.'); render(); }
    catch (e) { if (e.status === 401) { toast('انتهت الجلسة، سجّل الدخول مجددًا.', true); loginView(); } else toast(e.message, true, 7000); }
    saveBtn.disabled = false;
  };
  root.append(h('div', { class: 'container admin' }, side, main),
    h('div', { class: 'savebar' }, h('div', { class: 'container' }, saveBtn, h('span', { id: 'save-state', class: 'muted' }, dirty ? 'توجد تغييرات غير محفوظة' : 'لا توجد تغييرات غير محفوظة'), h('span', { class: 'spacer' }), h('a', { href: '/', target: '_blank', class: 'btn light sm' }, ico('external-link', 16), 'معاينة الموقع'))));
}

function overview(m) {
  const st = (label, ok, okT, noT, hint) => h('div', { class: 'st-card' }, h('b', {}, label), h('span', { class: ok ? 'ok-t' : 'no-t' }, ok ? okT : noT), hint && !ok ? h('div', { class: 'muted', style: { fontSize: '13px' } }, hint) : null);
  m.append(h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'حالة الموقع'),
    h('div', { class: 'status-grid' },
      st('مخزن الإعدادات (KV)', envS.kv, 'مربوط', 'غير مربوط', 'اربط مساحة KV باسم ITQAN_KV لتتمكن من حفظ الإعدادات.'),
      st('مفتاح Claude', envS.anthropic, 'مضبوط', 'غير مضبوط', 'أضف المتغير السري ANTHROPIC_API_KEY لتفعيل طبقة Claude.'),
      st('مفتاح Gemini', envS.gemini, 'مضبوط', 'غير مضبوط', 'أضف المتغير السري GEMINI_API_KEY لتفعيل طبقة Gemini المجانية.'),
      st('مفتاح توقيع الجلسات', envS.sessionSecret, 'مضبوط', 'غير مضبوط', 'يُنصح بإضافة SESSION_SECRET بقيمة عشوائية طويلة.'),
      st('اسم مستخدم المالك', envS.username, 'مضبوط', 'غير مضبوط (كلمة المرور وحدها)', 'اختياري: أضف ADMIN_USERNAME لزيادة الحماية.'),
      h('div', { class: 'st-card' }, h('b', {}, 'دراسات الجدوى المكتملة'), h('span', { style: { fontSize: '22px', fontWeight: 900 } }, String(usage?.total || 0)), usage?.last ? h('div', { class: 'muted', style: { fontSize: '13px' } }, 'آخرها: ' + new Date(usage.last).toLocaleString('ar-SA-u-nu-latn')) : null),
      h('div', { class: 'st-card' }, h('b', {}, 'الأدوات المفعّلة'), h('span', { style: { fontSize: '22px', fontWeight: 900 } }, String(BUILTIN_TOOLS.filter(t => cfg.tools[t.id]?.enabled !== false).length + cfg.customServices.filter(s => s.enabled !== false).length))))),
    h('div', { class: 'panel' }, h('h3', { style: { marginTop: 0 } }, 'كيف تضيف أدوات جديدة؟'),
      h('p', {}, 'من تبويب «الخدمات الإضافية» يمكنك إضافة خدمة جديدة فورًا دون برمجة: إما رابطًا لخدمة خارجية، أو صفحة كاملة بكود HTML و JavaScript تعمل داخل الموقع في إطار معزول.'),
      h('p', {}, 'أما الأدوات المدمجة الكبيرة فتُضاف إلى الكود المصدري في المستودع (ملف public/assets/js/defaults.js وملف الأداة)، ثم تُنشر تلقائيًا عبر Cloudflare.')));
}

function site(m) {
  const s = cfg.site;
  m.append(h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'هوية الموقع'),
    h('div', { class: 'opts' },
      field('اسم الموقع', bind(inp(), s, 'name')), field('الاسم بالإنجليزية', bind(inp({ dir: 'ltr' }), s, 'nameEn')),
      field('اسم المالك كما يظهر', bind(inp(), s, 'owner')), field('البريد الإلكتروني للتواصل', bind(inp({ dir: 'ltr', type: 'email' }), s, 'contactEmail')),
      field('اللون الأساسي', bind(inp({ type: 'color', style: { height: '42px', padding: '4px' } }), s, 'primaryColor')), field('اللون الثانوي', bind(inp({ type: 'color', style: { height: '42px', padding: '4px' } }), s, 'accentColor'))),
    h('div', { class: 'opts', style: { gridTemplateColumns: '1fr' } },
      field('الشعار النصي أسفل اسم الموقع في الصفحة الرئيسية', bind(inp(), s, 'tagline')),
      field('شريط الإعلانات أعلى الموقع (اتركه فارغًا لإخفائه)', bind(inp(), s, 'announcement')),
      field('نبذة عن المنصة', bind(ta(4), s, 'about')), field('سياسة الخصوصية', bind(ta(5), s, 'privacy')), field('نص التذييل', bind(inp(), s, 'footer')))));
}

const LINK_HINT = { whatsapp: 'الرقم مع رمز الدولة، مثل 9665xxxxxxxx', phone: '+9665xxxxxxxx', email: 'name@example.com', website: 'example.com' };
// صورة رمز QR للحساب: تُصغَّر وتُحفظ داخل الإعدادات
function qrField(a) {
  const prev = h('div');
  const draw = () => { prev.innerHTML = ''; if (a.qr) prev.append(h('div', { class: 'row' }, h('img', { src: a.qr, style: { width: '90px', height: '90px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff' } }), h('button', { class: 'btn light sm', type: 'button', onclick: () => { a.qr = ''; markDirty(); draw(); } }, ico('trash-2', 14), 'إزالة'))); };
  const fi = h('input', { type: 'file', accept: 'image/*', class: 'input' });
  fi.onchange = async () => {
    const f = fi.files[0]; if (!f) return;
    try {
      const bmp = await createImageBitmap(f); const size = Math.min(400, Math.max(bmp.width, bmp.height));
      const k = size / Math.max(bmp.width, bmp.height); const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false; g.drawImage(bmp, 0, 0, c.width, c.height);
      a.qr = c.toDataURL('image/png'); markDirty(); draw();
    } catch { toast('تعذّرت قراءة الصورة.', true); }
    fi.value = '';
  };
  draw();
  return h('div', { class: 'field', style: { gridColumn: '1/-1' } }, h('span', {}, 'صورة رمز QR للتحويل (اختيارية)'), fi, h('small', {}, 'قُص صورة الرمز من تطبيق البنك وارفعها هنا'), prev);
}

function profile(m) {
  const p = cfg.profile, d = cfg.donation;
  p.links ||= {};
  const links = h('div', { class: 'opts' }, BRAND_ORDER.map(k => h('label', { class: 'field' },
    h('span', { class: 'row', style: { gap: '6px' } }, h('span', { style: { color: BRANDS[k].color, display: 'inline-flex' }, html: BRANDS[k].svg.replace('<svg ', '<svg width="18" height="18" ') }), BRANDS[k].name),
    bind(inp({ dir: 'ltr', placeholder: LINK_HINT[k] || 'اسم المستخدم أو الرابط الكامل' }), p.links, k))));
  m.append(h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'الملف التعريفي'),
    h('p', { class: 'muted' }, 'يظهر في الصفحة الرئيسية وتذييل الموقع: الاسم وأيقونات التواصل فقط. الحقول الفارغة لا تظهر أيقوناتها.'),
    h('div', { class: 'opts' }, h('label', { class: 'check' }, bind(h('input', { type: 'checkbox' }), p, 'enabled', 'bool'), 'إظهار الملف التعريفي'), field('الاسم كما يظهر', bind(inp(), p, 'name'))),
    h('h3', {}, 'روابط التواصل'), links));

  const accBox = h('div'), linkBox = h('div');
  const drawAcc = () => {
    accBox.innerHTML = '';
    if (!d.accounts.length) accBox.append(h('p', { class: 'muted' }, 'لم تُضف حسابات بعد.'));
    d.accounts.forEach((a, i) => accBox.append(h('div', { class: 'q-section' },
      h('div', { class: 'opts', style: { marginTop: 0 } },
        field('اسم البنك', bind(inp(), a, 'bank')), field('اسم المستفيد', bind(inp(), a, 'holder')),
        field('رقم الآيبان (IBAN)', bind(inp({ dir: 'ltr' }), a, 'iban')), field('رقم الحساب', bind(inp({ dir: 'ltr' }), a, 'number')),
        field('الدولة', bind(inp(), a, 'country')), field('ملاحظة (اختيارية)', bind(inp(), a, 'note')),
        qrField(a)),
      h('div', { class: 'actions', style: { justifyContent: 'flex-start', marginTop: '10px' } }, h('button', { class: 'btn light sm', onclick: () => { if (confirm('حذف هذا الحساب؟')) { d.accounts.splice(i, 1); markDirty(); drawAcc(); } } }, ico('trash-2', 14), 'حذف الحساب')))));
  };
  const drawLinks = () => {
    linkBox.innerHTML = '';
    d.links.forEach((l, i) => linkBox.append(h('div', { class: 'list-row', style: { gridTemplateColumns: '1fr 2fr auto' } }, bind(inp({ placeholder: 'نص الزر، مثل: PayPal' }), l, 'label'), bind(inp({ dir: 'ltr', placeholder: 'https://' }), l, 'url'),
      h('button', { class: 'icon-btn', onclick: () => { d.links.splice(i, 1); markDirty(); drawLinks(); } }, ico('trash-2', 16)))));
  };
  drawAcc(); drawLinks();
  m.append(h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'دعم استمرار الأدوات'),
    h('p', { class: 'muted' }, 'يظهر القسم في الصفحة الرئيسية وصفحة «ادعم المنصة»، ويظهر رابط صغير إليه بعد نجاح أي أداة. لا يظهر شيء حتى تضيف حسابًا أو رابطًا واحدًا على الأقل.'),
    h('div', { class: 'opts' }, h('label', { class: 'check' }, bind(h('input', { type: 'checkbox' }), d, 'enabled', 'bool'), 'إظهار قسم الدعم'), field('عنوان القسم', bind(inp(), d, 'title'))),
    h('div', { class: 'opts', style: { gridTemplateColumns: '1fr' } }, field('نص الدعوة', bind(ta(3), d, 'text')), field('رسالة الشكر (في صفحة الدعم)', bind(inp(), d, 'thanks'))),
    h('div', { class: 'row', style: { marginTop: '18px' } }, h('h3', { style: { margin: 0 } }, 'الحسابات البنكية'), h('span', { class: 'spacer' }), h('button', { class: 'btn sm', onclick: () => { d.accounts.push({ bank: '', holder: '', iban: '', number: '', country: '', note: '' }); markDirty(); drawAcc(); } }, ico('plus', 14), 'إضافة حساب')),
    accBox,
    h('div', { class: 'row', style: { marginTop: '18px' } }, h('h3', { style: { margin: 0 } }, 'روابط دعم أخرى (اختيارية)'), h('span', { class: 'spacer' }), h('button', { class: 'btn light sm', onclick: () => { d.links.push({ label: '', url: '' }); markDirty(); drawLinks(); } }, ico('plus', 14), 'إضافة رابط')),
    linkBox));
}

function tools(m) {
  const list = BUILTIN_TOOLS.map((t, i) => ({ t, o: cfg.tools[t.id] ||= {}, order: Number.isFinite(cfg.tools[t.id]?.order) ? cfg.tools[t.id].order : i })).sort((a, b) => a.order - b.order);
  list.forEach((x, i) => x.o.order = i);
  const box = h('div');
  const draw = () => {
    box.innerHTML = '';
    list.forEach((x, i) => {
      const title = inp({ placeholder: x.t.title }); title.value = x.o.title || ''; title.oninput = () => { x.o.title = title.value.trim() || undefined; markDirty(); };
      const desc = inp({ placeholder: x.t.desc }); desc.value = x.o.desc || ''; desc.oninput = () => { x.o.desc = desc.value.trim() || undefined; markDirty(); };
      const badge = inp({ placeholder: 'شارة (مثل: جديد)' }); badge.value = x.o.badge || ''; badge.oninput = () => { x.o.badge = badge.value; markDirty(); };
      const move = (d) => { const j = i + d; if (j < 0 || j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; list.forEach((y, k) => y.o.order = k); markDirty(); draw(); };
      box.append(h('div', { class: 'list-row' }, h('span', { class: 'mini-ic', style: { background: x.t.color }, html: icon(x.t.icon, 16) }), title, desc, badge,
        h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, h('button', { class: 'icon-btn', title: 'أعلى', disabled: i === 0, onclick: () => move(-1) }, ico('arrow-up', 16)), h('button', { class: 'icon-btn', title: 'أسفل', disabled: i === list.length - 1, onclick: () => move(1) }, ico('arrow-down', 16)), sw(x.o.enabled !== false, v => x.o.enabled = v))));
    });
  };
  draw();
  m.append(h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'الأدوات المدمجة'), h('p', { class: 'muted' }, 'غيّر اسم الأداة ووصفها (اترك الحقل فارغًا لاستخدام النص الافتراضي)، ورتّبها بالأسهم، وأوقفها أو فعّلها بالمفتاح.'), box));
}

function services(m) {
  const list = cfg.customServices;
  const box = h('div'); const editor = h('div');
  const draw = () => {
    box.innerHTML = '';
    if (!list.length) box.append(h('p', { class: 'muted' }, 'لا توجد خدمات إضافية بعد.'));
    list.forEach((s, i) => box.append(h('div', { class: 'list-row', style: { gridTemplateColumns: '28px 1fr 1fr auto' } }, h('span', { class: 'mini-ic', style: { background: s.color || '#495057' }, html: icon(s.icon || 'zap', 16) }), h('b', {}, s.title || '(بدون عنوان)'), h('span', { class: 'muted' }, s.type === 'link' ? 'رابط خارجي' : 'صفحة HTML'),
      h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, h('button', { class: 'btn light sm', onclick: () => edit(s) }, 'تعديل'), h('button', { class: 'icon-btn', title: 'حذف', onclick: () => { if (confirm('حذف هذه الخدمة؟')) { list.splice(i, 1); markDirty(); draw(); editor.innerHTML = ''; } } }, ico('trash-2', 16)), sw(s.enabled !== false, v => s.enabled = v)))));
  };
  const edit = (s) => {
    editor.innerHTML = '';
    const iconSel = sel(Object.keys(ICONS).map(k => [k, k]), s.icon || 'zap'); const prev = h('span', { class: 'mini-ic', style: { background: s.color || '#495057', width: '42px', height: '42px' }, html: icon(s.icon || 'zap', 22) });
    const color = inp({ type: 'color', style: { height: '42px', padding: '4px' } });
    bind(iconSel, s, 'icon'); bind(color, s, 'color');
    const upd = () => { prev.innerHTML = icon(iconSel.value, 22); prev.style.background = color.value; }; iconSel.addEventListener('change', upd); color.addEventListener('input', upd);
    const type = sel([['html', 'صفحة داخل الموقع (HTML/JS)'], ['link', 'رابط خارجي']], s.type || 'html'); bind(type, s, 'type');
    const url = bind(inp({ dir: 'ltr', placeholder: 'https://' }), s, 'url'); const html = bind(h('textarea', { class: 'input', rows: 16, dir: 'ltr', style: { fontFamily: 'monospace', fontSize: '13px' } }), s, 'html');
    const urlF = field('الرابط', url), htmlF = field('كود الصفحة (HTML كامل بما فيه CSS و JavaScript)', html, 'تعمل الصفحة داخل إطار معزول عن الموقع ولوحة التحكم، ويمكنها تنزيل الملفات وفتح النوافذ.');
    const sync = () => { urlF.classList.toggle('hidden', type.value !== 'link'); htmlF.classList.toggle('hidden', type.value === 'link'); }; type.addEventListener('change', sync); sync();
    const cat = sel(CATEGORIES.map(c => [c.id, c.title]), s.category || 'custom'); bind(cat, s, 'category');
    const title = bind(inp(), s, 'title'); title.addEventListener('input', draw);
    editor.append(h('div', { class: 'panel' }, h('h3', { style: { marginTop: 0 } }, 'تعديل الخدمة'),
      h('div', { class: 'opts' }, field('العنوان', title), field('الوصف', bind(inp(), s, 'desc')), field('القسم', cat), field('الشارة (اختياري)', bind(inp(), s, 'badge')),
        h('div', { class: 'field' }, h('span', {}, 'الأيقونة واللون'), h('div', { class: 'row' }, prev, iconSel, color)), field('نوع الخدمة', type)),
      h('div', { class: 'opts', style: { gridTemplateColumns: '1fr' } }, urlF, htmlF),
      h('div', { class: 'actions' }, s.type !== 'link' && s.id ? h('a', { class: 'btn light sm', href: '/#/s/' + s.id, target: '_blank' }, 'معاينة (بعد الحفظ)') : null)));
    editor.scrollIntoView({ behavior: 'smooth' });
  };
  const add = h('button', { class: 'btn sm' }, ico('plus', 16), 'إضافة خدمة');
  add.onclick = () => { const s = { id: Math.random().toString(36).slice(2, 9), title: 'خدمة جديدة', desc: '', icon: 'zap', color: '#495057', category: 'custom', type: 'html', html: '<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head><meta charset="utf-8"><style>body{font-family:Tahoma,sans-serif;padding:24px}</style></head>\n<body>\n  <h2>خدمتي الجديدة</h2>\n  <p>اكتب هنا كود الأداة.</p>\n</body>\n</html>', enabled: true, order: 100 + list.length }; list.push(s); markDirty(); draw(); edit(s); };
  draw();
  m.append(h('div', { class: 'panel' }, h('div', { class: 'row' }, h('h2', { style: { margin: 0 } }, 'الخدمات الإضافية'), h('span', { class: 'spacer' }), add), h('p', { class: 'muted' }, 'أضف أدوات وخدمات جديدة تظهر في الصفحة الرئيسية مع الأدوات المدمجة.'), box), editor);
}

function feas(m) {
  const f = cfg.feasibility;
  const REASON = { credit: 'نفد الرصيد', quota: 'تجاوز الحصة المجانية', nokey: 'المفتاح غير مضبوط', auth: 'المفتاح غير صالح', disabled: 'متوقفة', offline: 'تعذّر الفحص' };
  const KEYS = { anthropic: 'ANTHROPIC_API_KEY', gemini: 'GEMINI_API_KEY' };
  const statusCells = {};
  const modeRows = MODE_IDS.map(m => {
    const o = f.modes[m];
    const st = h('span', { class: 'muted' }, '…'); statusCells[m] = st;
    const model = m === 'manual' ? h('span', { class: 'muted' }, 'لا يحتاج إلى نموذج') : bind(inp({ dir: 'ltr', placeholder: 'الافتراضي: ' + DEFAULT_MODELS[m] }), o, 'model');
    return h('div', { class: 'list-row', style: { gridTemplateColumns: '150px 1fr 1.2fr auto' } },
      h('div', {}, h('b', {}, MODE_INFO[m].title), h('div', { class: 'muted', style: { fontSize: '12px' } }, MODE_INFO[m].sub)),
      st, model, sw(o.enabled !== false, v => o.enabled = v));
  });
  const defSel = sel(MODE_IDS.map(m => [m, MODE_INFO[m].title]), f.defaultMode); bind(defSel, f, 'defaultMode');
  async function checkStatus(refresh) {
    Object.values(statusCells).forEach(c => { c.textContent = 'جارٍ الفحص…'; c.className = 'muted'; });
    try {
      const d = await api('/api/ai-status' + (refresh ? '?refresh=1' : ''));
      for (const m of MODE_IDS) { const x = d.status[m]; const c = statusCells[m]; c.className = x.available ? 'ok-t' : 'no-t'; c.textContent = x.available ? 'متاحة للمستخدمين' : 'غير متاحة: ' + (REASON[x.reason] || x.reason) + (x.reason === 'nokey' ? ` (أضف ${KEYS[m]})` : ''); }
    } catch (e) { Object.values(statusCells).forEach(c => { c.textContent = 'تعذّر الفحص'; c.className = 'no-t'; }); }
  }
  checkStatus(false);
  const qBox = h('div');
  const TYPES = [['text', 'نص قصير'], ['textarea', 'نص طويل'], ['number', 'رقم'], ['select', 'قائمة اختيار'], ['multiselect', 'اختيار متعدد']];
  const drawQ = () => {
    qBox.innerHTML = '';
    f.sections.forEach((s, si) => {
      const secTitle = bind(inp({ style: { fontWeight: 800 } }), s, 'title');
      const fields = h('div');
      s.fields.forEach((fl, fi) => {
        const typeSel = sel(TYPES, fl.type); bind(typeSel, fl, 'type');
        const opts = h('textarea', { class: 'input', rows: 3, placeholder: 'خيار في كل سطر' }); opts.value = (fl.options || []).join('\n');
        opts.oninput = () => { fl.options = opts.value.split('\n').map(x => x.trim()).filter(Boolean); markDirty(); };
        const optsWrap = h('div', {}, opts); const syncO = () => optsWrap.classList.toggle('hidden', !['select', 'multiselect'].includes(typeSel.value)); typeSel.addEventListener('change', syncO); syncO();
        const req = h('input', { type: 'checkbox' }); bind(req, fl, 'required', 'bool');
        const mv = (d) => { const j = fi + d; if (j < 0 || j >= s.fields.length) return; [s.fields[fi], s.fields[j]] = [s.fields[j], s.fields[fi]]; markDirty(); drawQ(); };
        fields.append(h('div', { class: 'q-field' },
          h('div', {}, bind(inp({ placeholder: 'نص السؤال' }), fl, 'label'), h('div', { style: { height: '6px' } }), bind(inp({ placeholder: 'نص توضيحي داخل الحقل (اختياري)' }), fl, 'placeholder')),
          h('div', {}, typeSel, h('label', { class: 'check', style: { marginTop: '6px' } }, req, 'إجباري')),
          optsWrap,
          h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, h('button', { class: 'icon-btn', onclick: () => mv(-1), disabled: fi === 0 }, ico('arrow-up', 16)), h('button', { class: 'icon-btn', onclick: () => mv(1), disabled: fi === s.fields.length - 1 }, ico('arrow-down', 16)),
            h('button', { class: 'icon-btn', title: 'حذف السؤال', onclick: () => { if (['projectName', 'currency', 'capital', 'studyYears', 'country', 'city'].includes(fl.id) && !confirm('هذا السؤال يعتمد عليه النموذج المالي أو الدراسة. هل تريد حذفه فعلًا؟')) return; s.fields.splice(fi, 1); markDirty(); drawQ(); } }, ico('trash-2', 16)))));
      });
      const mvS = (d) => { const j = si + d; if (j < 0 || j >= f.sections.length) return; [f.sections[si], f.sections[j]] = [f.sections[j], f.sections[si]]; markDirty(); drawQ(); };
      qBox.append(h('div', { class: 'q-section' },
        h('div', { class: 'row' }, h('div', { style: { flex: 1 } }, secTitle), h('button', { class: 'icon-btn', onclick: () => mvS(-1), disabled: si === 0 }, ico('arrow-up', 16)), h('button', { class: 'icon-btn', onclick: () => mvS(1), disabled: si === f.sections.length - 1 }, ico('arrow-down', 16)),
          h('button', { class: 'icon-btn', title: 'حذف القسم', onclick: () => { if (confirm('حذف هذا القسم بكل أسئلته؟')) { f.sections.splice(si, 1); markDirty(); drawQ(); } } }, ico('trash-2', 16))),
        fields, h('button', { class: 'btn light sm', style: { marginTop: '8px' }, onclick: () => { s.fields.push({ id: 'q_' + Math.random().toString(36).slice(2, 8), label: 'سؤال جديد', type: 'text', required: false, placeholder: '' }); markDirty(); drawQ(); } }, ico('plus', 14), 'إضافة سؤال')));
    });
    qBox.append(h('div', { class: 'row' }, h('button', { class: 'btn light sm', onclick: () => { f.sections.push({ id: 's_' + Math.random().toString(36).slice(2, 8), title: 'قسم جديد', fields: [] }); markDirty(); drawQ(); } }, ico('plus', 14), 'إضافة قسم'),
      h('button', { class: 'btn light sm', onclick: () => { if (confirm('استعادة الأسئلة الافتراضية؟ ستُحذف تعديلاتك على الأسئلة.')) { f.sections = structuredClone(DEFAULT_FEASIBILITY_SECTIONS); markDirty(); drawQ(); } } }, ico('refresh-cw', 14), 'استعادة الأسئلة الافتراضية')));
  };
  drawQ();
  m.append(h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'إعدادات دراسة الجدوى'),
    h('div', { class: 'opts' },
      h('label', { class: 'check' }, bind(h('input', { type: 'checkbox' }), f, 'enabled', 'bool'), 'تفعيل الخدمة'),
      h('label', { class: 'check' }, bind(h('input', { type: 'checkbox' }), f, 'webSearch', 'bool'), 'البحث في الويب عن أحدث بيانات السوق'),
      h('label', { class: 'check' }, bind(h('input', { type: 'checkbox' }), f, 'autoFallback', 'bool'), 'الانتقال تلقائيًا إلى Gemini إذا تعذّر Claude أثناء الإعداد'),
      field('الحد اليومي لكل مستخدم (للذكاء الاصطناعي)', bind(inp({ type: 'number', min: 0 }), f, 'dailyLimitPerIp', 'num'), 'صفر = بلا حد. الوضع اليدوي غير محدود دائمًا')),
    h('div', { class: 'opts', style: { gridTemplateColumns: '1fr' } }, field('تعليمات إضافية للذكاء الاصطناعي (اختياري)', bind(ta(3), f, 'extraInstructions'), 'مثال: ركّز على أنظمة رؤية 2030، أو أضف قسمًا عن الاستدامة.'))),
    h('div', { class: 'panel' },
      h('div', { class: 'row' }, h('h2', { style: { margin: 0 } }, 'طبقات الخدمة'), h('span', { class: 'spacer' }), h('button', { class: 'btn light sm', onclick: () => checkStatus(true) }, ico('refresh-cw', 14), 'إعادة الفحص الآن')),
      h('p', { class: 'muted' }, 'يختار المستخدم إحدى الطبقات المتاحة. الطبقة التي ينفد رصيدها أو تتجاوز حصتها تظهر للمستخدم رمادية ولا يمكن اختيارها، ثم يُعاد فحصها تلقائيًا (Claude كل ساعة، و Gemini كل 3 ساعات). بعد شحن الرصيد اضغط «إعادة الفحص الآن» لتفعيلها فورًا.'),
      ...modeRows,
      h('div', { class: 'opts' }, field('الطبقة المختارة افتراضيًا للمستخدم', defSel, 'إذا لم تكن متاحة، تُختار أول طبقة متاحة تلقائيًا'))),
    h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'أسئلة النموذج'), h('p', { class: 'muted' }, 'الأسئلة التي يجيب عنها المستخدم قبل إعداد الدراسة. تُرسل جميع الإجابات إلى الذكاء الاصطناعي.'), qBox));
}

function backup(m) {
  const file = h('input', { type: 'file', accept: '.json,application/json', class: 'hidden' });
  file.onchange = async () => { try { const imported = JSON.parse(await file.files[0].text()); cfg = mergeConfig(deepMerge(cfg, imported)); markDirty(); toast('تم استيراد النسخة ودمجها مع إعداداتك الحالية. اضغط «حفظ التغييرات» لاعتمادها.'); render(); } catch { toast('الملف غير صالح.', true); } file.value = ''; };
  m.append(h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'النسخ الاحتياطي'),
    h('p', {}, 'احفظ نسخة من جميع إعدادات الموقع (الهوية، الأدوات، الخدمات الإضافية، أسئلة دراسة الجدوى) في ملف على جهازك، واستعدها متى شئت.'),
    h('div', { class: 'actions', style: { justifyContent: 'flex-start' } },
      h('button', { class: 'btn', onclick: () => download(JSON.stringify(cfg, null, 2), `itqan-tools-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json') }, ico('download', 18), 'تنزيل نسخة احتياطية'),
      h('button', { class: 'btn light', onclick: () => file.click() }, ico('upload', 18), 'استيراد نسخة'), file,
      h('button', { class: 'btn danger', onclick: () => { if (confirm('إعادة جميع الإعدادات إلى القيم الافتراضية؟')) { cfg = mergeConfig({}); markDirty(); render(); } } }, ico('refresh-cw', 18), 'إعادة الضبط الافتراضي'))));
}

boot();
