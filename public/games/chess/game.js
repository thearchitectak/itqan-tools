// لعبة الشطرنج — جزء من سلسلة العب وتعلّم
import { Chess } from '../../vendor/chess.js';
import { h, ico, t, addDict, settings, num, modal, toast, sound, copyText, setSetting, store } from '../../assets/js/core.js';
import { Engine, LEVELS } from './engine.js';
import { buildSuggestions } from './coach.js';
import { Room } from './online.js';
import { Comms } from '../../assets/js/comms.js';
import { openReview, saveGame, loadHistory, parsePgn } from './review.js';

if (!document.getElementById('chess-css')) document.head.append(h('link', { id: 'chess-css', rel: 'stylesheet', href: new URL('./chess.css', import.meta.url).href }));

addDict({
  ar: {
    c_chooseMode: 'اختر طريقة اللعب', c_vsComputer: 'ضد الكمبيوتر', c_vsComputerD: 'ثلاثة مستويات، مع مساعد يقترح النقلات ويشرحها.',
    c_local: 'مع صديق على الجهاز نفسه', c_localD: 'تتناوبان على الجهاز نفسه.', c_online: 'عبر الإنترنت', c_onlineD: 'أنشئ غرفة برقم سري وأرسل الرابط لصديقك.',
    c_level: 'المستوى', c_easy: 'سهل', c_medium: 'متوسط', c_hard: 'صعب', c_color: 'لونك', c_white: 'الأبيض', c_black: 'الأسود', c_random: 'عشوائي',
    c_yourName: 'اسمك', c_whiteName: 'اسم صاحب الأبيض', c_blackName: 'اسم صاحب الأسود', c_autoFlip: 'قلب الرقعة تلقائيًا بعد كل نقلة', c_start: 'ابدأ المباراة',
    c_create: 'إنشاء غرفة', c_join: 'الانضمام إلى غرفة', c_roomPass: 'كلمة سر الغرفة', c_roomPassHint: 'يحتاجها صديقك للدخول.', c_roomCode: 'رقم الغرفة',
    c_createBtn: 'أنشئ الغرفة', c_joinBtn: 'ادخل الغرفة', c_waiting: 'بانتظار انضمام صديقك…', c_shareLink: 'رابط الدعوة', c_copyInvite: 'نسخ الدعوة',
    c_inviteText: 'تعال نلعب شطرنج في «العب وتعلّم»!\nالرابط: {link}\nرقم الغرفة: {code}\nكلمة السر: {pass}', c_connecting: 'جارٍ الاتصال…',
    c_errNotFound: 'لم يُعثر على الغرفة. تأكد من الرقم وأن صاحبها ما زال في صفحة الانتظار.', c_errPass: 'كلمة السر غير صحيحة.', c_errFull: 'الغرفة مكتملة.',
    c_errNet: 'تعذّر الاتصال بخدمة اللعب عبر الإنترنت. تحقق من اتصالك ثم أعد المحاولة.', c_errTimeout: 'انتهت مهلة الاتصال. أعد المحاولة.', c_needPass: 'اكتب كلمة سر للغرفة.', c_needCode: 'اكتب رقم الغرفة المكوّن من 6 أرقام.',
    c_oppLeft: 'غادر الخصم المباراة.', c_cancel: 'إلغاء',
    c_turnW: 'دور الأبيض', c_turnB: 'دور الأسود', c_yourTurn: 'دورك', c_thinking: 'الكمبيوتر يفكّر…', c_check: 'كش!',
    c_hint: 'المساعد', c_hintBtn: 'اقترح عليّ نقلة', c_analyzing: 'المساعد يحلّل الموضع…', c_hintOnlyYourTurn: 'يعمل المساعد عندما يحين دورك.',
    c_best: 'أفضل نقلة', c_great: 'نقلة رائعة', c_brilliant: 'تضحية بارعة', c_good: 'خيار ثالث', c_scenario: 'السيناريو المتوقع', c_why: 'لماذا؟',
    c_showArrow: 'أظهرها على الرقعة', c_playIt: 'العب هذه النقلة', c_eval: 'التقييم',
    c_undo: 'تراجع', c_flip: 'اقلب الرقعة', c_new: 'مباراة جديدة', c_resign: 'استسلام', c_draw: 'اعرض التعادل', c_moves: 'النقلات', c_settings: 'الإعدادات',
    c_resignQ: 'هل تريد الاستسلام فعلًا؟', c_yes: 'نعم', c_no: 'لا',
    c_mate: 'كش مات! فاز {name}.', c_stalemate: 'تعادل: لا توجد نقلات قانونية (ملك مخنوق).', c_threefold: 'تعادل بتكرار الموضع ثلاث مرات.', c_insufficient: 'تعادل لعدم كفاية القطع لإنهاء المباراة.', c_fifty: 'تعادل بقاعدة الخمسين نقلة.',
    c_resigned: '{name} استسلم، وفاز {winner}.', c_drawAgreed: 'تعادل بالاتفاق.', c_gameOver: 'انتهت المباراة', c_rematch: 'مباراة أخرى', c_close: 'إغلاق',
    c_drawOffer: '{name} يعرض التعادل. هل تقبل؟', c_drawDeclined: 'رُفض عرض التعادل.', c_drawSent: 'أُرسل عرض التعادل.', c_rematchOffer: '{name} يطلب مباراة أخرى. هل توافق؟', c_rematchSent: 'أُرسل طلب مباراة أخرى.',
    c_promote: 'اختر القطعة التي يترقّى إليها البيدق', c_engineFail: 'تعذّر تشغيل محرك الكمبيوتر في هذا المتصفح.', c_opponent: 'الخصم', c_backToModes: 'تغيير طريقة اللعب',
    c_review: 'مراجعة المباراة', c_reviewMode: 'مراجعة المباريات', c_reviewModeD: 'حلّل مبارياتك السابقة أو أي مباراة بصيغة PGN، وقيّم كل نقلة ودقة كل لاعب.', c_pgnBtn: 'حلّل هذه المباراة', c_vsLabel: '{w} ضد {b}',
    c_onlineNote: 'يتصل المتصفحان مباشرة، فلا تُحفظ المباراة على أي خادم. في بعض الشبكات المقيدة قد يتعذّر الاتصال.',
  },
  en: {
    c_chooseMode: 'Choose how to play', c_vsComputer: 'vs Computer', c_vsComputerD: 'Three levels, with a coach that suggests and explains moves.',
    c_local: 'With a friend, same device', c_localD: 'Take turns on one device.', c_online: 'Online', c_onlineD: 'Create a private room and send the link to a friend.',
    c_level: 'Level', c_easy: 'Easy', c_medium: 'Medium', c_hard: 'Hard', c_color: 'Your colour', c_white: 'White', c_black: 'Black', c_random: 'Random',
    c_yourName: 'Your name', c_whiteName: 'White player name', c_blackName: 'Black player name', c_autoFlip: 'Flip the board after each move', c_start: 'Start the game',
    c_create: 'Create a room', c_join: 'Join a room', c_roomPass: 'Room password', c_roomPassHint: 'Your friend needs it to enter.', c_roomCode: 'Room number',
    c_createBtn: 'Create room', c_joinBtn: 'Enter room', c_waiting: 'Waiting for your friend to join…', c_shareLink: 'Invite link', c_copyInvite: 'Copy invite',
    c_inviteText: "Let's play chess on Play & Learn!\nLink: {link}\nRoom: {code}\nPassword: {pass}", c_connecting: 'Connecting…',
    c_errNotFound: 'Room not found. Check the number and make sure the host is still on the waiting screen.', c_errPass: 'Wrong password.', c_errFull: 'The room is full.',
    c_errNet: 'Could not reach the online play service. Check your connection and try again.', c_errTimeout: 'Connection timed out. Please try again.', c_needPass: 'Enter a room password.', c_needCode: 'Enter the 6-digit room number.',
    c_oppLeft: 'Your opponent left the game.', c_cancel: 'Cancel',
    c_turnW: "White's turn", c_turnB: "Black's turn", c_yourTurn: 'Your turn', c_thinking: 'Computer is thinking…', c_check: 'Check!',
    c_hint: 'Coach', c_hintBtn: 'Suggest a move', c_analyzing: 'The coach is analysing…', c_hintOnlyYourTurn: 'The coach works on your turn.',
    c_best: 'Best move', c_great: 'Great move', c_brilliant: 'Brilliant sacrifice', c_good: 'Third option', c_scenario: 'Expected line', c_why: 'Why?',
    c_showArrow: 'Show on board', c_playIt: 'Play this move', c_eval: 'Evaluation',
    c_undo: 'Undo', c_flip: 'Flip board', c_new: 'New game', c_resign: 'Resign', c_draw: 'Offer draw', c_moves: 'Moves', c_settings: 'Settings',
    c_resignQ: 'Do you really want to resign?', c_yes: 'Yes', c_no: 'No',
    c_mate: 'Checkmate! {name} wins.', c_stalemate: 'Draw by stalemate.', c_threefold: 'Draw by threefold repetition.', c_insufficient: 'Draw: insufficient material.', c_fifty: 'Draw by the fifty-move rule.',
    c_resigned: '{name} resigned; {winner} wins.', c_drawAgreed: 'Draw agreed.', c_gameOver: 'Game over', c_rematch: 'Rematch', c_close: 'Close',
    c_drawOffer: '{name} offers a draw. Accept?', c_drawDeclined: 'Draw offer declined.', c_drawSent: 'Draw offer sent.', c_rematchOffer: '{name} wants a rematch. Accept?', c_rematchSent: 'Rematch request sent.',
    c_promote: 'Choose the promotion piece', c_engineFail: 'The chess engine could not start in this browser.', c_opponent: 'Opponent', c_backToModes: 'Change mode',
    c_review: 'Game review', c_reviewMode: 'Review games', c_reviewModeD: 'Analyse your past games or any PGN, rating every move and each player\'s accuracy.', c_pgnBtn: 'Analyse this game', c_vsLabel: '{w} vs {b}',
    c_onlineNote: 'Browsers connect directly; nothing is stored on a server. Some restricted networks may block the connection.',
  },
});

