import { h, $, $$, ico, toast, download, field, iconMarkup, safeImg } from './ui.js';
import { ICONS, icon } from './icons.js';
import { BRANDS, BRAND_ORDER } from './brands.js';
import { BUILTIN_TOOLS, CATEGORIES, GROUPS, getCategories, getGroups, DEFAULT_CONFIG, DEFAULT_FEASIBILITY_SECTIONS, DEFAULT_MODELS, MODE_IDS, MODE_INFO, mergeConfig, deepMerge } from './defaults.js';

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

const TABS = [['overview', 'نظرة عامة', 'gauge'], ['site', 'هوية الموقع', 'globe'], ['design', 'التصميم والصفحة الرئيسية', 'palette'], ['groups', 'المجموعات والأقسام', 'layers'], ['profile', 'الملف التعريفي وطرق الدفع', 'hand-heart'], ['tools', 'الأدوات', 'layout-grid'], ['services', 'الخدمات الإضافية', 'plus'], ['eng', 'الأدوات الهندسية', 'hard-hat'], ['aitools', 'الذكاء الاصطناعي في الأدوات', 'wand-sparkles'], ['feas', 'دراسة الجدوى', 'sparkles'], ['backup', 'النسخ الاحتياطي', 'save']];

function render() {
  root.innerHTML = '';
  const side = h('div', { class: 'side' }, TABS.map(([id, t, ic]) => h('button', { class: id === tab ? 'on' : '', onclick: () => { tab = id; render(); } }, ico(ic, 18), t)),
    h('button', { onclick: async () => { await api('/api/admin/logout', { method: 'POST' }); location.reload(); } }, ico('log-out', 18), 'تسجيل الخروج'));
  const main = h('div');
  ({ overview, site, design, groups, profile, tools, services, eng, aitools, feas, backup })[tab](main);
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

// الصورة الشخصية: تُقص مربعة من المنتصف وتُصغَّر إلى 320 بكسل قبل حفظها
function photoField(p) {
  const prev = h('div');
  const draw = () => { prev.innerHTML = ''; if (p.photo) prev.append(h('div', { class: 'row' }, h('img', { src: p.photo, style: { width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e5e7eb' } }), h('button', { class: 'btn light sm', type: 'button', onclick: () => { p.photo = ''; markDirty(); draw(); } }, ico('trash-2', 14), 'إزالة الصورة'))); };
  const fi = h('input', { type: 'file', accept: 'image/*', class: 'hidden' });
  const pick = h('button', { class: 'btn light sm', type: 'button', onclick: () => fi.click() }, ico('upload', 14), 'رفع صورة');
  fi.onchange = async () => {
    const f = fi.files[0]; if (!f) return;
    try {
      const bmp = await createImageBitmap(f); const side = Math.min(bmp.width, bmp.height); const S = 320;
      const c = document.createElement('canvas'); c.width = S; c.height = S;
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
      g.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, S, S);
      p.photo = c.toDataURL('image/jpeg', 0.85); markDirty(); draw();
    } catch { toast('تعذّرت قراءة الصورة.', true); }
    fi.value = '';
  };
  draw();
  return h('div', { class: 'field' }, h('span', {}, 'الصورة الشخصية (اختيارية)'), h('div', { class: 'row' }, pick, fi), h('small', {}, 'تظهر دائرية فوق الاسم. يُفضّل صورة مربعة ووجهك في منتصفها.'), prev);
}

function profile(m) {
  const p = cfg.profile, d = cfg.donation;
  p.links ||= {};
  const links = h('div', { class: 'opts' }, BRAND_ORDER.map(k => h('label', { class: 'field' },
    h('span', { class: 'row', style: { gap: '6px' } }, h('span', { style: { color: BRANDS[k].color, display: 'inline-flex' }, html: BRANDS[k].svg.replace('<svg ', '<svg width="18" height="18" ') }), BRANDS[k].name),
    bind(inp({ dir: 'ltr', placeholder: LINK_HINT[k] || 'اسم المستخدم أو الرابط الكامل' }), p.links, k))));
  m.append(h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'الملف التعريفي'),
    h('p', { class: 'muted' }, 'يظهر في الصفحة الرئيسية وتذييل الموقع: الاسم وأيقونات التواصل فقط. الحقول الفارغة لا تظهر أيقوناتها.'),
    h('div', { class: 'opts' }, h('label', { class: 'check' }, bind(h('input', { type: 'checkbox' }), p, 'enabled', 'bool'), 'إظهار الملف التعريفي'), field('الاسم كما يظهر', bind(inp(), p, 'name')), photoField(p)),
    h('h3', {}, 'روابط التواصل'), links));

  const TYPES = [['bank', 'حساب بنكي'], ['wallet', 'محفظة إلكترونية (STC Pay، فودافون كاش، إنستاباي…)'], ['link', 'رابط دفع (PayPal، Ko-fi…)'], ['other', 'أخرى']];
  const TEMPLATES = { bank: [['اسم المستفيد', false], ['رقم الآيبان', true], ['رقم الحساب', true]], wallet: [['رقم المحفظة', true], ['اسم صاحب المحفظة', false]], link: [], other: [['البيان', false]] };
  const methodsBox = listEditor(d.methods, (x, i, redraw) => {
    x.fields ||= [];
    const fields = listEditor(x.fields, (f) => h('div', { class: 'opts', style: { margin: 0, gridTemplateColumns: '1fr 1.6fr auto' } }, bind(inp({ placeholder: 'اسم الحقل، مثل: رقم الآيبان' }), f, 'label'), bind(inp({ placeholder: 'القيمة', dir: 'auto' }), f, 'value'), h('label', { class: 'check' }, bind(h('input', { type: 'checkbox' }), f, 'ltr', 'bool'), 'أرقام/لاتيني')),
      () => ({ label: '', value: '', ltr: true }), 'إضافة حقل');
    const type = sel(TYPES, x.type || 'bank'); bind(type, x, 'type');
    type.addEventListener('change', () => { if (!x.fields.some(f => f.value)) { x.fields = TEMPLATES[x.type].map(([label, ltr]) => ({ label, value: '', ltr })); markDirty(); redraw(); } });
    return h('div', { class: 'pay-ed' },
      h('div', { class: 'row' }, h('b', { style: { flex: 1 } }, x.name || 'طريقة دفع'), h('label', { class: 'check' }, bind(h('input', { type: 'checkbox' }), x, 'enabled', 'bool'), 'ظاهرة')),
      h('div', { class: 'opts' }, field('النوع', type), field('الاسم الظاهر', bind(inp({ placeholder: 'مثل: مصرف الراجحي، STC Pay، PayPal' }), x, 'name')),
        imgField(x, 'logo', 'شعار أو صورة الطريقة (اختياري)', { max: 96 }), imgField(x, 'qr', 'صورة رمز QR (اختيارية)', { max: 420, hint: 'قُص صورة الرمز من التطبيق وارفعها' }),
        field('رابط الدفع (اختياري)', bind(inp({ dir: 'ltr', placeholder: 'https://' }), x, 'url')), field('نص زر الرابط', bind(inp({ placeholder: 'ادعم عبر PayPal' }), x, 'buttonText')),
        h('div', { class: 'field', style: { gridColumn: '1/-1' } }, h('span', {}, 'ملاحظة (اختيارية)'), bind(inp({ placeholder: 'مثل: للتحويل من داخل السعودية' }), x, 'note'))),
      h('h4', { style: { margin: '8px 0' } }, 'البيانات (يظهر بجانب كل منها زر نسخ)'), fields);
  }, () => ({ id: Math.random().toString(36).slice(2, 8), type: 'bank', name: '', logo: '', qr: '', url: '', buttonText: '', note: '', enabled: true, fields: TEMPLATES.bank.map(([label, ltr]) => ({ label, value: '', ltr })) }), 'إضافة طريقة دفع أو حساب');
  m.append(h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'دعم استمرار الأدوات'),
    h('p', { class: 'muted' }, 'يظهر القسم في الصفحة الرئيسية وصفحة «ادعم المنصة»، ويظهر رابط صغير إليه بعد نجاح أي أداة. لا يظهر شيء حتى تضيف طريقة دفع ظاهرة واحدة على الأقل.'),
    h('div', { class: 'opts' }, h('label', { class: 'check' }, bind(h('input', { type: 'checkbox' }), d, 'enabled', 'bool'), 'إظهار قسم الدعم'), field('عنوان القسم', bind(inp(), d, 'title')), field('نص زر الدعم', bind(inp({ placeholder: 'ادعم الآن' }), d, 'buttonText')), field('عنوان نافذة طرق الدفع', bind(inp({ placeholder: 'طرق الدعم' }), d, 'detailsTitle'))),
    h('div', { class: 'opts', style: { gridTemplateColumns: '1fr' } }, field('نص الدعوة', bind(ta(3), d, 'text')), field('رسالة الشكر (في نافذة الدعم)', bind(inp(), d, 'thanks'))),
    h('h3', { style: { marginTop: '18px' } }, 'طرق الدفع والحسابات'), methodsBox));
}

function tools(m) {
  const cats = getCategories(cfg), G = getGroups(cfg);
  const catOpts = cats.map(c => [c.id, (G.find(g => g.cats.includes(c.id))?.title ? G.find(g => g.cats.includes(c.id)).title + ' ← ' : '') + ((cfg.categories.find(x => x.id === c.id) || c).title)]);
  const list = BUILTIN_TOOLS.map((t, i) => ({ t, o: cfg.tools[t.id] ||= {}, order: Number.isFinite(cfg.tools[t.id]?.order) ? cfg.tools[t.id].order : i })).sort((a, b) => a.order - b.order);
  list.forEach((x, i) => x.o.order = i);
  const q = inp({ type: 'search', placeholder: 'ابحث عن أداة…' });
  const box = h('div');
  let openId = null;
  const draw = () => {
    box.innerHTML = '';
    const term = q.value.trim();
    list.forEach((x, i) => {
      const T = x.t, o = x.o;
      if (term && !((o.title || T.title) + ' ' + T.id).includes(term)) return;
      const colorOf = () => o.color || T.color;
      const mini = h('span', { class: 'mini-ic', style: { background: colorOf() } });
      const paintMini = () => { mini.innerHTML = safeImg(o.image) ? `<img src="${o.image}" style="width:100%;height:100%;object-fit:contain">` : iconMarkup(o.icon || T.icon, o.iconSvg, 16); mini.style.background = safeImg(o.image) ? 'transparent' : colorOf(); };
      paintMini();
      const move = (d) => { const j = i + d; if (j < 0 || j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; list.forEach((y, k) => y.o.order = k); markDirty(); draw(); };
      const editBtn = h('button', { class: 'btn light sm', type: 'button', onclick: () => { openId = openId === T.id ? null : T.id; draw(); } }, openId === T.id ? 'إغلاق' : 'تعديل');
      const row = h('div', { class: 'tool-row' + (openId === T.id ? ' open' : '') },
        h('div', { class: 'tool-row-head' }, mini, h('b', { style: { flex: 1 } }, o.title || T.title), h('span', { class: 'muted', style: { fontSize: '12px' } }, (cats.find(c => c.id === (o.category || T.category)) || {}).title || ''),
          h('button', { class: 'icon-btn', type: 'button', title: 'أعلى', disabled: i === 0 || !!term, onclick: () => move(-1) }, ico('arrow-up', 16)), h('button', { class: 'icon-btn', type: 'button', title: 'أسفل', disabled: i === list.length - 1 || !!term, onclick: () => move(1) }, ico('arrow-down', 16)),
          sw(o.enabled !== false, v => o.enabled = v), editBtn));
      if (openId === T.id) {
        const title = inp({ placeholder: T.title }); title.value = o.title || ''; title.oninput = () => { o.title = title.value.trim() || undefined; markDirty(); };
        const desc = h('textarea', { class: 'input', rows: 2, placeholder: T.desc }); desc.value = o.desc || ''; desc.oninput = () => { o.desc = desc.value.trim() || undefined; markDirty(); };
        const badge = inp({ placeholder: 'مثل: جديد (فارغ = دون شارة)' }); badge.value = o.badge ?? T.badge ?? ''; badge.oninput = () => { o.badge = badge.value; markDirty(); };
        const cat = sel(catOpts, o.category || T.category); cat.onchange = () => { o.category = cat.value === T.category ? undefined : cat.value; markDirty(); };
        if (!o.icon) o.icon = T.icon;
        const ip = iconPick(o, 'icon', 'iconSvg', colorOf);
        const col = inp({ type: 'color', style: { height: '42px', padding: '4px', width: '64px' } }); col.value = o.color || T.color; col.oninput = () => { o.color = col.value; markDirty(); ip.paint(); paintMini(); };
        row.append(h('div', { class: 'tool-ed' },
          h('div', { class: 'opts' }, field('الاسم', title), field('الشارة', badge), h('div', { class: 'field', style: { gridColumn: '1/-1' } }, h('span', {}, 'الوصف'), desc),
            field('القسم (والمجموعة)', cat), h('div', { class: 'field' }, h('span', {}, 'الأيقونة واللون'), h('div', { class: 'row' }, ip.el, col)),
            imgField(o, 'image', 'صورة بدل الأيقونة (اختيارية)', { max: 128, hint: 'PNG أو SVG مربعة؛ تظهر بدل الأيقونة الملونة', onChange: paintMini })),
          h('div', { class: 'row' }, h('a', { class: 'btn light sm', href: '/#/tool/' + T.id, target: '_blank' }, ico('external-link', 14), 'فتح الأداة'),
            h('button', { class: 'btn light sm', type: 'button', onclick: () => { if (confirm('إعادة هذه الأداة إلى إعداداتها الافتراضية؟')) { const ord = o.order; for (const k of Object.keys(o)) delete o[k]; o.order = ord; markDirty(); draw(); } } }, ico('refresh-cw', 14), 'استعادة الافتراضي'))));
      }
      box.append(row);
    });
  };
  q.oninput = draw;
  draw();
  m.append(h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'الأدوات'), h('p', { class: 'muted' }, 'لكل أداة: الاسم والوصف والشارة والقسم والأيقونة (من أكثر من 2300 أيقونة أو صورة ترفعها) واللون، مع الترتيب والإظهار والإخفاء. الحقول الفارغة تعني القيمة الافتراضية.'), q, h('div', { style: { height: '10px' } }), box));
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
    const ipk = iconPick(s, 'icon', 'iconSvg', () => s.color || '#495057');
    const color = inp({ type: 'color', style: { height: '42px', padding: '4px' } });
    bind(color, s, 'color'); color.addEventListener('input', ipk.paint);
    const type = sel([['html', 'صفحة داخل الموقع (HTML/JS)'], ['link', 'رابط خارجي']], s.type || 'html'); bind(type, s, 'type');
    const url = bind(inp({ dir: 'ltr', placeholder: 'https://' }), s, 'url'); const html = bind(h('textarea', { class: 'input', rows: 16, dir: 'ltr', style: { fontFamily: 'monospace', fontSize: '13px' } }), s, 'html');
    const urlF = field('الرابط', url), htmlF = field('كود الصفحة (HTML كامل بما فيه CSS و JavaScript)', html, 'تعمل الصفحة داخل إطار معزول عن الموقع ولوحة التحكم، ويمكنها تنزيل الملفات وفتح النوافذ.');
    const sync = () => { urlF.classList.toggle('hidden', type.value !== 'link'); htmlF.classList.toggle('hidden', type.value === 'link'); }; type.addEventListener('change', sync); sync();
    const cat = sel(getCategories(cfg).map(c => [c.id, (cfg.categories.find(x => x.id === c.id) || c).title]), s.category || 'custom'); bind(cat, s, 'category');
    const title = bind(inp(), s, 'title'); title.addEventListener('input', draw);
    editor.append(h('div', { class: 'panel' }, h('h3', { style: { marginTop: 0 } }, 'تعديل الخدمة'),
      h('div', { class: 'opts' }, field('العنوان', title), field('الوصف', bind(inp(), s, 'desc')), field('القسم', cat), field('الشارة (اختياري)', bind(inp(), s, 'badge')),
        h('div', { class: 'field' }, h('span', {}, 'الأيقونة واللون'), h('div', { class: 'row' }, ipk.el, color)), field('نوع الخدمة', type), imgField(s, 'image', 'صورة بدل الأيقونة (اختيارية)', { max: 128 })),
      h('div', { class: 'opts', style: { gridTemplateColumns: '1fr' } }, urlF, htmlF),
      h('div', { class: 'actions' }, s.type !== 'link' && s.id ? h('a', { class: 'btn light sm', href: '/#/s/' + s.id, target: '_blank' }, 'معاينة (بعد الحفظ)') : null)));
    editor.scrollIntoView({ behavior: 'smooth' });
  };
  const add = h('button', { class: 'btn sm' }, ico('plus', 16), 'إضافة خدمة');
  add.onclick = () => { const s = { id: Math.random().toString(36).slice(2, 9), title: 'خدمة جديدة', desc: '', icon: 'zap', color: '#495057', category: 'custom', type: 'html', html: '<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head><meta charset="utf-8"><style>body{font-family:Tahoma,sans-serif;padding:24px}</style></head>\n<body>\n  <h2>خدمتي الجديدة</h2>\n  <p>اكتب هنا كود الأداة.</p>\n</body>\n</html>', enabled: true, order: 100 + list.length }; list.push(s); markDirty(); draw(); edit(s); };
  draw();
  m.append(h('div', { class: 'panel' }, h('div', { class: 'row' }, h('h2', { style: { margin: 0 } }, 'الخدمات الإضافية'), h('span', { class: 'spacer' }), add), h('p', { class: 'muted' }, 'أضف أدوات وخدمات جديدة تظهر في الصفحة الرئيسية مع الأدوات المدمجة.'), box), editor);
}

