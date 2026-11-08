// الواجهة الرئيسية: الترويسة، التنقل بين الصفحات، الصفحة الرئيسية، الإعدادات، الملف التعريفي والدعم.
import { h, ico, $, t, tr, settings, setSetting, applyLang, num, modal, toast, copyText, sound, onSettings, store, displayName } from './core.js';
import { GAMES } from './games.js';
import { SITE_CONFIG } from './site-config.js';
import { BRANDS, BRAND_ORDER } from './brands.js';

let CONFIG = structuredClone(SITE_CONFIG);
let current = null; // اللعبة المفتوحة حاليًا

// ---------- البيانات المشتركة مع أدوات إتقان ----------
async function loadShared() {
  if (!/^https?:$/.test(location.protocol)) return;
  try {
    const r = await fetch('/api/site', { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    if (j.profile) CONFIG.profile = { ...CONFIG.profile, ...j.profile, links: { ...CONFIG.profile.links, ...(j.profile.links || {}) } };
    if (j.donation) CONFIG.donation = { ...CONFIG.donation, ...j.donation };
  } catch { }
}

// ---------- الملف التعريفي ----------
const BASE = {
  telegram: 'https://t.me/', x: 'https://x.com/', instagram: 'https://instagram.com/', snapchat: 'https://snapchat.com/add/',
  tiktok: 'https://www.tiktok.com/@', youtube: 'https://www.youtube.com/@', linkedin: 'https://www.linkedin.com/in/',
  facebook: 'https://facebook.com/', threads: 'https://www.threads.net/@', github: 'https://github.com/',
};
function linkFor(key, value) {
  let v = String(value || '').trim(); if (!v) return null;
  if (key === 'whatsapp') { if (/^https?:/i.test(v)) return v; const n = v.replace(/[^\d]/g, '').replace(/^00/, ''); return n ? `https://wa.me/${n}` : null; }
  if (key === 'phone') return `tel:${v.replace(/[^\d+]/g, '')}`;
  if (key === 'email') return /^mailto:/i.test(v) ? v : `mailto:${v}`;
  if (/^https?:\/\//i.test(v)) return v;
  if (key === 'website') return 'https://' + v.replace(/^\/+/, '');
  return (BASE[key] || '') + v.replace(/^@/, '');
}
function socialIcons(links, size = 20) {
  const wrap = h('div', { class: 'socials' });
  for (const k of BRAND_ORDER) {
    const url = linkFor(k, links?.[k]); if (!url) continue;
    const b = BRANDS[k]; const ext = /^https?:/.test(url);
    wrap.append(h('a', { class: 'social', href: url, target: ext ? '_blank' : null, rel: ext ? 'noopener' : null, title: b.name, 'aria-label': b.name, style: { '--brand': b.color }, html: b.svg.replace('<svg ', `<svg width="${size}" height="${size}" `) }));
  }
  return wrap.children.length ? wrap : null;
}
function profileCard() {
  const p = CONFIG.profile; if (!p || p.enabled === false) return null;
  const name = settings.lang === 'en' ? (p.nameEn || 'Eng. Ahmed Khaled') : (p.name || 'المهندس/ أحمد خالد');
  return h('div', { class: 'panel profile-card', id: 'about' },
    /^(data:image\/|https:\/\/)/.test(p.photo || '') ? h('img', { class: 'avatar', src: p.photo, alt: name }) : h('div', { class: 'avatar' }, ico('user-round', 38)),
    h('div', { class: 'pc-name' }, name),
    h('div', { class: 'pc-role' }, t('role')),
    socialIcons(p.links));
}
function hasAccounts() { const d = CONFIG.donation; return d && ((d.accounts || []).some(a => a.iban || a.number) || (d.links || []).some(l => l.url)); }
const copyRow = (label, value, ltr = true) => value ? h('div', { class: 'acc-row' }, h('span', { class: 'muted' }, label), h('b', { dir: ltr ? 'ltr' : null }, value), h('button', { class: 'icon-btn', type: 'button', title: t('copy'), onclick: () => copyText(value.replace(/\s+/g, ltr ? '' : ' ')) }, ico('copy', 16))) : null;
function openDonation() {
  const d = CONFIG.donation;
  modal(t('donDetails'), h('div', {},
    h('div', { class: 'accounts' }, (d.accounts || []).filter(a => a.iban || a.number).map(a => h('div', { class: 'account' },
      h('div', { class: 'acc-head' }, ico('landmark', 18), h('b', {}, a.bank || t('bankAcc')), a.country ? h('span', { class: 'muted' }, ' — ' + a.country) : null),
      copyRow(t('beneficiary'), a.holder, false), copyRow(t('iban'), a.iban), copyRow(t('accNo'), a.number), a.note ? h('small', { class: 'muted' }, a.note) : null,
      /^data:image\//.test(a.qr || '') ? h('div', { class: 'acc-qr' }, h('img', { src: a.qr, alt: 'QR' }), h('small', { class: 'muted' }, t('scanQr'))) : null))),
    (d.links || []).some(l => l.url) ? h('div', { class: 'row', style: { marginTop: '12px', justifyContent: 'center' } }, (d.links || []).filter(l => l.url).map(l => h('a', { class: 'btn', href: l.url, target: '_blank', rel: 'noopener' }, ico('heart', 18), l.label || t('donNow')))) : null,
    h('p', { class: 'muted center', style: { margin: '14px 0 0' } }, d.thanks || t('donThanks'))), [], { icon: 'hand-heart' });
}
function donationCard() {
  const d = CONFIG.donation; if (!d || d.enabled === false) return null;
  const btn = hasAccounts()
    ? h('button', { class: 'btn accent', type: 'button', onclick: openDonation }, ico('heart', 18), t('donNow'))
    : h('a', { class: 'btn accent', href: d.fallbackUrl || SITE_CONFIG.donation.fallbackUrl, target: '_blank', rel: 'noopener' }, ico('heart', 18), t('donNow'));
  return h('div', { class: 'panel donation-card', id: 'support' },
    h('span', { class: 'don-ic big' }, ico('hand-heart', 30)), h('h2', {}, t('donTitle')), h('p', {}, t('donText')), btn);
}

// ---------- الترويسة والتذييل ----------
function header() {
  return h('header', { class: 'site-header' }, h('div', { class: 'container bar' },
    h('a', { class: 'brand', href: '#home' }, h('span', { class: 'logo' }, ico('gamepad-2', 22)), h('span', {}, t('siteName'), h('small', {}, t('siteSub')))),
    h('nav', { class: 'nav' },
      h('a', { href: '#home' }, ico('house', 18), h('span', { class: 'lbl' }, t('games'))),
      h('a', { href: '#about-me' }, ico('user-round', 18), h('span', { class: 'lbl' }, t('about'))),
      h('a', { href: '#support-us' }, ico('heart', 18), h('span', { class: 'lbl' }, t('support'))),
      h('button', { type: 'button', onclick: openSettings, title: t('settings') }, ico('settings', 18), h('span', { class: 'lbl' }, t('settings'))),
      h('button', { type: 'button', title: t('language'), onclick: () => setSetting('lang', settings.lang === 'ar' ? 'en' : 'ar') }, ico('languages', 18), h('span', {}, settings.lang === 'ar' ? 'EN' : 'ع')))));
}
function footer() {
  return h('footer', { class: 'site-footer' }, h('div', { class: 'container row' },
    h('span', {}, '© ', num(new Date().getFullYear()), ' ', settings.lang === 'en' ? (CONFIG.profile.nameEn || 'Eng. Ahmed Khaled') : CONFIG.profile.name, ' — ', t('footer')),
    h('span', {}, t('siteName'), ' · ', t('openSource'))));
}

// ---------- الإعدادات ----------
export function seg(options, value, onpick) {
  const el = h('div', { class: 'seg' });
  for (const [v, label] of options) el.append(h('button', { type: 'button', class: v === value ? 'on' : '', onclick: () => { el.querySelectorAll('button').forEach(b => b.classList.remove('on')); el.querySelector(`[data-v="${v}"]`).classList.add('on'); onpick(v); }, 'data-v': v }, label));
  return el;
}
export function openSettings() {
  const draft = { ...settings };
  const nameIn = h('input', { class: 'input', value: settings.playerName, maxlength: 24, placeholder: `${t('player')} ${num(1)}` });
  const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.1, value: settings.volume, oninput: (e) => draft.volume = +e.target.value });
  const body = h('div', { class: 'opts' },
    h('label', { class: 'field', style: { gridColumn: '1 / -1' } }, h('span', {}, t('playerName')), nameIn, h('small', {}, t('playerNameHint'))),
    h('div', { class: 'field' }, h('span', {}, t('language')), seg([['ar', 'العربية'], ['en', 'English']], draft.lang, v => draft.lang = v)),
    h('div', { class: 'field' }, h('span', {}, t('digits')), seg([['latin', '123'], ['arabic', '١٢٣']], draft.digits, v => draft.digits = v)),
    h('div', { class: 'field' }, h('span', {}, t('sound')), seg([[true, t('on')], [false, t('off')]].map(([a, b]) => [String(a), b]), String(draft.sound), v => draft.sound = v === 'true')),
    h('div', { class: 'field' }, h('span', {}, t('soundSet')), seg([['wood', t('wood')], ['digital', t('digital')], ['soft', t('soft')]], draft.soundSet, v => { draft.soundSet = v; const old = settings.soundSet; settings.soundSet = v; sound('move'); settings.soundSet = old; })),
    h('label', { class: 'field' }, h('span', {}, t('volume')), vol),
    h('div', { class: 'field' }, h('span', {}, t('boardTheme')), seg(Object.entries({ green: ['#eeeed2', '#769656'], brown: ['#f0d9b5', '#b58863'], blue: ['#dee3e6', '#8ca2ad'], gray: ['#ebecd0', '#a7a7a7'], purple: ['#ece4f7', '#9c7fc6'] }).map(([k, [a, b]]) => [k, h('span', { class: 'swatch', style: { background: `conic-gradient(${b} 0 25%, ${a} 0 50%, ${b} 0 75%, ${a} 0)` } })]), draft.boardTheme, v => draft.boardTheme = v)),
    h('div', { class: 'field' }, h('span', {}, t('pieceSet')), seg([['cburnett', 'Classic'], ['merida', 'Merida']], draft.pieceSet, v => draft.pieceSet = v)));
  modal(t('settings'), body, [{ label: t('cancel'), kind: 'ghost', value: false }, { label: t('save'), value: true, icon: 'check' }], { icon: 'settings' }).then(ok => {
    if (!ok) return;
    draft.playerName = nameIn.value.trim().slice(0, 24);
    const langChanged = draft.lang !== settings.lang || draft.digits !== settings.digits;
    for (const [k, v] of Object.entries(draft)) if (settings[k] !== v) { if (langChanged && (k === 'lang' || k === 'digits')) continue; setSetting(k, v); }
    if (langChanged) { settings.digits = draft.digits; setSetting('lang', draft.lang); }
    toast(t('settingsSaved'), 'ok');
  });
}

// ---------- الصفحات ----------
function homeView() {
  const grid = h('div', { class: 'grid' }, GAMES.map(g => h(g.status === 'ready' ? 'a' : 'div', { class: 'game-card' + (g.status !== 'ready' ? ' soon' : ''), href: g.status === 'ready' ? '#' + g.id : null },
    h('div', { class: 'art', style: { background: g.color } }, ico(g.icon, 56)),
    g.status !== 'ready' ? h('span', { class: 'badge' }, t('soon')) : null,
    h('div', { class: 'body' },
      h('small', { class: 'muted', style: { fontWeight: 700 } }, tr(g.field)),
      h('h3', {}, tr(g.title)), h('p', {}, tr(g.desc)),
      h('div', { class: 'tags' }, h('span', { class: 'tag' }, ico('users', 13), ' ', tr(g.players)), (g.tags || []).map(x => h('span', { class: 'tag' }, tr(x))))))));
  return h('div', { class: 'container' },
    h('section', { class: 'hero' }, h('span', { class: 'kicker' }, ico('sparkles', 16), t('heroKicker')), h('h1', { html: t('heroTitle') }), h('p', {}, t('heroText'))),
    h('h2', { class: 'section-title' }, ico('gamepad-2', 22), t('gamesTitle')), grid,
    h('div', { class: 'about-grid', id: 'about-me' }, profileCard(), h('div', { id: 'support-us' }, donationCard())));
}

function gameHead(g) {
  return h('div', { class: 'game-headbox no-print' },
    h('div', { class: 'crumbs' }, h('a', { href: '#home' }, t('home')), ' / ', tr(g.title)),
    h('div', { class: 'game-head' }, h('span', { class: 'ic', style: { background: g.color } }, ico(g.icon, 26)), h('div', { class: 'grow' }, h('h1', {}, tr(g.title)), h('p', {}, tr(g.desc)))));
}
async function gameView(g, root) {
  const box = h('div', { class: 'container game-page' },
    gameHead(g),
    h('div', { class: 'game-root' }, h('p', { class: 'muted center' }, t('loading'))));
  root.append(box);
  try {
    const mod = await import(g.module);
    const gr = box.querySelector('.game-root'); gr.innerHTML = '';
    const api = await mod.mount(gr, { openSettings, seg, CONFIG });
    return api;
  } catch (e) {
    console.error(e);
    box.querySelector('.game-root').innerHTML = '';
    box.querySelector('.game-root').append(h('div', { class: 'panel center' }, String(e.message || e)));
  }
}

async function render() {
  applyLang();
  try { current?.unmount?.(); } catch { }
  current = null;
  document.querySelectorAll('dialog.modal').forEach(d => { try { d.close(); } catch { } d.remove(); });
  const app = $('#app'); app.innerHTML = '';
  const hash = decodeURIComponent(location.hash.slice(1));
  let route = hash.split('-')[0] || 'home';
  app.append(header());
  const main = h('main'); app.append(main);
  const g = GAMES.find(x => x.id === route && x.status === 'ready');
  if (g) { document.title = `${tr(g.title)} — ${t('siteName')}`; current = await gameView(g, main); }
  else {
    document.title = `${t('siteName')} — ${t('siteSub')}`;
    main.append(homeView());
    if (hash === 'about-me' || hash === 'support-us') setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30);
    else window.scrollTo(0, 0);
  }
  app.append(footer());
}

let lastRoute = null;
window.addEventListener('hashchange', () => {
  const hash = location.hash.slice(1); const route = hash.split('-')[0];
  // التنقل داخل الصفحة الرئيسية بين أقسامها لا يعيد بناءها
  if ((hash === 'about-me' || hash === 'support-us') && (lastRoute === 'home' || lastRoute === 'about' || lastRoute === 'support')) { document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); lastRoute = route; return; }
  // روابط داخلية للعبة المفتوحة (مثل chess-join-123456) تعالجها اللعبة نفسها
  if (current?.onHash && route === lastRoute) { current.onHash(hash); return; }
  lastRoute = route; render();
});
onSettings((k) => { if (k === 'lang' || k === 'digits') { if (current?.onLang) { applyLang(); const app = $('#app'); app.querySelector('.site-header')?.replaceWith(header()); app.querySelector('.site-footer')?.replaceWith(footer()); const g = GAMES.find(x => x.id === lastRoute); if (g) { app.querySelector('.game-headbox')?.replaceWith(gameHead(g)); document.title = `${tr(g.title)} — ${t('siteName')}`; } current.onLang(); } else render(); } else current?.onSettings?.(k); });

lastRoute = location.hash.slice(1).split('-')[0] || 'home';
loadShared().finally(render);
