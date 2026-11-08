// الملف التعريفي للمالك (الاسم وروابط التواصل) وقسم دعم استمرار الأدوات
import { h, ico, toast } from './ui.js';
import { BRANDS, BRAND_ORDER } from './brands.js';

const BASE = {
  telegram: 'https://t.me/', x: 'https://x.com/', instagram: 'https://instagram.com/', snapchat: 'https://snapchat.com/add/',
  tiktok: 'https://www.tiktok.com/@', youtube: 'https://www.youtube.com/@', linkedin: 'https://www.linkedin.com/in/',
  facebook: 'https://facebook.com/', threads: 'https://www.threads.net/@', github: 'https://github.com/',
};

// يقبل اسم المستخدم أو الرابط الكامل أو الرقم
export function linkFor(key, value) {
  let v = String(value || '').trim();
  if (!v) return null;
  if (key === 'whatsapp') { if (/^https?:/i.test(v)) return v; const n = v.replace(/[^\d]/g, '').replace(/^00/, ''); return n ? `https://wa.me/${n}` : null; }
  if (key === 'phone') return `tel:${v.replace(/[^\d+]/g, '')}`;
  if (key === 'email') return /^mailto:/i.test(v) ? v : `mailto:${v}`;
  if (/^https?:\/\//i.test(v)) return v;
  if (key === 'website') return 'https://' + v.replace(/^\/+/, '');
  return (BASE[key] || '') + v.replace(/^@/, '');
}

export function socialIcons(links, size = 22) {
  const wrap = h('div', { class: 'socials' });
  for (const k of BRAND_ORDER) {
    const url = linkFor(k, links?.[k]); if (!url) continue;
    const b = BRANDS[k];
    const ext = /^https?:/.test(url);
    wrap.append(h('a', { class: 'social', href: url, target: ext ? '_blank' : null, rel: ext ? 'noopener' : null, title: b.name, 'aria-label': b.name, style: { '--brand': b.color }, html: b.svg.replace('<svg ', `<svg width="${size}" height="${size}" `) }));
  }
  return wrap.children.length ? wrap : null;
}

export function profileCard(cfg) {
  const p = cfg.profile;
  if (!p || p.enabled === false || !p.name) return null;
  const icons = socialIcons(p.links);
  return h('div', { class: 'panel profile-card' },
    /^(data:image\/|https:\/\/)/.test(p.photo || '') ? h('img', { class: 'avatar photo', src: p.photo, alt: p.name }) : h('div', { class: 'avatar', html: ico('user-round', 30).innerHTML }),
    h('div', { class: 'pc-name' }, p.name),
    icons || null);
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('تم النسخ.'); }
  catch { const t = h('textarea', {}, text); document.body.append(t); t.select(); try { document.execCommand('copy'); toast('تم النسخ.'); } catch { toast('تعذّر النسخ، انسخ الرقم يدويًا.', true); } t.remove(); }
}
const copyRow = (label, value, ltr = true) => value ? h('div', { class: 'acc-row' }, h('span', { class: 'muted' }, label), h('b', { dir: ltr ? 'ltr' : null }, value), h('button', { class: 'icon-btn', type: 'button', title: 'نسخ', onclick: () => copy(value.replace(/\s+/g, ltr ? '' : ' ')) }, ico('copy', 16))) : null;

export function hasDonation(cfg) {
  const d = cfg.donation;
  return d && d.enabled !== false && ((d.accounts || []).some(a => a.iban || a.number) || (d.links || []).some(l => l.url));
}

// تفاصيل الحسابات تُعرض في نافذة منبثقة عند الضغط على زر الدعم فقط
function openDonationDetails(cfg) {
  const d = cfg.donation;
  document.querySelector('dialog.don-dlg')?.remove();
  const dlg = h('dialog', { class: 'don-dlg', 'aria-label': d.title });
  const close = () => { dlg.close(); dlg.remove(); };
  dlg.append(h('div', { class: 'don-dlg-body' },
    h('div', { class: 'row' }, h('span', { class: 'don-ic', html: ico('hand-heart', 22).innerHTML }), h('h2', { style: { margin: 0, fontSize: '19px', flex: 1 } }, 'بيانات الدعم'), h('button', { class: 'icon-btn', type: 'button', title: 'إغلاق', 'aria-label': 'إغلاق', onclick: close }, ico('x', 20))),
    h('div', { class: 'accounts' }, (d.accounts || []).filter(a => a.iban || a.number).map(a => {
      const hasQr = /^data:image\//.test(a.qr || '');
      return h('div', { class: 'account' },
        h('div', { class: 'acc-head' }, ico('landmark', 18), h('b', {}, a.bank || 'حساب بنكي'), a.country ? h('span', { class: 'muted' }, ' — ' + a.country) : null),
        copyRow('اسم المستفيد', a.holder, false), copyRow('رقم الآيبان', a.iban), copyRow('رقم الحساب', a.number), a.note ? h('small', { class: 'muted' }, a.note) : null,
        hasQr ? h('div', { class: 'acc-qr' }, h('img', { src: a.qr, alt: 'رمز QR للتحويل إلى ' + (a.bank || 'الحساب') }), h('small', { class: 'muted' }, 'امسح الرمز من تطبيق البنك للتحويل مباشرة')) : null);
    })),
    (d.links || []).some(l => l.url) ? h('div', { class: 'actions' }, (d.links || []).filter(l => l.url).map(l => h('a', { class: 'btn', href: l.url, target: '_blank', rel: 'noopener' }, ico('heart', 18), l.label || 'ادعم'))) : null,
    d.thanks ? h('p', { class: 'muted center', style: { margin: '14px 0 0' } }, d.thanks) : null));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  document.body.append(dlg); dlg.showModal();
}

export function donationCard(cfg, { open = false } = {}) {
  if (!hasDonation(cfg)) return null;
  const d = cfg.donation;
  const card = h('div', { class: 'panel donation-card' },
    h('span', { class: 'don-ic big', html: ico('hand-heart', 30).innerHTML }),
    h('h2', {}, d.title),
    d.text ? h('p', {}, d.text) : null,
    h('button', { class: 'btn don-btn', type: 'button', onclick: () => openDonationDetails(cfg) }, ico('heart', 18), 'ادعم الآن'));
  if (open) setTimeout(() => openDonationDetails(cfg), 50);
  return card;
}

// سطر صغير يدعو إلى الدعم بعد نجاح أي أداة
export function supportNudge(cfg) {
  if (!hasDonation(cfg)) return null;
  return h('p', { class: 'nudge' }, ico('heart', 15), ' أفادتك الأداة؟ ', h('a', { href: '#/support' }, 'ادعم استمرارها مجانًا'));
}