// إعدادات الأدوات الهندسية: الكود الافتراضي وأسعار المتر للتكلفة التقديرية
function eng(m) {
  const e = cfg.eng;
  const rate = (k, title) => {
    const r = e.costRates[k];
    const n = (obj, key) => bind(inp({ type: 'number', min: 0, dir: 'ltr' }), obj, key, 'num');
    return h('div', { class: 'panel' }, h('h3', { style: { marginTop: 0 } }, title),
      h('div', { class: 'opts', style: { marginTop: 0 } },
        field('العملة', bind(inp(), r, 'currency')), field('سعر متر العظم (هيكل ومبانٍ)', n(r, 'shell')),
        field('إضافة التشطيب الاقتصادي للمتر', n(r.finish, 'economy')), field('إضافة التشطيب المتوسط للمتر', n(r.finish, 'standard')), field('إضافة التشطيب الفاخر للمتر', n(r.finish, 'lux'))));
  };
  m.append(
    h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'الأدوات الهندسية'),
      h('p', { class: 'muted' }, 'يمكنك تفعيل كل أداة أو إخفاؤها وتغيير ترتيبها من تبويب «الأدوات المدمجة».'),
      h('div', { class: 'opts' },
        field('الكود الافتراضي عند أول زيارة', bind(sel([['sa', 'الكود السعودي'], ['eg', 'الكود المصري'], ['intl', 'الكود العالمي']], e.defaultCode), e, 'defaultCode'), 'يستطيع الزائر تغييره من داخل أي أداة، ويُحفظ اختياره في متصفحه'),
        field('ملاحظة الأسعار التي تظهر للزائر', bind(inp(), e, 'priceNote')))),
    rate('eg', 'أسعار مصر (تظهر مع الكود المصري)'), rate('sa', 'أسعار السعودية (تظهر مع الكود السعودي)'),
    h('div', { class: 'note info', style: { marginTop: '16px' } }, 'سعر المتر يُطبَّق على إجمالي مسطحات البناء. حدّث الأسعار دوريًا بحسب السوق.'));
}

