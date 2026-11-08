// مراجعة المباراة: تحليل كل نقلة وتصنيفها، ودقة كل لاعب، ومخطط التقييم — على غرار المواقع العالمية
import { Chess } from '../../vendor/chess.js';
import { h, ico, t, addDict, settings, num, store, toast, copyText } from '../../assets/js/core.js';
import { Engine } from './engine.js';
import { chessBoard, kingInCheck } from './board.js';
import { features, describe, sacrificeInfo, sacText, uciToMove } from './coach.js';
import { detectOpening, isBook } from './openings.js';

addDict({
  ar: {
    r_title: 'مراجعة المباراة', r_analyzing: 'جارٍ تحليل النقلة {i} من {n}…', r_depth: 'دقة التحليل', r_fast: 'سريع', r_deep: 'عميق', r_start: 'ابدأ التحليل',
    r_accuracy: 'الدقة', r_rating: 'تقدير تقريبي للمستوى', r_ratingNote: 'يُقدَّر من الدقة في هذه المباراة وحدها، فهو مؤشر تقريبي وليس تصنيفًا رسميًّا.',
    r_brilliant: 'بارعة', r_great: 'عظيمة', r_best: 'الأفضل', r_excellent: 'ممتازة', r_good: 'جيدة', r_book: 'نظرية', r_inaccuracy: 'غير دقيقة', r_mistake: 'خطأ', r_miss: 'فرصة ضائعة', r_blunder: 'خطأ فادح', r_forced: 'إجبارية',
    r_lvl5: 'أداء استثنائي', r_lvl4: 'أداء قوي جدًّا', r_lvl3: 'أداء جيد', r_lvl2: 'أداء متوسط', r_lvl1: 'أداء مبتدئ',
    r_opening: 'الافتتاحية', r_start0: 'الموضع الابتدائي', r_bestWas: 'أفضل نقلة كانت {best}.', r_threat: 'الرد المتوقع بعدها: {reply}.',
    r_x_book: '{san} نقلة معروفة في نظرية الافتتاح.', r_x_best: '{san} هي أفضل نقلة في هذا الموضع.', r_x_great: '{san} نقلة عظيمة! كانت النقلة الوحيدة التي تحافظ على الموقف.',
    r_x_brilliant: '{san} نقلة بارعة!', r_x_excellent: '{san} نقلة ممتازة، قريبة جدًّا من الأفضل.', r_x_good: '{san} نقلة جيدة.',
    r_x_inaccuracy: '{san} نقلة غير دقيقة؛ أضاعت جزءًا من الأفضلية.', r_x_mistake: '{san} خطأ؛ خسرت به أفضلية واضحة.', r_x_blunder: '{san} خطأ فادح؛ قد يغيّر نتيجة المباراة.',
    r_x_miss: '{san} أضاعت فرصة لمعاقبة خطأ الخصم.', r_x_forced: '{san} نقلة إجبارية؛ لم تكن هناك نقلة قانونية غيرها.',
    r_whyBest: 'لماذا كانت {best} أفضل؟', r_showBest: 'اعرض أفضل خط', r_back: 'رجوع', r_copyPgn: 'نسخ PGN', r_moves: 'النقلات', r_summary: 'ملخص المباراة',
    r_white: 'الأبيض', r_black: 'الأسود', r_mateIn: 'كش مات في {n}', r_noMoves: 'لا توجد نقلات لمراجعتها.', r_engineFail: 'تعذّر تشغيل محرك التحليل.',
    r_history: 'مبارياتي السابقة', r_import: 'مراجعة مباراة من ملف PGN', r_importHint: 'الصق نص PGN لأي مباراة (مثلًا من مواقع الشطرنج المعروفة) لتحليلها.', r_badPgn: 'تعذّرت قراءة نص PGN.', r_review: 'مراجعة', r_noHistory: 'لا توجد مباريات محفوظة بعد. تُحفظ مبارياتك هنا تلقائيًا عند انتهائها.',
  },
  en: {
    r_title: 'Game review', r_analyzing: 'Analysing move {i} of {n}…', r_depth: 'Analysis depth', r_fast: 'Fast', r_deep: 'Deep', r_start: 'Start analysis',
    r_accuracy: 'Accuracy', r_rating: 'Rough level estimate', r_ratingNote: 'Estimated from this game\'s accuracy only — a rough indicator, not an official rating.',
    r_brilliant: 'Brilliant', r_great: 'Great', r_best: 'Best', r_excellent: 'Excellent', r_good: 'Good', r_book: 'Book', r_inaccuracy: 'Inaccuracy', r_mistake: 'Mistake', r_miss: 'Miss', r_blunder: 'Blunder', r_forced: 'Forced',
    r_lvl5: 'Outstanding performance', r_lvl4: 'Very strong performance', r_lvl3: 'Good performance', r_lvl2: 'Average performance', r_lvl1: 'Beginner performance',
    r_opening: 'Opening', r_start0: 'Starting position', r_bestWas: 'The best move was {best}.', r_threat: 'Expected reply: {reply}.',
    r_x_book: '{san} is a known opening move.', r_x_best: '{san} is the best move here.', r_x_great: '{san} is a great move — the only one that holds the position!',
    r_x_brilliant: '{san} is brilliant!', r_x_excellent: '{san} is excellent, very close to the best.', r_x_good: '{san} is a good move.',
    r_x_inaccuracy: '{san} is an inaccuracy; it gives away part of the advantage.', r_x_mistake: '{san} is a mistake; it loses a clear advantage.', r_x_blunder: '{san} is a blunder; it may change the result.',
    r_x_miss: "{san} misses a chance to punish the opponent's error.", r_x_forced: '{san} was forced — the only legal move.',
    r_whyBest: 'Why was {best} better?', r_showBest: 'Show best line', r_back: 'Back', r_copyPgn: 'Copy PGN', r_moves: 'Moves', r_summary: 'Game summary',
    r_white: 'White', r_black: 'Black', r_mateIn: 'Mate in {n}', r_noMoves: 'There are no moves to review.', r_engineFail: 'The analysis engine could not start.',
    r_history: 'My past games', r_import: 'Review a game from PGN', r_importHint: 'Paste the PGN of any game (for example from popular chess sites) to analyse it.', r_badPgn: 'Could not read that PGN.', r_review: 'Review', r_noHistory: 'No saved games yet. Your games are saved here automatically when they end.',
  },
});

