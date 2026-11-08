// لعبة «لوحة جدول الضرب» — جزء من سلسلة العب وتعلّم
// مستوحاة من لعبة الضرب الورقية: لوحة تُقرأ من الجهات الأربع، بطاقات ملوّنة حسب الجدول وبطاقات سوداء.
import { h, ico, t, tr, addDict, settings, num, modal, toast, sound, displayName, store, copyText } from '../../assets/js/core.js';
import { HostRoom, GuestRoom, netError } from '../../assets/js/netroom.js';
import { Comms } from '../../assets/js/comms.js';

if (!document.getElementById('mult-css')) document.head.append(h('link', { id: 'mult-css', rel: 'stylesheet', href: new URL('./mult.css', import.meta.url).href }));

addDict({
  ar: {
    m_level1: 'اللعب الجماعي', m_level1D: 'المستوى الأول (من 7 سنوات فأكثر): من 2 إلى 4 لاعبين، والفائز صاحب أقل مجموع.',
    m_level2: 'تعلّم الجدول', m_level2D: 'المستوى الثاني (للأطفال دون 7 سنوات والمبتدئين): رتّب بطاقات كل جدول في أماكنها حتى تحفظه.',
    m_players: 'اللاعبون', m_addPlayer: 'أضف لاعبًا', m_human: 'لاعب', m_bot: 'الكمبيوتر', m_botEasy: 'كمبيوتر مبتدئ', m_botSmart: 'كمبيوتر ذكي',
    m_options: 'خيارات اللعب', m_black: 'البطاقات السوداء', m_blackHint: 'بعضها نواتج مكرّرة تصلح لمربع آخر، وبعضها أرقام ليست ناتجًا لأي عملية.',
    m_hand: 'بطاقات كل لاعب', m_helper: 'المساعدة', m_helperHint: 'إضاءة المربعات المناسبة عند اختيار بطاقة.', m_digitsBoard: 'أرقام اللوحة', m_mixed: 'عربية وإنجليزية',
    m_tables: 'الجداول المطلوبة', m_order: 'ترتيب البطاقات', m_ordered: 'من الأصغر إلى الأكبر', m_shuffled: 'مخلوطة (أصعب)', m_kids: 'عدد الأطفال',
    m_start: 'ابدأ اللعب', m_print: 'طباعة اللوحة والبطاقات', m_rules: 'طريقة اللعب', m_settingsBtn: 'تغيير الإعداد',
    m_turnOf: 'دور {name}', m_pickCard: 'اختر بطاقة، ثم اضغط مربع العملية التي ناتجها رقم البطاقة.', m_draw: 'اسحب بطاقة', m_pass: 'مرّر الدور',
    m_deck: 'البطاقات المتبقية', m_cards: 'بطاقات', m_filled: 'المربعات المملوءة', m_reveal: 'دور {name}', m_revealBtn: 'أظهر بطاقاتي', m_revealHint: 'أعطِ الجهاز لصاحب الدور، ثم اضغط لإظهار بطاقاته.',
    m_occupied: 'هذا المربع فيه بطاقة، فلا يجوز وضع بطاقة أخرى فوقها.', m_wrong: 'ليس هذا مكانها: {a} × {b} = {p}. تعود البطاقة إليك وينتقل الدور.',
    m_drewPlayable: 'سحبت {v} ولها مكان في اللوحة؛ ضعها الآن.', m_drewNone: 'سحبت {v} ولا مكان لها الآن، فينتقل الدور.', m_oneDraw: 'لا يجوز سحب أكثر من بطاقة في الدور الواحد.',
    m_great: ['أحسنت!', 'رائع!', 'ممتاز!', 'إجابة صحيحة!', 'بطل!'],
    m_gameOver: 'انتهت اللعبة', m_boardFull: 'امتلأت اللوحة بالنواتج الصحيحة!', m_blocked: 'لم يعد أحد يستطيع اللعب.', m_winner: '🏆 الفائز: {name}', m_tie: '🤝 تعادل بين: {names}',
    m_sum: 'مجموع البطاقات', m_left: 'البطاقات المتبقية', m_rank: 'الترتيب', m_playAgain: 'العب مرة أخرى', m_wins: 'مرات الفوز',
    m_learnDone: 'أكملت الجدول!', m_mistakes: 'الأخطاء', m_time: 'الوقت', m_next: 'التالي', m_learnWinner: '🏆 {name} تخلّص من بطاقاته أولًا!',
    m_level3: 'اللعب عبر الإنترنت', m_level3D: 'أنشئ غرفة برقم سري وادعُ أصدقاءك من أجهزتهم، ويمكن إكمال المقاعد بالكمبيوتر.',
    m_create: 'إنشاء غرفة', m_join: 'الانضمام إلى غرفة', m_you: 'أنت', m_roomPass: 'كلمة سر الغرفة', m_roomCode: 'رقم الغرفة', m_createBtn: 'أنشئ الغرفة', m_joinBtn: 'ادخل الغرفة',
    m_connecting: 'جارٍ الاتصال…', m_lobby: 'غرفة اللعب', m_invite: 'رابط الدعوة', m_copyInvite: 'نسخ الدعوة', m_inviteText: 'تعال نلعب «لوحة جدول الضرب» في العب وتعلّم!\nالرابط: {link}\nرقم الغرفة: {code}\nكلمة السر: {pass}',
    m_waitingPlayers: 'بانتظار انضمام اللاعبين…', m_waitingHost: 'بانتظار أن يبدأ صاحب الغرفة اللعب…', m_addBot: 'أضف الكمبيوتر', m_startOnline: 'ابدأ اللعب', m_needTwo: 'يلزم لاعبان على الأقل.', m_leave: 'مغادرة الغرفة',
    m_needPass: 'اكتب كلمة سر للغرفة.', m_needCode: 'اكتب رقم الغرفة المكوّن من 6 أرقام.', m_joined: 'انضم {name}.', m_left: 'غادر {name}، ويكمل الكمبيوتر مكانه.', m_leftLobby: 'غادر {name} الغرفة.', m_hostLeft: 'أغلق صاحب الغرفة اللعبة.',
    m_yourTurn: 'دورك', m_waitTurn: 'انتظر دورك؛ الآن دور {name}.', m_hostOnly: 'صاحب الغرفة هو من يبدأ اللعبة الجديدة.', m_close: 'إغلاق', m_netNote: 'يتصل اللاعبون مباشرة بين أجهزتهم، ولا تُحفظ اللعبة على أي خادم.',
    net_notFound: 'لم يُعثر على الغرفة. تأكد من الرقم وأن صاحبها ما زال في الغرفة.', net_badPass: 'كلمة السر غير صحيحة.', net_full: 'الغرفة مكتملة.', net_started: 'بدأت اللعبة في هذه الغرفة.', net_timeout: 'انتهت مهلة الاتصال، أعد المحاولة.', net_error: 'تعذّر الاتصال بخدمة اللعب عبر الإنترنت. تحقق من اتصالك ثم أعد المحاولة.',
    m_name: 'الاسم', m_placed: '{name} وضع {v} على {a} × {b}', m_log: 'سجل اللعب',
    m_rulesText: `<h4>مكونات اللعبة</h4><ul>
<li>لوحة تضم 36 عملية من جداول الضرب دون تكرار، مرتبة في مجموعات: جدول 2 في الصف الأول، ثم جدول 4، ثم في المنتصف جدول 6 يمينًا وجدول 8 وسطًا وجدول 7 يسارًا، ثم جدول 5، ثم جدول 3. وكل عملية مكتوبة في الجهات الأربع ليقرأها كل لاعب من مكانه.</li>
<li>50 بطاقة: منها 36 بطاقة نواتج ملوّنة، لكل جدول لون (جدول 2 بالأحمر، وجدول 3 بالأخضر، وهكذا)، و14 بطاقة سوداء؛ بعضها نواتج مكررة، وبعضها أرقام ليست نواتج لأي عملية، وهي تمنح الفرص وتزيد الحماس.</li>
<li>يشترك في اللعب لاعبان أو ثلاثة أو أربعة.</li></ul>
<h4>المستوى الأول: من 7 سنوات فأكثر</h4><ol>
<li>تُخلط البطاقات ويأخذ كل لاعب 5 بطاقات، ويبدأ اللاعب الأول بوضع إحدى بطاقاته في مكانها الصحيح، ثم الذي يليه، وهكذا.</li>
<li>إذا لم تكن لدى اللاعب بطاقة لها مكان في اللوحة، أو انتهت بطاقاته، سحب في دوره بطاقة واحدة من البطاقات المتبقية؛ فإن كان لها مكان وضعها، وإلا انتقل الدور إلى اللاعب الذي يليه.</li>
<li>إذا أخطأ اللاعب فوضع بطاقته في غير مكانها، عادت إليه البطاقة وانتقل الدور.</li>
<li>عندما تمتلئ اللوحة يكون اللاعبون قد وصلوا إلى جميع النواتج الصحيحة، فيجمع كل لاعب أرقام البطاقات الباقية معه.</li>
<li>يفوز صاحب أقل مجموع؛ لأنه تخلّص من البطاقات ذات الأرقام الكبيرة، أو لم يخطئ في معرفة نواتج الضرب.</li></ol>
<h4>تنبيهات مهمة</h4><ul>
<li>إذا كانت مع اللاعب بطاقة سوداء لها مكان في اللوحة، فالأفضل أن يتخلص منها أولًا؛ لأنها قد تكون تكرارًا لإحدى البطاقات الملوّنة.</li>
<li>لا يسحب اللاعب أكثر من بطاقة واحدة في الدور الواحد.</li></ul>
<h4>المستوى الثاني: للأطفال دون 7 سنوات أو المبتدئين في حفظ الجدول</h4><ol>
<li>تُستبعد البطاقات السوداء، وتبقى البطاقات الملوّنة.</li>
<li>يرتّب الطفل بطاقات جدول 2 من الأصغر إلى الأكبر ويضعها في أماكنها على اللوحة، ثم جدول 4، وهكذا.</li>
<li>بتكرار الترتيب يعرف الطفل أماكن البطاقات بمجرد النظر، ثم يرتقي إلى مستوى أصعب بخلط البطاقات.</li>
<li>يمكن تقسيم البطاقات على طفلين، ويفوز من يتخلّص من بطاقاته أولًا.</li></ol>`,
  },
  en: {
    m_level1: 'Group game', m_level1D: 'Level 1 (age 7+): 2–4 players; the lowest total wins.',
    m_level2: 'Learn a table', m_level2D: 'Level 2 (under 7 and beginners): place each table\'s cards on the board until you know it by heart.',
    m_players: 'Players', m_addPlayer: 'Add player', m_human: 'Player', m_bot: 'Computer', m_botEasy: 'Beginner computer', m_botSmart: 'Smart computer',
    m_options: 'Options', m_black: 'Black cards', m_blackHint: 'Some are repeated products that fit another square; others are not the product of any fact.',
    m_hand: 'Cards per player', m_helper: 'Helper', m_helperHint: 'Highlight matching squares when you pick a card.', m_digitsBoard: 'Board digits', m_mixed: 'Arabic & English',
    m_tables: 'Tables to learn', m_order: 'Card order', m_ordered: 'Smallest to largest', m_shuffled: 'Shuffled (harder)', m_kids: 'Number of children',
    m_start: 'Start', m_print: 'Print board & cards', m_rules: 'How to play', m_settingsBtn: 'Change setup',
    m_turnOf: "{name}'s turn", m_pickCard: 'Pick a card, then tap the fact whose product is on the card.', m_draw: 'Draw a card', m_pass: 'Pass',
    m_deck: 'Cards left', m_cards: 'cards', m_filled: 'Squares filled', m_reveal: "{name}'s turn", m_revealBtn: 'Show my cards', m_revealHint: 'Hand the device to the player whose turn it is, then tap to show their cards.',
    m_occupied: 'That square already holds a card.', m_wrong: 'Not there: {a} × {b} = {p}. The card goes back to you and your turn ends.',
    m_drewPlayable: 'You drew {v} and it fits on the board — place it now.', m_drewNone: 'You drew {v}; it has no place now, so your turn ends.', m_oneDraw: 'Only one card may be drawn per turn.',
    m_great: ['Well done!', 'Great!', 'Excellent!', 'Correct!', 'Champion!'],
    m_gameOver: 'Game over', m_boardFull: 'The board is full of correct products!', m_blocked: 'Nobody can play any more.', m_winner: '🏆 Winner: {name}', m_tie: '🤝 Tie between: {names}',
    m_sum: 'Card total', m_left: 'Cards left', m_rank: 'Rank', m_playAgain: 'Play again', m_wins: 'Wins',
    m_learnDone: 'You finished the table!', m_mistakes: 'Mistakes', m_time: 'Time', m_next: 'Next', m_learnWinner: '🏆 {name} placed all their cards first!',
    m_level3: 'Play online', m_level3D: 'Create a private room and invite friends on their own devices; fill empty seats with the computer.',
    m_create: 'Create a room', m_join: 'Join a room', m_you: 'You', m_roomPass: 'Room password', m_roomCode: 'Room number', m_createBtn: 'Create room', m_joinBtn: 'Enter room',
    m_connecting: 'Connecting…', m_lobby: 'Game room', m_invite: 'Invite link', m_copyInvite: 'Copy invite', m_inviteText: "Let's play Times Tables Board on Play & Learn!\nLink: {link}\nRoom: {code}\nPassword: {pass}",
    m_waitingPlayers: 'Waiting for players to join…', m_waitingHost: 'Waiting for the host to start…', m_addBot: 'Add computer', m_startOnline: 'Start', m_needTwo: 'At least two players are needed.', m_leave: 'Leave room',
    m_needPass: 'Enter a room password.', m_needCode: 'Enter the 6-digit room number.', m_joined: '{name} joined.', m_left: '{name} left; the computer takes over.', m_leftLobby: '{name} left the room.', m_hostLeft: 'The host closed the game.',
    m_yourTurn: 'Your turn', m_waitTurn: "Wait for your turn — it's {name}'s turn.", m_hostOnly: 'Only the host can start a new game.', m_close: 'Close', m_netNote: 'Players connect directly between devices; nothing is stored on a server.',
    net_notFound: 'Room not found. Check the number and that the host is still in the room.', net_badPass: 'Wrong password.', net_full: 'The room is full.', net_started: 'The game in this room has already started.', net_timeout: 'Connection timed out; please try again.', net_error: 'Could not reach the online play service. Check your connection and try again.',
    m_name: 'Name', m_placed: '{name} placed {v} on {a} × {b}', m_log: 'Game log',
    m_rulesText: `<h4>What's in the game</h4><ul>
<li>A board with 36 times-table facts, no repeats, grouped by table: 2 on the first row, then 4; in the middle 6 (right), 8 (centre) and 7 (left); then 5, then 3. Each fact is written in all four directions.</li>
<li>50 cards: 36 coloured product cards (each table has its own colour) and 14 black cards — some repeat a product, others are not a product of any fact.</li>
<li>2, 3 or 4 players.</li></ul>
<h4>Level 1: age 7 and up</h4><ol>
<li>Shuffle and deal 5 cards each. Players take turns placing one card on its correct fact.</li>
<li>If you have no card that fits (or no cards at all), draw one card on your turn; if it fits, place it, otherwise your turn ends.</li>
<li>If you place a card on the wrong fact, it comes back to you and your turn ends.</li>
<li>When the board is full, everyone adds up the cards left in their hand.</li>
<li>The lowest total wins.</li></ol>
<h4>Tips</h4><ul><li>If a black card fits the board, play it first — it may duplicate a coloured card.</li><li>Never draw more than one card per turn.</li></ul>
<h4>Level 2: under 7 or beginners</h4><ol>
<li>Remove the black cards.</li><li>Place table 2's cards from smallest to largest on the board, then table 4, and so on.</li>
<li>Repeat until you know every place by sight, then shuffle the cards for a harder challenge.</li><li>Two children can split the cards; whoever places all theirs first wins.</li></ol>`,
  },
});