function aitools(m) {
  const a = cfg.aiTools;
  const REASON = { credit: 'نفد الرصيد', quota: 'تجاوز الحصة المجانية', nokey: 'المفتاح غير مضبوط', auth: 'المفتاح غير صالح', disabled: 'متوقف' };
  const KEYS = { anthropic: 'ANTHROPIC_API_KEY', gemini: 'GEMINI_API_KEY' };
  const NAMES = { gemini: ['Gemini', 'مجاني بحصة يومية'], anthropic: ['Claude', 'الأدق، مدفوع'] };
  const cells = {};
  const rows = ['gemini', 'anthropic'].map(p => {
    const o = a.providers[p]; const st = h('span', { class: 'muted' }, '…'); cells[p] = st;
    return h('div', { class: 'list-row', style: { gridTemplateColumns: '150px 1fr 1.2fr auto' } },
      h('div', {}, h('b', {}, NAMES[p][0]), h('div', { class: 'muted', style: { fontSize: '12px' } }, NAMES[p][1])),
      st, bind(inp({ dir: 'ltr', placeholder: 'الافتراضي: ' + DEFAULT_MODELS[p] }), o, 'model'), sw(o.enabled !== false, v => o.enabled = v));
  });
  (async () => {
    try { const d = await api('/api/vision'); for (const p of ['gemini', 'anthropic']) { const x = d.status[p], c = cells[p]; c.className = x.available ? 'ok-t' : 'no-t'; c.textContent = x.available ? 'متاح للمستخدمين' : 'غير متاح: ' + (REASON[x.reason] || x.reason) + (x.reason === 'nokey' ? ` (أضف ${KEYS[p]})` : ''); } }
    catch { Object.values(cells).forEach(c => { c.textContent = 'تعذّر الفحص'; c.className = 'no-t'; }); }
  })();
  m.append(h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'الذكاء الاصطناعي في الأدوات'),
    h('p', { class: 'muted' }, 'يظهر في الأدوات التالية خيار ثانٍ بجانب المعالجة على الجهاز: مصحح ورق التظليل (قارئ ثانٍ يؤكد القراءة ويقرأ اسم الطالب ورقمه)، وتحويل PDF إلى Word وإلى Excel (للملفات الممسوحة ضوئيًا). يستخدم مفاتيح Claude و Gemini نفسها المضبوطة لدراسة الجدوى، والمعالجة على الجهاز تبقى متاحة ومجانية دائمًا.'),
    h('div', { class: 'opts' },
      h('label', { class: 'check' }, bind(h('input', { type: 'checkbox' }), a, 'enabled', 'bool'), 'إظهار خيار الذكاء الاصطناعي في الأدوات'),
      h('label', { class: 'check' }, bind(h('input', { type: 'checkbox' }), a, 'autoFallback', 'bool'), 'الانتقال تلقائيًا إلى المزوّد الآخر إذا تعذّر المختار'),
      field('الحد اليومي لكل مستخدم (عدد الصور أو الصفحات)', bind(inp({ type: 'number', min: 0 }), a, 'dailyImagesPerIp', 'num'), 'صفر = بلا حد. كل ورقة طالب أو صفحة PDF تُحسب صورة واحدة'))),
    h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'المزوّدون'), h('p', { class: 'muted' }, 'المزوّد الذي ينفد رصيده أو تنتهي حصته يظهر للمستخدم رماديًا ولا يمكن اختياره، ثم يُعاد فحصه تلقائيًا.'), ...rows));
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