export const CLASSES = {
  brilliant: { sym: '!!', color: '#1baca6' }, great: { sym: '!', color: '#5c8bb0' }, best: { sym: '★', color: '#81b64c' }, excellent: { sym: '✔', color: '#81b64c' },
  good: { sym: '✓', color: '#95b776' }, book: { sym: '📖', color: '#a88865' }, forced: { sym: '→', color: '#97a6b1' },
  inaccuracy: { sym: '?!', color: '#f7c631' }, mistake: { sym: '?', color: '#ffa459' }, miss: { sym: '✗', color: '#ff7769' }, blunder: { sym: '??', color: '#fa412d' },
};
const ORDER = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'];

// ---------- الحسابات ----------
const winPct = (cp) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
const lineCp = (l) => l.mate != null ? (l.mate > 0 ? 10000 - l.mate * 10 : -10000 - l.mate * 10) : (l.cp ?? 0);
const moveAcc = (loss) => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669 + 1));
function gameAccuracy(arr) {
  if (!arr.length) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const harm = arr.length / arr.reduce((a, b) => a + 1 / Math.max(b, 1), 0);
  return (mean + harm) / 2;
}
function ratingFromAcc(a) {
  const pts = [[0, 300], [40, 450], [50, 600], [60, 850], [70, 1150], [80, 1500], [85, 1750], [90, 2050], [95, 2450], [98, 2750], [100, 2900]];
  for (let i = 1; i < pts.length; i++) if (a <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return Math.round((y0 + (a - x0) / (x1 - x0) * (y1 - y0)) / 50) * 50; }
  return 2900;
}

// قاعدة مواضع الافتتاحيات المفتوحة (Lichess chess-openings، CC0): مفتاحها الموضع
let BOOK = null;
async function loadBook() {
  if (BOOK) return BOOK;
  try {
    const r = await fetch(new URL('./data/openings.json', import.meta.url));
    const j = await r.json(); BOOK = new Map();
    for (const [epd, v] of Object.entries(j)) BOOK.set(epd.split(' ').slice(0, 3).join(' '), v);
  } catch { BOOK = new Map(); }
  return BOOK;
}
const key3 = (fen) => fen.split(' ').slice(0, 3).join(' ');

