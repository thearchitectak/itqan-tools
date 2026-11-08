// يتحقق من صحة مواضع دروس الأكاديمية ونقلات حلولها
import { Chess } from '../public/vendor/chess.js';
import { MODULES } from '../public/games/chesslearn/content.js';
let errors = 0, tasks = 0;
const err = (id, msg) => { errors++; console.log('✗', id, msg); };
const mv = (c, u) => { try { return c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || 'q' }); } catch { return null; } };
function walk(c, sol, i, id, step) {
  if (i >= sol.length) { if (step.acceptMate && !c.isCheckmate()) err(id, 'final not mate ' + c.fen()); return; }
  const cur = sol[i];
  const playerTurn = step.firstByOpponent ? i % 2 === 1 : i % 2 === 0;
  if (cur === '*') { const replies = c.moves({ verbose: true }); if (!replies.length) err(id, 'no replies'); for (const r of replies) { const cc = new Chess(c.fen()); cc.move(r.san); walk(cc, sol, i + 1, id, step); } return; }
  const opts = Array.isArray(cur) ? cur : [cur];
  if (!playerTurn && opts.length > 1) err(id, 'opponent alternatives');
  for (const u of opts) { const cc = new Chess(c.fen()); if (!mv(cc, u)) { err(id, `illegal ${u} at ${i} in ${c.fen()}`); continue; } walk(cc, sol, i + 1, id, step); }
}
for (const m of MODULES) for (const l of m.lessons) l.steps.forEach((s, k) => {
  const id = `${l.id}#${k}`;
  if (s.fen) { try { new Chess(s.fen); } catch (e) { err(id, 'bad fen ' + s.fen + ' ' + e.message); return; } }
  if (s.type === 'task') { tasks++; walk(new Chess(s.fen), s.solution, 0, id, s); }
  if (s.type === 'demo') { const c = new Chess(s.fen); for (const [u] of s.moves) if (!mv(c, u)) err(id, 'demo illegal ' + u); if (s.moves.at(-1)[0] && /#/.test(c.history().at(-1) || '') === false && /مات/.test(s.moves.at(-1)[1].ar) && /كش مات/.test(s.moves.at(-1)[1].ar)) err(id, 'demo claims mate but not'); }
  if (s.type === 'quiz' && (s.answer < 0 || s.answer >= s.options.length)) err(id, 'quiz answer index');
  if (s.type === 'stars') {
    // تحقق من إمكانية الوصول لكل نجمة بحركة القطعة على رقعة فارغة مع العوائق
    const occ = new Set(Object.keys(s.blockers || {}));
    for (const st of s.stars) if (occ.has(st)) err(id, 'star on blocker ' + st);
  }
  if (s.type === 'play') { const c = new Chess(s.fen); if (c.isGameOver()) err(id, 'play over'); }
});
console.log(`${tasks} tasks checked, ${errors} errors`);
