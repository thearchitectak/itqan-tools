// الأدوات المشتركة بين صفحات الموقع وجميع الألعاب: إنشاء العناصر، الأيقونات، الترجمة، الإعدادات، الأصوات، النوافذ.
import { ICONS } from './icons.js';

// ---------- إنشاء العناصر ----------
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v), Object.entries(v).forEach(([p, val]) => p.startsWith('--') && el.style.setProperty(p, val));
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
export function ico(name, size = 20) {
  const s = (ICONS[name] || ICONS['circle-help']).replace(/width="24" height="24"/, `width="${size}" height="${size}"`);
  const span = document.createElement('span');
  span.className = 'ico'; span.style.display = 'inline-grid'; span.innerHTML = s;
  return span;
}
export const $ = (s, r = document) => r.querySelector(s);

// ---------- التخزين المحلي الآمن ----------
export const store = {
  get(k, d) { try { const v = localStorage.getItem('itqan-play:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('itqan-play:' + k, JSON.stringify(v)); } catch { } },
};

// ---------- الإعدادات العامة ----------
const DEFAULT_SETTINGS = { lang: 'ar', digits: 'latin', sound: true, soundSet: 'wood', volume: 0.7, boardTheme: 'green', pieceSet: 'cburnett', playerName: '' };
export const settings = { ...DEFAULT_SETTINGS, ...store.get('settings', {}) };
const listeners = new Set();
export function setSetting(k, v) { settings[k] = v; store.set('settings', settings); listeners.forEach(f => f(k, v)); }
export function onSettings(f) { listeners.add(f); return () => listeners.delete(f); }

// ---------- الترجمة ----------
const DICT = { ar: {}, en: {} };
export function addDict(d) { for (const l of Object.keys(d)) Object.assign(DICT[l] ||= {}, d[l]); }
export function t(key, vars) {
  let s = DICT[settings.lang]?.[key] ?? DICT.ar[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(v);
  return s;
}
// نص ثنائي اللغة مخزن في كائن { ar, en }
export const tr = (o) => (o && typeof o === 'object') ? (o[settings.lang] ?? o.ar) : o;
export function applyLang() {
  document.documentElement.lang = settings.lang;
  document.documentElement.dir = settings.lang === 'ar' ? 'rtl' : 'ltr';
}
// تنسيق الأرقام حسب اختيار المستخدم (123 أو ١٢٣)
export function num(n) {
  const s = String(n);
  if (settings.digits !== 'arabic') return s;
  return s.replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

addDict({
  ar: {
    siteName: 'العب وتعلّم', siteSub: 'سلسلة ألعاب تعليمية من إتقان', home: 'الرئيسية', games: 'الألعاب', about: 'نبذة عنّي', support: 'ادعم السلسلة', settings: 'الإعدادات',
    heroKicker: 'سلسلة العب وتعلّم', heroTitle: 'تعلّم وأنت <span>تلعب</span>', heroText: 'ألعاب تعليمية مجانية في مجالات متنوعة، تُلعب على الشاشة أو تُطبع وتُلعب حول الطاولة مع الأهل والأصدقاء.',
    gamesTitle: 'ألعاب السلسلة', play: 'العب الآن', soon: 'قريبًا', players: 'اللاعبون',
    aboutTitle: 'صاحب السلسلة', role: 'مهندس معماري ومستشار تدريبي',
    donTitle: 'ادعم استمرار السلسلة', donText: 'جميع ألعاب السلسلة مجانية، وستبقى كذلك. إن أفادتك أو أفادت أبناءك، فمساهمتك مهما كانت تساعد على تطوير ألعاب جديدة في مجالات أخرى.',
    donNow: 'ادعم الآن', donDetails: 'بيانات الدعم', donThanks: 'شكرًا لدعمك، فبمساهمتك تستمر الألعاب مجانية للجميع.', beneficiary: 'اسم المستفيد', iban: 'رقم الآيبان', accNo: 'رقم الحساب', bankAcc: 'حساب بنكي', scanQr: 'امسح الرمز من تطبيق البنك للتحويل مباشرة',
    copied: 'تم النسخ.', copyFail: 'تعذّر النسخ، انسخه يدويًا.', copy: 'نسخ', close: 'إغلاق', ok: 'حسنًا', cancel: 'إلغاء', save: 'حفظ', back: 'رجوع إلى الألعاب',
    language: 'اللغة', digits: 'شكل الأرقام', sound: 'الأصوات', on: 'تشغيل', off: 'إيقاف', soundSet: 'نمط الصوت', wood: 'خشبي', digital: 'رقمي', soft: 'هادئ', volume: 'مستوى الصوت',
    playerName: 'اسمك الذي يظهر للاعبين', playerNameHint: 'اتركه فارغًا ليُسمّى «لاعب 1» تلقائيًا.', boardTheme: 'شكل رقعة الشطرنج', pieceSet: 'شكل القطع',
    settingsSaved: 'حُفظت الإعدادات.', footer: 'جميع الحقوق محفوظة', openSource: 'مفتوح المصدر', notFound: 'الصفحة غير موجودة.', loading: 'جارٍ التحميل…',
    player: 'لاعب', computer: 'الكمبيوتر', you: 'أنت',
  },
  en: {
    siteName: 'Play & Learn', siteSub: 'An educational games series by ITQAN', home: 'Home', games: 'Games', about: 'About', support: 'Support', settings: 'Settings',
    heroKicker: 'Play & Learn series', heroTitle: 'Learn while you <span>play</span>', heroText: 'Free educational games across many subjects — play them on screen, or print them and play around the table with family and friends.',
    gamesTitle: 'Games in the series', play: 'Play now', soon: 'Coming soon', players: 'Players',
    aboutTitle: 'About the author', role: 'Architect and training consultant',
    donTitle: 'Support the series', donText: 'All games in the series are free and will stay free. If they helped you or your children, any contribution helps build new games in more subjects.',
    donNow: 'Support now', donDetails: 'Support details', donThanks: 'Thank you — your support keeps the games free for everyone.', beneficiary: 'Beneficiary', iban: 'IBAN', accNo: 'Account number', bankAcc: 'Bank account', scanQr: 'Scan with your banking app to transfer directly',
    copied: 'Copied.', copyFail: 'Could not copy; please copy it manually.', copy: 'Copy', close: 'Close', ok: 'OK', cancel: 'Cancel', save: 'Save', back: 'Back to games',
    language: 'Language', digits: 'Digits', sound: 'Sounds', on: 'On', off: 'Off', soundSet: 'Sound style', wood: 'Wooden', digital: 'Digital', soft: 'Soft', volume: 'Volume',
    playerName: 'Your display name', playerNameHint: 'Leave empty to be named "Player 1" automatically.', boardTheme: 'Chessboard theme', pieceSet: 'Piece set',
    settingsSaved: 'Settings saved.', footer: 'All rights reserved', openSource: 'Open source', notFound: 'Page not found.', loading: 'Loading…',
    player: 'Player', computer: 'Computer', you: 'You',
  },
});

// ---------- رسائل قصيرة ----------
export function toast(msg, kind = '') {
  let box = $('.toasts'); if (!box) { box = h('div', { class: 'toasts', 'aria-live': 'polite' }); document.body.append(box); }
  const el = h('div', { class: 'toast ' + (kind === true ? 'err' : kind) }, msg);
  box.append(el); setTimeout(() => el.remove(), 3200);
}

// ---------- نافذة منبثقة ----------
// actions: [{ label, kind, value, onclick }] — تُرجع Promise بالقيمة المختارة
export function modal(title, body, actions = [{ label: t('ok'), value: true }], { icon, dismissible = true, wide = false } = {}) {
  return new Promise((resolve) => {
    const dlg = h('dialog', { class: 'modal', style: wide ? { width: 'min(760px, 100% - 24px)' } : null });
    const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
    dlg.append(h('div', { class: 'modal-body' },
      h('div', { class: 'modal-head' }, icon ? ico(icon, 22) : null, h('h2', {}, title),
        dismissible ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('close'), onclick: () => done(null) }, ico('x', 20)) : null),
      body,
      actions.length ? h('div', { class: 'modal-actions' }, actions.map(a => h('button', {
        class: 'btn ' + (a.kind || ''), type: 'button', onclick: async () => { if (a.onclick) { const r = await a.onclick(); if (r === false) return; } done(a.value); },
      }, a.icon ? ico(a.icon, 18) : null, a.label))) : null));
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); if (dismissible) done(null); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg && dismissible) done(null); });
    document.body.append(dlg); dlg.showModal();
    modal.current = { close: done };
  });
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast(t('copied'), 'ok'); }
  catch {
    const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }, text); document.body.append(ta); ta.select();
    try { document.execCommand('copy'); toast(t('copied'), 'ok'); } catch { toast(t('copyFail'), true); } ta.remove();
  }
}