// تحليل المباراة كاملة: يعيد لكل نقلة التصنيف والتقييم
export async function analyzeGame(sans, startFen, { depth = 11, onProgress } = {}) {
  const book = await loadBook();
  const c = new Chess(startFen || undefined);
  const fens = [c.fen()], ucis = [], verbose = [];
  for (const s of sans) { const m = c.move(s); ucis.push(m.from + m.to + (m.promotion || '')); verbose.push(m); fens.push(c.fen()); }
  const eng = new Engine();
  try { await eng.start(); } catch (e) { eng.terminate(); throw e; }
  const an = [];
  for (let i = 0; i < fens.length; i++) {
    onProgress?.(i, fens.length);
    const cc = new Chess(fens[i]);
    if (cc.isGameOver()) { an.push({ terminal: true, mate: cc.isCheckmate(), lines: [] }); continue; }
    const lines = await eng.analyze(fens[i], { multipv: 2, depth, movetime: depth > 12 ? 2500 : 900 });
    an.push({ lines });
  }
  eng.terminate();
  // تقييم كل موضع من منظور الأبيض (سنتي بيدق)
  const evalW = fens.map((f, i) => {
    const turn = f.split(' ')[1]; const a = an[i];
    if (a.terminal) return a.mate ? (turn === 'w' ? -10000 : 10000) : 0;
    const v = lineCp(a.lines[0] || { cp: 0 }); return turn === 'w' ? v : -v;
  });
  const mateW = fens.map((f, i) => { const l = an[i].lines?.[0]; if (!l || l.mate == null) return null; const turn = f.split(' ')[1]; return turn === 'w' ? l.mate : -l.mate; });
  const moves = [];
  for (let i = 0; i < sans.length; i++) {
    const mover = fens[i].split(' ')[1];
    const sign = mover === 'w' ? 1 : -1;
    const before = winPct(sign * evalW[i]), after = winPct(sign * evalW[i + 1]);
    const loss = Math.max(0, before - after);
    const lines = an[i].lines || [];
    const best = lines[0], second = lines[1];
    const legalCount = new Chess(fens[i]).moves().length;
    let cls;
    const playedIsBest = best && best.pv[0] === ucis[i];
    if (legalCount === 1) cls = 'forced';
    else if (i < 30 && !startFen && (book.has(key3(fens[i + 1])) || isBook(sans, i)) && loss < 8) cls = 'book';
    else if (playedIsBest || loss < 1) {
      cls = 'best';
      // بارعة: تضحية سليمة
      const pv = [ucis[i], ...((an[i + 1]?.lines?.[0]?.pv) || [])];
      const sac = sacrificeInfo(fens[i], { pv, mate: null, cp: 0 });
      if (sac && after >= 50 && verbose[i].piece !== 'p') { cls = 'brilliant'; moves.sac = moves.sac || {}; moves.sac[i] = sac; }
      else if (second && best) {
        const gap = winPct(lineCp(best)) - winPct(lineCp(second));
        const prev = verbose[i - 1];
        const recapture = prev && prev.captured && verbose[i].to === prev.to;
        if (gap >= 20 && !recapture && after >= 40) cls = 'great';
      }
    } else if (loss < 3) cls = 'excellent';
    else if (loss < 6) cls = 'good';
    else if (loss < 10) cls = 'inaccuracy';
    else if (loss < 20) cls = 'mistake';
    else cls = 'blunder';
    // إذا كان الموقف فائزًا بوضوح وبقي فائزًا، فلا يُعدّ خطأً (مثلًا: كش مات أبطأ قليلًا)
    if (['inaccuracy', 'mistake', 'blunder'].includes(cls) && before >= 97 && after >= 85) cls = after >= 92 ? 'excellent' : 'good';
    const prevCls = moves[i - 1]?.cls;
    if (['inaccuracy', 'mistake', 'blunder'].includes(cls) && ['mistake', 'blunder'].includes(prevCls) && before >= 70 && after >= 35) cls = 'miss';
    moves.push({ i, san: sans[i], uci: ucis[i], mover, cls, loss, acc: moveAcc(loss), before, after, best, second, fen: fens[i], after_fen: fens[i + 1], sac: moves.sac?.[i] });
  }
  const accW = gameAccuracy(moves.filter(m => m.mover === 'w').map(m => m.acc));
  const accB = gameAccuracy(moves.filter(m => m.mover === 'b').map(m => m.acc));
  const counts = { w: {}, b: {} };
  for (const m of moves) counts[m.mover][m.cls] = (counts[m.mover][m.cls] || 0) + 1;
  // اسم الافتتاحية: الأعمق تطابقًا، بالعربية إن توفّر
  let opening = detectOpening(sans);
  if (!startFen) {
    let deep = null; for (let i = 1; i < fens.length && i <= 30; i++) { const v = book.get(key3(fens[i])); if (v) deep = v; }
    if (deep && (!opening || !opening.name)) opening = { name: { ar: deep[1], en: deep[1] }, eco: deep[0], idea: { ar: '', en: '' } };
    else if (deep && opening) opening = { ...opening, variation: deep[1], eco: deep[0] };
  }
  return { fens, ucis, sans, moves, evalW, mateW, an, acc: { w: accW, b: accB }, counts, opening };
}

