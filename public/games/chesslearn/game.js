// أكاديمية الشطرنج: دروس منظمة، تمارين تفاعلية، ألغاز، واختبارات
import { Chess } from '../../vendor/chess.js';
import { h, ico, t, tr, addDict, settings, num, toast, sound, store, modal } from '../../assets/js/core.js';
import { Board } from '../chess/board.js';
import { Engine } from '../chess/engine.js';
import { MODULES } from './content.js';
import { movesAr } from '../chess/coach.js';

if (!document.getElementById('chess-css')) document.head.append(h('link', { id: 'chess-css', rel: 'stylesheet', href: new URL('../chess/chess.css', import.meta.url).href }));
if (!document.getElementById('academy-css')) document.head.append(h('link', { id: 'academy-css', rel: 'stylesheet', href: new URL('./academy.css', import.meta.url).href }));

addDict({
  ar: {
    a_title: 'أكاديمية الشطرنج', a_sub: 'تعلّم الشطرنج خطوة بخطوة: من حركة القطع إلى الخطط والافتتاحيات والألغاز.', a_progress: 'تقدّمك', a_lessons: 'درس', a_back: 'رجوع', a_home: 'الأكاديمية',
    a_next: 'التالي', a_prev: 'السابق', a_finish: 'إنهاء الدرس', a_step: 'الخطوة {i} من {n}', a_done: 'أُنجز', a_start: 'ابدأ', a_review: 'مراجعة',
    a_wellDone: 'أحسنت!', a_starsDone: 'جمعت كل النجوم في {n}.', a_tryAgain: 'ليست هذه النقلة المطلوبة، حاول مرة أخرى.', a_hint: 'تلميح', a_solution: 'أظهر الحل', a_solved: 'أحسنت! حللت التمرين.',
    a_yourTurn: 'دورك', a_white: 'تلعب بالأبيض', a_black: 'تلعب بالأسود', a_correct: 'إجابة صحيحة!', a_wrong: 'إجابة غير صحيحة.', a_restart: 'أعد المحاولة', a_undo: 'تراجع',
    a_goalMate: 'الهدف: كش مات', a_goalPromote: 'الهدف: ترقية البيدق', a_movesLeft: 'النقلات المتبقية: {n}', a_failed: 'لم يتحقق الهدف هذه المرة. أعد المحاولة.', a_goalDone: 'أحسنت! حققت الهدف.',
    a_lessonDone: 'أنهيت الدرس!', a_nextLesson: 'الدرس التالي', a_toModule: 'العودة إلى الوحدة', a_quizScore: 'نتيجتك: {s} من {n}',
    a_demoHint: 'استخدم الأزرار لمتابعة النقلات وشرحها.', a_demoStart: 'الموضع الابتدائي',
    p_title: 'الألغاز', p_level: 'المستوى', p_auto: 'حسب تقييمي', p_l1: 'مبتدئ', p_l2: 'متوسط', p_l3: 'متقدم', p_l4: 'خبير', p_rating: 'تقييمك في الألغاز', p_puzzleRating: 'تقييم اللغز',
    p_solved: 'محلولة', p_streak: 'سلسلة صحيحة', p_findw: 'جد أفضل نقلة للأبيض.', p_findb: 'جد أفضل نقلة للأسود.', p_correct: 'صحيح! تابع.', p_success: 'أحسنت! حللت اللغز.', p_fail: 'ليست هذه النقلة. يمكنك المحاولة مرة أخرى أو مشاهدة الحل.',
    p_next: 'اللغز التالي', p_retry: 'حاول مرة أخرى', p_mateIn: 'كش مات في {n}', p_source: 'الألغاز من قاعدة ألغاز Lichess المفتوحة.', p_all: 'حللت كل ألغاز هذا المستوى! اختر مستوى آخر.',
  },
  en: {
    a_title: 'Chess Academy', a_sub: 'Learn chess step by step: from how pieces move to plans, openings and puzzles.', a_progress: 'Your progress', a_lessons: 'lessons', a_back: 'Back', a_home: 'Academy',
    a_next: 'Next', a_prev: 'Previous', a_finish: 'Finish lesson', a_step: 'Step {i} of {n}', a_done: 'Done', a_start: 'Start', a_review: 'Review',
    a_wellDone: 'Well done!', a_starsDone: 'You collected every star in {n} moves.', a_tryAgain: 'That is not the move we are looking for — try again.', a_hint: 'Hint', a_solution: 'Show solution', a_solved: 'Well done! Exercise solved.',
    a_yourTurn: 'Your move', a_white: 'You play White', a_black: 'You play Black', a_correct: 'Correct!', a_wrong: 'Not correct.', a_restart: 'Try again', a_undo: 'Undo',
    a_goalMate: 'Goal: checkmate', a_goalPromote: 'Goal: promote the pawn', a_movesLeft: 'Moves left: {n}', a_failed: 'Goal not reached this time. Try again.', a_goalDone: 'Well done! Goal reached.',
    a_lessonDone: 'Lesson complete!', a_nextLesson: 'Next lesson', a_toModule: 'Back to the unit', a_quizScore: 'Your score: {s} of {n}',
    a_demoHint: 'Use the buttons to step through the moves and their explanations.', a_demoStart: 'Starting position',
    p_title: 'Puzzles', p_level: 'Level', p_auto: 'My rating', p_l1: 'Beginner', p_l2: 'Intermediate', p_l3: 'Advanced', p_l4: 'Expert', p_rating: 'Your puzzle rating', p_puzzleRating: 'Puzzle rating',
    p_solved: 'Solved', p_streak: 'Streak', p_findw: 'Find the best move for White.', p_findb: 'Find the best move for Black.', p_correct: 'Correct! Keep going.', p_success: 'Well done! Puzzle solved.', p_fail: 'Not the move. Try again or view the solution.',
    p_next: 'Next puzzle', p_retry: 'Try again', p_mateIn: 'Mate in {n}', p_source: 'Puzzles from the open Lichess puzzle database.', p_all: 'You have solved every puzzle at this level! Pick another level.',
  },
});

