// يختار مجموعة ألغاز متدرجة من قاعدة ألغاز Lichess (CC0) ويتحقق من صحة نقلاتها
// الاستخدام: node scripts/build-puzzles.mjs <ملف CSV: id,fen,moves,rating>
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from '../public/vendor/chess.js';
const src = process.argv[2];
const rows = readFileSync(src, 'utf8').trim().split('\n').map(l => l.split(','));
const buckets = new Map();
for (const [id, fen, moves, rating] of rows) {
  const r = +rating; const b = Math.floor(r / 50);
  if (!buckets.has(b)) buckets.set(b, []);
  buckets.get(b).push({ id, fen, moves: moves.split(' '), rating: r });
}
const out = [];
for (const [b, list] of [...buckets.entries()].sort((a, c) => a[0] - c[0])) {
  let taken = 0;
  for (const p of list) {
    if (taken >= 9) break;
    if (p.moves.length < 2 || p.moves.length > 9) continue;
    try {
      const c = new Chess(p.fen);
      for (const u of p.moves) { if (!c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })) throw 0; }
    } catch { continue; }
    out.push([p.id, p.fen, p.moves.join(' '), p.rating]); taken++;
  }
}
writeFileSync(new URL('../public/games/chesslearn/puzzles.json', import.meta.url), JSON.stringify(out));
console.log(out.length, 'puzzles', out[0][3], '→', out[out.length - 1][3]);
