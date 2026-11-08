// لعبة لودو — جزء من سلسلة العب وتعلّم
// على الجهاز نفسه، أو ضد الكمبيوتر، أو عبر الإنترنت (مع محادثة وميكروفون وكاميرا اختيارية)
import { h, ico, t, addDict, settings, num, modal, toast, sound, displayName, store, copyText } from '../../assets/js/core.js';
import { HostRoom, GuestRoom, netError } from '../../assets/js/netroom.js';
import { Comms } from '../../assets/js/comms.js';

if (!document.getElementById('ludo-css')) document.head.append(h('link', { id: 'ludo-css', rel: 'stylesheet', href: new URL('./ludo.css', import.meta.url).href }));

addDict({
  ar: {
    l_local: 'على الجهاز نفسه', l_localD: 'من 2 إلى 4 لاعبين، أشخاص أو كمبيوتر.', l_online: 'عبر الإنترنت', l_onlineD: 'أنشئ غرفة برقم سري وادعُ أصدقاءك من أجهزتهم.',
    l_players: 'اللاعبون', l_add: 'أضف لاعبًا', l_human: 'لاعب', l_easy: 'كمبيوتر مبتدئ', l_smart: 'كمبيوتر ذكي', l_options: 'خيارات اللعب',
    l_auto: 'التحريك التلقائي', l_autoD: 'إذا كانت هناك نقلة واحدة ممكنة نُفّذت تلقائيًا.', l_three: 'ثلاث ستات متتالية', l_threeD: 'تُلغي الدور.',
    l_start: 'ابدأ اللعب', l_rules: 'طريقة اللعب', l_change: 'تغيير الإعداد', l_leave: 'مغادرة الغرفة',
    l_red: 'الأحمر', l_green: 'الأخضر', l_yellow: 'الأصفر', l_blue: 'الأزرق',
    l_roll: 'ارمِ النرد', l_diceIs: 'النرد: {n}', l_yourRoll: 'دورك: ارمِ النرد', l_pick: 'اختر القطعة التي تريد تحريكها', l_turnOf: 'دور {name}', l_noMove: 'لا توجد نقلة ممكنة بالرقم {n}.',
    l_three6: 'ثلاث ستات متتالية! انتهى الدور.', l_extra: 'دور إضافي!', l_captured: '{a} أعاد قطعة {b} إلى البيت!', l_home: 'وصلت قطعة إلى المركز!',
    l_winner: '🏆 الفائز: {name}', l_gameOver: 'انتهت اللعبة', l_again: 'العب مرة أخرى', l_finished: 'في المركز', l_close: 'إغلاق', l_hostOnly: 'صاحب الغرفة هو من يبدأ اللعبة الجديدة.',
    l_create: 'إنشاء غرفة', l_join: 'الانضمام إلى غرفة', l_you: 'أنت', l_pass: 'كلمة سر الغرفة', l_code: 'رقم الغرفة', l_createBtn: 'أنشئ الغرفة', l_joinBtn: 'ادخل الغرفة', l_connecting: 'جارٍ الاتصال…',
    l_lobby: 'غرفة اللعب', l_invite: 'رابط الدعوة', l_copyInvite: 'نسخ الدعوة', l_inviteText: 'تعال نلعب لودو في «العب وتعلّم»!\nالرابط: {link}\nرقم الغرفة: {code}\nكلمة السر: {pass}',
    l_waitPlayers: 'بانتظار انضمام اللاعبين…', l_waitHost: 'بانتظار أن يبدأ صاحب الغرفة اللعب…', l_addBot: 'أضف الكمبيوتر', l_needTwo: 'يلزم لاعبان على الأقل.',
    l_needPass: 'اكتب كلمة سر للغرفة.', l_needCode: 'اكتب رقم الغرفة المكوّن من 6 أرقام.', l_joined: 'انضم {name}.', l_left: 'غادر {name}، ويكمل الكمبيوتر مكانه.', l_leftLobby: 'غادر {name} الغرفة.', l_hostLeft: 'أغلق صاحب الغرفة اللعبة.',
    l_waitTurn: 'انتظر دورك؛ الآن دور {name}.', l_netNote: 'يتصل اللاعبون مباشرة بين أجهزتهم. المحادثة والميكروفون والكاميرا اختيارية، وتبدأ مغلقة.', l_log: 'سجل اللعب',
    l_rulesText: `<ol>
<li>لكل لاعب أربع قطع في بيته. يرمي كل لاعب النرد في دوره.</li>
<li>لا تخرج القطعة من البيت إلا إذا ظهر الرقم 6.</li>
<li>تتحرك القطعة بعدد نقاط النرد في اتجاه عقارب الساعة حول اللوحة، ثم تدخل الممر الملوّن الخاص بلونها حتى المركز، ويلزم الرقم المطابق تمامًا للوصول.</li>
<li>إذا وقفت قطعتك على مربع فيه قطعة لخصم أعدتها إلى بيتها، إلا في المربعات الآمنة المعلّمة بنجمة ومربعات الخروج.</li>
<li>تحصل على دور إضافي إذا ظهر الرقم 6، أو أعدت قطعة خصم، أو أوصلت قطعة إلى المركز. وثلاث ستات متتالية تُلغي الدور.</li>
<li>يفوز أول من يوصل قطعه الأربع إلى المركز.</li></ol>`,
  },
  en: {
    l_local: 'Same device', l_localD: '2–4 players, people or computer.', l_online: 'Online', l_onlineD: 'Create a private room and invite friends on their own devices.',
    l_players: 'Players', l_add: 'Add player', l_human: 'Player', l_easy: 'Beginner computer', l_smart: 'Smart computer', l_options: 'Options',
    l_auto: 'Auto move', l_autoD: 'When only one move is possible, it is played automatically.', l_three: 'Three sixes in a row', l_threeD: 'Lose the turn.',
    l_start: 'Start', l_rules: 'How to play', l_change: 'Change setup', l_leave: 'Leave room',
    l_red: 'Red', l_green: 'Green', l_yellow: 'Yellow', l_blue: 'Blue',
    l_roll: 'Roll the dice', l_diceIs: 'Dice: {n}', l_yourRoll: 'Your turn: roll the dice', l_pick: 'Choose the piece to move', l_turnOf: "{name}'s turn", l_noMove: 'No move possible with {n}.',
    l_three6: 'Three sixes in a row! Turn over.', l_extra: 'Extra turn!', l_captured: '{a} sent a piece of {b} home!', l_home: 'A piece reached the centre!',
    l_winner: '🏆 Winner: {name}', l_gameOver: 'Game over', l_again: 'Play again', l_finished: 'home', l_close: 'Close', l_hostOnly: 'Only the host can start a new game.',
    l_create: 'Create a room', l_join: 'Join a room', l_you: 'You', l_pass: 'Room password', l_code: 'Room number', l_createBtn: 'Create room', l_joinBtn: 'Enter room', l_connecting: 'Connecting…',
    l_lobby: 'Game room', l_invite: 'Invite link', l_copyInvite: 'Copy invite', l_inviteText: "Let's play Ludo on Play & Learn!\nLink: {link}\nRoom: {code}\nPassword: {pass}",
    l_waitPlayers: 'Waiting for players to join…', l_waitHost: 'Waiting for the host to start…', l_addBot: 'Add computer', l_needTwo: 'At least two players are needed.',
    l_needPass: 'Enter a room password.', l_needCode: 'Enter the 6-digit room number.', l_joined: '{name} joined.', l_left: '{name} left; the computer takes over.', l_leftLobby: '{name} left the room.', l_hostLeft: 'The host closed the game.',
    l_waitTurn: "Wait for your turn — it's {name}'s turn.", l_netNote: 'Players connect directly between devices. Chat, microphone and camera are optional and start off.', l_log: 'Game log',
    l_rulesText: `<ol><li>Each player has four pieces at home and rolls the dice on their turn.</li><li>A piece leaves home only on a 6.</li><li>Pieces move clockwise around the board, then up their own coloured lane to the centre; an exact roll is needed to finish.</li><li>Landing on an opponent sends it home, except on star (safe) squares and start squares.</li><li>Rolling a 6, capturing, or bringing a piece home gives an extra turn. Three sixes in a row lose the turn.</li><li>The first to bring all four pieces home wins.</li></ol>`,
  },
});