const FILES = 'abcdefgh';
const THEMES = { green: ['#eeeed2', '#769656'], brown: ['#f0d9b5', '#b58863'], blue: ['#dee3e6', '#8ca2ad'], gray: ['#ebecd0', '#a7a7a7'], purple: ['#ece4f7', '#9c7fc6'] };
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const pieceUrl = (c, p) => new URL(`../../vendor/pieces/${settings.pieceSet === 'merida' ? 'merida' : 'cburnett'}/${c}${p.toUpperCase()}.svg`, import.meta.url).href;
const other = (c) => c === 'w' ? 'b' : 'w';

export async function mount(root, ctx) {
  const S = {
    mode: null, chess: new Chess(), myColor: 'w', orient: 'w', names: { w: '', b: '' }, level: 'medium', autoFlip: false,
    sel: null, targets: [], last: null, over: null, thinking: false, token: 0, hints: null, hintsFen: null, analyzing: false, arrow: null, room: null, onlineTab: 'create', joinCode: '', lobby: null,
  };
  const prefs = { level: 'medium', color: 'w', autoFlip: false, wName: '', bName: '', ...store.get('chess-prefs', {}) };
  let engine = null, coach = null, alive = true;
  const view = h('div', { class: 'chess' }); root.append(view);

  const initialHash = location.hash.slice(1);
  if (/^chess-join-\d{6}$/.test(initialHash)) { S.joinCode = initialHash.split('-')[2]; S.onlineTab = 'join'; }

  // ---------- شاشة اختيار الطريقة ----------
  function showModes(preselect) {
    S.mode = null; view.innerHTML = '';
    const nameIn = (placeholder) => h('input', { class: 'input', maxlength: 24, value: settings.playerName, placeholder, oninput: e => setSetting('playerName', e.target.value.trim()) });
    const modeCard = (id, icon, title, desc, body) => h('div', { class: 'panel c-mode' + (preselect === id ? ' open' : ''), 'data-mode': id },
      h('button', { class: 'c-mode-head', type: 'button', onclick: () => { view.querySelectorAll('.c-mode').forEach(x => x.classList.toggle('open', x.dataset.mode === id && !x.classList.contains('open'))); } },
        h('span', { class: 'c-mode-ic' }, ico(icon, 24)), h('span', { class: 'grow' }, h('b', {}, title), h('small', {}, desc)), ico('chevron-left', 18)),
      h('div', { class: 'c-mode-body' }, body));

    // ضد الكمبيوتر
    const comp = h('div', { class: 'opts' },
      h('label', { class: 'field' }, h('span', {}, t('c_yourName')), nameIn(`${t('player')} ${num(1)}`)),
      h('div', { class: 'field' }, h('span', {}, t('c_level')), ctx.seg([['easy', t('c_easy')], ['medium', t('c_medium')], ['hard', t('c_hard')]], prefs.level, v => prefs.level = v)),
      h('div', { class: 'field' }, h('span', {}, t('c_color')), ctx.seg([['w', t('c_white')], ['b', t('c_black')], ['random', t('c_random')]], prefs.color, v => prefs.color = v)),
      h('div', {}, h('button', { class: 'btn', type: 'button', onclick: () => startComputer() }, ico('play', 18), t('c_start'))));
    // على الجهاز نفسه
    const wIn = h('input', { class: 'input', maxlength: 24, value: prefs.wName, placeholder: `${t('player')} ${num(1)}`, oninput: e => prefs.wName = e.target.value });
    const bIn = h('input', { class: 'input', maxlength: 24, value: prefs.bName, placeholder: `${t('player')} ${num(2)}`, oninput: e => prefs.bName = e.target.value });
    const local = h('div', { class: 'opts' },
      h('label', { class: 'field' }, h('span', {}, t('c_whiteName')), wIn),
      h('label', { class: 'field' }, h('span', {}, t('c_blackName')), bIn),
      h('div', { class: 'field' }, h('span', {}, t('c_autoFlip')), ctx.seg([['0', t('off')], ['1', t('on')]], prefs.autoFlip ? '1' : '0', v => prefs.autoFlip = v === '1')),
      h('div', {}, h('button', { class: 'btn', type: 'button', onclick: () => startLocal() }, ico('play', 18), t('c_start'))));
    // عبر الإنترنت
    const passIn = h('input', { class: 'input', maxlength: 32, placeholder: '••••', value: store.get('chess-room-pass', '') });
    let hostColor = 'random';
    const codeIn = h('input', { class: 'input c-code', inputmode: 'numeric', maxlength: 6, value: S.joinCode, placeholder: '123456', dir: 'ltr' });
    const jPassIn = h('input', { class: 'input', maxlength: 32, placeholder: '••••' });
    const createBox = h('div', { class: 'opts' },
      h('label', { class: 'field' }, h('span', {}, t('c_yourName')), nameIn(`${t('player')} ${num(1)}`)),
      h('label', { class: 'field' }, h('span', {}, t('c_roomPass')), passIn, h('small', {}, t('c_roomPassHint'))),
      h('div', { class: 'field' }, h('span', {}, t('c_color')), ctx.seg([['w', t('c_white')], ['b', t('c_black')], ['random', t('c_random')]], hostColor, v => hostColor = v)),
      h('div', {}, h('button', { class: 'btn', type: 'button', onclick: (e) => createRoom(passIn.value.trim(), hostColor, e.currentTarget) }, ico('plus', 18), t('c_createBtn'))));
    const joinBox = h('div', { class: 'opts' },
      h('label', { class: 'field' }, h('span', {}, t('c_yourName')), nameIn(`${t('player')} ${num(2)}`)),
      h('label', { class: 'field' }, h('span', {}, t('c_roomCode')), codeIn),
      h('label', { class: 'field' }, h('span', {}, t('c_roomPass')), jPassIn),
      h('div', {}, h('button', { class: 'btn', type: 'button', onclick: (e) => joinRoom(codeIn.value.trim(), jPassIn.value.trim(), e.currentTarget) }, ico('log-out', 18), t('c_joinBtn'))));
    const tabs = h('div', {}, ctx.seg([['create', t('c_create')], ['join', t('c_join')]], S.onlineTab, v => { S.onlineTab = v; createBox.classList.toggle('hidden', v !== 'create'); joinBox.classList.toggle('hidden', v !== 'join'); }));
    createBox.classList.toggle('hidden', S.onlineTab !== 'create'); joinBox.classList.toggle('hidden', S.onlineTab !== 'join');
    const online = h('div', { class: 'c-online' }, tabs, createBox, joinBox, h('p', { class: 'muted', style: { fontSize: '13px', margin: '12px 0 0' } }, ico('info', 14), ' ', t('c_onlineNote')));

    view.append(h('h2', { class: 'c-h2' }, t('c_chooseMode')),
      h('div', { class: 'c-modes' },
        modeCard('computer', 'cpu', t('c_vsComputer'), t('c_vsComputerD'), comp),
        modeCard('local', 'users', t('c_local'), t('c_localD'), local),
        modeCard('online', 'globe', t('c_online'), t('c_onlineD'), online),
        modeCard('review', 'brain', t('c_reviewMode'), t('c_reviewModeD'), reviewBox())));
  }

  // ---------- مراجعة المباريات ----------
  let rv = null;
  function reviewBox() {
    const hist = loadHistory();
    const ta = h('textarea', { class: 'input c-pgn', placeholder: '1. e4 e5 2. Nf3 Nc6 ...' });
    return h('div', { class: 'c-history' },
      h('b', {}, t('r_history')),
      hist.length ? hist.map(g => h('div', { class: 'c-hitem' },
        h('span', { class: 'c-dot ' + (g.myColor || 'w') }),
        h('div', { class: 'grow' }, h('b', {}, t('c_vsLabel', { w: g.names.w, b: g.names.b })), h('small', {}, new Date(g.date).toLocaleString(settings.lang === 'ar' ? (settings.digits === 'arabic' ? 'ar-EG' : 'ar-EG-u-nu-latn') : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }), ' · ', g.result || '')),
        h('button', { class: 'btn sm', type: 'button', onclick: () => showReview(g, () => showModes('review')) }, ico('brain', 15), t('r_review')))) : h('p', { class: 'muted' }, t('r_noHistory')),
      h('b', { style: { marginTop: '10px' } }, t('r_import')), h('small', { class: 'muted' }, t('r_importHint')), ta,
      h('div', {}, h('button', { class: 'btn', type: 'button', onclick: () => { const g = parsePgn(ta.value); if (!g) { toast(t('r_badPgn'), true); return; } showReview({ ...g, myColor: 'w' }, () => showModes('review')); } }, ico('sparkles', 16), t('c_pgnBtn'))));
  }
  function currentGameRecord() {
    return { sans: S.chess.history(), names: { ...S.names }, myColor: S.mode === 'local' ? 'w' : S.myColor, mode: S.mode, result: S.over?.text || '', id: S.savedId };
  }
  function showReview(g, back) {
    rv?.destroy(); S.reviewing = { g, back };
    rv = openReview(view, g, { onBack: () => { rv?.destroy(); rv = null; S.reviewing = null; back(); } });
  }

  // ---------- بدء المباريات ----------
  function resetGame() {
    S.chess = new Chess(); S.savedId = null; S.sel = null; S.targets = []; S.last = null; S.over = null; S.hints = null; S.arrow = null; S.token++; S.thinking = false; S.analyzing = false;
  }
  const myName = (fallback = 1) => (settings.playerName || '').trim() || `${t('player')} ${num(fallback)}`;
  function startComputer() {
    store.set('chess-prefs', prefs);
    resetGame(); S.mode = 'computer'; S.level = prefs.level;
    S.myColor = prefs.color === 'random' ? (Math.random() < .5 ? 'w' : 'b') : prefs.color; S.orient = S.myColor;
    S.names[S.myColor] = myName(1);
    S.names[other(S.myColor)] = `${t('computer')} (${t('c_' + S.level)})`;
    engine ||= new Engine();
    engine.start().catch(() => toast(t('c_engineFail'), true));
    renderGame(); maybeEngine();
  }
  function startLocal() {
    store.set('chess-prefs', prefs);
    resetGame(); S.mode = 'local'; S.autoFlip = prefs.autoFlip; S.orient = 'w'; S.myColor = 'w';
    S.names.w = prefs.wName.trim() || (settings.playerName || `${t('player')} ${num(1)}`);
    S.names.b = prefs.bName.trim() || `${t('player')} ${num(2)}`;
    renderGame();
  }

  // ---------- الغرف عبر الإنترنت ----------
  function roomHandlers() {
    return {
      onStart: ({ opponent, myColor }) => {
        S.lobby = null; resetGame(); S.mode = 'online'; S.myColor = myColor; S.orient = myColor;
        S.names[myColor] = myName(S.room.role === 'host' ? 1 : 2); S.names[other(myColor)] = opponent || `${t('player')} ${num(S.room.role === 'host' ? 2 : 1)}`;
        modal.current?.close?.(null);
        sound('notify'); renderGame(); startComms();
      },
      onMessage: onRemote,
      onLeave: () => { if (S.mode === 'online' && !S.over) { toast(t('c_oppLeft'), true); finish({ text: t('c_oppLeft') }); } },
      onError: (e) => { if (S.lobby) { toast(errText(e), true); } },
    };
  }
  const errText = (e) => {
    const ty = e?.type || '';
    if (ty === 'peer-unavailable') return t('c_errNotFound');
    if (ty === 'denied-password') return t('c_errPass');
    if (ty === 'denied-full') return t('c_errFull');
    if (ty === 'timeout') return t('c_errTimeout');
    return t('c_errNet');
  };
  async function createRoom(pass, color, btn) {
    if (!pass) { toast(t('c_needPass'), true); return; }
    store.set('chess-room-pass', pass);
    btn.disabled = true; btn.textContent = t('c_connecting');
    closeRoom(); S.room = new Room(roomHandlers());
    try {
      const code = await S.room.host({ password: pass, name: myName(1), color });
      showLobby(code, pass);
    } catch (e) { toast(errText(e), true); btn.disabled = false; btn.textContent = t('c_createBtn'); closeRoom(); S.room = null; }
  }
  async function joinRoom(code, pass, btn) {
    if (!/^\d{6}$/.test(code)) { toast(t('c_needCode'), true); return; }
    btn.disabled = true; btn.textContent = t('c_connecting');
    closeRoom(); S.room = new Room(roomHandlers());
    try { await S.room.join({ code, password: pass, name: myName(2) }); }
    catch (e) { toast(errText(e), true); btn.disabled = false; btn.textContent = t('c_joinBtn'); closeRoom(); S.room = null; }
  }
  function inviteLink(code) { return `${location.origin}${location.pathname}#chess-join-${code}`; }
  function showLobby(code, pass) {
    S.lobby = { code, pass }; view.innerHTML = '';
    const link = inviteLink(code);
    view.append(h('div', { class: 'panel c-lobby' },
      h('div', { class: 'c-spinner' }), h('h2', {}, t('c_waiting')),
      h('div', { class: 'c-lobby-grid' },
        h('div', {}, h('small', { class: 'muted' }, t('c_roomCode')), h('div', { class: 'c-bigcode', dir: 'ltr' }, code)),
        h('div', {}, h('small', { class: 'muted' }, t('c_roomPass')), h('div', { class: 'c-bigcode', dir: 'ltr' }, pass))),
      h('div', { class: 'field', style: { marginTop: '14px' } }, h('span', {}, t('c_shareLink')), h('div', { class: 'row' }, h('input', { class: 'input grow', readonly: true, value: link, dir: 'ltr' }), h('button', { class: 'btn sm', type: 'button', onclick: () => copyText(t('c_inviteText', { link, code, pass })) }, ico('copy', 16), t('c_copyInvite')))),
      h('button', { class: 'btn ghost', type: 'button', style: { marginTop: '16px' }, onclick: () => { closeRoom(); S.room = null; S.lobby = null; showModes('online'); } }, t('c_cancel'))));
  }
  // المحادثة والصوت والصورة في المباراة عبر الإنترنت
  let comms = null;
  function closeRoom() { try { comms?.destroy(); } catch { } comms = null; try { S.room?.close(); } catch { } }
  function startComms() {
    if (comms || !S.room?.peer || !S.room.conn) return;
    const me = S.names[S.myColor];
    comms = new Comms({ peer: S.room.peer, me: { id: S.room.peer.id, name: me }, sendChat: (text) => S.room?.send({ type: 'chat', text }) });
    comms.setRoster([{ id: S.room.peer.id, name: me }, { id: S.room.conn.peer, name: S.names[other(S.myColor)] }]);
  }
  function onRemote(msg) {
    if (msg?.type === 'chat') { comms?.addChat({ name: S.names[other(S.myColor)], text: String(msg.text || '').slice(0, 300) }); return; }
    if (S.mode !== 'online') return;
    if (msg.type === 'move') {
      if (S.chess.turn() === S.myColor || S.over) return;
      if (S.chess.history().length !== msg.n) return;
      applyMove({ from: msg.uci.slice(0, 2), to: msg.uci.slice(2, 4), promotion: msg.uci[4] }, true);
    } else if (msg.type === 'resign') finish({ text: t('c_resigned', { name: S.names[other(S.myColor)], winner: S.names[S.myColor] }), winner: S.myColor });
    else if (msg.type === 'draw-offer') {
      modal(t('c_draw'), h('p', {}, t('c_drawOffer', { name: S.names[other(S.myColor)] })), [{ label: t('c_no'), kind: 'ghost', value: false }, { label: t('c_yes'), value: true }], { icon: 'handshake' })
        .then(ok => { S.room?.send({ type: 'draw-answer', ok: !!ok }); if (ok) finish({ text: t('c_drawAgreed') }); });
    } else if (msg.type === 'draw-answer') { if (msg.ok) finish({ text: t('c_drawAgreed') }); else toast(t('c_drawDeclined')); }
    else if (msg.type === 'rematch') {
      modal.current?.close?.(null);
      modal(t('c_rematch'), h('p', {}, t('c_rematchOffer', { name: S.names[other(S.myColor)] })), [{ label: t('c_no'), kind: 'ghost', value: false }, { label: t('c_yes'), value: true }], { icon: 'refresh-cw' })
        .then(ok => { if (ok) { S.room?.send({ type: 'rematch-ok' }); rematch(); } });
    } else if (msg.type === 'rematch-ok') { modal.current?.close?.(null); rematch(); }
  }
  function rematch() {
    const names = { ...S.names }; const mine = other(S.myColor);
    resetGame(); S.myColor = mine; S.orient = mine; S.names = { [mine]: names[other(mine)], [other(mine)]: names[mine] };
    sound('notify'); renderGame();
  }

  // ---------- منطق النقلات ----------
  const isMyTurn = () => S.mode === 'local' ? true : S.chess.turn() === S.myColor;
  function canMovePiece(sq) {
    if (S.over || S.thinking) return false;
    const p = S.chess.get(sq); if (!p) return false;
    if (S.mode === 'local') return p.color === S.chess.turn();
    return p.color === S.myColor && S.chess.turn() === S.myColor;
  }
  function select(sq) {
    S.sel = sq; S.targets = S.chess.moves({ square: sq, verbose: true }).map(m => m.to); drawBoard();
  }
  async function tryMove(from, to) {
    const legal = S.chess.moves({ square: from, verbose: true }).filter(m => m.to === to);
    if (!legal.length) return false;
    let promotion;
    if (legal.some(m => m.promotion)) { promotion = await askPromotion(S.chess.turn()); if (!promotion) { S.sel = null; S.targets = []; drawBoard(); return true; } }
    applyMove({ from, to, promotion });
    return true;
  }
  function applyMove(mv, remote = false) {
    let m; try { m = S.chess.move({ from: mv.from, to: mv.to, promotion: mv.promotion || undefined }); } catch { return; }
    if (!m) return;
    S.last = { from: m.from, to: m.to }; S.sel = null; S.targets = []; S.hints = null; S.arrow = null;
    sound(S.chess.inCheck() ? 'check' : m.isKingsideCastle?.() || m.isQueensideCastle?.() ? 'castle' : m.captured ? 'capture' : 'move');
    if (S.mode === 'online' && !remote) S.room?.send({ type: 'move', uci: m.from + m.to + (m.promotion || ''), n: S.chess.history().length - 1 });
    if (S.mode === 'local' && S.autoFlip) S.orient = S.chess.turn();
    checkEnd();
    renderGame();
    maybeEngine();
  }
  function checkEnd() {
    const c = S.chess; if (!c.isGameOver()) return;
    if (c.isCheckmate()) { const w = other(c.turn()); finish({ text: t('c_mate', { name: S.names[w] }), winner: w }); }
    else if (c.isStalemate()) finish({ text: t('c_stalemate') });
    else if (c.isThreefoldRepetition()) finish({ text: t('c_threefold') });
    else if (c.isInsufficientMaterial()) finish({ text: t('c_insufficient') });
    else finish({ text: t('c_fifty') });
  }
  function finish(res) {
    if (S.over) return;
    S.over = res; S.token++; S.thinking = false;
    if (S.chess.history().length >= 2) { try { S.savedId = saveGame({ ...currentGameRecord(), id: undefined }); } catch { } }
    const iWon = res.winner && (S.mode === 'local' || res.winner === S.myColor);
    sound(res.winner ? (iWon ? 'win' : 'lose') : 'draw');
    setTimeout(() => {
      if (!alive) return;
      renderGame();
      const actions = [{ label: t('c_close'), kind: 'ghost', value: 'close' }];
      if (S.chess.history().length >= 2) actions.push({ label: t('c_review'), kind: 'ghost', value: 'review', icon: 'brain' });
      if (S.mode === 'online') { if (S.room?.conn?.open) actions.push({ label: t('c_rematch'), value: 'rematch', icon: 'refresh-cw' }); }
      else actions.push({ label: t('c_new'), value: 'new', icon: 'refresh-cw' });
      modal(t('c_gameOver'), h('p', { class: 'c-result' }, res.winner ? '🏆 ' : '🤝 ', res.text), actions, { icon: 'trophy' }).then(v => {
        if (v === 'new') S.mode === 'computer' ? startComputer() : startLocal();
        if (v === 'rematch') { S.room?.send({ type: 'rematch' }); toast(t('c_rematchSent')); }
        if (v === 'review') showReview(currentGameRecord(), () => renderGame());
      });
    }, 350);
  }
  async function maybeEngine() {
    if (S.mode !== 'computer' || S.over || S.chess.turn() === S.myColor) return;
    S.thinking = true; renderStatus();
    const token = ++S.token, fen = S.chess.fen();
    const started = Date.now();
    try {
      let uci;
      const L = LEVELS[S.level];
      if (L.random && Math.random() < L.random) {
        const ms = S.chess.moves({ verbose: true }); const m = ms[Math.floor(Math.random() * ms.length)]; uci = m.from + m.to + (m.promotion || '');
        await new Promise(r => setTimeout(r, 400));
      } else uci = await engine.bestMove(fen, S.level);
      const wait = 350 - (Date.now() - started); if (wait > 0) await new Promise(r => setTimeout(r, wait));
      if (!alive || token !== S.token || S.chess.fen() !== fen || !uci || uci === '(none)') return;
      S.thinking = false;
      applyMove({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    } catch (e) { console.error(e); S.thinking = false; toast(t('c_engineFail'), true); renderStatus(); }
  }
  function undo() {
    if (S.mode === 'online' || S.thinking && S.mode !== 'computer') return;
    S.token++; S.thinking = false; engine?.stop();
    if (S.mode === 'computer') { S.chess.undo(); if (S.chess.turn() !== S.myColor) S.chess.undo(); }
    else S.chess.undo();
    S.over = null; S.hints = null; S.arrow = null; S.sel = null; S.targets = [];
    const hist = S.chess.history({ verbose: true }); const lm = hist[hist.length - 1]; S.last = lm ? { from: lm.from, to: lm.to } : null;
    if (S.mode === 'local' && S.autoFlip) S.orient = S.chess.turn();
    renderGame(); maybeEngine();
  }
  async function resign() {
    const ok = await modal(t('c_resign'), h('p', {}, t('c_resignQ')), [{ label: t('c_no'), kind: 'ghost', value: false }, { label: t('c_yes'), kind: 'danger', value: true }], { icon: 'flag' });
    if (!ok || S.over) return;
    const loser = S.mode === 'local' ? S.chess.turn() : S.myColor;
    if (S.mode === 'online') S.room?.send({ type: 'resign' });
    finish({ text: t('c_resigned', { name: S.names[loser], winner: S.names[other(loser)] }), winner: other(loser) });
  }

  // ---------- المساعد ----------
  async function askCoach() {
    if (S.over || !isMyTurn() || S.thinking) { toast(t('c_hintOnlyYourTurn')); return; }
    const fen = S.chess.fen();
    if (S.hints && S.hintsFen === fen) return;
    S.analyzing = true; S.hints = null; renderCoach();
    try {
      coach ||= new Engine();
      const depth = S.level === 'hard' ? 16 : 14;
      const lines = await coach.analyze(fen, { multipv: 5, depth, movetime: 3000 });
      if (!alive || S.chess.fen() !== fen) return;
      S.hints = buildSuggestions(fen, lines); S.hintsFen = fen;
      S.arrow = S.hints[0] ? { from: S.hints[0].from, to: S.hints[0].to, kind: 'best' } : null;
    } catch (e) { console.error(e); toast(t('c_engineFail'), true); }
    S.analyzing = false; renderCoach(); drawBoard();
  }

  // ---------- الترقية ----------
  function askPromotion(color) {
    return new Promise((resolve) => {
      const box = h('div', { class: 'c-promo' }, ['q', 'r', 'b', 'n'].map(p => h('button', { type: 'button', onclick: () => { modal.current?.close?.(p); } }, h('img', { src: pieceUrl(color, p), alt: p }))));
      modal(t('c_promote'), box, [], { icon: 'crown' }).then(resolve);
    });
  }

  // ---------- العرض ----------
  let boardEl = null, arrowsEl = null, statusEl = null, coachEl = null, movesEl = null, barsEl = { top: null, bottom: null };
  function renderGame() {
    if (!alive) return;
    view.innerHTML = '';
    boardEl = h('div', { class: 'cb', dir: 'ltr' });
    arrowsEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); arrowsEl.setAttribute('viewBox', '0 0 8 8'); arrowsEl.setAttribute('class', 'cb-arrows');
    const wrap = h('div', { class: 'cb-wrap' }, boardEl, arrowsEl);
    barsEl.top = h('div', { class: 'c-bar' }); barsEl.bottom = h('div', { class: 'c-bar' });
    statusEl = h('div', { class: 'c-status' });
    coachEl = h('div', { class: 'c-coach' });
    movesEl = h('div', { class: 'c-moves' });
    const btn = (icon, label, onclick, extra = {}) => h('button', { class: 'btn ghost sm', type: 'button', onclick, ...extra }, ico(icon, 16), label);
    const controls = h('div', { class: 'c-controls' },
      S.mode !== 'online' ? btn('undo-2', t('c_undo'), undo) : null,
      btn('arrow-right-left', t('c_flip'), () => { S.orient = other(S.orient); renderGame(); }),
      S.mode === 'online' ? btn('handshake', t('c_draw'), () => { if (!S.over) { S.room?.send({ type: 'draw-offer' }); toast(t('c_drawSent')); } }) : null,
      btn('flag', t('c_resign'), resign, { disabled: !!S.over }),
      S.mode !== 'online' ? btn('refresh-cw', t('c_new'), () => S.mode === 'computer' ? startComputer() : startLocal()) : null,
      S.chess.history().length >= 2 && (S.mode !== 'online' || S.over) ? btn('brain', t('c_review'), () => { S.token++; S.thinking = false; engine?.stop(); showReview(currentGameRecord(), () => { renderGame(); maybeEngine(); }); }) : null,
      btn('settings', t('c_settings'), () => ctx.openSettings()),
      btn('chevron-right', t('c_backToModes'), () => { S.token++; closeRoom(); S.room = null; showModes(S.mode); }));
    view.append(h('div', { class: 'c-layout' },
      h('div', { class: 'c-left' }, barsEl.top, wrap, barsEl.bottom),
      h('div', { class: 'c-side' }, h('div', { class: 'panel' }, statusEl, controls), S.mode === 'computer' ? h('div', { class: 'panel' }, coachEl) : null, h('div', { class: 'panel' }, h('b', {}, t('c_moves')), movesEl))));
    drawBoard(); renderStatus(); renderCoach(); renderMoves();
  }

  function drawBoard() {
    if (!boardEl) return;
    const [light, dark] = THEMES[settings.boardTheme] || THEMES.green;
    boardEl.style.setProperty('--light', light); boardEl.style.setProperty('--dark', dark);
    boardEl.innerHTML = '';
    const c = S.chess; const flip = S.orient === 'b';
    const checkSq = c.inCheck() ? c.findPiece({ type: 'k', color: c.turn() })[0] : null;
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const file = flip ? 7 - f : f, rank = flip ? r + 1 : 8 - r;
      const sq = FILES[file] + rank; const p = c.get(sq);
      const isLight = (file + rank) % 2 === 0;
      const cls = ['sq', isLight ? 'l' : 'd'];
      if (S.last && (S.last.from === sq || S.last.to === sq)) cls.push('last');
      if (S.sel === sq) cls.push('sel');
      if (checkSq === sq) cls.push('check');
      if (S.targets.includes(sq)) cls.push(p ? 'cap' : 'dot');
      const el = h('div', { class: cls.join(' '), 'data-sq': sq },
        f === 0 ? h('span', { class: 'co rk' }, rank) : null, r === 7 ? h('span', { class: 'co fl' }, FILES[file]) : null,
        p ? h('img', { class: 'pc', src: pieceUrl(p.color, p.type), alt: p.color + p.type, draggable: 'false' }) : null);
      boardEl.append(el);
    }
    drawArrow();
  }
  function sqCenter(sq) {
    const file = FILES.indexOf(sq[0]), rank = +sq[1]; const flip = S.orient === 'b';
    return [(flip ? 7 - file : file) + 0.5, (flip ? rank - 1 : 8 - rank) + 0.5];
  }
  function drawArrow() {
    if (!arrowsEl) return;
    arrowsEl.innerHTML = '';
    if (!S.arrow) return;
    const color = { best: '#16a34a', great: '#2563eb', brilliant: '#9333ea', good: '#f59e0b' }[S.arrow.kind] || '#16a34a';
    const [x1, y1] = sqCenter(S.arrow.from), [x2, y2] = sqCenter(S.arrow.to);
    const ang = Math.atan2(y2 - y1, x2 - x1), len = Math.hypot(x2 - x1, y2 - y1) - 0.35;
    const ex = x1 + Math.cos(ang) * len, ey = y1 + Math.sin(ang) * len;
    const ns = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(ns, 'g'); g.setAttribute('opacity', '0.85');
    const line = document.createElementNS(ns, 'line');
    Object.entries({ x1, y1, x2: ex, y2: ey, stroke: color, 'stroke-width': 0.17, 'stroke-linecap': 'round' }).forEach(([k, v]) => line.setAttribute(k, v));
    const head = document.createElementNS(ns, 'polygon');
    const hx = x2 - Math.cos(ang) * 0.12, hy = y2 - Math.sin(ang) * 0.12;
    const p1 = [hx - Math.cos(ang) * 0.4 + Math.sin(ang) * 0.28, hy - Math.sin(ang) * 0.4 - Math.cos(ang) * 0.28];
    const p2 = [hx - Math.cos(ang) * 0.4 - Math.sin(ang) * 0.28, hy - Math.sin(ang) * 0.4 + Math.cos(ang) * 0.28];
    head.setAttribute('points', `${hx},${hy} ${p1.join(',')} ${p2.join(',')}`); head.setAttribute('fill', color);
    g.append(line, head); arrowsEl.append(g);
  }

  function captured(color) {
    // القطع التي فقدها هذا اللون
    const start = { p: 8, n: 2, b: 2, r: 2, q: 1 }; const have = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    for (const row of S.chess.board()) for (const p of row) if (p && p.color === color && p.type !== 'k') have[p.type]++;
    const lost = []; for (const k of ['q', 'r', 'b', 'n', 'p']) for (let i = 0; i < Math.max(0, start[k] - have[k]); i++) lost.push(k);
    return lost;
  }
  function renderBars() {
    const top = other(S.orient), bottom = S.orient;
    const mat = (c) => { let s = 0; for (const row of S.chess.board()) for (const p of row) if (p && p.color === c) s += VAL[p.type]; return s; };
    const fill = (el, color) => {
      el.innerHTML = '';
      const lost = captured(other(color));
      const adv = mat(color) - mat(other(color));
      const active = !S.over && S.chess.turn() === color;
      el.className = 'c-bar' + (active ? ' active' : '');
      el.append(...[h('span', { class: 'c-dot ' + color }),
        h('b', { class: 'c-name' }, S.names[color] || (color === 'w' ? t('c_white') : t('c_black'))),
        S.mode === 'computer' && color !== S.myColor && S.thinking ? h('span', { class: 'c-think' }, h('i'), h('i'), h('i')) : null,
        h('span', { class: 'c-caps' }, lost.map(k => h('img', { src: pieceUrl(other(color), k), alt: k })), adv > 0 ? h('small', {}, '+' + num(adv)) : null)].filter(Boolean));
    };
    fill(barsEl.top, top); fill(barsEl.bottom, bottom);
  }
  function renderStatus() {
    renderBars();
    if (!statusEl) return;
    let txt;
    if (S.over) txt = S.over.text;
    else if (S.thinking) txt = t('c_thinking');
    else if (S.mode === 'local') txt = S.chess.turn() === 'w' ? t('c_turnW') : t('c_turnB');
    else txt = S.chess.turn() === S.myColor ? t('c_yourTurn') : (S.chess.turn() === 'w' ? t('c_turnW') : t('c_turnB'));
    statusEl.innerHTML = '';
    statusEl.append(...[h('span', { class: 'c-dot ' + S.chess.turn() }), h('b', {}, txt), !S.over && S.chess.inCheck() ? h('span', { class: 'c-checktag' }, t('c_check')) : null].filter(Boolean));
  }
  function renderMoves() {
    if (!movesEl) return;
    const hist = S.chess.history(); movesEl.innerHTML = '';
    const ol = h('ol', { dir: 'ltr' });
    for (let i = 0; i < hist.length; i += 2) ol.append(h('li', {}, h('span', {}, hist[i]), h('span', {}, hist[i + 1] || '')));
    movesEl.append(ol); movesEl.scrollTop = movesEl.scrollHeight;
  }
  function renderCoach() {
    if (!coachEl) return;
    coachEl.innerHTML = '';
    const head = h('div', { class: 'row' }, h('span', { class: 'c-bulb' }, ico('lightbulb', 22)), h('b', { class: 'grow' }, t('c_hint')),
      h('button', { class: 'btn accent sm', type: 'button', disabled: S.analyzing || S.over || !isMyTurn() || S.thinking, onclick: askCoach }, ico('lightbulb', 16), t('c_hintBtn')));
    coachEl.append(head);
    if (S.analyzing) { coachEl.append(h('p', { class: 'muted c-analyzing' }, h('span', { class: 'c-spinner sm' }), t('c_analyzing'))); return; }
    if (!S.hints || S.hintsFen !== S.chess.fen()) return;
    const label = { best: t('c_best'), great: t('c_great'), brilliant: t('c_brilliant'), good: t('c_good') };
    const icon = { best: 'trophy', great: 'sparkles', brilliant: 'brain', good: 'check' };
    for (const s of S.hints) {
      const card = h('details', { class: 'c-sug ' + s.kind, open: S.arrow?.kind === s.kind ? true : null },
        h('summary', {}, h('span', { class: 'c-sug-ic' }, ico(icon[s.kind], 16)), h('span', { class: 'grow' }, h('b', {}, label[s.kind]), s.sacrifice ? h('span', { class: 'c-sactag' }, ico('brain', 12), ' ', t('c_brilliant')) : null, ' ', h('code', { dir: 'ltr' }, s.san)), h('small', { class: 'muted' }, s.eval)),
        h('div', { class: 'c-sug-body' },
          h('div', { class: 'c-sub' }, t('c_scenario')),
          h('ol', { class: 'c-scen' }, s.scenario.map(x => h('li', {}, x))),
          h('div', { class: 'c-sub' }, t('c_why')),
          h('ul', {}, s.reasons.map(x => h('li', {}, x))),
          h('div', { class: 'row' },
            h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { S.arrow = { from: s.from, to: s.to, kind: s.kind }; drawArrow(); } }, ico('eye', 15), t('c_showArrow')),
            h('button', { class: 'btn sm', type: 'button', onclick: () => applyMove({ from: s.uci.slice(0, 2), to: s.uci.slice(2, 4), promotion: s.uci[4] }) }, ico('play', 15), t('c_playIt')))));
      card.addEventListener('toggle', () => { if (card.open) { S.arrow = { from: s.from, to: s.to, kind: s.kind }; drawArrow(); coachEl.querySelectorAll('details').forEach(d => d !== card && (d.open = false)); } });
      coachEl.append(card);
    }
  }

  // ---------- التفاعل مع الرقعة (نقر أو سحب) ----------
  let drag = null;
  view.addEventListener('pointerdown', (e) => {
    const sqEl = e.target.closest('.cb .sq'); if (!sqEl || e.button > 0) return;
    const sq = sqEl.dataset.sq;
    if (S.sel && S.targets.includes(sq)) { e.preventDefault(); tryMove(S.sel, sq); return; }
    if (canMovePiece(sq)) {
      e.preventDefault(); select(sq);
      const img = boardEl.querySelector(`[data-sq="${sq}"] .pc`);
      if (img) {
        const r = img.getBoundingClientRect();
        const ghost = img.cloneNode(); ghost.className = 'pc-ghost'; Object.assign(ghost.style, { width: r.width + 'px', height: r.height + 'px', left: (e.clientX - r.width / 2) + 'px', top: (e.clientY - r.height / 2) + 'px' });
        document.body.append(ghost); boardEl.querySelector(`[data-sq="${sq}"] .pc`).style.opacity = '.35';
        drag = { from: sq, ghost, w: r.width, moved: false, x: e.clientX, y: e.clientY };
      }
    } else if (S.sel) { S.sel = null; S.targets = []; drawBoard(); }
  });
  const onMove = (e) => {
    if (!drag) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) drag.moved = true;
    drag.ghost.style.left = (e.clientX - drag.w / 2) + 'px'; drag.ghost.style.top = (e.clientY - drag.w / 2) + 'px';
  };
  const onUp = (e) => {
    if (!drag) return;
    const d = drag; drag = null; d.ghost.remove();
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.cb .sq');
    const to = el?.dataset.sq;
    if (d.moved && to && to !== d.from && S.targets.includes(to)) tryMove(d.from, to);
    else drawBoard();
  };
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);

  // ---------- البدء ----------
  if (S.joinCode) showModes('online'); else showModes();

  return {
    unmount() { alive = false; rv?.destroy(); S.token++; closeRoom(); engine?.terminate(); coach?.terminate(); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); },
    onLang() { if (S.reviewing) { showReview(S.reviewing.g, S.reviewing.back); } else if (S.mode) renderGame(); else if (S.lobby) showLobby(S.lobby.code, S.lobby.pass); else showModes(); },
    onSettings(k) { if (S.reviewing && (k === 'boardTheme' || k === 'pieceSet')) { rv?.rerender?.(); return; } if (S.mode && (k === 'boardTheme' || k === 'pieceSet')) { drawBoard(); renderBars(); } },
    onHash(hash) { if (/^chess-join-\d{6}$/.test(hash) && !S.mode && !S.lobby) { S.joinCode = hash.split('-')[2]; S.onlineTab = 'join'; showModes('online'); } },
  };
}
