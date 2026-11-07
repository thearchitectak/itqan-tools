import fs from 'fs';
const names = process.argv.slice(2);
const out = {};
for (const n of names) {
  let s = fs.readFileSync(`node_modules/lucide-static/icons/${n}.svg`, 'utf8');
  s = s.replace(/<!--[\s\S]*?-->/g, '').replace(/\s*class="[^"]*"/, '').replace(/\n\s*/g, ' ').trim();
  out[n] = s;
}
fs.writeFileSync('public/assets/js/icons.js', '// Lucide icons (ISC License) — https://lucide.dev\nexport const ICONS = ' + JSON.stringify(out, null, 1) + ';\nexport function icon(n, size = 24) { const s = ICONS[n] || ICONS["file-text"]; return s.replace(/width="24"/, `width="${size}"`).replace(/height="24"/, `height="${size}"`); }\n');
console.log(Object.keys(out).length);
