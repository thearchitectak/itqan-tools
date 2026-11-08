import { h, $, $$, ico, esc } from './ui.js';
import { icon } from './icons.js';
import { CATEGORIES, mergeConfig, resolveTools } from './defaults.js';
import { profileCard, donationCard, socialIcons, hasDonation } from './profile.js';

export let CONFIG = mergeConfig({});
let TOOLS = [];

async function loadConfig() {
  try {
    const r = await fetch('/api/config', { cache: 'no-store' });
    if (r.ok) CONFIG = mergeConfig(await r.json());
  } catch { /* يعمل الموقع بالإعدادات الافتراضية إن تعذّر الاتصال */ }
  TOOLS = resolveTools(CONFIG);
  window.__ITQAN_CFG = CONFIG;
}

function applyBranding() {
  const s = CONFIG.site;
  const root = document.documentElement.style;
  root.setProperty('--primary', s.primaryColor || '#0f766e');
  root.setProperty('--primary-600', `color-mix(in srgb, ${s.primaryColor} 85%, #000)`);
  root.setProperty('--primary-50', `color-mix(in srgb, ${s.primaryColor} 8%, #fff)`);
  root.setProperty('--accent', s.accentColor || '#f59e0b');
  $('#brand-name').textContent = s.name;
  $('#brand-owner').textContent = s.owner || '';
  $('#brand-logo').innerHTML = icon('layers', 20);
  $('#f-name').textContent = s.name;
  $('#f-about').textContent = s.about || '';
  const fs = CONFIG.profile?.enabled !== false ? socialIcons(CONFIG.profile?.links, 18) : null;
  $('#f-social').innerHTML = ''; if (fs) $('#f-social').append(fs);
  $('#f-copy').innerHTML = `© ${new Date().getFullYear()} ${esc(s.name)} — ${esc(s.footer || '')}${s.owner ? ' · ' + esc(s.owner) : ''}${s.contactEmail ? ` · <a href="mailto:${esc(s.contactEmail)}">${esc(s.contactEmail)}</a>` : ''}`;
  const an = $('#announce');
  if (s.announcement) { an.textContent = s.announcement; an.classList.remove('hidden'); } else an.classList.add('hidden');
  const nav = $('#nav'); nav.innerHTML = '';
  const links = [['#/', 'الرئيسية'], ['#/?c=organize', 'أدوات PDF'], ['#/?c=convert', 'التحويل']];
  if (isOn('qr')) links.push(['#/tool/qr', 'رمز QR']);
  if (isOn('feasibility')) links.push(['#/tool/feasibility', 'دراسة الجدوى']);
  if (hasDonation(CONFIG)) links.push(['#/support', 'ادعم المنصة']);
  for (const [href, t] of links) nav.append(h('a', { href }, t));
}
const isOn = (id) => TOOLS.find(t => t.id === id)?.enabled;

function setTitle(t) { document.title = t ? `${t} — ${CONFIG.site.name}` : `${CONFIG.site.name} — ${CONFIG.site.tagline}`; }

function toolCard(t) {
  const href = t.builtin ? `#/tool/${t.id}` : (t.type === 'link' ? t.url : `#/s/${t.serviceId}`);
  return h('a', { class: 'tool-card', href, target: !t.builtin && t.type === 'link' ? '_blank' : null, rel: !t.builtin && t.type === 'link' ? 'noopener' : null },
    t.badge ? h('span', { class: 'badge' }, t.badge) : null,
    h('span', { class: 'ic', style: { background: t.color }, html: icon(t.icon, 26) }),
    h('h3', {}, t.title), h('p', {}, t.desc));
}

function renderHome(params) {
  setTitle('');
  const app = $('#app'); app.innerHTML = '';
  const s = CONFIG.site;
  const visible = TOOLS.filter(t => t.enabled);
  const usedCats = CATEGORIES.filter(c => visible.some(t => t.category === c.id));
  let cat = params.get('c') || 'all';
  if (cat !== 'all' && !usedCats.some(c => c.id === cat)) cat = 'all';
  const grid = h('div', { class: 'grid' });
  const search = h('input', { class: 'search', type: 'search', placeholder: 'ابحث عن أداة…' });
  const filters = h('div', { class: 'filters' });
  const draw = () => {
    const q = search.value.trim();
    grid.innerHTML = '';
    visible.filter(t => (cat === 'all' || t.category === cat) && (!q || (t.title + ' ' + t.desc).includes(q))).forEach(t => grid.append(toolCard(t)));
    if (!grid.children.length) grid.append(h('p', { class: 'muted center', style: { gridColumn: '1/-1' } }, 'لا توجد أدوات مطابقة.'));
  };
  const mkBtn = (id, title) => { const b = h('button', { class: cat === id ? 'on' : '' }, title); b.onclick = () => { cat = id; $$('button', filters).forEach(x => x.classList.remove('on')); b.classList.add('on'); draw(); }; return b; };
  filters.append(mkBtn('all', 'جميع الأدوات'), ...usedCats.map(c => mkBtn(c.id, c.title)));
  search.oninput = draw;
  app.append(h('div', { class: 'container' },
    h('section', { class: 'hero' },
      h('h1', {}, s.name), h('p', {}, s.tagline),
      h('div', { class: 'badges' },
        h('span', { class: 'pill', html: icon('infinity', 16) + ' مجاني بالكامل' }),
        h('span', { class: 'pill', html: icon('shield-check', 16) + ' ملفاتك لا تغادر جهازك' }),
        h('span', { class: 'pill', html: icon('zap', 16) + ' دون تسجيل أو اشتراك' }))),
    filters, search, grid));
  const pc = profileCard(CONFIG), dc = donationCard(CONFIG);
  if (pc || dc) app.firstChild.append(h('section', { class: 'about-row' + (pc && dc ? '' : ' single') }, pc, dc));
  draw();
}