/* ======================= أدوات مساعدة للوحة التحكم الشاملة ======================= */
let ALLI = null;
const allIcons = () => (ALLI = ALLI || import('./icons-all.js'));
const ICON_AR = { 'ملف': 'file', 'صورة': 'image', 'قلم': 'pen', 'بيت': 'home', 'منزل': 'house', 'مبنى': 'building', 'هندسة': 'ruler', 'مسطرة': 'ruler', 'حاسبة': 'calculator', 'كتاب': 'book', 'تعليم': 'graduation', 'مدرسة': 'school', 'نجمة': 'star', 'قلب': 'heart', 'مال': 'banknote', 'نقود': 'coins', 'بنك': 'landmark', 'محفظة': 'wallet', 'بطاقة': 'credit-card', 'هاتف': 'phone', 'بريد': 'mail', 'رسالة': 'message', 'مستخدم': 'user', 'إعدادات': 'settings', 'بحث': 'search', 'قفل': 'lock', 'ساعة': 'clock', 'تقويم': 'calendar', 'خريطة': 'map', 'موقع': 'map-pin', 'شمس': 'sun', 'قمر': 'moon', 'مصباح': 'lamp', 'ضوء': 'lightbulb', 'كاميرا': 'camera', 'فيديو': 'video', 'صوت': 'volume', 'موسيقى': 'music', 'رسم': 'chart', 'إحصاء': 'chart', 'تنزيل': 'download', 'رفع': 'upload', 'سحابة': 'cloud', 'رمز': 'qr', 'باركود': 'barcode', 'أدوات': 'wrench', 'مفتاح': 'key', 'سيارة': 'car', 'شجرة': 'tree', 'ماء': 'droplet', 'نار': 'flame', 'لون': 'palette', 'طبقات': 'layers', 'صندوق': 'box', 'مجلد': 'folder', 'لعبة': 'gamepad', 'ذكاء': 'sparkles', 'سهم': 'arrow', 'تحقق': 'check', 'اختبار': 'clipboard-check', 'عمود': 'columns', 'سلم': 'footprints' };