const FILES = 'abcdefgh';
const sqIdx = (sq) => [FILES.indexOf(sq[0]), +sq[1] - 1];
const sqName = (f, r) => FILES[f] + (r + 1);
const mvTry = (c, u) => { try { return c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || 'q' }); } catch { return null; } };

// حركة قطعة منفردة على رقعة بلا ملوك (لدروس النجوم)
function soloTargets(piece, from, blockers) {
  const [f, r] = sqIdx(from); const out = []; const occ = (x, y) => blockers[sqName(x, y)];
  const ray = (dx, dy, max = 8) => { for (let k = 1; k <= max; k++) { const x = f + dx * k, y = r + dy * k; if (x < 0 || x > 7 || y < 0 || y > 7 || occ(x, y)) break; out.push(sqName(x, y)); } };
  const t = piece[1];
  if (t === 'R' || t === 'Q') [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => ray(a, b));
  if (t === 'B' || t === 'Q') [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([a, b]) => ray(a, b));
  if (t === 'K') [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([a, b]) => ray(a, b, 1));
  if (t === 'N') [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].forEach(([a, b]) => { const x = f + a, y = r + b; if (x >= 0 && x < 8 && y >= 0 && y < 8 && !occ(x, y)) out.push(sqName(x, y)); });
  if (t === 'P') { if (r < 7 && !occ(f, r + 1)) { out.push(sqName(f, r + 1)); if (r === 1 && !occ(f, r + 2)) out.push(sqName(f, r + 2)); } }
  return out;
}