// ---------- الواجهة ----------
export function openReview(root, game, { onBack } = {}) {
  // game: { sans, startFen, names:{w,b}, myColor, id }
  root.innerHTML = '';
  const box = h('div', { class: 'rv' }); root.append(box);
  if (!game.sans?.length) { box.append(h('div', { class: 'panel center' }, t('r_noMoves')), h('button', { class: 'btn ghost', onclick: onBack }, t('r_back'))); return {}; }
  let R = game.id ? store.get('rv-' + game.id, null) : null;
  let idx = 0, showBest = false, alive = true;
  const depthPref = store.get('rv-depth', 11);

  function startScreen() {
    box.innerHTML = '';
    let depth = depthPref;
    const prog = h('div', { class: 'rv-prog hidden' }, h('div', { class: 'rv-bar' }, h('i')), h('small', { class: 'muted' }));
    const btn = h('button', { class: 'btn', type: 'button' }, ico('sparkles', 18), t('r_start'));
    const segEl = h('div', { class: 'seg' }, [[11, t('r_fast')], [14, t('r_deep')]].map(([v, l]) => h('button', { type: 'button', class: v === depth ? 'on' : '', onclick: (e) => { depth = v; segEl.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.currentTarget)); } }, l)));
    btn.onclick = async () => {
      store.set('rv-depth', depth);
      btn.disabled = true; prog.classList.remove('hidden');
      try {
        R = await analyzeGame(game.sans, game.startFen, { depth, onProgress: (i, n) => { if (!alive) return; prog.querySelector('i').style.width = (i / n * 100) + '%'; prog.querySelector('small').textContent = t('r_analyzing', { i: num(i + 1), n: num(n) }); } });
        if (!alive) return;
        if (game.id) { try { store.set('rv-' + game.id, slim(R)); } catch { } }
        idx = 0; render();
      } catch (e) { console.error(e); toast(t('r_engineFail'), true); btn.disabled = false; }
    };
    box.append(h('div', { class: 'panel rv-start' },
      h('span', { class: 'rv-start-ic' }, ico('brain', 34)), h('h2', {}, t('r_title')),
      h('p', { class: 'muted' }, `${game.names.w} — ${game.names.b} · ${num(Math.ceil(game.sans.length / 2))} ${settings.lang === 'ar' ? 'نقلة' : 'moves'}`),
      h('div', { class: 'field', style: { alignItems: 'center' } }, h('span', {}, t('r_depth')), segEl),
      btn, prog,
      h('button', { class: 'btn ghost sm', type: 'button', onclick: onBack, style: { marginTop: '8px' } }, ico('chevron-right', 16), t('r_back'))));
    if (R) render();
  }
  // تخزين مختصر للتحليل
  function slim(r) { return { ...r, an: r.an.map(a => ({ terminal: a.terminal, mate: a.mate, lines: (a.lines || []).map(l => ({ cp: l.cp, mate: l.mate, pv: l.pv.slice(0, 8) })) })), moves: r.moves.map(m => ({ ...m, best: m.best && { cp: m.best.cp, mate: m.best.mate, pv: m.best.pv.slice(0, 8) }, second: m.second && { cp: m.second.cp, mate: m.second.mate, pv: m.second.pv.slice(0, 4) } })) }; }

  let board, chess, els = {};
  function render() {
    box.innerHTML = '';
    chess = new Chess(R.fens[0]);
    const boardHost = h('div', { class: 'rv-boardhost' });
    els.evalbar = h('div', { class: 'rv-evalbar' }, h('i'), h('span'));
    els.top = h('div', { class: 'c-bar' }); els.bottom = h('div', { class: 'c-bar' });
    els.explain = h('div', { class: 'rv-explain' });
    els.list = h('div', { class: 'rv-list' });
    els.graph = h('div', { class: 'rv-graph' });
    const nav = h('div', { class: 'rv-nav', dir: 'ltr' },
      navBtn('⏮', () => go(0)), navBtn('◀', () => go(idx - 1)), navBtn('▶', () => go(idx + 1)), navBtn('⏭', () => go(R.sans.length)));
    box.append(h('div', { class: 'c-layout' },
      h('div', { class: 'c-left' }, els.top, h('div', { class: 'rv-boardrow', dir: 'ltr' }, els.evalbar, boardHost), els.bottom, nav, els.graph),
      h('div', { class: 'c-side' },
        h('div', { class: 'panel' }, summary()),
        h('div', { class: 'panel' }, els.explain),
        h('div', { class: 'panel' }, h('div', { class: 'row' }, h('b', { class: 'grow' }, t('r_moves')),
          h('button', { class: 'btn ghost sm', type: 'button', onclick: () => copyText(pgn()) }, ico('copy', 15), t('r_copyPgn')),
          h('button', { class: 'btn ghost sm', type: 'button', onclick: onBack }, ico('chevron-right', 15), t('r_back'))), els.list))));
    board = chessBoard(boardHost, chess, { orientation: game.myColor || 'w', interactive: false });
    drawGraph(); drawList(); go(idx);
  }
  const navBtn = (s, f) => h('button', { class: 'btn ghost sm', type: 'button', onclick: f }, s);
  function pgn() {
    const c = new Chess(R.fens[0]); for (const s of R.sans) c.move(s);
    c.setHeader('White', game.names.w); c.setHeader('Black', game.names.b); c.setHeader('Site', 'Play & Learn — ITQAN');
    return c.pgn();
  }
  function summary() {
    const col = (c) => { const a = R.acc[c]; const lvl = a >= 92 ? 5 : a >= 82 ? 4 : a >= 70 ? 3 : a >= 55 ? 2 : 1; return h('div', { class: 'rv-player ' + c },
      h('div', { class: 'rv-pname' }, h('span', { class: 'c-dot ' + c }), game.names[c] || t(c === 'w' ? 'r_white' : 'r_black')),
      h('div', { class: 'rv-acc' }, num(a.toFixed(1))), h('small', { class: 'muted' }, t('r_accuracy')),
      h('div', { class: 'rv-lvl' }, t('r_lvl' + lvl)),
      h('div', { class: 'rv-rating', title: t('r_ratingNote') }, R.moves.filter(m => m.mover === c && !['book', 'forced'].includes(m.cls)).length >= 8 ? ['≈ ', num(ratingFromAcc(a))] : '—')); };
    const rows = ORDER.map(k => h('tr', {}, h('td', { class: 'n' }, num(R.counts.w[k] || 0)), h('td', {}, h('span', { class: 'rv-ic', style: { background: CLASSES[k].color } }, CLASSES[k].sym), ' ', t('r_' + k)), h('td', { class: 'n' }, num(R.counts.b[k] || 0))));
    return h('div', {},
      h('div', { class: 'row' }, ico('trophy', 18), h('b', {}, t('r_summary'))),
      R.opening ? h('p', { class: 'rv-opening' }, ico('layers', 14), ' ', t('r_opening'), ': ', R.opening.name[settings.lang] || R.opening.name.ar, R.opening.variation && R.opening.variation !== (R.opening.name.en) ? h('small', { class: 'muted', dir: 'ltr', style: { display: 'block' } }, `${R.opening.eco || ''} ${R.opening.variation}`) : null) : null,
      h('div', { class: 'rv-players' }, col('w'), col('b')),
      h('small', { class: 'muted rv-note' }, t('r_rating'), ' — ', t('r_ratingNote')),
      h('table', { class: 'rv-counts' }, h('tbody', {}, rows)));
  }
  function drawGraph() {
    const n = R.evalW.length, W = 600, H = 110;
    const y = (cp) => H - winPct(cp) / 100 * H;
    const pts = R.evalW.map((cp, i) => `${(i / Math.max(1, n - 1)) * W},${y(cp)}`);
    const area = `0,${H} ${pts.join(' ')} ${W},${H}`;
    let dots = '';
    R.moves.forEach((m, i) => { if (['brilliant', 'great', 'mistake', 'miss', 'blunder'].includes(m.cls)) dots += `<circle cx="${((i + 1) / (n - 1)) * W}" cy="${y(R.evalW[i + 1])}" r="5" fill="${CLASSES[m.cls].color}" stroke="#fff" stroke-width="1.5"/>`; });
    els.graph.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><rect width="${W}" height="${H}" fill="#3a3a3a"/><polygon points="${area}" fill="#f5f5f5"/><line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" stroke="#9ca3af" stroke-dasharray="4 4"/>${dots}<line class="rv-cursor" x1="0" x2="0" y1="0" y2="${H}" stroke="#f59e0b" stroke-width="2"/></svg>`;
    els.graph.onclick = (e) => { const r = els.graph.getBoundingClientRect(); go(Math.round((e.clientX - r.left) / r.width * (n - 1))); };
  }
  function drawList() {
    els.list.innerHTML = '';
    const ol = h('ol', { dir: 'ltr' });
    for (let i = 0; i < R.moves.length; i += 2) ol.append(h('li', {}, [i, i + 1].map(k => R.moves[k] ? h('button', { type: 'button', class: 'rv-mv', 'data-k': k + 1, onclick: () => go(k + 1) },
      h('span', { class: 'rv-ic', style: { background: CLASSES[R.moves[k].cls].color } }, CLASSES[R.moves[k].cls].sym), R.moves[k].san) : h('span'))));
    els.list.append(ol);
  }
  function evalLabel(i) {
    const m = R.mateW[i];
    if (m != null) return (m > 0 ? '' : '-') + 'M' + Math.abs(m);
    const terminal = R.an[i]?.terminal; if (terminal) return R.an[i].mate ? (R.fens[i].split(' ')[1] === 'w' ? '0-1' : '1-0') : '½';
    const v = R.evalW[i] / 100; return (v > 0 ? '+' : '') + v.toFixed(1);
  }
  function san(fen, uci) { const c = new Chess(fen); const m = uciToMove(c, uci); return m ? m.san : uci; }
  function go(k) {
    idx = Math.max(0, Math.min(R.sans.length, k));
    chess.load(R.fens[idx]);
    const m = R.moves[idx - 1];
    const arrows = [], badges = {};
    if (m) {
      badges[m.uci.slice(2, 4)] = { text: CLASSES[m.cls].sym, color: CLASSES[m.cls].color, title: t('r_' + m.cls) };
      if (m.best && m.best.pv[0] !== m.uci && !['book', 'forced', 'best', 'brilliant', 'great'].includes(m.cls)) arrows.push({ from: m.best.pv[0].slice(0, 2), to: m.best.pv[0].slice(2, 4), color: '#16a34a', opacity: .75 });
    }
    if (showBest && R.an[idx]?.lines?.[0]) { const u = R.an[idx].lines[0].pv[0]; arrows.push({ from: u.slice(0, 2), to: u.slice(2, 4), color: '#2563eb' }); }
    board.set({ last: m ? { from: m.uci.slice(0, 2), to: m.uci.slice(2, 4) } : null, check: kingInCheck(chess), arrows, badges });
    // شريط التقييم
    const w = winPct(R.evalW[idx]);
    els.evalbar.querySelector('i').style.height = (100 - w) + '%';
    els.evalbar.classList.toggle('flip', board.orientation === 'b');
    els.evalbar.querySelector('span').textContent = evalLabel(idx);
    els.evalbar.querySelector('span').className = w >= 50 ? 'w' : 'b';
    // اللاعبون
    const top = board.orientation === 'w' ? 'b' : 'w';
    for (const [el, c] of [[els.top, top], [els.bottom, top === 'w' ? 'b' : 'w']]) { el.innerHTML = ''; el.append(h('span', { class: 'c-dot ' + c }), h('b', { class: 'c-name' }, game.names[c]), h('span', { class: 'grow' }), h('span', { class: 'rv-accmini' }, num(R.acc[c].toFixed(1)), '%')); }
    // المؤشر في المخطط والقائمة
    const cur = els.graph.querySelector('.rv-cursor'); if (cur) { const x = idx / Math.max(1, R.evalW.length - 1) * 600; cur.setAttribute('x1', x); cur.setAttribute('x2', x); }
    els.list.querySelectorAll('.rv-mv').forEach(b => b.classList.toggle('on', +b.dataset.k === idx));
    els.list.querySelector('.rv-mv.on')?.scrollIntoView({ block: 'nearest' });
    explain(m);
  }
  function explain(m) {
    const e = els.explain; e.innerHTML = '';
    if (!m) { e.append(h('p', { class: 'muted' }, t('r_start0')), R.opening ? h('p', {}, h('b', {}, R.opening.name[settings.lang] || R.opening.name.ar), h('br'), R.opening.idea[settings.lang] || R.opening.idea.ar) : null); return; }
    const C = CLASSES[m.cls];
    e.append(h('div', { class: 'rv-head', style: { '--k': C.color } }, h('span', { class: 'rv-ic big', style: { background: C.color } }, C.sym), h('div', { class: 'grow' }, h('b', {}, t('r_' + m.cls)), h('div', { class: 'muted' }, num(Math.ceil((m.i + 1) / 2)), m.mover === 'w' ? '. ' : '… ', h('code', { dir: 'ltr' }, m.san))), h('span', { class: 'rv-eval' }, evalLabel(m.i + 1))));
    const txt = h('div', { class: 'rv-text' });
    txt.append(h('p', {}, t('r_x_' + m.cls, { san: m.san })));
    if (m.cls === 'brilliant' && m.sac) txt.append(h('p', {}, sacText({ line: { mate: null }, info: m.sac })));
    if (m.cls === 'book' && R.opening) txt.append(h('p', { class: 'muted' }, R.opening.name[settings.lang] || R.opening.name.ar));
    const bad = ['excellent', 'good', 'inaccuracy', 'mistake', 'miss', 'blunder'].includes(m.cls);
    if (bad && m.best) {
      const bestSan = san(m.fen, m.best.pv[0]);
      txt.append(h('p', {}, t('r_bestWas', { best: bestSan })));
      if (['inaccuracy', 'mistake', 'miss', 'blunder'].includes(m.cls)) {
        const reply = R.an[m.i + 1]?.lines?.[0]?.pv?.[0];
        if (reply) { const c = new Chess(m.after_fen); const mv = uciToMove(c, reply); if (mv) txt.append(h('p', { class: 'rv-threat' }, ico('flag', 14), ' ', t('r_threat', { reply: describe(mv, 'opp') + (R.mateW[m.i + 1] != null ? ` (${t('r_mateIn', { n: num(Math.abs(R.mateW[m.i + 1])) })})` : '') }))); }
        const f = features(m.fen, m.best);
        if (f?.reasons?.length) txt.append(h('div', { class: 'c-sub' }, t('r_whyBest', { best: bestSan })), h('ul', {}, f.reasons.slice(0, 4).map(r => h('li', {}, r))));
      }
    }
    e.append(txt, h('label', { class: 'rv-toggle' }, h('input', { type: 'checkbox', checked: showBest ? true : null, onchange: (ev) => { showBest = ev.target.checked; go(idx); } }), ' ', t('r_showBest')));
  }
  const onKey = (e) => { if (!alive || !R || /input|textarea/i.test(e.target.tagName)) return; if (e.key === 'ArrowRight') go(idx + 1); else if (e.key === 'ArrowLeft') go(idx - 1); else if (e.key === 'Home') go(0); else if (e.key === 'End') go(R.sans.length); else return; e.preventDefault(); };
  window.addEventListener('keydown', onKey);
  if (R) render(); else startScreen();
  return { destroy() { alive = false; window.removeEventListener('keydown', onKey); board?.destroy(); }, rerender() { if (R) render(); else startScreen(); } };
}

// ---------- سجل المباريات ----------
export function saveGame(g) {
  const list = store.get('chess-history', []);
  list.unshift({ ...g, id: g.id || ('g' + Date.now()), date: Date.now() });
  store.set('chess-history', list.slice(0, 25));
  return list[0].id;
}
export const loadHistory = () => store.get('chess-history', []);
export function parsePgn(text) {
  const c = new Chess();
  try { c.loadPgn(text.trim()); } catch { return null; }
  const hd = c.getHeaders ? c.getHeaders() : c.header();
  const sans = c.history();
  if (!sans.length) return null;
  const fen = hd.FEN || null;
  return { sans, startFen: fen, names: { w: hd.White || t('r_white'), b: hd.Black || t('r_black') }, result: hd.Result || '' };
}