function iconPick(obj, nameKey, svgKey, colorOf) {
  const prev = h('span', { class: 'mini-ic', style: { width: '42px', height: '42px' } });
  const paint = () => { prev.innerHTML = iconMarkup(obj[nameKey] || 'zap', obj[svgKey], 22); prev.style.background = colorOf ? colorOf() : 'var(--primary)'; };
  paint();
  const btn = h('button', { class: 'btn light sm', type: 'button' }, ico('search', 14), 'اختيار أيقونة');
  btn.onclick = async () => {
    const { ALL_ICONS, ICON_TAGS } = await allIcons();
    const names = Object.keys(ALL_ICONS);
    const q = h('input', { class: 'input', type: 'search', placeholder: 'ابحث بالعربية أو الإنجليزية: بيت، مال، ruler، book…' });
    const grid = h('div', { class: 'icon-grid' });
    const dlg = h('dialog', { class: 'don-dlg icon-dlg' }, h('div', { class: 'don-dlg-body' },
      h('div', { class: 'row' }, h('h2', { style: { margin: 0, flex: 1, fontSize: '19px' } }, `اختيار أيقونة (${names.length})`), h('button', { class: 'icon-btn', type: 'button', onclick: () => { dlg.close(); dlg.remove(); } }, ico('x', 20))), q, grid));
    const draw = () => {
      let t = q.value.trim().toLowerCase();
      for (const [a, e] of Object.entries(ICON_AR)) if (t.includes(a)) t = t.replace(a, e);
      const words = t.split(/\s+/).filter(Boolean);
      const list = (words.length ? names.filter(n => words.every(w => n.includes(w) || (ICON_TAGS[n] || '').includes(w))) : names).slice(0, 240);
      grid.innerHTML = '';
      list.forEach(n => { const b = h('button', { type: 'button', title: n, html: ALL_ICONS[n].replace('<svg ', '<svg width="24" height="24" ') }); b.onclick = () => { obj[nameKey] = n; obj[svgKey] = ICONS[n] ? '' : ALL_ICONS[n]; markDirty(); paint(); dlg.close(); dlg.remove(); }; grid.append(b); });
      if (!list.length) grid.append(h('p', { class: 'muted' }, 'لا توجد نتائج.'));
    };
    let tm; q.oninput = () => { clearTimeout(tm); tm = setTimeout(draw, 150); };
    document.body.append(dlg); dlg.showModal(); draw(); q.focus();
  };
  return { el: h('div', { class: 'row', style: { gap: '8px' } }, prev, btn), paint };
}