export async function mount(root, ctx) {
  let progress = store.get('academy-progress', {});
  const saveProgress = () => store.set('academy-progress', progress);
  const view = h('div', { class: 'academy' }); root.append(view);
  let board = null, engine = null, timers = [], cleanup = null;
  let nav = { screen: 'home' };
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const reset = () => { timers.forEach(clearTimeout); timers = []; board?.destroy(); board = null; cleanup?.(); cleanup = null; };
  const getEngine = () => (engine ||= new Engine());

  const lessonCount = (m) => m.special === 'puzzles' ? 0 : m.lessons.length;
  const doneCount = (m) => m.lessons.filter(l => progress[l.id]).length;

  // ---------- الصفحة الرئيسية ----------
  function home() {
    reset(); nav = { screen: 'home' }; view.innerHTML = '';
    const total = MODULES.reduce((s, m) => s + lessonCount(m), 0), done = MODULES.reduce((s, m) => s + doneCount(m), 0);
    const pct = total ? Math.round(100 * done / total) : 0;
    view.append(
      h('div', { class: 'panel ac-hero' }, h('div', { class: 'grow' }, h('h2', {}, ico('crown', 24), ' ', t('a_title')), h('p', { class: 'muted' }, t('a_sub'))),
        h('div', { class: 'ac-ring', style: { '--p': pct } }, h('b', {}, num(pct) + '٪'), h('small', {}, t('a_progress')))),
      h('div', { class: 'ac-grid' }, MODULES.map(m => {
        const n = lessonCount(m), d = doneCount(m);
        const pz = m.special === 'puzzles' ? store.get('puzzle-stats', { solved: 0 }) : null;
        return h('button', { type: 'button', class: 'ac-card', onclick: () => m.special === 'puzzles' ? puzzles() : moduleView(m) },
          h('span', { class: 'ac-ic', style: { background: m.color } }, ico(m.icon, 30)),
          h('b', {}, tr(m.title)), h('small', { class: 'muted' }, tr(m.desc)),
          pz ? h('span', { class: 'ac-meta' }, `${t('p_solved')}: ${num(pz.solved || 0)}`)
            : h('span', { class: 'ac-meta' }, h('span', { class: 'ac-bar' }, h('i', { style: { width: (n ? 100 * d / n : 0) + '%' } })), `${num(d)}/${num(n)}`));
      })));
  }

  // ---------- صفحة الوحدة ----------
  function moduleView(m) {
    reset(); nav = { screen: 'module', m }; view.innerHTML = '';
    view.append(h('div', { class: 'ac-top' }, h('button', { class: 'btn ghost sm', type: 'button', onclick: home }, ico('chevron-right', 16), t('a_home')),
      h('span', { class: 'ac-ic sm', style: { background: m.color } }, ico(m.icon, 20)), h('h2', {}, tr(m.title))),
      h('div', { class: 'ac-lessons' }, m.lessons.map((l, i) => h('button', { type: 'button', class: 'ac-lesson' + (progress[l.id] ? ' done' : ''), onclick: () => lessonView(m, i) },
        h('span', { class: 'ac-num' }, progress[l.id] ? ico('check', 18) : num(i + 1)),
        h('span', { class: 'grow' }, h('b', {}, tr(l.title)), h('small', { class: 'muted' }, `${num(l.steps.length)} ${settings.lang === 'en' ? 'steps' : 'خطوات'}`)),
        h('span', { class: 'btn sm' + (progress[l.id] ? ' ghost' : '') }, progress[l.id] ? t('a_review') : t('a_start'))))));
  }

  // ---------- مشغّل الدروس ----------
  function lessonView(m, li) {
    reset(); nav = { screen: 'lesson', m, li };
    const lesson = m.lessons[li];
    let si = 0; const solved = new Set(); let quizScore = 0; const answered = new Map();
    view.innerHTML = '';
    const head = h('div', { class: 'ac-top' }, h('button', { class: 'btn ghost sm', type: 'button', onclick: home }, ico('house', 16), t('a_home')), h('button', { class: 'btn ghost sm', type: 'button', onclick: () => moduleView(m) }, ico('chevron-right', 16), tr(m.title)), h('h2', {}, tr(lesson.title)));
    const boardBox = h('div', { class: 'ac-board' });
    const panel = h('div', { class: 'panel ac-panel' });
    view.append(head, h('div', { class: 'c-layout' }, h('div', { class: 'c-left' }, boardBox), h('div', { class: 'c-side' }, panel)));

    const needsSolve = (s) => ['stars', 'task', 'play', 'quiz'].includes(s.type);
    function renderStep() {
      timers.forEach(clearTimeout); timers = []; cleanup?.(); cleanup = null;
      const s = lesson.steps[si];
      board?.destroy(); board = new Board({ orientation: s.orientation || 'w' });
      boardBox.innerHTML = ''; boardBox.append(board.el);
      panel.innerHTML = '';
      const dots = h('div', { class: 'ac-dots' }, lesson.steps.map((_, k) => h('span', { class: (k === si ? 'on ' : '') + (k < si || solved.has(k) ? 'ok' : '') })));
      const text = h('div', { class: 'ac-text' }, s.text ? tr(s.text) : (s.q ? tr(s.q) : ''));
      const feedback = h('div', { class: 'ac-feedback' });
      const extra = h('div', { class: 'ac-extra' });
      const nextBtn = h('button', { class: 'btn', type: 'button', onclick: next }, si === lesson.steps.length - 1 ? t('a_finish') : t('a_next'), ico(settings.lang === 'ar' ? 'chevron-left' : 'chevron-right', 16));
      const prevBtn = h('button', { class: 'btn ghost', type: 'button', disabled: si === 0, onclick: () => { si--; renderStep(); } }, t('a_prev'));
      const setDone = () => { solved.add(si); nextBtn.disabled = false; dots.children[si].classList.add('ok'); };
      nextBtn.disabled = needsSolve(s) && !solved.has(si);
      panel.append(h('div', { class: 'row' }, h('small', { class: 'muted grow' }, t('a_step', { i: num(si + 1), n: num(lesson.steps.length) })), dots), text, extra, feedback, h('div', { class: 'row ac-navbtns' }, prevBtn, h('span', { class: 'grow' }), nextBtn));
      const ok = (msg) => { feedback.className = 'ac-feedback ok'; feedback.textContent = msg; };
      const bad = (msg) => { feedback.className = 'ac-feedback bad'; feedback.textContent = msg; };
      const arrowsOf = (a) => (a || []).map(([from, to, color]) => ({ from, to, color: color || '#16a34a' }));

      if (s.type === 'info') {
        board.setPosition(s.fen ? new Chess(s.fen) : s.pieces); board.setArrows(arrowsOf(s.arrows)); board.setMarks(s.marks || {});
      }
      else if (s.type === 'quiz') {
        if (s.fen || s.pieces) { board.setPosition(s.fen ? new Chess(s.fen) : s.pieces); board.setMarks(s.marks || {}); } else boardBox.innerHTML = '';
        const prev = answered.get(si);
        const opts = h('div', { class: 'ac-options' }, s.options.map((o, k) => h('button', { type: 'button', class: 'ac-opt', 'data-k': k, onclick: () => {
          if (answered.has(si)) return;
          answered.set(si, k);
          const right = k === s.answer; if (right) quizScore++;
          sound(right ? 'notify' : 'error');
          mark(k);
        } }, tr(o))));
        const mark = (k) => {
          opts.querySelectorAll('.ac-opt').forEach(b => { const kk = +b.dataset.k; b.classList.toggle('right', kk === s.answer); b.classList.toggle('wrong', kk === k && k !== s.answer); b.disabled = true; });
          if (k === s.answer) ok(t('a_correct') + ' ' + tr(s.explain)); else bad(t('a_wrong') + ' ' + tr(s.explain));
          setDone();
        };
        extra.append(opts);
        if (prev != null) mark(prev);
      }
      else if (s.type === 'demo') {
        const c = new Chess(s.fen); let p = 0;
        const note = h('div', { class: 'ac-note' });
        const show = () => {
          const cc = new Chess(s.fen); let last = null; for (let k = 0; k < p; k++) last = mvTry(cc, s.moves[k][0]);
          board.setPosition(cc); board.setLast(last);
          const nxt = s.moves[p]; board.setArrows(nxt ? [{ from: nxt[0].slice(0, 2), to: nxt[0].slice(2, 4), color: '#2563eb', opacity: '0.45' }] : []);
          note.innerHTML = '';
          if (p === 0) note.append(h('small', { class: 'muted' }, t('a_demoStart'), ' — ', t('a_demoHint')));
          else note.append(h('b', { dir: 'ltr' }, last.color === 'w' ? `${cc.moveNumber()}. ${last.san}` : `${cc.moveNumber() - 1}... ${last.san}`), ' — ', tr(s.moves[p - 1][1]));
          if (p >= s.moves.length) setDone();
          stepBtns.querySelector('.prev').disabled = p === 0; stepBtns.querySelector('.nxt').disabled = p >= s.moves.length;
          if (last) sound(last.captured ? 'capture' : 'move');
        };
        const stepBtns = h('div', { class: 'row', dir: 'ltr', style: { justifyContent: 'center' } },
          h('button', { class: 'btn ghost sm prev', type: 'button', onclick: () => { if (p > 0) { p--; show(); } } }, '◀'),
          h('button', { class: 'btn sm nxt', type: 'button', onclick: () => { if (p < s.moves.length) { p++; show(); } } }, '▶'));
        extra.append(note, stepBtns);
        solved.add(si); nextBtn.disabled = false; // العرض لا يتطلب حلًّا
        show();
      }
      else if (s.type === 'stars') {
        let pos = s.from, moves = 0; const stars = new Set(s.stars);
        const draw = () => {
          board.setPosition({ ...(s.blockers || {}), [pos]: s.piece });
          const mk = {}; stars.forEach(x => mk[x] = 'star'); board.setMarks(mk);
        };
        board.o.canMove = (sq) => sq === pos && stars.size > 0;
        board.o.legalTargets = (sq) => soloTargets(s.piece, sq, s.blockers || {});
        board.o.onMove = ({ to }) => {
          pos = to; moves++; sound('move');
          if (stars.delete(to)) sound('notify');
          draw();
          if (!stars.size) { ok(`${t('a_wellDone')} ${t('a_starsDone', { n: settings.lang === 'en' ? moves : movesAr(moves) })}`); setDone(); }
        };
        extra.append(h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { pos = s.from; moves = 0; s.stars.forEach(x => stars.add(x)); feedback.textContent = ''; feedback.className = 'ac-feedback'; draw(); } }, ico('rotate-ccw', 15), t('a_restart')));
        draw();
      }
      else if (s.type === 'task') runTask(s, { board, ok, bad, extra, setDone, feedback });
      else if (s.type === 'play') runPlay(s, { board, ok, bad, extra, setDone, feedback });
    }

    function next() {
      if (si < lesson.steps.length - 1) { si++; renderStep(); return; }
      progress[lesson.id] = true; saveProgress(); sound('win');
      const quizSteps = lesson.steps.filter(s => s.type === 'quiz').length;
      const hasNext = li < m.lessons.length - 1;
      modal(t('a_lessonDone'), h('div', { class: 'center' }, h('div', { class: 'ac-trophy' }, '🏆'), h('p', {}, tr(lesson.title)), lesson.quiz || quizSteps > 1 ? h('p', { class: 'm-champ' }, t('a_quizScore', { s: num(quizScore), n: num(quizSteps) })) : null),
        [{ label: t('a_toModule'), kind: 'ghost', value: 'module' }, ...(hasNext ? [{ label: t('a_nextLesson'), value: 'next', icon: 'play' }] : [])], { icon: 'trophy' })
        .then(v => { if (v === 'next') lessonView(m, li + 1); else moduleView(m); });
    }
    renderStep();
  }

  // ---------- التمرين: نقلات محددة ----------
  function runTask(s, { board, ok, bad, extra, setDone, feedback }) {
    const chess = new Chess(s.fen);
    const player = s.firstByOpponent ? (chess.turn() === 'w' ? 'b' : 'w') : chess.turn();
    board.setOrientation(s.orientation || player);
    let idx = 0, busy = false, fails = 0, finished = false;
    const isPlayerIdx = (i) => s.firstByOpponent ? i % 2 === 1 : i % 2 === 0;
    const refresh = (last) => { board.setPosition(chess); board.setLast(last); };
    const expected = () => { const e = s.solution[idx]; return Array.isArray(e) ? e : [e]; };
    const done = () => { finished = true; ok(t('a_solved')); sound('win'); setDone(); board.setArrows([]); board.setMarks({}); };
    async function opponent() {
      if (idx >= s.solution.length) return done();
      busy = true;
      let u = s.solution[idx];
      if (u === '*') { try { u = await getEngine().bestMove(chess.fen(), 'hard'); } catch { u = chess.moves({ verbose: true })[0]; u = u.from + u.to; } }
      later(() => { const m = mvTry(chess, u); idx++; refresh(m); if (m) sound(m.captured ? 'capture' : 'move'); busy = false; if (idx >= s.solution.length) done(); }, 450);
    }
    board.o.canMove = (sq) => !busy && !finished && chess.turn() === player && chess.get(sq)?.color === player;
    board.o.legalTargets = (sq) => chess.moves({ square: sq, verbose: true }).map(m => m.to);
    board.o.onMove = ({ from, to }) => {
      const exp = expected();
      const match = exp.find(e => e.slice(0, 4) === from + to);
      const promo = match ? (match[4] || 'q') : 'q';
      const test = new Chess(chess.fen()); const tm = mvTry(test, from + to + promo);
      const isLast = idx === s.solution.length - 1;
      if (match || (s.acceptMate && isLast && test.isCheckmate())) {
        const m = mvTry(chess, from + to + promo); idx++; refresh(m); sound(m.captured ? 'capture' : chess.inCheck() ? 'check' : 'move');
        board.setArrows([]); board.setMarks({});
        if (idx >= s.solution.length) return done();
        ok(t('a_correct')); return opponent();
      }
      fails++; sound('error'); board.setPosition(chess); board.flash(to);
      bad(t('a_tryAgain'));
      if (fails >= 2) hintBtn.disabled = false;
      void tm;
    };
    const hintBtn = h('button', { class: 'btn ghost sm', type: 'button', disabled: !s.drill, onclick: () => { const e = expected()[0]; board.setMarks({ [e.slice(0, 2)]: 'hint' }); } }, ico('lightbulb', 15), t('a_hint'));
    const solBtn = h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { const e = expected()[0]; board.setArrows([{ from: e.slice(0, 2), to: e.slice(2, 4), color: '#16a34a' }]); } }, ico('eye', 15), t('a_solution'));
    const resetBtn = h('button', { class: 'btn ghost sm', type: 'button', onclick: () => renderAgain() }, ico('rotate-ccw', 15), t('a_restart'));
    const renderAgain = () => { chess.load(s.fen); idx = 0; finished = false; busy = false; fails = 0; feedback.textContent = ''; feedback.className = 'ac-feedback'; refresh(null); board.setArrows([]); board.setMarks({}); if (s.firstByOpponent) opponent(); };
    extra.append(h('div', { class: 'ac-sidehint' }, h('span', { class: 'c-dot ' + player }), ' ', player === 'w' ? t('a_white') : t('a_black')), h('div', { class: 'row' }, hintBtn, solBtn, resetBtn));
    refresh(null);
    if (s.firstByOpponent) opponent();
  }

  // ---------- اللعب ضد الكمبيوتر حتى تحقيق الهدف ----------
  function runPlay(s, { board, ok, bad, extra, setDone, feedback }) {
    const chess = new Chess(s.fen); const player = chess.turn();
    board.setOrientation(player);
    let busy = false, finished = false, used = 0;
    const left = h('b'); const goal = s.goal === 'mate' ? t('a_goalMate') : t('a_goalPromote');
    const upd = (last) => { board.setPosition(chess); board.setLast(last); left.textContent = t('a_movesLeft', { n: num(Math.max(0, s.maxMoves - used)) }); };
    const fail = () => { finished = true; bad(t('a_failed')); sound('lose'); };
    const check = (m) => {
      if (s.goal === 'mate' && chess.isCheckmate() && chess.turn() !== player) { finished = true; ok(t('a_goalDone')); sound('win'); setDone(); return true; }
      if (s.goal === 'promote' && m?.promotion && m.color === player) { finished = true; ok(t('a_goalDone')); sound('win'); setDone(); return true; }
      if (chess.isGameOver()) { fail(); return true; }
      if (s.goal === 'promote' && !chess.findPiece({ type: 'p', color: player }).length) { fail(); return true; }
      if (used >= s.maxMoves && chess.turn() !== player) { fail(); return true; }
      return false;
    };
    board.o.canMove = (sq) => !busy && !finished && chess.turn() === player && chess.get(sq)?.color === player;
    board.o.legalTargets = (sq) => chess.moves({ square: sq, verbose: true }).map(m => m.to);
    board.o.onMove = async ({ from, to }) => {
      const m = mvTry(chess, from + to + 'q'); if (!m) return;
      used++; upd(m); sound(m.captured ? 'capture' : chess.inCheck() ? 'check' : 'move');
      if (check(m)) return;
      busy = true; const fen = chess.fen();
      try {
        const u = await getEngine().bestMove(fen, 'hard');
        if (chess.fen() !== fen || finished) return;
        later(() => { const r = mvTry(chess, u); upd(r); if (r) sound(r.captured ? 'capture' : 'move'); busy = false; check(r); }, 250);
      } catch { busy = false; toast(t('c_engineFail'), true); }
    };
    const restart = () => { chess.load(s.fen); used = 0; finished = false; busy = false; feedback.textContent = ''; feedback.className = 'ac-feedback'; upd(null); };
    extra.append(h('div', { class: 'ac-goal' }, ico('trophy', 16), ' ', goal, ' · ', left),
      h('div', { class: 'row' }, h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { if (busy || chess.history().length < 2 || finished) return; chess.undo(); chess.undo(); used = Math.max(0, used - 1); upd(null); } }, ico('undo-2', 15), t('a_undo')),
        h('button', { class: 'btn ghost sm', type: 'button', onclick: restart }, ico('rotate-ccw', 15), t('a_restart'))));
    upd(null);
  }

  // ---------- الألغاز ----------
  let PUZZLES = null;
  async function puzzles() {
    reset(); nav = { screen: 'puzzles' }; view.innerHTML = '';
    if (!PUZZLES) { try { PUZZLES = await (await fetch(new URL('./puzzles.json', import.meta.url))).json(); } catch { PUZZLES = []; } }
    const stats = { rating: 800, solved: 0, streak: 0, best: 0, done: {}, ...store.get('puzzle-stats', {}) };
    const saveStats = () => store.set('puzzle-stats', stats);
    let level = store.get('puzzle-level', 'auto');
    const LV = { auto: null, l1: [0, 1000], l2: [1000, 1600], l3: [1600, 2100], l4: [2100, 4000] };
    const statsEl = h('div', { class: 'pz-stats' });
    const info = h('div', { class: 'ac-text' }), feedback = h('div', { class: 'ac-feedback' }), btns = h('div', { class: 'row' });
    const boardBox = h('div', { class: 'ac-board' });
    const levelSeg = ctx.seg([['auto', t('p_auto')], ['l1', t('p_l1')], ['l2', t('p_l2')], ['l3', t('p_l3')], ['l4', t('p_l4')]], level, v => { level = v; store.set('puzzle-level', v); nextPuzzle(); });
    view.append(h('div', { class: 'ac-top' }, h('button', { class: 'btn ghost sm', type: 'button', onclick: home }, ico('chevron-right', 16), t('a_home')), h('h2', {}, ico('puzzle', 22), ' ', t('p_title'))),
      h('div', { class: 'c-layout' }, h('div', { class: 'c-left' }, boardBox),
        h('div', { class: 'c-side' }, h('div', { class: 'panel' }, statsEl, h('div', { class: 'field', style: { marginTop: '10px' } }, h('span', {}, t('p_level')), levelSeg)),
          h('div', { class: 'panel ac-panel' }, info, feedback, btns), h('small', { class: 'muted' }, t('p_source')))));
    const drawStats = () => { statsEl.innerHTML = ''; statsEl.append(
      h('div', {}, h('b', {}, num(Math.round(stats.rating))), h('small', {}, t('p_rating'))),
      h('div', {}, h('b', {}, num(stats.solved)), h('small', {}, t('p_solved'))),
      h('div', {}, h('b', {}, num(stats.streak)), h('small', {}, t('p_streak')))); };
    drawStats();

    let cur = null;
    function pick() {
      const range = LV[level] || [stats.rating - 200, stats.rating + 200];
      let pool = PUZZLES.filter(p => p[3] >= range[0] && p[3] < range[1] && !stats.done[p[0]]);
      if (!pool.length && level === 'auto') pool = PUZZLES.filter(p => !stats.done[p[0]]).sort((a, b) => Math.abs(a[3] - stats.rating) - Math.abs(b[3] - stats.rating)).slice(0, 20);
      return pool[Math.floor(Math.random() * pool.length)] || null;
    }
    function nextPuzzle() {
      timers.forEach(clearTimeout); timers = [];
      const p = pick();
      board?.destroy(); board = new Board({}); boardBox.innerHTML = ''; boardBox.append(board.el);
      feedback.textContent = ''; feedback.className = 'ac-feedback'; btns.innerHTML = '';
      if (!p) { info.textContent = t('p_all'); board.setPosition({}); return; }
      const [id, fen, movesStr, rating] = p; const moves = movesStr.split(' ');
      const chess = new Chess(fen);
      // تحديد إن كان اللغز كش مات
      const tc = new Chess(fen); moves.forEach(u => mvTry(tc, u)); const mateN = tc.isCheckmate() ? Math.ceil((moves.length - 1) / 2) : 0;
      const player = chess.turn() === 'w' ? 'b' : 'w';
      board.setOrientation(player); board.setPosition(chess);
      cur = { id, rating, moves, chess, idx: 0, failed: false, finished: false, busy: true, player };
      info.innerHTML = '';
      info.append(h('div', { class: 'row' }, h('span', { class: 'c-dot ' + player }), h('b', {}, t('p_find' + player))),
        h('small', { class: 'muted' }, `${t('p_puzzleRating')}: ${num(rating)}`, mateN ? ` · ${t('p_mateIn', { n: num(mateN) })}` : ''));
      const playOpp = () => { cur.busy = true; later(() => { const m = mvTry(chess, moves[cur.idx]); cur.idx++; board.setPosition(chess); board.setLast(m); sound(m?.captured ? 'capture' : 'move'); cur.busy = false; }, 550); };
      board.o.canMove = (sq) => !cur.busy && !cur.finished && chess.turn() === player && chess.get(sq)?.color === player;
      board.o.legalTargets = (sq) => chess.moves({ square: sq, verbose: true }).map(m => m.to);
      board.o.onMove = ({ from, to }) => {
        const exp = moves[cur.idx]; const promo = exp.slice(0, 4) === from + to ? (exp[4] || 'q') : 'q';
        const test = new Chess(chess.fen()); mvTry(test, from + to + promo);
        const last = cur.idx === moves.length - 1;
        if (exp.slice(0, 4) === from + to || (last && test.isCheckmate())) {
          const m = mvTry(chess, from + to + promo); cur.idx++; board.setPosition(chess); board.setLast(m); sound(m.captured ? 'capture' : chess.inCheck() ? 'check' : 'move');
          if (cur.idx >= moves.length) return solvedPuzzle();
          feedback.className = 'ac-feedback ok'; feedback.textContent = t('p_correct'); playOpp(); return;
        }
        sound('error'); board.setPosition(chess); board.flash(to);
        feedback.className = 'ac-feedback bad'; feedback.textContent = t('p_fail');
        if (!cur.failed) { cur.failed = true; rate(false); }
        showButtons();
      };
      showButtons(); playOpp();
    }
    function rate(win) {
      if (stats.done[cur.id] != null) return;
      const exp = 1 / (1 + Math.pow(10, (cur.rating - stats.rating) / 400));
      stats.rating = Math.max(100, stats.rating + 24 * ((win ? 1 : 0) - exp));
      stats.done[cur.id] = win ? 1 : 0;
      if (win) { stats.solved++; stats.streak++; stats.best = Math.max(stats.best, stats.streak); } else stats.streak = 0;
      saveStats(); drawStats();
    }
    function solvedPuzzle() {
      cur.finished = true; feedback.className = 'ac-feedback ok'; feedback.textContent = t('p_success'); sound('win');
      if (!cur.failed) rate(true); showButtons();
    }
    function showSolution() {
      cur.finished = true; const { chess, moves } = cur;
      const stepSol = () => { if (cur.idx >= moves.length) return showButtons(); const m = mvTry(chess, moves[cur.idx]); cur.idx++; board.setPosition(chess); board.setLast(m); sound('move'); later(stepSol, 700); };
      stepSol();
    }
    function showButtons() {
      btns.innerHTML = '';
      if (!cur) return;
      if (!cur.finished && cur.failed) btns.append(h('button', { class: 'btn ghost sm', type: 'button', onclick: showSolution }, ico('eye', 15), t('a_solution')));
      if (!cur.finished) btns.append(h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { const e = cur.moves[cur.idx]; if (e) board.setMarks({ [e.slice(0, 2)]: 'hint' }); if (!cur.failed) { cur.failed = true; rate(false); } } }, ico('lightbulb', 15), t('a_hint')));
      btns.append(h('button', { class: 'btn sm', type: 'button', onclick: nextPuzzle }, t('p_next'), ico(settings.lang === 'ar' ? 'chevron-left' : 'chevron-right', 15)));
    }
    nextPuzzle();
  }

  home();
  return {
    unmount() { reset(); engine?.terminate(); },
    onLang() { if (nav.screen === 'module') moduleView(nav.m); else if (nav.screen === 'lesson') lessonView(nav.m, nav.li); else if (nav.screen === 'puzzles') puzzles(); else home(); },
    onSettings(k) { if (board && (k === 'boardTheme' || k === 'pieceSet')) board.render(); },
  };
}