// ---------- الأصوات (مولّدة برمجيًا بلا ملفات) ----------
let ac = null;
function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; } } if (ac?.state === 'suspended') ac.resume().catch(() => { }); return ac; }
function noise(a, dur, freq, gain, q = 1.2) {
  const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = a.createGain(); g.gain.value = gain * settings.volume;
  src.connect(f).connect(g).connect(a.destination); src.start();
}
function tone(a, freq, dur, gain, type = 'sine', delay = 0) {
  const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain * settings.volume, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
export function sound(kind) {
  if (!settings.sound) return;
  const a = ctx(); if (!a) return;
  const set = settings.soundSet;
  if (set === 'wood') {
    if (kind === 'move' || kind === 'place') noise(a, 0.09, 1800, 1.6);
    else if (kind === 'capture') { noise(a, 0.12, 1200, 2.2); noise(a, 0.08, 2600, 1); }
    else if (kind === 'check') { noise(a, 0.09, 1800, 1.6); tone(a, 880, 0.18, 0.18, 'triangle', 0.05); }
    else if (kind === 'castle') { noise(a, 0.08, 1800, 1.4); setTimeout(() => noise(a, 0.08, 1600, 1.4), 110); }
    else if (kind === 'draw') noise(a, 0.18, 900, 1.2, 0.6);
  } else if (set === 'digital') {
    const m = { move: 660, place: 660, capture: 440, check: 990, castle: 550, draw: 520 };
    if (m[kind]) tone(a, m[kind], 0.12, 0.25, 'square');
  } else {
    const m = { move: 520, place: 520, capture: 390, check: 780, castle: 460, draw: 440 };
    if (m[kind]) tone(a, m[kind], 0.25, 0.22, 'sine');
  }
  if (kind === 'win') [523, 659, 784, 1047].forEach((f, i) => tone(a, f, 0.25, 0.22, 'triangle', i * 0.12));
  if (kind === 'lose') [392, 330, 262].forEach((f, i) => tone(a, f, 0.3, 0.2, 'sine', i * 0.16));
  if (kind === 'error') tone(a, 200, 0.22, 0.25, 'sawtooth');
  if (kind === 'notify') { tone(a, 740, 0.12, 0.2); tone(a, 988, 0.15, 0.2, 'sine', 0.1); }
}

// ---------- اسم اللاعب ----------
export function displayName(fallbackIndex = 1) {
  const n = (settings.playerName || '').trim();
  return n || `${t('player')} ${num(fallbackIndex)}`;
}
