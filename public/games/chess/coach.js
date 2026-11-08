// المساعد الذكي: يحوّل تحليل المحرك إلى ثلاثة اقتراحات مشروحة (أفضل نقلة، نقلة رائعة، تضحية بارعة)
import { Chess } from '../../vendor/chess.js';
import { settings, num } from '../../assets/js/core.js';

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const NAMES = {
  ar: { p: 'البيدق', n: 'الحصان', b: 'الفيل', r: 'الرخ', q: 'الوزير', k: 'الملك' },
  en: { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' },
};
const L = () => settings.lang === 'en' ? 'en' : 'ar';
export const pn = (t) => NAMES[L()][t];
// اسم القطعة مضافًا (حصانُ الخصم)
const pnOf = (t) => L() === 'ar' ? NAMES.ar[t].replace(/^ال/, '') : NAMES.en[t];
// صياغة العدد مع المعدود بالعربية الفصحى
export function countAr(n, one, two, few, many) { if (n === 1) return one; if (n === 2) return two; if (n >= 3 && n <= 10) return `${num(n)} ${few}`; return `${num(n)} ${many}`; }
export const movesAr = (n) => countAr(n, 'نقلة واحدة', 'نقلتين', 'نقلات', 'نقلة');
const sq = (s) => `⁦${s}⁩`; // عزل اتجاه أسماء المربعات داخل النص العربي

function material(chess, color) {
  let s = 0; for (const row of chess.board()) for (const p of row) if (p && p.color === color) s += VAL[p.type];
  return s;
}
const diff = (chess, me) => material(chess, me) - material(chess, me === 'w' ? 'b' : 'w');

// تقييم بوحدة البيدق من منظور اللاعب صاحب الدور
export function scoreOf(line) {
  if (line.mate != null) return line.mate > 0 ? 1000 - line.mate : -1000 - line.mate;
  return (line.cp ?? 0) / 100;
}
export function evalText(line) {
  const ar = L() === 'ar';
  if (line.mate != null) {
    const n = Math.abs(line.mate);
    if (line.mate > 0) return ar ? `كش مات لصالحك خلال ${movesAr(n)}` : `Mate for you in ${n}`;
    return ar ? `انتبه: الخصم يستطيع الكش مات خلال ${movesAr(n)}` : `Careful: opponent mates in ${n}`;
  }
  const v = (line.cp ?? 0) / 100, a = Math.abs(v), s = (v >= 0 ? '+' : '−') + num(a.toFixed(1));
  if (ar) {
    if (a < 0.3) return `الموقف متعادل تقريبًا (${s})`;
    if (a < 1) return v > 0 ? `أفضلية طفيفة لك (${s})` : `أفضلية طفيفة للخصم (${s})`;
    if (a < 2.5) return v > 0 ? `أفضلية واضحة لك (${s})` : `أفضلية واضحة للخصم (${s})`;
    return v > 0 ? `تفوّق حاسم لك (${s})` : `تفوّق حاسم للخصم (${s})`;
  }
  if (a < 0.3) return `Roughly equal (${s})`;
  if (a < 1) return v > 0 ? `Slight edge for you (${s})` : `Slight edge for opponent (${s})`;
  if (a < 2.5) return v > 0 ? `Clear advantage for you (${s})` : `Clear advantage for opponent (${s})`;
  return v > 0 ? `Decisive advantage for you (${s})` : `Decisive advantage for opponent (${s})`;
}

// وصف نقلة واحدة بلغة طبيعية
export function describe(m, who) {
  const ar = L() === 'ar';
  if (m.san.startsWith('O-O')) {
    const long = m.san.startsWith('O-O-O');
    return ar ? `${who === 'me' ? 'تُبيّت' : 'يُبيّت الخصم'} ملك${who === 'me' ? 'ك' : 'ه'} ${long ? 'تبييتًا طويلًا' : 'تبييتًا قصيرًا'}`
      : `${who === 'me' ? 'you castle' : 'the opponent castles'} ${long ? 'queenside' : 'kingside'}`;
  }
  let s;
  if (ar) {
    if (m.captured) s = who === 'me' ? `تأخذ ب${pn(m.piece)} ${pn(m.captured)} الذي في ${sq(m.to)}` : `يأخذ الخصم ب${pn(m.piece)} ${pn(m.captured)} الذي في ${sq(m.to)}`;
    else s = who === 'me' ? `تنقل ${pn(m.piece)} من ${sq(m.from)} إلى ${sq(m.to)}` : `ينقل الخصم ${pn(m.piece)} من ${sq(m.from)} إلى ${sq(m.to)}`;
    if (m.promotion) s += ` ويترقّى إلى ${pn(m.promotion)}`;
    if (m.san.includes('#')) s += ' — كش مات!'; else if (m.san.includes('+')) s += ' مع كش';
  } else {
    const subj = who === 'me' ? 'your' : "the opponent's";
    s = m.captured ? `${subj} ${pn(m.piece)} takes the ${pn(m.captured)} on ${m.to}` : `${subj} ${pn(m.piece)} goes from ${m.from} to ${m.to}`;
    if (m.promotion) s += ` and promotes to a ${pn(m.promotion)}`;
    if (m.san.includes('#')) s += ' — checkmate!'; else if (m.san.includes('+')) s += ' with check';
  }
  return s;
}

export function uciToMove(chess, uci) {
  try { return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' }); } catch { return null; }
}

// سيناريو: تسلسل النقلات المتوقعة
function scenario(fen, pv, plies = 6) {
  const c = new Chess(fen); const parts = []; const ar = L() === 'ar';
  for (let i = 0; i < Math.min(plies, pv.length); i++) {
    const m = uciToMove(c, pv[i]); if (!m) break;
    const who = i % 2 === 0 ? 'me' : 'opp';
    let d = describe(m, who);
    if (ar) d = (i === 0 ? '' : i % 2 === 1 ? 'فيردّ الخصم غالبًا: ' : 'ثم ') + d;
    else d = (i === 0 ? '' : i % 2 === 1 ? 'the likely reply: ' : 'then ') + d;
    parts.push(d);
  }
  return parts;
}

// خصائص النقلة الأولى لاستخراج الأسباب
export function features(fen, line) {
  const c = new Chess(fen); const me = c.turn(), opp = me === 'w' ? 'b' : 'w';
  const before = new Chess(fen);
  const m = uciToMove(c, line.pv[0]); if (!m) return null;
  const f = { move: m, reasons: [] };
  const ar = L() === 'ar';
  const push = (a, e) => f.reasons.push(ar ? a : e);

  if (line.mate != null && line.mate > 0) push(line.mate === 1 ? 'تنهي المباراة فورًا بكش مات.' : `تقود إلى كش مات خلال ${movesAr(line.mate)} مهما كان رد الخصم.`, line.mate === 1 ? 'It ends the game with checkmate.' : `It forces mate in ${line.mate} whatever the opponent does.`);
  if (m.san.startsWith('O-O')) push('تؤمّن ملكك في الزاوية وتُدخل الرخ إلى اللعب.', 'It tucks your king to safety and brings the rook into play.');
  if (m.promotion) push(`ترقّي البيدق إلى ${pn(m.promotion)} فتزداد قوتك كثيرًا.`, `It promotes the pawn to a ${pn(m.promotion)}.`);
  if (m.captured) {
    const back = before.attackers(m.to, opp).length > 0;
    if (!back || VAL[m.captured] > VAL[m.piece]) push(`تكسب ${pnOf(m.captured)} الخصم${back ? ' مقابل قطعة أقل قيمة' : ' دون مقابل'}.`, `It wins the opponent's ${pn(m.captured)}${back ? ' for a cheaper piece' : ' for free'}.`);
    else push(`تبادل قطعًا بطريقة مفيدة لك.`, 'It makes a favourable exchange.');
  }
  if (m.san.includes('+') && !m.san.includes('#')) push('تضع الملك في كش، فتجبر الخصم على الرد وتكسب الوقت.', 'It gives check, forcing a reply and gaining time.');
  // الشوكة والتهديدات
  const targets = [];
  for (const row of c.board()) for (const p of row) {
    if (!p || p.color !== opp || p.type === 'p') continue;
    const atk = c.attackers(p.square, me);
    if (!atk.includes(m.to)) continue;
    const defended = c.attackers(p.square, opp).length > 0;
    if (p.type === 'k' || VAL[p.type] > VAL[m.promotion || m.piece] || !defended) targets.push(p);
  }
  if (targets.length >= 2) push(`شوكة: ${pn(m.promotion || m.piece)} يهاجم ${targets.map(p => pn(p.type) + ' ' + sq(p.square)).join(' و')} في وقت واحد، فلا يستطيع الخصم إنقاذهما معًا.`, `A fork: your ${pn(m.promotion || m.piece)} attacks ${targets.map(p => p.type === 'k' ? 'the king' : `the ${pn(p.type)} on ${p.square}`).join(' and ')} at once.`);
  else if (targets.length === 1 && targets[0].type !== 'k') push(`تهدد ${pnOf(targets[0].type)} الخصم في ${sq(targets[0].square)}.`, `It threatens the opponent's ${pn(targets[0].type)} on ${targets[0].square}.`);
  // إنقاذ قطعة مهددة
  const wasAttacked = before.attackers(m.from, opp);
  if (!m.captured && m.piece !== 'k' && wasAttacked.length) {
    const cheap = wasAttacked.some(s => VAL[before.get(s).type] < VAL[m.piece]);
    const undefended = before.attackers(m.from, me).length === 0;
    if (cheap || undefended) push(`تنقذ ${pn(m.piece)} من التهديد الذي كان عليه في ${sq(m.from)}.`, `It rescues your ${pn(m.piece)} that was under attack on ${m.from}.`);
  }
  // التطوير والمركز
  const moveNo = before.moveNumber();
  const backRank = me === 'w' ? '1' : '8';
  if (moveNo <= 12 && (m.piece === 'n' || m.piece === 'b') && m.from[1] === backRank) push('تطوّر قطعة جديدة وتُخرجها إلى اللعب، وهذا من مبادئ الافتتاح.', 'It develops a new piece — a key opening principle.');
  if (['d4', 'd5', 'e4', 'e5'].includes(m.to)) push('تسيطر على مربعات مركز الرقعة.', 'It takes control of the centre squares.');
  else if (m.piece === 'p' && moveNo <= 10 && ['c4', 'c5', 'f4', 'f5'].includes(m.to)) push('تنافس على المركز من الجناح.', 'It fights for the centre from the side.');
  if (m.piece === 'p' && ((me === 'w' && +m.to[1] >= 6) || (me === 'b' && +m.to[1] <= 3)) && !m.promotion) push('تدفع البيدق نحو الترقية فتضغط على الخصم.', 'It pushes the pawn towards promotion.');
  return f;
}

// هل النقلة الأولى في الخط تضحية؟
export function sacrificeInfo(fen, line) {
  const c = new Chess(fen); const me = c.turn(), opp = me === 'w' ? 'b' : 'w';
  const root = diff(c, me);
  const m = uciToMove(c, line.pv[0]); if (!m) return null;
  // فحص ثابت: القطعة تقف حيث يمكن أخذها بخسارة
  const atk = c.attackers(m.to, opp);
  const def = c.attackers(m.to, me).length;
  const myVal = VAL[m.promotion || m.piece], capVal = m.captured ? VAL[m.captured] : 0;
  let staticSac = false;
  if (atk.length && myVal - capVal >= 2) {
    const minAtk = Math.min(...atk.map(s => VAL[c.get(s).type] || 100));
    if (!def || minAtk < myVal) staticSac = true;
  }
  // فحص ديناميكي عبر الخط المتوقع
  let worst = 0, end = root, recap = false;
  const c2 = new Chess(fen);
  for (let i = 0; i < Math.min(6, line.pv.length); i++) {
    const mv = uciToMove(c2, line.pv[i]); if (!mv) break;
    if (i === 1 && mv.to === m.to && mv.captured) recap = true;
    const d = diff(c2, me);
    if (i % 2 === 1) worst = Math.min(worst, d - root);
    end = d;
  }
  const lost = Math.max(staticSac ? myVal - capVal : 0, -worst);
  if (lost < 2) return null;
  if (!staticSac && !(recap && worst <= -2)) return null;
  return { move: m, lost, regained: end - root };
}

export function sacText({ line, info }) {
  const ar = L() === 'ar';
    const what = info.move.captured ? (ar ? `تعطي ${pn(info.move.promotion || info.move.piece)} مقابل ${pn(info.move.captured)}` : `you give your ${pn(info.move.piece)} for a ${pn(info.move.captured)}`) : (ar ? `تترك ${pn(info.move.promotion || info.move.piece)} عرضة للأخذ` : `you leave your ${pn(info.move.piece)} en prise`);
    const why = line.mate != null && line.mate > 0 ? (ar ? `لأن قبولها يفتح الطريق إلى كش مات خلال ${movesAr(line.mate)}.` : `because accepting it allows mate in ${line.mate}.`)
      : info.regained >= 0 ? (ar ? 'ثم تسترد المادة وأكثر بعد بضع نقلات.' : 'and then win the material back with interest a few moves later.')
        : (ar ? 'مقابل هجوم ومبادرة يعوّضان المادة، ويبقى الموقف متوازنًا أو لصالحك.' : 'in return for an attack and initiative that compensate for the material.');
    return ar ? `تضحية: ${what} (نحو ${countAr(info.lost, 'نقطة واحدة', 'نقطتين', 'نقاط', 'نقطة')} من المادة)، ${why}` : `A sacrifice: ${what} (about ${info.lost} points of material), ${why}`;
}

// الدالة الرئيسية: تبني الاقتراحات الثلاثة
export function buildSuggestions(fen, lines) {
  const ar = L() === 'ar';
  const valid = lines.filter(l => l.pv?.length);
  if (!valid.length) return [];
  const best = valid[0], bestScore = scoreOf(best);
  const out = [];
  const make = (kind, line, extra = []) => {
    const f = features(fen, line); if (!f) return null;
    let own = f.reasons;
    if (kind === 'brilliant') own = own.filter(r => !/تبادل|تكسب|exchange|wins the/.test(r));
    const reasons = [...extra, ...own];
    if (!reasons.length) reasons.push(ar ? 'تحسّن تنسيق قطعك وتحافظ على توازن الموقف وفق تحليل المحرك.' : 'It improves your piece coordination and keeps the position balanced, according to the engine.');
    return { kind, uci: line.pv[0], san: f.move.san, from: f.move.from, to: f.move.to, piece: f.move.piece, eval: evalText(line), score: scoreOf(line), scenario: scenario(fen, line.pv), reasons };
  };
  out.push(make('best', best, [ar ? 'هي النقلة الأقوى في هذا الموضع بحسب تحليل المحرك.' : 'It is the strongest move in this position according to the engine.']));

  // التضحية البارعة: من بين الخطوط الجيدة
  const sacs = [];
  for (const l of valid) {
    const sc = scoreOf(l);
    if (sc < bestScore - 1.2 || sc < -0.8) continue;
    const info = sacrificeInfo(fen, l); if (info) sacs.push({ line: l, info });
  }
  // إذا كانت أفضل نقلة نفسها تضحية، تُوسم بذلك ولا تتكرر
  if (sacs[0] && sacs[0].line === best && out[0]) { out[0].sacrifice = true; out[0].reasons.splice(1, 0, sacText(sacs[0])); }
  const sac = sacs.find(x => x.line !== best) || null;
  // النقلة الرائعة: أفضل بديل لا يساوي التضحية
  const great = valid.find((l, i) => i > 0 && l !== sac?.line);
  if (great) {
    const gap = bestScore - scoreOf(great);
    const note = great.mate != null && great.mate > 0 ? (ar ? 'بديل قوي يقود أيضًا إلى الفوز.' : 'A strong alternative that also wins.')
      : best.mate != null && best.mate > 0 ? (ar ? 'أفضل نقلة تفرض كش مات، أما هذه فتحافظ على أفضليتك دون حسم فوري.' : 'The best move forces mate; this one keeps your advantage without finishing at once.')
        : gap <= 0.3 ? (ar ? `بديل رائع يكاد يساوي أفضل نقلة في قوته (الفارق ${num(Math.max(0, gap).toFixed(1))} فقط).` : `A great alternative almost as strong as the best move (only ${Math.max(0, gap).toFixed(1)} behind).`)
          : (ar ? `بديل جيد، لكنه أضعف من أفضل نقلة بفارق ${num(gap.toFixed(1))}.` : `A decent alternative, ${gap.toFixed(1)} weaker than the best move.`);
    out.push(make('great', great, [note]));
  }
  if (sac) out.push(make('brilliant', sac.line, [sacText(sac)]));
  else {
    const third = valid.find((l, i) => i > 0 && l !== great);
    if (third) { const x = make('good', third, [out[0]?.sacrifice ? (ar ? 'التضحية البارعة هنا هي أفضل نقلة نفسها، وهذا خيار ثالث معقول.' : 'The brilliant sacrifice here is the best move itself; this is a reasonable third option.') : (ar ? 'لا توجد في هذا الموضع تضحية مفيدة، وهذا خيار ثالث معقول.' : 'There is no sound sacrifice here; this is a reasonable third option.')]); if (x) out.push(x); }
  }
  return out.filter(Boolean);
}