// رفع صورة صغيرة وحفظها داخل الإعدادات (تُصغَّر تلقائيًا)
function imgField(obj, key, label, { max = 128, hint, fmt = 'image/png', onChange } = {}) {
  const prev = h('div', { class: 'row' });
  const draw = () => { prev.innerHTML = ''; if (obj[key]) prev.append(h('img', { src: obj[key], style: { width: '56px', height: '56px', objectFit: 'contain', border: '1px solid var(--line)', borderRadius: '10px', background: '#fff' } }), h('button', { class: 'btn light sm', type: 'button', onclick: () => { obj[key] = ''; markDirty(); draw(); onChange?.(); } }, ico('trash-2', 14), 'إزالة')); };
  const fi = h('input', { type: 'file', accept: 'image/*', class: 'hidden' });
  const pick = h('button', { class: 'btn light sm', type: 'button', onclick: () => fi.click() }, ico('upload', 14), 'رفع صورة');
  fi.onchange = async () => {
    const f = fi.files[0]; if (!f) return;
    try {
      if (f.type === 'image/svg+xml' && f.size < 60000) { const t = await f.text(); obj[key] = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(t.replace(/<script[\s\S]*?<\/script>/gi, '')))); }
      else {
        const bmp = await createImageBitmap(f); const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
        const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
        const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(bmp, 0, 0, c.width, c.height);
        obj[key] = c.toDataURL(fmt, 0.9);
      }
      markDirty(); draw(); onChange?.();
    } catch { toast('تعذّرت قراءة الصورة.', true); }
    fi.value = '';
  };
  draw();
  return h('div', { class: 'field' }, h('span', {}, label), h('div', { class: 'row' }, pick, fi), hint ? h('small', {}, hint) : null, prev);
}

// قائمة قابلة للترتيب والحذف والإضافة
function listEditor(arr, rowFn, makeNew, addLabel) {
  const box = h('div', { class: 'le' });
  const draw = () => {
    box.innerHTML = '';
    arr.forEach((it, i) => {
      const mv = (d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; markDirty(); draw(); };
      box.append(h('div', { class: 'le-row' }, h('div', { class: 'le-main' }, rowFn(it, i, draw)),
        h('div', { class: 'le-ctl' }, h('button', { class: 'icon-btn', type: 'button', title: 'أعلى', disabled: i === 0, onclick: () => mv(-1) }, ico('arrow-up', 16)), h('button', { class: 'icon-btn', type: 'button', title: 'أسفل', disabled: i === arr.length - 1, onclick: () => mv(1) }, ico('arrow-down', 16)),
          h('button', { class: 'icon-btn', type: 'button', title: 'حذف', onclick: () => { if (confirm('حذف هذا العنصر؟')) { arr.splice(i, 1); markDirty(); draw(); } } }, ico('trash-2', 16)))));
    });
    if (!arr.length) box.append(h('p', { class: 'muted' }, 'لا توجد عناصر.'));
    box.append(h('button', { class: 'btn light sm', type: 'button', onclick: () => { arr.push(makeNew()); markDirty(); draw(); } }, ico('plus', 14), addLabel || 'إضافة'));
  };
  draw();
  return box;
}
const colorInp = (obj, key) => bind(inp({ type: 'color', style: { height: '42px', padding: '4px', width: '64px' } }), obj, key);