// ---------- هندسة اللوحة (15×15) ----------
const PATH = [[1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0], [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7], [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [7, 14], [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7], [0, 6]];
const START = [0, 13, 26, 39];
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const HOME = [[[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]]];
const YARD = [[[2, 2], [4, 2], [2, 4], [4, 4]], [[11, 2], [13, 2], [11, 4], [13, 4]], [[11, 11], [13, 11], [11, 13], [13, 13]], [[2, 11], [4, 11], [2, 13], [4, 13]]];
const FINISH = [[6.6, 7.5], [7.5, 6.6], [8.4, 7.5], [7.5, 8.4]];
const COLORS = ['#e53935', '#2e9d43', '#f2b705', '#1e78d6'];
const CNAMES = ['l_red', 'l_green', 'l_yellow', 'l_blue'];
const SEATS = { 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };
const ROT = [-90, 180, 90, 0]; // لتدوير اللوحة فيظهر لون اللاعب أسفل اليسار
const AVATARS = ['🦁', '🐯', '🐼', '🦊', '🐸', '🐵', '🐧', '🦄', '🐨', '🐙', '🦉', '🐬'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const absOf = (c, p) => (p >= 0 && p <= 50) ? (START[c] + p) % 52 : null;

function tokenXY(c, p, k) {
  if (p < 0) return YARD[c][k];
  if (p <= 50) { const [x, y] = PATH[(START[c] + p) % 52]; return [x + 0.5, y + 0.5]; }
  if (p <= 55) { const [x, y] = HOME[c][p - 51]; return [x + 0.5, y + 0.5]; }
  const [x, y] = FINISH[c]; const off = [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]][k]; return [x + off[0] * 0.8, y + off[1] * 0.8];
}

const DEFAULT = { mode: 'local', count: 2, players: [{ type: 'human', name: '', avatar: '🦁' }, { type: 'smart', name: '', avatar: '🐼' }, { type: 'smart', name: '', avatar: '🦊' }, { type: 'easy', name: '', avatar: '🐸' }], auto: true, three: true };

export async function mount(root, ctx) {
  const saved = store.get('ludo-setup', {});
  const setup = { ...DEFAULT, ...saved, players: DEFAULT.players.map((p, i) => ({ ...p, ...(saved.players?.[i] || {}) })) };
  let G = null, net = null, timer = null, alive = true;
  const view = h('div', { class: 'ludo' }); root.append(view);
  const later = (fn, ms) => { clearTimeout(timer); timer = setTimeout(() => { if (alive) fn(); }, ms); };

  // ================= الإعداد =================
  function showSetup() {
    clearTimeout(timer); G = null; if (net) closeNet(); view.innerHTML = '';
    const modes = h('div', { class: 'l-modes' }, [['local', '🎲'], ['online', '🌐']].map(([m, ic]) => h('button', { type: 'button', class: 'l-mode' + (setup.mode === m ? ' on' : ''), onclick: () => { setup.mode = m; showSetup(); } },
      h('span', { class: 'l-mode-ic' }, ic), h('b', {}, t('l_' + m)), h('small', {}, t('l_' + m + 'D')))));
    let body;
    if (setup.mode === 'local') {
      const seats = SEATS[setup.count];
      const rows = h('div', { class: 'l-players' }, setup.players.slice(0, setup.count).map((p, i) => h('div', { class: 'l-prow', style: { '--pc': COLORS[seats[i]] } },
        h('button', { type: 'button', class: 'l-av', onclick: (e) => { p.avatar = AVATARS[(AVATARS.indexOf(p.avatar) + 1) % AVATARS.length]; e.currentTarget.textContent = p.avatar; } }, p.avatar),
        h('span', { class: 'l-cname' }, t(CNAMES[seats[i]])),
        h('input', { class: 'input', maxlength: 18, value: p.name, placeholder: defName(p, i), oninput: e => p.name = e.target.value }),
        ctx.seg([['human', t('l_human')], ['easy', t('l_easy')], ['smart', t('l_smart')]], p.type, v => { p.type = v; }),
        i >= 2 ? h('button', { type: 'button', class: 'icon-btn', onclick: () => { setup.count--; showSetup(); } }, ico('x', 18)) : null)));
      if (setup.count < 4) rows.append(h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { setup.count++; showSetup(); } }, ico('plus', 16), t('l_add')));
      body = h('div', {}, h('h3', { class: 'l-h3' }, ico('users', 18), t('l_players')), rows, optionsBox(),
        h('div', { class: 'row', style: { marginTop: '18px' } }, h('button', { class: 'btn l-go', type: 'button', onclick: startLocal }, ico('play', 18), t('l_start')), h('button', { class: 'btn ghost', type: 'button', onclick: showRules }, ico('info', 18), t('l_rules'))));
    } else body = onlineBox();
    view.append(h('div', { class: 'l-setup-grid' }, h('div', { class: 'panel l-setup' }, modes, body), h('div', { class: 'l-preview' }, boardSvg(null))));
  }
  function optionsBox() {
    return h('div', {}, h('h3', { class: 'l-h3' }, ico('settings', 18), t('l_options')), h('div', { class: 'opts' },
      h('div', { class: 'field' }, h('span', {}, t('l_auto')), ctx.seg([['1', t('on')], ['0', t('off')]], setup.auto ? '1' : '0', v => setup.auto = v === '1'), h('small', {}, t('l_autoD'))),
      h('div', { class: 'field' }, h('span', {}, t('l_three')), ctx.seg([['1', t('on')], ['0', t('off')]], setup.three ? '1' : '0', v => setup.three = v === '1'), h('small', {}, t('l_threeD')))));
  }
  function defName(p, i) { if (p.type !== 'human') return `${t('computer')} ${num(i + 1)}`; return i === 0 ? displayName(1) : `${t('player')} ${num(i + 1)}`; }
  function showRules() { modal(t('l_rules'), h('div', { class: 'l-rules', html: t('l_rulesText') }), [], { icon: 'info' }); }

  // ================= منطق اللعب =================
  function newGame(players) {
    G = { players: players.map((p, i) => ({ ...p, c: SEATS[players.length][i], tokens: [-1, -1, -1, -1] })), turn: 0, dice: null, rolled: false, sixes: 0, movable: [], over: false, winner: null, log: [], last: null, anim: false, net: G?.net || null };
  }
  function startLocal() {
    store.set('ludo-setup', setup);
    newGame(setup.players.slice(0, setup.count).map((p, i) => ({ name: p.name.trim() || defName(p, i), avatar: p.avatar, type: p.type })));
    render(); hook();
  }
  const cur = () => G.players[G.turn];
  const isBot = (p) => p.type === 'easy' || p.type === 'smart';
  function legalMoves(pl, d) {
    const out = [];
    pl.tokens.forEach((p, k) => {
      if (p === 56) return;
      if (p < 0) { if (d === 6) out.push(k); return; }
      if (p + d <= 56) out.push(k);
    });
    // القطع المتطابقة في البيت تُعدّ نقلة واحدة
    const yard = out.filter(k => pl.tokens[k] < 0); return yard.length > 1 ? out.filter(k => pl.tokens[k] >= 0).concat(yard[0]) : out;
  }
  function hook() {
    clearTimeout(timer);
    if (!alive || !G || G.over || G.net?.role === 'guest') return;
    const p = cur();
    if (isBot(p)) later(() => { if (!G.rolled) roll(); }, 600 + Math.random() * 300);
  }
  function addLog(s) { G.log.unshift(s); if (G.log.length > 40) G.log.pop(); }
  function roll() {
    if (!G || G.over || G.rolled || G.anim) return;
    const d = 1 + Math.floor(Math.random() * 6);
    G.dice = d; G.rolled = true; G.rolling = true; sound('move');
    G.sixes = d === 6 ? G.sixes + 1 : 0;
    render();
    later(() => {
      G.rolling = false;
      if (setup.three && G.sixes === 3) { G.sixes = 0; notifyAll(t('l_three6')); return nextTurn(true); }
      G.movable = legalMoves(cur(), d);
      render();
      if (!G.movable.length) { notifyCur(t('l_noMove', { n: num(d) })); return later(() => d === 6 ? again() : nextTurn(), 900); }
      const p = cur();
      if (isBot(p)) return later(() => move(botChoice(p, d)), 600);
      if (setup.auto && G.movable.length === 1) return later(() => move(G.movable[0]), 450);
    }, 520);
  }
  function again() { G.rolled = false; G.dice = G.dice; G.movable = []; render(); hook(); }
  function nextTurn(keepDice) {
    if (G.over) return;
    G.turn = (G.turn + 1) % G.players.length; G.rolled = false; G.movable = []; G.sixes = 0; if (!keepDice) G.dice = null;
    render(); hook();
  }
  function move(k) {
    if (!G || G.over || G.anim || !G.movable.includes(k)) return;
    const p = cur(), d = G.dice, from = p.tokens[k];
    G.movable = []; G.anim = true;
    const target = from < 0 ? 0 : from + d;
    const steps = from < 0 ? [0] : Array.from({ length: d }, (_, i) => from + i + 1);
    let i = 0;
    const step = () => {
      p.tokens[k] = steps[i]; G.last = { c: p.c, k }; sound('place'); render();
      if (++i < steps.length) return later(step, 140);
      later(() => finishMove(p, k, target), 160);
    };
    step();
  }
  function finishMove(p, k, pos) {
    G.anim = false;
    let captured = false;
    const A = absOf(p.c, pos);
    if (A != null && !SAFE.has(A)) {
      for (const q of G.players) if (q !== p) q.tokens.forEach((tp, j) => { if (absOf(q.c, tp) === A) { q.tokens[j] = -1; captured = true; addLog(t('l_captured', { a: p.name, b: q.name })); notifyAll(t('l_captured', { a: p.name, b: q.name })); } });
    }
    if (captured) sound('capture');
    const home = pos === 56;
    if (home) { sound('notify'); addLog(t('l_home')); }
    if (p.tokens.every(x => x === 56)) { G.over = true; G.winner = G.turn; render(); return showWin(); }
    const extra = G.dice === 6 || captured || home;
    if (extra) { if (isHumanHere(p)) toast(t('l_extra'), 'ok'); again(); } else nextTurn();
  }
  const isHumanHere = (p) => p.type === 'human';
  // ذكاء الكمبيوتر
  function threatened(c, A, players) {
    if (A == null || SAFE.has(A)) return false;
    return players.some(q => q.c !== c && q.tokens.some(tp => { const B = absOf(q.c, tp); if (B == null) return false; const dist = (A - B + 52) % 52; return dist >= 1 && dist <= 6; }));
  }
  function botChoice(p, d) {
    const opts = G.movable;
    if (p.type === 'easy') return pick(opts);
    let best = opts[0], bs = -1e9;
    for (const k of opts) {
      const from = p.tokens[k], to = from < 0 ? 0 : from + d; let s = to * 0.2;
      const A = absOf(p.c, to);
      if (to === 56) s += 100;
      if (from < 0) s += 60;
      if (A != null && !SAFE.has(A) && G.players.some(q => q !== p && q.tokens.some(tp => absOf(q.c, tp) === A))) s += 90;
      if (to > 50 && from <= 50) s += 40;
      if (A != null && SAFE.has(A)) s += 15;
      if (threatened(p.c, absOf(p.c, from), G.players)) s += 25;
      if (threatened(p.c, A, G.players)) s -= 35;
      if (s > bs) { bs = s; best = k; }
    }
    return best;
  }
  function showWin() {
    const w = G.players[G.winner];
    const myWin = G.net ? G.winner === G.net.mySeat : isHumanHere(w) || !G.players.some(isHumanHere);
    sound(myWin ? 'win' : 'lose'); if (myWin) confetti();
    const ranking = G.players.map((p, i) => ({ p, i, score: p.tokens.reduce((s, x) => s + Math.max(0, x + 1), 0), home: p.tokens.filter(x => x === 56).length })).sort((a, b) => b.score - a.score);
    const body = h('div', {}, h('p', { class: 'm-champ l-champ' }, t('l_winner', { name: `${w.avatar} ${w.name}` })),
      h('div', { class: 'l-rank' }, ranking.map((r, k) => h('div', { class: 'l-rrow', style: { '--pc': COLORS[r.p.c] } }, h('b', {}, ['🥇', '🥈', '🥉', '4'][k]), h('span', {}, r.p.avatar), h('span', { class: 'grow' }, r.p.name), h('small', {}, `${num(r.home)} / ${num(4)} ${t('l_finished')}`)))));
    const guest = G.net?.role === 'guest';
    if (guest) body.append(h('p', { class: 'muted center' }, t('l_hostOnly')));
    modal(t('l_gameOver'), body, guest ? [{ label: t('l_close'), kind: 'ghost', value: 'close' }] : [{ label: t('l_change'), kind: 'ghost', value: 'setup' }, { label: t('l_again'), value: 'again', icon: 'refresh-cw' }], { icon: 'trophy', dismissible: guest })
      .then(v => {
        if (!alive || guest) return;
        if (G?.net) { if (v === 'again') startOnline(); else { G = null; showLobby(); } return; }
        v === 'again' ? startLocal() : showSetup();
      });
  }

  // ================= الرسم =================
  function boardSvg(G0) {
    const ns = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs, parent) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent?.append(e); return e; };
    const svg = el('svg', { viewBox: '0 0 15 15', class: 'l-svg' });
    const rot = G0?.net ? ROT[G0.players[G0.net.mySeat].c] : 0;
    const g = el('g', { transform: `rotate(${rot} 7.5 7.5)` }, svg);
    el('rect', { x: 0, y: 0, width: 15, height: 15, rx: 0.4, fill: '#fffdf7' }, g);
    // البيوت
    [[0, 0], [9, 0], [9, 9], [0, 9]].forEach(([x, y], c) => {
      el('rect', { x, y, width: 6, height: 6, rx: 0.35, fill: COLORS[c] }, g);
      el('rect', { x: x + 0.8, y: y + 0.8, width: 4.4, height: 4.4, rx: 0.5, fill: '#fff' }, g);
      YARD[c].forEach(([cx, cy]) => el('circle', { cx, cy, r: 0.62, fill: COLORS[c], opacity: 0.25 }, g));
    });
    // مسار اللعب
    PATH.forEach(([x, y], i) => {
      const startC = START.indexOf(i);
      el('rect', { x: x + 0.03, y: y + 0.03, width: 0.94, height: 0.94, rx: 0.12, fill: startC >= 0 ? COLORS[startC] : '#fff', stroke: '#d6d3cb', 'stroke-width': 0.04 }, g);
      if (SAFE.has(i)) { const s = el('text', { x: x + 0.5, y: y + 0.72, 'text-anchor': 'middle', 'font-size': 0.62, fill: startC >= 0 ? '#fff' : '#9ca3af' }, g); s.textContent = '★'; }
    });
    HOME.forEach((cells, c) => cells.forEach(([x, y]) => el('rect', { x: x + 0.03, y: y + 0.03, width: 0.94, height: 0.94, rx: 0.12, fill: COLORS[c], opacity: 0.85 }, g)));
    // المركز
    [['6,6 7.5,7.5 6,9', 0], ['6,6 9,6 7.5,7.5', 1], ['9,6 9,9 7.5,7.5', 2], ['6,9 9,9 7.5,7.5', 3]].forEach(([pts, c]) => el('polygon', { points: pts, fill: COLORS[c] }, g));
    // القطع
    if (G0) {
      const groups = new Map();
      G0.players.forEach((p, pi) => p.tokens.forEach((pos, k) => {
        const [x, y] = tokenXY(p.c, pos, k);
        const key = pos >= 0 && pos < 56 ? `${x},${y}` : `u${pi}${k}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ p, pi, k, x, y });
      }));
      // القطع القابلة للتحريك تُرسم أخيرًا لتكون فوق غيرها وسهلة الضغط
      const items = [];
      for (const list of groups.values()) list.forEach((tk, j) => {
        const n = list.length, off = n > 1 ? (j - (n - 1) / 2) * 0.22 : 0;
        const movable = !G0.over && G0.turn === tk.pi && G0.movable.includes(tk.k) && canAct();
        items.push({ tk, n, off, movable });
      });
      items.sort((x, y) => x.movable - y.movable);
      for (const { tk, n, off, movable } of items) {
        const tg = el('g', { class: 'l-tok' + (movable ? ' mv' : '') + (G0.last && G0.last.c === tk.p.c && G0.last.k === tk.k ? ' last' : ''), transform: `translate(${tk.x + off} ${tk.y + off})` }, g);
        el('circle', { r: n > 1 ? 0.33 : 0.4, fill: COLORS[tk.p.c], stroke: '#fff', 'stroke-width': 0.09 }, tg);
        el('circle', { r: 0.15, fill: '#fff', opacity: 0.85 }, tg);
        if (movable) { el('circle', { r: 0.52, fill: 'none', stroke: '#111827', 'stroke-width': 0.06, class: 'l-ring' }, tg); tg.addEventListener('click', () => act('move', tk.k)); }
      }
    }
    return svg;
  }
  function diceEl(d, rolling) {
    const P = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] }[d || 1];
    return h('div', { class: 'l-die' + (rolling ? ' rolling' : '') + (d ? '' : ' empty') }, Array.from({ length: 9 }, (_, i) => h('i', { class: P.includes(i + 1) && d ? 'on' : '' })));
  }
  const canAct = () => G && !G.over && !G.anim && (G.net ? G.turn === G.net.mySeat : cur().type === 'human');
  function act(kind, k) {
    if (!canAct()) { if (G?.net && !G.over) toast(t('l_waitTurn', { name: cur().name })); return; }
    if (G.net?.role === 'guest') { net.room.send({ type: 'action', act: kind, k }); return; }
    if (kind === 'roll') roll(); else move(k);
  }
  function render() {
    if (!alive || !G) return;
    view.innerHTML = '';
    const p = cur();
    const mySeat = G.net ? G.net.mySeat : null;
    const status = G.over ? t('l_winner', { name: G.players[G.winner].name })
      : canAct() ? (!G.rolled ? t('l_yourRoll') : G.movable.length > 1 ? t('l_pick') : t('l_diceIs', { n: num(G.dice) }))
        : t('l_turnOf', { name: p.name });
    const seats = h('div', { class: 'l-seats' }, G.players.map((q, i) => h('div', { class: 'l-seat' + (i === G.turn && !G.over ? ' active' : ''), style: { '--pc': COLORS[q.c] } },
      h('span', { class: 'l-av sm' }, q.avatar), h('div', { class: 'grow' }, h('b', {}, q.name, mySeat === i ? ` (${t('l_you')})` : ''), h('small', {}, t(CNAMES[q.c]), ' · ', num(q.tokens.filter(x => x === 56).length), '/', num(4))),
      q.type === 'remote' ? ico('globe', 15) : isBot(q) ? ico('bot', 15) : null)));
    const rollBtn = h('button', { class: 'btn l-roll', type: 'button', style: { '--pc': COLORS[p.c] }, disabled: !canAct() || G.rolled, onclick: () => act('roll') }, ico('dice-5', 20), t('l_roll'));
    view.append(
      h('div', { class: 'row l-top no-print' },
        h('span', { class: 'grow' }),
        h('button', { class: 'btn ghost sm', type: 'button', onclick: showRules }, ico('info', 16), t('l_rules')),
        G.net ? h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { closeNet(); G = null; showSetup(); } }, ico('log-out', 16), t('l_leave'))
          : h('button', { class: 'btn ghost sm', type: 'button', onclick: showSetup }, ico('settings', 16), t('l_change'))),
      h('div', { class: 'l-layout' },
        h('div', { class: 'l-boardwrap' }, boardSvg(G), h('div', { class: 'l-center', style: { '--pc': COLORS[p.c] }, onclick: () => { if (!G.rolled) act('roll'); } }, diceEl(G.dice, G.rolling))),
        h('div', { class: 'l-side' },
          h('div', { class: 'panel l-status', style: { '--pc': COLORS[p.c] } }, h('div', { class: 'row' }, h('span', { class: 'l-av' }, p.avatar), h('b', { class: 'grow' }, status)), rollBtn),
          h('div', { class: 'panel' }, seats),
          G.log.length ? h('details', { class: 'panel' }, h('summary', {}, t('l_log')), h('ul', { class: 'l-log' }, G.log.map(s => h('li', {}, s)))) : '')));
    broadcast();
  }
  function confetti() {
    const box = h('div', { class: 'm-confetti l-confetti' }); document.body.append(box);
    for (let i = 0; i < 90; i++) box.append(h('i', { style: { left: Math.random() * 100 + 'vw', background: pick(COLORS), animationDelay: Math.random() * 0.6 + 's', animationDuration: 1.8 + Math.random() * 1.4 + 's' } }));
    setTimeout(() => box.remove(), 4000);
  }
  function notifyCur(text) { const p = cur(); if (p.type === 'human') toast(text); else if (p.type === 'remote') net?.room.send(p.id, { type: 'notify', text }); }
  function notifyAll(text) { toast(text); if (G?.net?.role === 'host') net.room.broadcast({ type: 'notify', text }); }

  // ================= اللعب عبر الإنترنت =================
  const myInfo = () => ({ name: (settings.playerName || '').trim() || setup.players[0].name.trim() || displayName(1), avatar: setup.players[0].avatar });
  function onlineBox() {
    const me = setup.players[0];
    const tab = setup.tab || 'create';
    const nameIn = h('input', { class: 'input', maxlength: 18, value: me.name || settings.playerName || '', placeholder: displayName(1), oninput: e => me.name = e.target.value });
    const passIn = h('input', { class: 'input', maxlength: 24, placeholder: '••••', value: store.get('ludo-room-pass', '') });
    const codeIn = h('input', { class: 'input l-code', inputmode: 'numeric', maxlength: 6, dir: 'ltr', placeholder: '123456', value: setup.joinCode || '' });
    const jPass = h('input', { class: 'input', maxlength: 24, placeholder: '••••' });
    const createBox = h('div', { class: tab === 'create' ? '' : 'hidden' }, h('div', { class: 'opts' }, h('label', { class: 'field' }, h('span', {}, t('l_pass')), passIn)), optionsBox(),
      h('button', { class: 'btn l-go', type: 'button', style: { marginTop: '14px' }, onclick: (e) => createRoom(passIn.value.trim(), e.currentTarget) }, ico('plus', 18), t('l_createBtn')));
    const joinBox = h('div', { class: tab === 'join' ? '' : 'hidden' }, h('div', { class: 'opts' }, h('label', { class: 'field' }, h('span', {}, t('l_code')), codeIn), h('label', { class: 'field' }, h('span', {}, t('l_pass')), jPass)),
      h('button', { class: 'btn l-go', type: 'button', style: { marginTop: '14px' }, onclick: (e) => joinRoom(codeIn.value.trim(), jPass.value.trim(), e.currentTarget) }, ico('log-out', 18), t('l_joinBtn')));
    return h('div', {},
      h('h3', { class: 'l-h3' }, ico('user', 18), t('l_you')),
      h('div', { class: 'l-prow' }, h('button', { type: 'button', class: 'l-av', onclick: (e) => { me.avatar = AVATARS[(AVATARS.indexOf(me.avatar) + 1) % AVATARS.length]; e.currentTarget.textContent = me.avatar; } }, me.avatar), nameIn),
      h('div', { style: { margin: '14px 0' } }, ctx.seg([['create', t('l_create')], ['join', t('l_join')]], tab, v => { setup.tab = v; createBox.classList.toggle('hidden', v !== 'create'); joinBox.classList.toggle('hidden', v !== 'join'); })),
      createBox, joinBox, h('p', { class: 'muted', style: { fontSize: '13px', marginTop: '14px' } }, ico('info', 14), ' ', t('l_netNote')));
  }
  async function createRoom(pass, btn) {
    if (!pass) { toast(t('l_needPass'), true); return; }
    store.set('ludo-room-pass', pass); store.set('ludo-setup', setup);
    btn.disabled = true; btn.textContent = t('l_connecting');
    closeNet();
    const room = new HostRoom('ludo', { password: pass, max: 3 }, {
      onJoin: (id, info) => {
        if (!net) return;
        const used = net.players.map(p => p.avatar);
        const name = String(info.name || '').slice(0, 18) || `${t('player')} ${num(net.players.length + 1)}`;
        net.players.push({ id, name, avatar: AVATARS.includes(info.avatar) && !used.includes(info.avatar) ? info.avatar : AVATARS.find(a => !used.includes(a)), type: 'remote' });
        sound('notify'); toast(t('l_joined', { name }), 'ok'); showLobby();
      },
      onLeave: (id) => onGuestLeft(id),
      onMessage: (id, msg) => onGuestMessage(id, msg),
    });
    try {
      const code = await room.open();
      net = { role: 'host', room, code, pass, players: [{ id: 'host', ...myInfo(), type: 'human' }] };
      net.comms = new Comms({ peer: room.peer, me: { id: room.peer.id, name: myInfo().name }, sendChat: (text) => room.broadcast({ type: 'chat', name: myInfo().name, text }) });
      showLobby();
    } catch (e) { toast(t(netError(e)), true); btn.disabled = false; btn.textContent = t('l_createBtn'); room.close(); }
  }
  async function joinRoom(code, pass, btn) {
    if (!/^\d{6}$/.test(code)) { toast(t('l_needCode'), true); return; }
    btn.disabled = true; btn.textContent = t('l_connecting');
    closeNet();
    const room = new GuestRoom('ludo', { onMessage: onHostMessage, onLeave: () => { toast(t('l_hostLeft'), true); closeNet(); G = null; modal.current?.close?.(null); showSetup(); } });
    try {
      await room.join(code, pass, myInfo());
      net = { role: 'guest', room, code, pass, players: [] };
      net.comms = new Comms({ peer: room.peer, me: { id: room.peer.id, name: myInfo().name }, sendChat: (text) => room.send({ type: 'chat', text }) });
      showLobby();
    } catch (e) { toast(t(netError(e)), true); btn.disabled = false; btn.textContent = t('l_joinBtn'); room.close(); }
  }
  function closeNet() { try { net?.comms?.destroy(); } catch { } try { net?.room?.close(); } catch { } net = null; }
  function updateRoster() {
    if (!net || net.role !== 'host') return;
    const list = net.players.filter(p => p.type === 'human' || p.type === 'remote').map(p => ({ id: p.type === 'human' ? net.room.peer.id : p.id, name: p.name }));
    net.comms?.setRoster(list); net.room.broadcast({ type: 'roster', list });
  }
  const inviteLink = () => `${location.origin}${location.pathname}#ludo-join-${net.code}`;
  function showLobby() {
    if (!net || (G && !G.over)) return;
    G = null; view.innerHTML = '';
    const n = net.players.length, seats = SEATS[Math.max(2, n)] || SEATS[4];
    if (net.role === 'host') { net.room.broadcast({ type: 'lobby', players: net.players.map(p => ({ name: p.name, avatar: p.avatar, type: p.type })) }); updateRoster(); }
    view.append(h('div', { class: 'panel l-lobby' },
      h('div', { class: 'row' }, h('h2', { class: 'grow', style: { margin: 0 } }, ico('globe', 20), ' ', t('l_lobby')), h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { closeNet(); showSetup(); } }, t('l_leave'))),
      h('div', { class: 'l-codes' }, h('div', {}, h('small', { class: 'muted' }, t('l_code')), h('b', { dir: 'ltr' }, net.code)), h('div', {}, h('small', { class: 'muted' }, t('l_pass')), h('b', { dir: 'ltr' }, net.pass))),
      h('div', { class: 'l-players' }, net.players.map((p, i) => h('div', { class: 'l-prow', style: { '--pc': COLORS[(SEATS[n] || SEATS[4])[i] ?? i] } }, h('span', { class: 'l-av' }, p.avatar), h('b', { class: 'grow' }, p.name),
        p.type === 'remote' ? ico('globe', 16) : p.type === 'human' ? ico('user', 16) : ico('bot', 16),
        net.role === 'host' && (p.type === 'smart' || p.type === 'easy') ? h('button', { type: 'button', class: 'icon-btn', onclick: () => { net.players.splice(i, 1); showLobby(); } }, ico('x', 16)) : null))),
      h('p', { class: 'muted l-wait' }, h('span', { class: 'm-spin' }), net.role === 'host' ? t('l_waitPlayers') : t('l_waitHost')),
      net.role === 'host' ? h('div', {},
        h('div', { class: 'field' }, h('span', {}, t('l_invite')), h('div', { class: 'row' }, h('input', { class: 'input grow', readonly: true, dir: 'ltr', value: inviteLink() }), h('button', { class: 'btn sm', type: 'button', onclick: () => copyText(t('l_inviteText', { link: inviteLink(), code: net.code, pass: net.pass })) }, ico('copy', 15), t('l_copyInvite')))),
        h('div', { class: 'row', style: { marginTop: '14px' } },
          n < 4 ? h('button', { class: 'btn ghost', type: 'button', onclick: () => { net.players.push({ id: 'bot' + Date.now(), name: `${t('computer')} ${num(n + 1)}`, avatar: AVATARS.find(a => !net.players.some(p => p.avatar === a)), type: 'smart' }); showLobby(); } }, ico('bot', 17), t('l_addBot')) : null,
          h('button', { class: 'btn l-go', type: 'button', onclick: () => { if (net.players.length < 2) { toast(t('l_needTwo'), true); return; } startOnline(); } }, ico('play', 18), t('l_start')))) : null));
    void seats;
  }
  function startOnline() {
    net.room.locked = true;
    G = { net: { role: 'host', mySeat: 0 } };
    newGame(net.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, type: p.type })));
    modal.current?.close?.(null);
    render(); hook();
  }
  function onGuestMessage(id, msg) {
    if (msg?.type === 'chat' && net) {
      const from = net.players.find(p => p.id === id)?.name || '…', text = String(msg.text || '').slice(0, 300); if (!text) return;
      net.comms?.addChat({ name: from, text });
      for (const pid of net.room.conns.keys()) if (pid !== id) net.room.send(pid, { type: 'chat', name: from, text });
      return;
    }
    if (!G || G.over || msg?.type !== 'action') return;
    const s = G.players.findIndex(p => p.id === id);
    if (s !== G.turn || G.anim) return;
    if (msg.act === 'roll') roll(); else if (msg.act === 'move' && Number.isInteger(msg.k)) move(msg.k);
  }
  function onGuestLeft(id) {
    if (!net) return;
    if (G && !G.over) {
      const s = G.players.findIndex(p => p.id === id); if (s < 0) return;
      const p = G.players[s]; p.type = 'smart'; p.id = 'bot-' + id;
      const np = net.players.find(q => q.id === id); if (np) { np.type = 'smart'; np.id = p.id; }
      toast(t('l_left', { name: p.name })); updateRoster(); render(); if (G.turn === s && !G.anim) { if (!G.rolled) hook(); else if (G.movable.length) later(() => move(botChoice(p, G.dice)), 500); }
      return;
    }
    const k = net.players.findIndex(p => p.id === id);
    if (k >= 0) { const [p] = net.players.splice(k, 1); toast(t('l_leftLobby', { name: p.name })); if (G?.over) G = null; showLobby(); }
  }
  let lastBroadcast = 0;
  function broadcast() {
    if (G?.net?.role !== 'host') return;
    G.players.forEach((p, s) => {
      if (p.type !== 'remote') return;
      net.room.send(p.id, { type: 'state', mySeat: s, three: setup.three, g: { turn: G.turn, dice: G.dice, rolled: G.rolled, rolling: !!G.rolling, movable: G.movable, over: G.over, winner: G.winner, last: G.last, anim: G.anim, log: G.log.slice(0, 20),
        players: G.players.map((q, k) => ({ name: q.name, avatar: q.avatar, c: q.c, tokens: q.tokens, type: k === s ? 'human' : isBot(q) ? q.type : 'remote' })) } });
    });
    lastBroadcast = Date.now();
  }
  let shownWin = false;
  function onHostMessage(msg) {
    if (msg.type === 'chat') { net?.comms?.addChat({ name: msg.name, text: msg.text }); return; }
    if (msg.type === 'roster') { net?.comms?.setRoster(msg.list); return; }
    if (msg.type === 'notify') { if (msg.text) toast(msg.text); return; }
    if (msg.type === 'lobby') { if (net) { net.players = msg.players; if (!G || G.over) { G = null; showLobby(); } } return; }
    if (msg.type !== 'state') return;
    const newGame0 = !G || (G.over && !msg.g.over);
    if (newGame0) { modal.current?.close?.(null); shownWin = false; }
    const prevLast = JSON.stringify(G?.last), prevDice = G?.dice;
    G = { ...msg.g, net: { role: 'guest', mySeat: msg.mySeat } };
    if (JSON.stringify(G.last) !== prevLast) sound('place'); else if (G.rolling && prevDice !== G.dice) sound('move');
    render();
    if (G.over && !shownWin) { shownWin = true; showWin(); }
  }

  { const m = /^ludo-join-(\d{6})$/.exec(location.hash.slice(1)); if (m) { setup.mode = 'online'; setup.tab = 'join'; setup.joinCode = m[1]; } }
  showSetup();
  return {
    unmount() { alive = false; clearTimeout(timer); closeNet(); },
    onLang() { if (G && !G.over) render(); else if (net) showLobby(); else showSetup(); },
    onSettings() { },
    onHash(hash) { const m = /^ludo-join-(\d{6})$/.exec(hash); if (m && !net && !(G && !G.over)) { setup.mode = 'online'; setup.tab = 'join'; setup.joinCode = m[1]; showSetup(); } },
  };
}
