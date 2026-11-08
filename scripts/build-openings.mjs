// يبني قاعدة الافتتاحيات من مستودع lichess-org/chess-openings (CC0)
// الاستخدام: node scripts/build-openings.mjs <مسار مجلد chess-openings>
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from '../public/vendor/chess.js';
const dir = process.argv[2] || '/tmp/chess-openings';
const out = {};
for (const f of ['a', 'b', 'c', 'd', 'e']) {
  const lines = readFileSync(`${dir}/${f}.tsv`, 'utf8').trim().split('\n').slice(1);
  for (const l of lines) {
    const [eco, name, pgn] = l.split('\t');
    const c = new Chess();
    try { c.loadPgn(pgn); } catch { continue; }
    const epd = c.fen().split(' ').slice(0, 4).join(' ');
    out[epd] = [eco, name];
  }
}
writeFileSync(new URL('../public/games/chess/data/openings.json', import.meta.url), JSON.stringify(out));
console.log(Object.keys(out).length, 'positions');