/* ======================= تبويب التصميم والصفحة الرئيسية ======================= */
function design(m) {
  const t = cfg.theme, H = cfg.home, N = cfg.nav, F = cfg.footer, s = cfg.site;
  const FONT_OPTS = [['Cairo', 'Cairo (الافتراضي)'], ['Tajawal', 'Tajawal'], ['Almarai', 'Almarai'], ['IBM Plex Sans Arabic', 'IBM Plex Sans Arabic'], ['Readex Pro', 'Readex Pro'], ['Noto Kufi Arabic', 'Noto Kufi Arabic'], ['El Messiri', 'El Messiri'], ['system', 'خط النظام']];
  const logo = iconPick(t, 'logoIcon', 'logoIconSvg', () => s.primaryColor);
  m.append(
    h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'الألوان والخط'),
      h('div', { class: 'opts' },
        field('الخط', bind(sel(FONT_OPTS, t.font), t, 'font'), 'الخطوط غير Cairo تُحمَّل من Google Fonts'),
        field('استدارة الزوايا (بكسل)', bind(inp({ type: 'number', min: 0, max: 30 }), t, 'radius', 'num')),
        field('الوضع الليلي', bind(sel([['off', 'متوقف'], ['auto', 'تلقائي حسب جهاز الزائر'], ['on', 'دائمًا']], t.dark), t, 'dark')),
        field('اللون الأساسي', colorInp(s, 'primaryColor')), field('اللون الثانوي (الشارات والإعلانات)', colorInp(s, 'accentColor')),
        field('خلفية الصفحة', colorInp(t, 'bg')), field('خلفية البطاقات', colorInp(t, 'card')), field('لون النصوص', colorInp(t, 'ink')),
        field('خلفية الشريط العلوي', colorInp(t, 'headerBg')), field('خلفية التذييل', colorInp(t, 'footerBg')), field('نصوص التذييل', colorInp(t, 'footerInk')))),
    h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'الشعار والأيقونة'),
      h('div', { class: 'opts' },
        h('div', { class: 'field' }, h('span', {}, 'أيقونة الشعار'), logo.el, h('small', {}, 'تظهر بجوار اسم الموقع إن لم ترفع صورة شعار')),
        imgField(t, 'logoImage', 'صورة الشعار (اختيارية)', { max: 160, hint: 'PNG أو SVG بخلفية شفافة؛ تحل محل الأيقونة' }),
        imgField(t, 'favicon', 'أيقونة المتصفح (Favicon)', { max: 64, hint: 'مربعة، وتظهر في تبويب المتصفح' }))),
    h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'الصفحة الرئيسية'),
      h('div', { class: 'opts' },
        field('العنوان الكبير', bind(inp({ placeholder: s.name }), H, 'heroTitle'), 'فارغ = اسم الموقع'),
        field('النص تحت العنوان', bind(inp({ placeholder: s.tagline }), H, 'heroText'), 'فارغ = الشعار النصي من «هوية الموقع»'),
        field('نص مربع البحث', bind(inp(), H, 'searchPlaceholder')),
        field('حالة المجموعات عند أول زيارة', bind(sel([['closed', 'مطوية كلها'], ['first', 'فتح المجموعة الأولى'], ['open', 'مفتوحة كلها']], H.groupsDefault), H, 'groupsDefault')),
        h('label', { class: 'check' }, bind(h('input', { type: 'checkbox' }), H, 'showSearch', 'bool'), 'إظهار مربع البحث'),
        h('label', { class: 'check' }, bind(h('input', { type: 'checkbox' }), H, 'showJump', 'bool'), 'إظهار أزرار المجموعات السريعة'),
        h('label', { class: 'check' }, bind(h('input', { type: 'checkbox' }), H, 'showGroupControls', 'bool'), 'إظهار «فتح الكل / طي الكل»'),
        h('label', { class: 'check' }, bind(h('input', { type: 'checkbox' }), H, 'showProfile', 'bool'), 'إظهار الملف التعريفي'),
        h('label', { class: 'check' }, bind(h('input', { type: 'checkbox' }), H, 'showDonation', 'bool'), 'إظهار قسم الدعم')),
      h('h3', {}, 'الشارات تحت العنوان'),
      listEditor(H.badges, (b) => { const ip = iconPick(b, 'icon', 'iconSvg'); return h('div', { class: 'row' }, ip.el, h('div', { style: { flex: 1 } }, bind(inp({ placeholder: 'نص الشارة' }), b, 'text'))); }, () => ({ icon: 'check', text: '' }), 'إضافة شارة')),
    h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'القائمة العلوية'),
      h('div', { class: 'opts' },
        field('طريقة بناء القائمة', bind(sel([['auto', 'تلقائية من المجموعات'], ['custom', 'عناصر أحددها بنفسي']], N.mode), N, 'mode')),
        h('label', { class: 'check' }, bind(h('input', { type: 'checkbox' }), N, 'showSupport', 'bool'), 'إضافة «ادعم المنصة» تلقائيًا')),
      h('p', { class: 'muted' }, 'في الوضع المخصص: الروابط الداخلية تبدأ بـ #/ مثل #/tool/omr أو #/?g=eng، والخارجية بـ https://'),
      listEditor(N.items, (x) => h('div', { class: 'opts', style: { margin: 0 } }, bind(inp({ placeholder: 'النص' }), x, 'label'), bind(inp({ placeholder: '#/tool/qr أو https://', dir: 'ltr' }), x, 'href'),
        h('label', { class: 'check' }, bind(h('input', { type: 'checkbox' }), x, 'newTab', 'bool'), 'في نافذة جديدة'), h('label', { class: 'check' }, bind(h('input', { type: 'checkbox' }), x, 'enabled', 'bool'), 'ظاهر')),
        () => ({ label: '', href: '', newTab: false, enabled: true }), 'إضافة عنصر')),
    h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'روابط التذييل'),
      listEditor(F.links, (x) => h('div', { class: 'opts', style: { margin: 0 } }, bind(inp({ placeholder: 'النص' }), x, 'label'), bind(inp({ placeholder: '#/privacy أو https://', dir: 'ltr' }), x, 'href')), () => ({ label: '', href: '' }), 'إضافة رابط')),
    h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'CSS مخصص (للمتقدمين)'),
      h('p', { class: 'muted' }, 'أي تنسيق تكتبه هنا يُطبَّق على الموقع كله بعد الحفظ. مثال: .tool-card h3 { font-size: 18px }'),
      bind(h('textarea', { class: 'input', rows: 8, dir: 'ltr', style: { fontFamily: 'monospace', fontSize: '13px' } }), t, 'customCss')),
    h('div', { class: 'actions' }, h('button', { class: 'btn light sm', type: 'button', onclick: () => { if (!confirm('استعادة التصميم الافتراضي (الألوان والخط والشعار والصفحة الرئيسية والقوائم)؟')) return; cfg.theme = structuredClone(DEFAULT_CONFIG.theme); cfg.home = structuredClone(DEFAULT_CONFIG.home); cfg.nav = structuredClone(DEFAULT_CONFIG.nav); cfg.footer = structuredClone(DEFAULT_CONFIG.footer); markDirty(); render(); } }, ico('refresh-cw', 14), 'استعادة التصميم الافتراضي')));
}