function renderText(title, text) {
  setTitle(title);
  $('#app').innerHTML = '';
  $('#app').append(h('div', { class: 'container tool-page' }, h('div', { class: 'panel', style: { maxWidth: '820px', margin: '0 auto' } }, h('h1', { style: { marginTop: 0 } }, title), ...String(text || '').split(/\n+/).map(p => h('p', {}, p)))));
}

function renderService(id) {
  const s = CONFIG.customServices.find(x => x.id === id && x.enabled !== false);
  if (!s) return renderNotFound();
  setTitle(s.title);
  const app = $('#app'); app.innerHTML = '';
  const page = h('div', { class: 'container tool-page' }, h('div', { class: 'tool-head' }, h('span', { class: 'ic', style: { background: s.color || '#495057' }, html: icon(s.icon || 'zap', 32) }), h('h1', {}, s.title), h('p', {}, s.desc || '')));
  if (s.type === 'link') page.append(h('div', { class: 'center' }, h('a', { class: 'btn', href: s.url, target: '_blank', rel: 'noopener' }, 'فتح الخدمة')));
  else {
    // محتوى HTML يضيفه المالك، يعمل داخل إطار معزول عن الموقع
    const f = h('iframe', { class: 'service-frame', sandbox: 'allow-scripts allow-forms allow-downloads allow-popups allow-modals' });
    f.srcdoc = s.html || '<p>لا يوجد محتوى.</p>';
    page.append(f);
  }
  app.append(page);
}

function renderSupport() {
  const dc = donationCard(CONFIG, { open: true });
  if (!dc) return renderNotFound();
  setTitle(CONFIG.donation.title);
  $('#app').innerHTML = '';
  $('#app').append(h('div', { class: 'container tool-page', style: { maxWidth: '760px' } }, dc, profileCard(CONFIG)));
}

function renderNotFound() {
  setTitle('الصفحة غير موجودة');
  $('#app').innerHTML = '';
  $('#app').append(h('div', { class: 'container tool-page center' }, h('h1', {}, 'الصفحة غير موجودة'), h('p', {}, h('a', { href: '#/' }, 'العودة إلى الصفحة الرئيسية'))));
}

export function toolShell(t) {
  setTitle(t.title);
  const app = $('#app'); app.innerHTML = '';
  const body = h('div', { class: 'tool-body' });
  const page = h('div', { class: 'container tool-page', style: { '--tool-color': t.color } },
    h('div', { class: 'tool-head' }, h('span', { class: 'ic', style: { background: t.color }, html: icon(t.icon, 34) }), h('h1', {}, t.title), h('p', {}, t.desc)),
    body);
  page.style.setProperty('--tool-color', t.color);
  app.append(page);
  return body;
}

async function renderTool(id) {
  const t = TOOLS.find(x => x.id === id && x.builtin);
  if (!t || !t.enabled) return renderNotFound();
  const body = toolShell(t);
  body.append(h('p', { class: 'center muted' }, 'جارٍ تجهيز الأداة…'));
  try {
    if (id === 'qr' || id === 'barcode') { const m = await import('./codes.js'); body.innerHTML = ''; (id === 'qr' ? m.renderQR : m.renderBarcode)(body, t); }
    else if (id === 'feasibility') { const m = await import('./feasibility.js'); body.innerHTML = ''; m.renderFeasibility(body, t, CONFIG); }
    else { const m = await import('./pdf-tools.js'); body.innerHTML = ''; m.renderPdfTool(id, body, t); }
  } catch (e) { console.error(e); body.innerHTML = ''; body.append(h('div', { class: 'note err' }, 'تعذّر تحميل الأداة: ' + e.message)); }
}

function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = hash.split('?');
  const params = new URLSearchParams(qs || '');
  const parts = path.split('/').filter(Boolean);
  $$('#nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + hash));
  window.scrollTo(0, 0);
  if (!parts.length) return renderHome(params);
  if (parts[0] === 'tool' && parts[1]) return renderTool(parts[1]);
  if (parts[0] === 's' && parts[1]) return renderService(parts[1]);
  if (parts[0] === 'about') return renderText('عن المنصة', CONFIG.site.about);
  if (parts[0] === 'support') return renderSupport();
  if (parts[0] === 'privacy') return renderText('الخصوصية', CONFIG.site.privacy);
  renderNotFound();
}

await loadConfig();
applyBranding();
window.addEventListener('hashchange', route);
route();