// ---------- البيانات ----------
// توزيع اللوحة كما في اللعبة الأصلية (الترتيب هنا من اليسار إلى اليمين لكل صف):
// صف جدول 2، ثم جدول 4، ثم صفّان في المنتصف: جدول 7 يسارًا، وجدول 8 وسطًا، وجدول 6 يمينًا،
// ثم صف جدول 5، ثم صف جدول 3. كل صف يتزايد من اليمين إلى اليسار.
const LAYOUT = [
  [[2, 9, 2], [2, 8, 2], [2, 7, 2], [2, 6, 2], [2, 5, 2], [2, 4, 2]],
  [[4, 9, 4], [4, 8, 4], [4, 7, 4], [4, 6, 4], [4, 5, 4], [4, 4, 4]],
  [[7, 10, 7], [7, 7, 7], [8, 9, 8], [8, 8, 8], [6, 9, 6], [6, 6, 6]],
  [[7, 9, 7], [7, 8, 7], [9, 9, 8], [9, 10, 8], [6, 8, 6], [6, 7, 6]],
  [[5, 10, 5], [5, 9, 5], [5, 8, 5], [5, 7, 5], [5, 6, 5], [5, 5, 5]],
  [[3, 9, 3], [3, 8, 3], [3, 7, 3], [3, 6, 3], [3, 5, 3], [3, 4, 3]],
];
// g: مجموعة اللون (رقم الجدول)؛ مجموعة جدول 8 تضم 8×8 و8×9 و9×9 و9×10
const FACTS = LAYOUT.flat().map(([a, b, g]) => ({ a, b, g, p: a * b }));
const GROUPS = [2, 3, 4, 5, 6, 7, 8];
const GROUP_LABEL = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8 / 9' };
const PRODUCTS = new Set(FACTS.map(f => f.p));
// ألوان هادئة متباينة لكل مجموعة
const TABLE_COLORS = { 2: '#d64545', 4: '#2f6fd6', 6: '#e09b00', 8: '#3c9a3c', 7: '#8a3fb5', 5: '#d63a83', 3: '#00897b' };
const FRUITS = ['🍎', '🍉', '🍓', '🍍', '🍊', '🍇', '🍒', '🍑', '🍐', '🥝', '🍌', '🍋'];
const AVATARS = ['🦁', '🐯', '🐼', '🦊', '🐸', '🐵', '🐧', '🦄', '🐨', '🐙', '🦉', '🐬'];
const PCOLORS = ['#0f766e', '#dc2626', '#2563eb', '#9333ea'];
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const AR = (n) => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
// الأرقام حسب الجهة: الأعلى والأسفل بالعربية، والجانبان بالإنجليزية (كما في اللوحة الورقية)
const sideNum = (n, side, mode) => mode === 'arabic' ? AR(n) : mode === 'latin' ? String(n) : (side === 'b' || side === 't') ? AR(n) : String(n);