/* ======================= تبويب المجموعات والأقسام ======================= */
function groups(m) {
  if (!cfg.groups.length) cfg.groups = structuredClone(GROUPS).map(g => ({ ...g, enabled: true }));
  const cats = getCategories(cfg);
  const catTitle = (id) => (cfg.categories.find(c => c.id === id) || cats.find(c => c.id === id) || { title: id }).title;
  const setCatTitle = (id, title) => { let c = cfg.categories.find(x => x.id === id); if (!c) { c = { id }; cfg.categories.push(c); } c.title = title; markDirty(); };
  const box = h('div');
  const draw = () => {
    box.innerHTML = '';
    // الأقسام غير المسندة إلى أي مجموعة
    const used = new Set(cfg.groups.flatMap(g => g.cats));
    const orphan = cats.filter(c => !used.has(c.id));
    cfg.groups.forEach((g, gi) => {
      g.cats ||= [];
      const ip = iconPick(g, 'icon', 'iconSvg', () => g.color);
      const color = colorInp(g, 'color'); color.addEventListener('input', ip.paint);
      const mvG = (d) => { const j = gi + d; if (j < 0 || j >= cfg.groups.length) return; [cfg.groups[gi], cfg.groups[j]] = [cfg.groups[j], cfg.groups[gi]]; markDirty(); draw(); };
      const catRows = h('div', { class: 'cat-list' });
      g.cats.forEach((cid, ci) => {
        const ttl = inp({ value: catTitle(cid) }); ttl.oninput = () => setCatTitle(cid, ttl.value);
        const move = sel([['', 'نقل إلى…'], ...cfg.groups.filter(x => x !== g).map(x => [x.id, x.title])], '');
        move.onchange = () => { const to = cfg.groups.find(x => x.id === move.value); if (!to) return; g.cats.splice(ci, 1); to.cats.push(cid); markDirty(); draw(); };
        const mvC = (d) => { const j = ci + d; if (j < 0 || j >= g.cats.length) return; [g.cats[ci], g.cats[j]] = [g.cats[j], g.cats[ci]]; markDirty(); draw(); };
        const nTools = BUILTIN_TOOLS.filter(t => (cfg.tools[t.id]?.category || t.category) === cid).length + cfg.customServices.filter(s => s.category === cid).length;
        catRows.append(h('div', { class: 'cat-row' }, ttl, h('span', { class: 'muted', style: { whiteSpace: 'nowrap' } }, `${nTools} أداة`), move,
          h('button', { class: 'icon-btn', type: 'button', disabled: ci === 0, onclick: () => mvC(-1) }, ico('arrow-up', 16)), h('button', { class: 'icon-btn', type: 'button', disabled: ci === g.cats.length - 1, onclick: () => mvC(1) }, ico('arrow-down', 16)),
          h('button', { class: 'icon-btn', type: 'button', title: 'إزالة القسم من المجموعة', onclick: () => { g.cats.splice(ci, 1); markDirty(); draw(); } }, ico('x', 16))));
      });
      const addCat = h('button', { class: 'btn light sm', type: 'button' }, ico('plus', 14), 'قسم جديد');
      addCat.onclick = () => { const title = prompt('اسم القسم الجديد:'); if (!title) return; const id = 'c_' + Math.random().toString(36).slice(2, 8); cfg.categories.push({ id, title }); g.cats.push(id); markDirty(); draw(); };
      const addOrphan = orphan.length ? sel([['', 'إضافة قسم موجود…'], ...orphan.map(c => [c.id, catTitle(c.id)])], '') : null;
      if (addOrphan) addOrphan.onchange = () => { if (addOrphan.value) { g.cats.push(addOrphan.value); markDirty(); draw(); } };
      box.append(h('div', { class: 'panel grp-ed', style: { borderInlineStart: `5px solid ${g.color}` } },
        h('div', { class: 'row' }, h('b', { style: { flex: 1, fontSize: '17px' } }, g.title || '(بدون اسم)'),
          h('button', { class: 'icon-btn', type: 'button', disabled: gi === 0, onclick: () => mvG(-1) }, ico('arrow-up', 16)), h('button', { class: 'icon-btn', type: 'button', disabled: gi === cfg.groups.length - 1, onclick: () => mvG(1) }, ico('arrow-down', 16)),
          sw(g.enabled !== false, v => { g.enabled = v; }),
          h('button', { class: 'icon-btn', type: 'button', title: 'حذف المجموعة', onclick: () => { if (confirm('حذف المجموعة؟ أقسامها ستظهر تحت «خدمات إضافية» أو آخر مجموعة.')) { cfg.groups.splice(gi, 1); markDirty(); draw(); } } }, ico('trash-2', 16))),
        h('div', { class: 'opts' }, field('اسم المجموعة', bind(inp(), g, 'title')), field('الوصف', bind(inp(), g, 'desc')),
          h('div', { class: 'field' }, h('span', {}, 'الأيقونة واللون'), h('div', { class: 'row' }, ip.el, color)),
          imgField(g, 'image', 'صورة بدل الأيقونة (اختيارية)', { max: 128 })),
        h('h4', { style: { margin: '10px 0 6px' } }, 'الأقسام داخل المجموعة'), catRows, h('div', { class: 'row', style: { marginTop: '8px' } }, addCat, addOrphan)));
    });
    box.append(h('div', { class: 'actions' },
      h('button', { class: 'btn sm', type: 'button', onclick: () => { cfg.groups.push({ id: 'g_' + Math.random().toString(36).slice(2, 8), title: 'مجموعة جديدة', desc: '', icon: 'folder', color: '#475569', cats: [], enabled: true }); markDirty(); draw(); } }, ico('plus', 14), 'إضافة مجموعة'),
      h('button', { class: 'btn light sm', type: 'button', onclick: () => { if (confirm('استعادة المجموعات والأقسام الافتراضية؟')) { cfg.groups = []; cfg.categories = []; markDirty(); render(); } } }, ico('refresh-cw', 14), 'استعادة الافتراضي')));
  };
  draw();
  m.append(h('div', { class: 'panel' }, h('h2', { style: { marginTop: 0 } }, 'المجموعات والأقسام'), h('p', { class: 'muted' }, 'المجموعات هي القوائم الكبرى القابلة للطي في الصفحة الرئيسية، وتحت كل مجموعة أقسامها. غيّر الأسماء والأيقونات والألوان والترتيب، وانقل الأقسام بين المجموعات، أو أضف مجموعات وأقسامًا جديدة. ولنقل أداة إلى قسم آخر استخدم تبويب «الأدوات».')), box);
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