// البطاقات: 36 ملوّنة + بطاقات سوداء (نصفها تقريبًا نواتج مكررة والباقي ليست نواتج)
function makeDeck(blackCount) {
  const cards = FACTS.map((f, i) => ({ id: 'c' + i, v: f.p, table: f.g }));
  const prods = shuffle([...PRODUCTS]);
  const non = []; for (let n = 5; n <= 95; n++) if (!PRODUCTS.has(n)) non.push(n);
  const nonS = shuffle(non);
  const dup = Math.round(blackCount * 0.45);
  for (let i = 0; i < blackCount; i++) cards.push({ id: 'k' + i, v: i < dup ? prods[i % prods.length] : nonS[i], black: true });
  return shuffle(cards);
}

const DEFAULT = {
  level: 1,
  players: [{ type: 'human', name: '', avatar: '🦁' }, { type: 'smart', name: '', avatar: '🐼' }, { type: 'easy', name: '', avatar: '🦊' }, { type: 'smart', name: '', avatar: '🐸' }],
  count: 2, black: 14, hand: 5, helper: false, digits: 'mixed',
  tables: [2, 4, 6, 8, 7, 5, 3], order: 'ordered', kids: 1,
};

export async function mount(root, ctx) {
  const saved = store.get('mult2-setup', {});
  const setup = { ...DEFAULT, ...saved, players: DEFAULT.players.map((p, i) => ({ ...p, ...(saved.players?.[i] || {}) })) };
  let G = null; // حالة اللعبة الحالية
  let timer = null, alive = true, tick = null;
  const wins = store.get('mult2-wins', {});
  const view = h('div', { class: 'mult' }); root.append(view);

  // ================= شاشة الإعداد =================
  function showSetup() {
    clearTimeout(timer); clearInterval(tick); G = null; view.innerHTML = '';
    if (net) closeNet();
    const levelCards = h('div', { class: 'm-levels' }, [1, 2, 3].map(l => h('button', { type: 'button', class: 'm-level' + (setup.level === l ? ' on' : ''), onclick: () => { setup.level = l; showSetup(); } },
      h('span', { class: 'm-level-ic' }, ['🎲', '🌱', '🌐'][l - 1]), h('b', {}, t('m_level' + l)), h('small', {}, t('m_level' + l + 'D')))));
    if (setup.level === 3) return showOnlineSetup(levelCards);

    const count = setup.level === 1 ? setup.count : setup.kids;
    const rows = h('div', { class: 'm-players' });
    for (let i = 0; i < count; i++) {
      const p = setup.players[i];
      const types = setup.level === 1 ? [['human', t('m_human')], ['easy', t('m_botEasy')], ['smart', t('m_botSmart')]] : [['human', t('m_human')]];
      if (setup.level === 2) p.type = 'human';
      rows.append(h('div', { class: 'm-prow', style: { '--pc': PCOLORS[i] } },
        h('button', { type: 'button', class: 'm-avatar', title: 'avatar', onclick: () => { p.avatar = AVATARS[(AVATARS.indexOf(p.avatar) + 1) % AVATARS.length]; showSetup(); } }, p.avatar),
        h('input', { class: 'input', maxlength: 18, value: p.name, placeholder: defaultName(p, i), oninput: e => p.name = e.target.value }),
        types.length > 1 ? ctx.seg(types, p.type, v => { p.type = v; showSetup(); }) : null,
        i >= 2 ? h('button', { type: 'button', class: 'icon-btn', onclick: () => { if (setup.level === 1) setup.count--; else setup.kids--; showSetup(); } }, ico('x', 18)) : null));
    }
    if (count < (setup.level === 1 ? 4 : 2)) rows.append(h('button', { type: 'button', class: 'btn ghost sm m-add', onclick: () => { if (setup.level === 1) setup.count++; else setup.kids++; showSetup(); } }, ico('plus', 16), t('m_addPlayer')));
    if (setup.level === 2 && count === 1) rows.append(h('button', { type: 'button', class: 'btn ghost sm m-add', onclick: () => { setup.kids = 2; showSetup(); } }, ico('plus', 16), t('m_addPlayer')));

    const opts = setup.level === 1
      ? h('div', { class: 'opts' },
        h('div', { class: 'field' }, h('span', {}, t('m_black')), ctx.seg([0, 8, 14, 20].map(n => [String(n), num(n)]), String(setup.black), v => setup.black = +v), h('small', {}, t('m_blackHint'))),
        h('div', { class: 'field' }, h('span', {}, t('m_hand')), ctx.seg([4, 5, 6].map(n => [String(n), num(n)]), String(setup.hand), v => setup.hand = +v)),
        h('div', { class: 'field' }, h('span', {}, t('m_helper')), ctx.seg([['0', t('off')], ['1', t('on')]], setup.helper ? '1' : '0', v => setup.helper = v === '1'), h('small', {}, t('m_helperHint'))),
        h('div', { class: 'field' }, h('span', {}, t('m_digitsBoard')), ctx.seg([['mixed', t('m_mixed')], ['arabic', '١٢٣'], ['latin', '123']], setup.digits, v => setup.digits = v)))
      : h('div', { class: 'opts' },
        h('div', { class: 'field', style: { gridColumn: '1 / -1' } }, h('span', {}, t('m_tables')),
          h('div', { class: 'm-chips' }, [2, 4, 6, 8, 7, 5, 3].map(n => h('button', { type: 'button', class: 'm-chip' + (setup.tables.includes(n) ? ' on' : ''), style: { '--tc': TABLE_COLORS[n] }, onclick: (e) => {
            if (setup.tables.includes(n)) { if (setup.tables.length > 1) setup.tables = setup.tables.filter(x => x !== n); } else setup.tables = [...setup.tables, n];
            e.currentTarget.classList.toggle('on', setup.tables.includes(n));
          } }, `× ${GROUP_LABEL[n].split(' / ').map(x => num(x)).join(' / ')}`)))),
        h('div', { class: 'field' }, h('span', {}, t('m_order')), ctx.seg([['ordered', t('m_ordered')], ['shuffled', t('m_shuffled')]], setup.order, v => setup.order = v)),
        h('div', { class: 'field' }, h('span', {}, t('m_helper')), ctx.seg([['0', t('off')], ['1', t('on')]], setup.helper ? '1' : '0', v => setup.helper = v === '1')),
        h('div', { class: 'field' }, h('span', {}, t('m_digitsBoard')), ctx.seg([['mixed', t('m_mixed')], ['arabic', '١٢٣'], ['latin', '123']], setup.digits, v => setup.digits = v)));

    view.append(h('div', { class: 'm-setup-grid' },
      h('div', { class: 'panel m-setup' },
        levelCards,
        h('h3', { class: 'm-h3' }, ico('users', 18), t('m_players')), rows,
        h('h3', { class: 'm-h3' }, ico('settings', 18), t('m_options')), opts,
        h('div', { class: 'row', style: { marginTop: '20px' } },
          h('button', { class: 'btn m-go', type: 'button', onclick: start }, ico('play', 20), t('m_start')),
          h('button', { class: 'btn ghost', type: 'button', onclick: printSheet }, ico('printer', 18), t('m_print')),
          h('button', { class: 'btn ghost', type: 'button', onclick: showRules }, ico('info', 18), t('m_rules')))),
      h('div', { class: 'm-preview' }, boardEl(null, true))));
  }
  // ================= اللعب عبر الإنترنت =================
  let net = null; // { role, room, code, pass, players: [{ id, name, avatar, type }] }
  const myInfo = () => ({ name: (settings.playerName || '').trim() || setup.players[0].name.trim() || displayName(1), avatar: setup.players[0].avatar });
  function showOnlineSetup(levelCards) {
    const me = setup.players[0];
    const nameIn = h('input', { class: 'input', maxlength: 18, value: me.name || settings.playerName || '', placeholder: displayName(1), oninput: e => me.name = e.target.value });
    const av = h('button', { type: 'button', class: 'm-avatar', style: { '--pc': PCOLORS[0] }, onclick: (e) => { me.avatar = AVATARS[(AVATARS.indexOf(me.avatar) + 1) % AVATARS.length]; e.currentTarget.textContent = me.avatar; } }, me.avatar);
    const passIn = h('input', { class: 'input', maxlength: 24, placeholder: '••••', value: store.get('mult-room-pass', '') });
    const codeIn = h('input', { class: 'input m-code', inputmode: 'numeric', maxlength: 6, dir: 'ltr', placeholder: '123456', value: setup.joinCode || '' });
    const jPass = h('input', { class: 'input', maxlength: 24, placeholder: '••••' });
    const tab = setup.onlineTab || 'create';
    const createBox = h('div', { class: 'opts' + (tab === 'create' ? '' : ' hidden') },
      h('label', { class: 'field' }, h('span', {}, t('m_roomPass')), passIn),
      h('div', { class: 'field' }, h('span', {}, t('m_black')), ctx.seg([0, 8, 14, 20].map(n => [String(n), num(n)]), String(setup.black), v => setup.black = +v)),
      h('div', { class: 'field' }, h('span', {}, t('m_hand')), ctx.seg([4, 5, 6].map(n => [String(n), num(n)]), String(setup.hand), v => setup.hand = +v)),
      h('div', { class: 'field' }, h('span', {}, t('m_digitsBoard')), ctx.seg([['mixed', t('m_mixed')], ['arabic', '١٢٣'], ['latin', '123']], setup.digits, v => setup.digits = v)),
      h('div', {}, h('button', { class: 'btn m-go', type: 'button', onclick: (e) => createRoom(passIn.value.trim(), e.currentTarget) }, ico('plus', 18), t('m_createBtn'))));
    const joinBox = h('div', { class: 'opts' + (tab === 'join' ? '' : ' hidden') },
      h('label', { class: 'field' }, h('span', {}, t('m_roomCode')), codeIn),
      h('label', { class: 'field' }, h('span', {}, t('m_roomPass')), jPass),
      h('div', {}, h('button', { class: 'btn m-go', type: 'button', onclick: (e) => joinRoom(codeIn.value.trim(), jPass.value.trim(), e.currentTarget) }, ico('log-out', 18), t('m_joinBtn'))));
    view.innerHTML = '';
    view.append(h('div', { class: 'm-setup-grid' },
      h('div', { class: 'panel m-setup' }, levelCards,
        h('h3', { class: 'm-h3' }, ico('user', 18), t('m_you')),
        h('div', { class: 'm-prow', style: { '--pc': PCOLORS[0] } }, av, nameIn),
        h('div', { style: { marginTop: '16px' } }, ctx.seg([['create', t('m_create')], ['join', t('m_join')]], tab, v => { setup.onlineTab = v; createBox.classList.toggle('hidden', v !== 'create'); joinBox.classList.toggle('hidden', v !== 'join'); })),
        h('div', { style: { marginTop: '14px' } }, createBox, joinBox),
        h('p', { class: 'muted', style: { fontSize: '13px', margin: '14px 0 0' } }, ico('info', 14), ' ', t('m_netNote'))),
      h('div', { class: 'm-preview' }, boardEl(null, true))));
  }
  async function createRoom(pass, btn) {
    if (!pass) { toast(t('m_needPass'), true); return; }
    store.set('mult-room-pass', pass); store.set('mult2-setup', setup);
    btn.disabled = true; btn.textContent = t('m_connecting');
    closeNet();
    const room = new HostRoom('mult', { password: pass, max: 3 }, {
      onJoin: (id, info) => {
        if (!net) return;
        const name = String(info.name || '').slice(0, 18) || `${t('player')} ${num(net.players.length + 1)}`;
        const used = net.players.map(p => p.avatar); let avatar = AVATARS.includes(info.avatar) && !used.includes(info.avatar) ? info.avatar : AVATARS.find(a => !used.includes(a));
        net.players.push({ id, name, avatar, type: 'remote' });
        sound('notify'); toast(t('m_joined', { name }), 'ok'); showLobby();
      },
      onLeave: (id) => onGuestLeft(id),
      onMessage: (id, msg) => onGuestMessage(id, msg),
    });
    try {
      const code = await room.open();
      net = { role: 'host', room, code, pass, players: [{ id: 'host', ...myInfo(), type: 'human' }] };
      net.comms = new Comms({ peer: room.peer, me: { id: room.peer.id, name: myInfo().name }, sendChat: (text) => room.broadcast({ type: 'chat', name: myInfo().name, text }) });
      showLobby();
    } catch (e) { toast(t(netError(e)), true); btn.disabled = false; btn.textContent = t('m_createBtn'); room.close(); }
  }
  async function joinRoom(code, pass, btn) {
    if (!/^\d{6}$/.test(code)) { toast(t('m_needCode'), true); return; }
    btn.disabled = true; btn.textContent = t('m_connecting');
    closeNet();
    const room = new GuestRoom('mult', {
      onMessage: (msg) => onHostMessage(msg),
      onLeave: () => { toast(t('m_hostLeft'), true); closeNet(); G = null; modal.current?.close?.(null); showSetup(); },
    });
    try {
      const id = await room.join(code, pass, myInfo());
      net = { role: 'guest', room, code, pass, id, players: [] };
      net.comms = new Comms({ peer: room.peer, me: { id: room.peer.id, name: myInfo().name }, sendChat: (text) => room.send({ type: 'chat', text }) });
      showLobby();
    } catch (e) { toast(t(netError(e)), true); btn.disabled = false; btn.textContent = t('m_joinBtn'); room.close(); }
  }
  function closeNet() { try { net?.comms?.destroy(); } catch { } try { net?.room?.close(); } catch { } net = null; }
  // قائمة المشاركين في الصوت والصورة (اللاعبون الحقيقيون فقط)
  function updateRoster() {
    if (!net || net.role !== 'host') return;
    const list = net.players.filter(p => p.type === 'human' || p.type === 'remote').map(p => ({ id: p.type === 'human' ? net.room.peer.id : p.id, name: p.name }));
    net.comms?.setRoster(list); net.room.broadcast({ type: 'roster', list });
  }
  const inviteLink = () => `${location.origin}${location.pathname}#multiplication-join-${net.code}`;
  function showLobby() {
    if (!net || (G && !G.over)) return;
    G = null; view.innerHTML = '';
    if (net.role === 'host') { net.room.broadcast({ type: 'lobby', players: net.players.map(p => ({ name: p.name, avatar: p.avatar, type: p.type })) }); updateRoster(); }
    const list = h('div', { class: 'm-lobby-list' }, net.players.map((p, i) => h('div', { class: 'm-prow', style: { '--pc': PCOLORS[i] } },
      h('span', { class: 'm-avatar' }, p.avatar), h('b', { class: 'grow' }, p.name), p.type === 'remote' ? ico('globe', 16) : p.type === 'human' ? ico('user', 16) : ico('bot', 16),
      net.role === 'host' && (p.type === 'smart' || p.type === 'easy') ? h('button', { type: 'button', class: 'icon-btn', onclick: () => { net.players.splice(i, 1); showLobby(); } }, ico('x', 16)) : null)));
    const hostBox = net.role === 'host' ? h('div', {},
      h('div', { class: 'field', style: { marginTop: '12px' } }, h('span', {}, t('m_invite')),
        h('div', { class: 'row' }, h('input', { class: 'input grow', readonly: true, dir: 'ltr', value: inviteLink() }), h('button', { class: 'btn sm', type: 'button', onclick: () => copyText(t('m_inviteText', { link: inviteLink(), code: net.code, pass: net.pass })) }, ico('copy', 15), t('m_copyInvite')))),
      h('div', { class: 'row', style: { marginTop: '16px' } },
        net.players.length < 4 ? h('button', { class: 'btn ghost', type: 'button', onclick: () => { net.players.push({ id: 'bot' + Date.now(), name: `${t('computer')} ${num(net.players.length + 1)}`, avatar: AVATARS.find(a => !net.players.some(p => p.avatar === a)), type: 'smart' }); showLobby(); } }, ico('bot', 17), t('m_addBot')) : null,
        h('button', { class: 'btn m-go', type: 'button', onclick: () => { if (net.players.length < 2) { toast(t('m_needTwo'), true); return; } startOnline(); } }, ico('play', 18), t('m_startOnline')))) : null;
    view.append(h('div', { class: 'panel m-lobby' },
      h('div', { class: 'row' }, h('h2', { class: 'grow', style: { margin: 0 } }, ico('globe', 20), ' ', t('m_lobby')), h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { closeNet(); showSetup(); } }, t('m_leave'))),
      h('div', { class: 'm-codes' }, h('div', {}, h('small', { class: 'muted' }, t('m_roomCode')), h('b', { dir: 'ltr' }, net.code)), h('div', {}, h('small', { class: 'muted' }, t('m_roomPass')), h('b', { dir: 'ltr' }, net.pass))),
      list,
      h('p', { class: 'muted m-wait' }, h('span', { class: 'm-spin' }), net.role === 'host' ? t('m_waitingPlayers') : t('m_waitingHost')),
      hostBox));
  }
  // المضيف: بدء اللعبة بالمقاعد الحالية
  function startOnline() {
    net.room.locked = true;
    const players = net.players.map((p, i) => ({ id: p.id, type: p.type, name: p.name, avatar: p.avatar, color: PCOLORS[i], hand: [] }));
    const cells = FACTS.map((f, i) => ({ ...f, idx: i, card: null, by: null }));
    const deck = makeDeck(setup.black);
    for (let k = 0; k < setup.hand; k++) for (const p of players) p.hand.push(deck.pop());
    G = { level: 1, players, cells, deck, turn: 0, drew: false, passes: 0, sel: null, revealed: true, last: null, log: [], over: false, net: { role: 'host', mySeat: 0 } };
    modal.current?.close?.(null);
    render(); hook();
  }
  const seatOf = (id) => G?.players.findIndex(p => p.id === id);
  function onGuestMessage(id, msg) {
    if (msg?.type === 'chat' && net) {
      const from = net.players.find(p => p.id === id)?.name || '…', text = String(msg.text || '').slice(0, 300); if (!text) return;
      net.comms?.addChat({ name: from, text });
      for (const pid of net.room.conns.keys()) if (pid !== id) net.room.send(pid, { type: 'chat', name: from, text });
      return;
    }
    if (!G || G.over || msg?.type !== 'action') return;
    const s = seatOf(id);
    if (s < 0 || G.turn !== s || G.lock) return;
    if (msg.act === 'place' && Number.isInteger(msg.cardIdx) && Number.isInteger(msg.cellIdx) && G.players[s].hand[msg.cardIdx] && G.cells[msg.cellIdx]) place(s, msg.cardIdx, msg.cellIdx);
    else if (msg.act === 'draw') draw(s);
  }
  function onGuestLeft(id) {
    if (!net) return;
    if (G && !G.over) {
      const s = seatOf(id); if (s < 0) return;
      const p = G.players[s]; p.type = 'smart'; p.id = 'bot-' + id;
      const np = net.players.find(q => q.id === id); if (np) { np.type = 'smart'; np.id = p.id; }
      toast(t('m_left', { name: p.name })); updateRoster(); render(); if (G.turn === s) hook();
      return;
    }
    const k = net.players.findIndex(p => p.id === id);
    if (k >= 0) { const [p] = net.players.splice(k, 1); toast(t('m_leftLobby', { name: p.name })); if (G?.over) G = null; showLobby(); }
  }
  // إرسال الحالة لكل لاعب (يرى بطاقاته فقط)
  function broadcastState() {
    if (!G?.net || G.net.role !== 'host') return;
    G.players.forEach((p, s) => {
      if (p.type !== 'remote') return;
      net.room.send(p.id, {
        type: 'state', mySeat: s, turn: G.turn, deck: G.deck.length, drew: G.turn === s ? G.drew : false, last: G.last, over: G.over, result: G.result || null, log: G.log.slice(0, 20), digits: setup.digits,
        players: G.players.map((q, k) => ({ name: q.name, avatar: q.avatar, color: q.color, type: k === s ? 'human' : (q.type === 'easy' || q.type === 'smart') ? q.type : 'remote', count: q.hand.length })),
        hand: p.hand, cells: G.cells.map(c => c.card ? { card: c.card, by: c.by } : null),
      });
    });
  }
  // الضيف: استقبال الحالة من المضيف
  let lastShownResult = null;
  function onHostMessage(msg) {
    if (msg.type === 'chat') { net?.comms?.addChat({ name: msg.name, text: msg.text }); return; }
    if (msg.type === 'roster') { net?.comms?.setRoster(msg.list); return; }
    if (msg.type === 'lobby') { if (net) { net.players = msg.players; if (!G || G.over) { G = null; showLobby(); } } return; }
    if (msg.type === 'notify') { if (msg.text) toast(msg.text, msg.kind || ''); if (msg.sound) sound(msg.sound); if (msg.cheer) cheer(); return; }
    if (msg.type !== 'state') return;
    const prevLast = G?.last;
    const newGame = !G || (G.over && !msg.over);
    if (newGame) { modal.current?.close?.(null); lastShownResult = null; }
    setup.digits = msg.digits || setup.digits;
    const sel = !newGame && G?.turn === msg.turn ? G.sel : null;
    G = {
      level: 1, net: { role: 'guest', mySeat: msg.mySeat }, turn: msg.turn, drew: msg.drew, last: msg.last, over: msg.over, result: msg.result, log: msg.log || [], revealed: true, lock: false,
      deck: new Array(msg.deck).fill(null), sel: sel != null && sel < msg.hand.length ? sel : null,
      players: msg.players.map((q, k) => ({ ...q, hand: k === msg.mySeat ? msg.hand : new Array(q.count).fill(null) })),
      cells: FACTS.map((f, i) => ({ ...f, idx: i, card: msg.cells[i]?.card || null, by: msg.cells[i]?.by ?? null })),
    };
    if (msg.last != null && msg.last !== prevLast && !newGame) sound('place');
    render();
    if (G.over && G.result && lastShownResult !== JSON.stringify(G.result)) { lastShownResult = JSON.stringify(G.result); showResult(G.result); }
  }
  // رسالة إلى لاعب بعينه: محلي أو عن بعد
  function notify(pi, text, kind = '', extra = {}) {
    const p = G.players[pi];
    if (p.type === 'human') { toast(text, kind); return; }
    if (p.type === 'remote' && net?.role === 'host') net.room.send(p.id, { type: 'notify', text, kind, ...extra });
  }

  function defaultName(p, i) {
    if (p.type === 'easy' || p.type === 'smart') return `${t('computer')} ${num(i + 1)}`;
    return i === 0 ? displayName(1) : `${t('player')} ${num(i + 1)}`;
  }
  function showRules() { modal(t('m_rules'), h('div', { class: 'm-rules', html: t('m_rulesText') }), [], { icon: 'info', wide: true }); }

  // ================= بدء اللعب =================
  function start() {
    store.set('mult2-setup', setup);
    const n = setup.level === 1 ? setup.count : setup.kids;
    const players = setup.players.slice(0, n).map((p, i) => ({ type: setup.level === 2 ? 'human' : p.type, name: p.name.trim() || defaultName(p, i), avatar: p.avatar, color: PCOLORS[i], hand: [] }));
    const cells = FACTS.map((f, i) => ({ ...f, idx: i, card: null, by: null }));
    if (setup.level === 1) {
      const deck = makeDeck(setup.black);
      for (let k = 0; k < setup.hand; k++) for (const p of players) p.hand.push(deck.pop());
      G = { level: 1, players, cells, deck, turn: 0, drew: false, passes: 0, sel: null, revealed: false, last: null, log: [], over: false };
    } else {
      // بطاقات الجداول المختارة فقط، بالترتيب أو مخلوطة
      let cards = [];
      // ترتيب المجموعات كما في اللوحة: 2 ثم 4 ثم 6 ثم 8 ثم 7 ثم 5 ثم 3، وداخل كل مجموعة من الأصغر إلى الأكبر
      const order = [2, 4, 6, 8, 7, 5, 3].filter(g => setup.tables.includes(g));
      for (const tb of order) for (const f of FACTS.filter(f => f.g === tb).sort((x, y) => x.p - y.p)) cards.push({ id: 'c' + f.a + 'x' + f.b, v: f.p, table: f.g });
      if (setup.order === 'shuffled') cards = shuffle(cards);
      players.forEach((p, i) => { p.hand = cards.filter((_, k) => k % players.length === i); p.mistakes = 0; });
      G = { level: 2, players, cells, deck: [], turn: 0, sel: 0, revealed: true, last: null, log: [], over: false, started: Date.now(), active: new Set(setup.tables) };
      clearInterval(tick); tick = setInterval(() => { const el = view.querySelector('.m-clock'); if (el && G && !G.over) el.textContent = clock(); }, 1000);
    }
    G.revealed = humans() <= 1;
    render(); hook();
  }
  const clock = () => { const s = Math.floor((Date.now() - G.started) / 1000); return num(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`); };
  const cur = () => G.players[G.turn];
  const humans = () => G.players.filter(p => p.type === 'human').length;
  const playable = (v) => G.cells.filter(c => !c.card && c.p === v);
  const anyPlayable = (p) => p.hand.some(c => playable(c.v).length);

  function nextTurn() {
    if (G.over) return;
    G.turn = (G.turn + 1) % G.players.length; G.sel = G.level === 2 ? 0 : null; G.drew = false;
    G.revealed = humans() <= 1 || cur().type !== 'human';
    render(); hook();
  }
  function hook() {
    clearTimeout(timer);
    if (!alive || !G || G.over) return;
    if (G.net?.role === 'guest') return;
    if (cur().type === 'easy' || cur().type === 'smart') timer = setTimeout(botTurn, 1000 + Math.random() * 600);
  }
  function addLog(s) { G.log.unshift(s); if (G.log.length > 50) G.log.pop(); }

  // وضع بطاقة على مربع
  function place(pi, cardIdx, cellIdx, fromBot = false) {
    const p = G.players[pi], card = p.hand[cardIdx], cell = G.cells[cellIdx];
    if (cell.card) { notify(pi, t('m_occupied'), true); sound('error'); return; }
    if (card.v !== cell.p) {
      // خطأ: تعود البطاقة إلى صاحبها وينتقل الدور
      sound('error'); shake(cellIdx);
      if (G.level === 2) p.mistakes++;
      if (!fromBot) notify(pi, t('m_wrong', { a: num(cell.a), b: num(cell.b), p: num(cell.p) }), true, { sound: 'error' });
      G.sel = G.level === 2 ? 0 : null;
      if (G.level === 2 && G.players.length === 1) { render(); return; }
      G.lock = true; setTimeout(() => { if (G) { G.lock = false; nextTurn(); } }, 700); render(); return;
    }
    p.hand.splice(cardIdx, 1); cell.card = card; cell.by = pi; G.last = cellIdx; G.passes = 0;
    sound('place'); if (p.type === 'human') cheer(); else if (p.type === 'remote') notify(pi, '', '', { cheer: true });
    addLog(t('m_placed', { name: p.name, v: num(card.v), a: num(cell.a), b: num(cell.b) }));
    // نهاية اللعبة
    if (G.level === 1 && G.cells.every(c => c.card)) return finish('full');
    if (G.level === 2 && p.hand.length === 0) return finish('learn', pi);
    if (G.level === 2 && G.players.length === 1) { G.sel = 0; render(); return; }
    nextTurn();
  }
  function draw(pi) {
    const p = G.players[pi];
    if (G.drew) { notify(pi, t('m_oneDraw')); return; }
    const card = G.deck.pop();
    if (!card) { // لا بطاقات: تمرير
      G.passes++;
      if (G.passes >= G.players.length && !G.players.some(anyPlayable)) return finish('blocked');
      return nextTurn();
    }
    p.hand.push(card); G.drew = true; G.passes = 0; sound('move');
    if (playable(card.v).length) {
      if (p.type === 'human' || p.type === 'remote') { notify(pi, t('m_drewPlayable', { v: num(card.v) }), 'ok'); if (p.type === 'human') G.sel = p.hand.length - 1; render(); }
      else { render(); timer = setTimeout(() => botPlace(pi), 900); }
    } else {
      notify(pi, t('m_drewNone', { v: num(card.v) }));
      G.lock = true; render(); timer = setTimeout(() => { if (!G) return; G.lock = false; nextTurn(); }, p.type === 'easy' || p.type === 'smart' ? 700 : 1200);
    }
  }
  // الكمبيوتر
  function botPlace(pi) {
    if (!alive || !G || G.over) return;
    const p = G.players[pi];
    // يقدّم البطاقة السوداء ثم الأكبر قيمة
    const opts = p.hand.map((c, k) => ({ c, k, cells: playable(c.v) })).filter(o => o.cells.length).sort((a, b) => (b.c.black - a.c.black) || (b.c.v - a.c.v));
    if (!opts.length) return nextTurn();
    let o = opts[0];
    if (p.type === 'easy') {
      // المبتدئ قد يختار بطاقة عشوائية، ويخطئ أحيانًا في المكان
      o = pick(opts);
      if (Math.random() < 0.18) { const wrong = G.cells.filter(c => !c.card && c.p !== o.c.v); if (wrong.length) return place(pi, o.k, pick(wrong).idx, true); }
    }
    place(pi, o.k, pick(o.cells).idx, true);
  }
  function botTurn() {
    if (!alive || !G || G.over || !['easy', 'smart'].includes(cur().type)) return;
    const pi = G.turn, p = cur();
    if (anyPlayable(p) && !(p.type === 'easy' && Math.random() < 0.1)) return botPlace(pi);
    draw(pi);
  }

  function finish(reason, winnerIdx) {
    G.over = true; clearTimeout(timer); clearInterval(tick);
    render();
    if (G.level === 2) {
      const secs = Math.floor((Date.now() - G.started) / 1000);
      confetti(); sound('win');
      const p = G.players[winnerIdx];
      const stars = p.mistakes === 0 ? 3 : p.mistakes <= 2 ? 2 : 1;
      const body = h('div', { class: 'center' },
        h('div', { class: 'm-stars' }, '⭐'.repeat(stars) + '☆'.repeat(3 - stars)),
        h('p', { class: 'm-champ' }, G.players.length > 1 ? t('m_learnWinner', { name: `${p.avatar} ${p.name}` }) : t('m_learnDone')),
        h('p', {}, `${t('m_time')}: ${num(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`)} · ${t('m_mistakes')}: ${G.players.map(x => num(x.mistakes)).join(' / ')}`));
      return modal(t('m_gameOver'), body, [{ label: t('m_settingsBtn'), kind: 'ghost', value: 'setup' }, { label: t('m_playAgain'), value: 'again', icon: 'refresh-cw' }], { icon: 'trophy', dismissible: false })
        .then(v => { if (!alive) return; v === 'again' ? start() : showSetup(); });
    }
    const res = G.players.map((p, i) => ({ i, p, sum: p.hand.reduce((s, c) => s + c.v, 0) })).sort((a, b) => a.sum - b.sum);
    const best = res[0].sum, winners = res.filter(r => r.sum === best);
    winners.forEach(w => { wins[w.p.name] = (wins[w.p.name] || 0) + 1; }); store.set('mult2-wins', wins);
    G.result = { reason, best, winners: winners.map(w => w.i), ranking: res.map(r => ({ i: r.i, name: r.p.name, avatar: r.p.avatar, color: r.p.color, sum: r.sum, cards: r.p.hand, wins: wins[r.p.name] || 0 })) };
    render();
    showResult(G.result);
  }
  function showResult(R) {
    const mySeat = G.net ? G.net.mySeat : null;
    const localWin = R.winners.some(i => mySeat != null ? i === mySeat : G.players[i]?.type === 'human');
    sound(localWin || (!G.net && humans() === 0) ? 'win' : 'lose'); if (localWin) confetti();
    const medals = ['🥇', '🥈', '🥉', '4'];
    let rank = 0, prev = null;
    const table = h('div', { class: 'm-podium' }, R.ranking.map((r, k) => {
      if (r.sum !== prev) { rank = k; prev = r.sum; }
      return h('div', { class: 'm-prank' + (r.sum === R.best ? ' win' : ''), style: { '--pc': r.color } },
        h('span', { class: 'm-medal' }, medals[rank]), h('span', { class: 'm-pav' }, r.avatar),
        h('div', { class: 'grow' }, h('b', {}, r.name, mySeat === r.i ? ` (${t('m_you')})` : ''), h('div', { class: 'm-mini' }, r.cards.length ? r.cards.map(c => cardEl(c, { mini: true })) : h('small', { class: 'muted' }, '—'))),
        h('div', { class: 'm-sum' }, h('small', {}, t('m_sum')), h('b', {}, num(r.sum))),
        h('div', { class: 'm-sum' }, h('small', {}, t('m_wins')), h('b', {}, num(r.wins))));
    }));
    const wn = R.winners.map(i => R.ranking.find(r => r.i === i));
    const body = h('div', {},
      h('p', { class: 'm-roundmsg' }, R.reason === 'full' ? t('m_boardFull') : t('m_blocked')),
      h('p', { class: 'm-champ' }, wn.length > 1 ? t('m_tie', { names: wn.map(w => w.name).join(settings.lang === 'ar' ? ' و' : ', ') }) : t('m_winner', { name: `${wn[0].avatar} ${wn[0].name}` })),
      table);
    const guest = G.net?.role === 'guest';
    const actions = guest ? [{ label: t('m_close'), kind: 'ghost', value: 'close' }]
      : [{ label: t('m_settingsBtn'), kind: 'ghost', value: 'setup' }, { label: t('m_playAgain'), value: 'again', icon: 'refresh-cw' }];
    if (guest) body.append(h('p', { class: 'muted center' }, t('m_hostOnly')));
    modal(t('m_gameOver'), body, actions, { icon: 'trophy', dismissible: guest, wide: true })
      .then(v => {
        if (!alive) return;
        if (G?.net?.role === 'host') { if (v === 'again') startOnline(); else if (v === 'setup') { G.over = true; G = null; showLobby(); } return; }
        if (guest) return;
        v === 'again' ? start() : showSetup();
      });
  }

  // ================= التفاعل =================
  function onCell(idx) {
    if (!G || G.over || G.lock) return;
    if (G.net && G.turn !== G.net.mySeat) { toast(t('m_waitTurn', { name: cur().name })); return; }
    if (cur().type !== 'human' || !G.revealed) return;
    if (G.sel == null) { toast(t('m_pickCard')); return; }
    if (G.net?.role === 'guest') { if (G.cells[idx].card) { toast(t('m_occupied'), true); return; } net.room.send({ type: 'action', act: 'place', cardIdx: G.sel, cellIdx: idx }); G.lock = true; setTimeout(() => { if (G) G.lock = false; }, 3000); return; }
    place(G.turn, G.sel, idx);
  }
  function doDraw() {
    if (!G || G.over || G.lock) return;
    if (G.net && G.turn !== G.net.mySeat) { toast(t('m_waitTurn', { name: cur().name })); return; }
    if (G.net?.role === 'guest') { net.room.send({ type: 'action', act: 'draw' }); G.lock = true; setTimeout(() => { if (G) G.lock = false; }, 3000); return; }
    draw(G.turn);
  }
  function selectCard(k) { if (!G || G.over) return; G.sel = G.sel === k && G.level === 1 ? null : k; sound('move'); render(); }

  // ================= العرض =================
  function cardEl(c, { mini = false, selected = false, onclick = null, back = false } = {}) {
    if (back) return h('span', { class: 'm-card back' });
    const color = c.black ? '#1f2937' : TABLE_COLORS[c.table];
    return h(onclick ? 'button' : 'span', { type: onclick ? 'button' : null, class: 'm-card' + (mini ? ' mini' : '') + (selected ? ' sel' : '') + (c.black ? ' black' : ''), style: { '--cc': color }, onclick },
      h('span', { class: 'c tl' }, AR(c.v)), h('span', { class: 'v' }, num(c.v)), h('span', { class: 'c br' }, String(c.v)));
  }
  function boardEl(G0, preview = false) {
    const mode = setup.digits;
    const helperVal = G0 && setup.helper && G0.sel != null && cur()?.type === 'human' && G0.revealed ? G0.players[G0.turn].hand[G0.sel]?.v : null;
    return h('div', { class: 'mboard' + (preview ? ' preview' : ' live') }, FACTS.map((f, i) => {
      const cell = G0?.cells[i];
      const op = (side) => h('span', { class: 'op ' + side, dir: 'ltr' }, `${sideNum(f.a, side, mode)} × ${sideNum(f.b, side, mode)}`);
      const cls = ['mcell'];
      if (cell?.card) cls.push('filled');
      if (G0 && G0.last === i) cls.push('last');
      if (helperVal != null && !cell?.card && f.p === helperVal) cls.push('hint');
      if (G0?.level === 2 && setup.helper && !G0.active.has(f.g)) cls.push('dim');
      const el = h('div', { class: cls.join(' '), style: { '--tc': TABLE_COLORS[f.g] }, 'data-i': i, 'data-g': f.g, 'data-row': Math.floor(i / 6), onclick: preview ? null : () => onCell(i) },
        op('b'), op('t'), op('l'), op('r'),
        h('div', { class: 'slot' }, cell?.card ? cardEl(cell.card, { mini: true }) : h('span', { class: 'fruit' }, FRUITS[i % FRUITS.length])));
      return el;
    }));
  }
  function shake(i) { const el = view.querySelector(`.mcell[data-i="${i}"]`); if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); } }
  function cheer() {
    const el = view.querySelector('.m-cheer'); if (!el) return;
    const g = t('m_great'); el.textContent = Array.isArray(g) ? pick(g) : g; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }

  const SEATS = { 1: ['bottom'], 2: ['bottom', 'top'], 3: ['bottom', 'right', 'top'], 4: ['bottom', 'right', 'top', 'left'] };
  function render() {
    if (!alive || !G) return;
    view.innerHTML = '';
    const seats = SEATS[G.players.length];
    const me = G.net ? G.players[G.net.mySeat] : cur();
    const myTurn = !G.net || G.turn === G.net.mySeat;
    const filled = G.cells.filter(c => c.card).length;
    const nP = G.players.length, rel = (i) => G.net ? (i - G.net.mySeat + nP) % nP : i;
    const seatEls = G.players.map((p, i) => h('div', { class: `m-seat ${seats[rel(i)]}` + (i === G.turn && !G.over ? ' active' : ''), style: { '--pc': p.color } },
      h('span', { class: 'm-seat-av' }, p.avatar),
      h('div', {}, h('div', { class: 'm-seat-name' }, p.name, p.type === 'remote' ? h('span', { class: 'm-bot' }, ico('globe', 13)) : p.type !== 'human' ? h('span', { class: 'm-bot' }, ico('bot', 13)) : null),
        h('div', { class: 'm-backs' }, p.hand.slice(0, 12).map(() => cardEl(null, { back: true })), h('small', {}, num(p.hand.length))))));
    // يد اللاعب
    const handBox = h('div', { class: 'm-hand' });
    if (!G.over && me.type === 'human') {
      if (!G.revealed) {
        handBox.append(h('div', { class: 'm-reveal' }, h('span', { class: 'm-big-av' }, me.avatar), h('b', {}, t('m_reveal', { name: me.name })), h('small', { class: 'muted' }, t('m_revealHint')),
          h('button', { class: 'btn', type: 'button', onclick: () => { G.revealed = true; render(); } }, ico('eye', 18), t('m_revealBtn'))));
      } else {
        const cards = G.level === 2 && G.players.length === 1 && setup.order === 'ordered' ? me.hand.slice(0, 1) : me.hand;
        handBox.append(
          h('div', { class: 'm-hand-head' + (myTurn ? ' my' : '') }, h('span', { class: 'm-big-av sm' }, me.avatar), h('b', {}, G.net ? (myTurn ? t('m_yourTurn') : t('m_waitTurn', { name: cur().name })) : t('m_turnOf', { name: me.name })), h('span', { class: 'muted grow' }, myTurn ? t('m_pickCard') : '')),
          h('div', { class: 'm-cards' }, cards.map((c) => { const k = me.hand.indexOf(c); return cardEl(c, { selected: G.sel === k, onclick: () => selectCard(k) }); })),
          G.level === 1 ? h('div', { class: 'row m-actions' },
            h('button', { class: 'btn accent', type: 'button', disabled: G.drew || !myTurn, onclick: doDraw }, ico('layers', 18), G.deck.length ? t('m_draw') : t('m_pass'))) : '');
      }
    } else if (!G.over) handBox.append(h('div', { class: 'm-reveal' }, h('span', { class: 'm-big-av thinking' }, me.avatar), h('b', {}, t('m_turnOf', { name: me.name }), ' …')));
    view.append(
      h('div', { class: 'm-top row no-print' },
        G.level === 1 ? h('span', { class: 'tag' }, ico('layers', 13), ' ', t('m_deck'), ': ', num(G.deck.length)) : h('span', { class: 'tag m-clock' }, clock()),
        h('span', { class: 'tag' }, t('m_filled'), ': ', num(filled), ' / ', num(36)),
        h('div', { class: 'm-progress grow' }, h('i', { style: { width: (filled / 36 * 100) + '%' } })),
        h('button', { class: 'btn ghost sm', type: 'button', onclick: showRules }, ico('info', 16), t('m_rules')),
        G.net ? h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { clearTimeout(timer); closeNet(); G = null; showSetup(); } }, ico('log-out', 16), t('m_leave'))
          : h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { clearTimeout(timer); showSetup(); } }, ico('settings', 16), t('m_settingsBtn'))),
      h('div', { class: 'm-table-area n' + G.players.length }, seatEls, h('div', { class: 'm-boardwrap' }, boardEl(G), h('div', { class: 'm-cheer' }))),
      handBox,
      G.log.length ? h('details', { class: 'panel m-log' }, h('summary', {}, t('m_log')), h('ul', {}, G.log.map(s => h('li', {}, s)))) : '');
    broadcastState();
  }

  // احتفال بسيط
  function confetti() {
    const box = h('div', { class: 'm-confetti' }); document.body.append(box);
    const colors = Object.values(TABLE_COLORS);
    for (let i = 0; i < 90; i++) box.append(h('i', { style: { left: Math.random() * 100 + 'vw', background: pick(colors), animationDelay: Math.random() * 0.6 + 's', animationDuration: 1.8 + Math.random() * 1.4 + 's', transform: `rotate(${Math.random() * 360}deg)` } }));
    setTimeout(() => box.remove(), 4000);
  }

  // ================= الطباعة =================
  function printSheet() {
    document.querySelector('.m-print')?.remove();
    const deck = makeDeck(14).sort((a, b) => (a.black - b.black) || (a.table || 0) - (b.table || 0) || a.v - b.v);
    const sheet = h('div', { class: 'm-print' },
      h('section', { class: 'pp' }, h('div', { class: 'pp-title' }, `${t('siteName')} — ${tr({ ar: 'لوحة جدول الضرب', en: 'Times Tables Board' })}`), boardEl(null, true)),
      h('section', { class: 'pp' }, h('div', { class: 'pp-title' }, tr({ ar: 'البطاقات — قصّها على الخطوط', en: 'Cards — cut along the lines' })),
        h('div', { class: 'pcards' }, deck.map(c => h('div', { class: 'pcard' + (c.black ? ' black' : ''), style: { '--cc': c.black ? '#1f2937' : TABLE_COLORS[c.table] } },
          h('span', { class: 'c tl' }, AR(c.v)), h('span', { class: 'c tr' }, String(c.v)), h('span', { class: 'v' }, num(c.v)), h('span', { class: 'c bl' }, String(c.v)), h('span', { class: 'c br' }, AR(c.v)))))),
      h('section', { class: 'pp' }, h('div', { class: 'pp-title' }, t('m_rules')), h('div', { class: 'm-rules', html: t('m_rulesText') })));
    document.body.append(sheet); document.body.classList.add('m-printing');
    const done = () => { document.body.classList.remove('m-printing'); sheet.remove(); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    try { window.print(); } catch { }
    setTimeout(() => { if (document.body.classList.contains('m-printing') && !matchMedia('print').matches) done(); }, 1500);
  }

  { const m = /^multiplication-join-(\d{6})$/.exec(location.hash.slice(1)); if (m) { setup.level = 3; setup.onlineTab = 'join'; setup.joinCode = m[1]; } }
  showSetup();
  return {
    unmount() { alive = false; closeNet(); clearTimeout(timer); clearInterval(tick); document.querySelector('.m-print')?.remove(); },
    onLang() { if (G && !G.over) render(); else if (net) showLobby(); else showSetup(); },
    onHash(hash) { const m = /^multiplication-join-(\d{6})$/.exec(hash); if (m && !net && !(G && !G.over)) { setup.level = 3; setup.onlineTab = 'join'; setup.joinCode = m[1]; showSetup(); } },
  };
}
