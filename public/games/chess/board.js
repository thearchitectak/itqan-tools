// مكوّن رقعة شطرنج قابل لإعادة الاستخدام (المراجعة، الدروس، الألغاز، التدريب)
import { h, settings } from '../../assets/js/core.js';

export const FILES = 'abcdefgh';
export const THEMES = { green: ['#eeeed2', '#769656'], brown: ['#f0d9b5', '#b58863'], blue: ['#dee3e6', '#8ca2ad'], gray: ['#ebecd0', '#a7a7a7'], purple: ['#ece4f7', '#9c7fc6'] };
export const pieceUrl = (c, p) => new URL(`../../vendor/pieces/${settings.pieceSet === 'merida' ? 'merida' : 'cburnett'}/${c}${p.toUpperCase()}.svg`, import.meta.url).href;
const NS = 'http://www.w3.org/2000/svg';

// opts:
//  pieceAt(sq) -> {color,type}|null
//  legal(sq) -> [{to, promotion?}]       (النقلات المسموحة من المربع)
//  canSelect(sq) -> bool
//  onMove(from, to) -> Promise|void       (يُستدعى عند نقلة صحيحة)
//  orientation 'w'|'b'
// يدعم أسلوبين: new Board(container, opts) أو new Board(opts) ثم إلحاق board.el بالصفحة
export class Board {
  constructor(container, opts = {}) {
    if (!(container instanceof Element)) { opts = container || {}; container = null; this.legacy = true; }
    this.o = { orientation: 'w', interactive: true, ...opts };
    this.state = { last: null, check: null, arrows: [], marks: {}, badges: {} };
    this.sel = null; this.targets = [];
    this.wrap = h('div', { class: 'cb-wrap' });
    this.grid = h('div', { class: 'cb', dir: 'ltr' });
    this.el = this.wrap;
    this.svg = document.createElementNS(NS, 'svg'); this.svg.setAttribute('viewBox', '0 0 8 8'); this.svg.setAttribute('class', 'cb-arrows');
    this.badgeLayer = h('div', { class: 'cb-badges' });
    this.wrap.append(this.grid, this.svg, this.badgeLayer);
    container?.append(this.wrap);
    this._bind();
  }
  get orientation() { return this.o.orientation; }
  setOrientation(c) { this.o.orientation = c; this.render(); }
  flip() { this.setOrientation(this.o.orientation === 'w' ? 'b' : 'w'); }
  set(state) { Object.assign(this.state, state); this.render(); }
  clearSelection() { this.sel = null; this.targets = []; }

  render() {
    const [light, dark] = THEMES[settings.boardTheme] || THEMES.green;
    this.grid.style.setProperty('--light', light); this.grid.style.setProperty('--dark', dark);
    this.grid.innerHTML = '';
    const flip = this.o.orientation === 'b', st = this.state;
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const file = flip ? 7 - f : f, rank = flip ? r + 1 : 8 - r;
      const sq = FILES[file] + rank, p = this.o.pieceAt?.(sq);
      const cls = ['sq', (file + rank) % 2 === 0 ? 'l' : 'd'];
      if (st.last && (st.last.from === sq || st.last.to === sq)) cls.push('last');
      if (this.sel === sq) cls.push('sel');
      if (st.check === sq) cls.push('check');
      const mk = st.marks?.[sq];
      if (mk && mk !== 'star') cls.push('mk-' + mk);
      if (this.targets.includes(sq)) cls.push(p ? 'cap' : 'dot');
      this.grid.append(h('div', { class: cls.join(' '), 'data-sq': sq },
        f === 0 ? h('span', { class: 'co rk' }, rank) : null, r === 7 ? h('span', { class: 'co fl' }, FILES[file]) : null,
        mk === 'star' ? h('span', { class: 'star' }, '★') : null,
        p ? h('img', { class: 'pc', src: pieceUrl(p.color, p.type), alt: p.color + p.type, draggable: 'false' }) : null));
    }
    this._arrows(); this._badges();
  }
  center(sq) {
    const file = FILES.indexOf(sq[0]), rank = +sq[1], flip = this.o.orientation === 'b';
    return [(flip ? 7 - file : file) + 0.5, (flip ? rank - 1 : 8 - rank) + 0.5];
  }
  _arrows() {
    this.svg.innerHTML = '';
    for (const a of this.state.arrows || []) {
      const color = a.color || '#16a34a';
      const [x1, y1] = this.center(a.from), [x2, y2] = this.center(a.to);
      const ang = Math.atan2(y2 - y1, x2 - x1), len = Math.hypot(x2 - x1, y2 - y1) - 0.35;
      const g = document.createElementNS(NS, 'g'); g.setAttribute('opacity', a.opacity ?? 0.85);
      const line = document.createElementNS(NS, 'line');
      Object.entries({ x1, y1, x2: x1 + Math.cos(ang) * len, y2: y1 + Math.sin(ang) * len, stroke: color, 'stroke-width': a.width || 0.17, 'stroke-linecap': 'round' }).forEach(([k, v]) => line.setAttribute(k, v));
      const hx = x2 - Math.cos(ang) * 0.12, hy = y2 - Math.sin(ang) * 0.12;
      const p1 = [hx - Math.cos(ang) * 0.4 + Math.sin(ang) * 0.28, hy - Math.sin(ang) * 0.4 - Math.cos(ang) * 0.28];
      const p2 = [hx - Math.cos(ang) * 0.4 - Math.sin(ang) * 0.28, hy - Math.sin(ang) * 0.4 + Math.cos(ang) * 0.28];
      const head = document.createElementNS(NS, 'polygon'); head.setAttribute('points', `${hx},${hy} ${p1.join(',')} ${p2.join(',')}`); head.setAttribute('fill', color);
      g.append(line, head); this.svg.append(g);
    }
  }
  _badges() {
    this.badgeLayer.innerHTML = '';
    for (const [sq, b] of Object.entries(this.state.badges || {})) {
      const [x, y] = this.center(sq);
      this.badgeLayer.append(h('span', { class: 'cb-badge', style: { left: `${(x + 0.5) / 8 * 100}%`, top: `${(y - 0.5) / 8 * 100}%`, background: b.color }, title: b.title || '' }, b.text));
    }
  }

  // ----- واجهة الأسلوب الأقدم المستخدمة في الأكاديمية -----
  setPosition(x) {
    if (x && typeof x.get === 'function' && typeof x.fen === 'function') { const c = x; this.o.pieceAt = (sq) => c.get(sq) || null; this.state.check = kingInCheck(c); }
    else { const map = x || {}; this.o.pieceAt = (sq) => map[sq] ? { color: map[sq][0], type: map[sq][1].toLowerCase() } : null; this.state.check = null; }
    this.sel = null; this.targets = []; this.render();
  }
  setLast(m) { this.state.last = m ? { from: m.from, to: m.to } : null; this.render(); }
  setArrows(a) { this.state.arrows = a || []; this._arrows(); }
  setMarks(m) { this.state.marks = m || {}; this.render(); }
  flash(sq) { const el = this.grid.querySelector(`[data-sq="${sq}"]`); if (el) { el.classList.remove('flash-bad'); void el.offsetWidth; el.classList.add('flash-bad'); } }
  _legal(sq) { if (this.o.legal) return this.o.legal(sq); if (this.o.legalTargets) return (this.o.legalTargets(sq) || []).map(to => ({ to })); return []; }
  _canSelect(sq) { return this.o.canSelect ? this.o.canSelect(sq) : this.o.canMove ? this.o.canMove(sq) : false; }

  _select(sq) { this.sel = sq; this.targets = this._legal(sq).map(m => m.to); this.render(); }
  async _try(from, to) {
    if (this.legacy) { this.sel = null; this.targets = []; this.render(); return this.o.onMove?.({ from, to }); }
    const ms = this._legal(from).filter(m => m.to === to);
    this.sel = null; this.targets = [];
    if (!ms.length) { this.render(); return; }
    let promotion = ms.find(m => m.promotion) ? (await this.o.askPromotion?.(this.o.pieceAt(from).color)) || null : undefined;
    if (promotion === null) { this.render(); return; }
    await this.o.onMove?.(from, to, promotion);
  }
  _bind() {
    let drag = null;
    this.grid.addEventListener('pointerdown', (e) => {
      if (!this.o.interactive || e.button > 0) return;
      const sqEl = e.target.closest('.sq'); if (!sqEl) return;
      const sq = sqEl.dataset.sq;
      if (this.sel && this.targets.includes(sq)) { e.preventDefault(); this._try(this.sel, sq); return; }
      if (this._canSelect(sq)) {
        e.preventDefault(); this._select(sq);
        const img = this.grid.querySelector(`[data-sq="${sq}"] .pc`);
        if (img) {
          const r = img.getBoundingClientRect();
          const ghost = img.cloneNode(); ghost.className = 'pc-ghost';
          Object.assign(ghost.style, { width: r.width + 'px', height: r.height + 'px', left: (e.clientX - r.width / 2) + 'px', top: (e.clientY - r.height / 2) + 'px' });
          document.body.append(ghost); img.style.opacity = '.35';
          drag = { from: sq, ghost, w: r.width, moved: false, x: e.clientX, y: e.clientY };
        }
      } else if (this.sel) { this.sel = null; this.targets = []; this.render(); }
    });
    this._mv = (e) => {
      if (!drag) return;
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) drag.moved = true;
      drag.ghost.style.left = (e.clientX - drag.w / 2) + 'px'; drag.ghost.style.top = (e.clientY - drag.w / 2) + 'px';
    };
    this._up = (e) => {
      if (!drag) return;
      const d = drag; drag = null; d.ghost.remove();
      const to = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.cb .sq')?.dataset.sq;
      if (d.moved && to && to !== d.from && this.targets.includes(to)) this._try(d.from, to);
      else this.render();
    };
    window.addEventListener('pointermove', this._mv); window.addEventListener('pointerup', this._up);
  }
  destroy() { window.removeEventListener('pointermove', this._mv); window.removeEventListener('pointerup', this._up); this.wrap.remove(); }
}

// ربط الرقعة بكائن chess.js
export function chessBoard(container, chess, opts = {}) {
  const b = new Board(container, {
    pieceAt: (sq) => chess.get(sq) || null,
    legal: (sq) => chess.moves({ square: sq, verbose: true }).map(m => ({ to: m.to, promotion: m.promotion })),
    canSelect: (sq) => { const p = chess.get(sq); return !!p && p.color === chess.turn(); },
    ...opts,
  });
  return b;
}
export function kingInCheck(chess) { return chess.inCheck() ? chess.findPiece({ type: 'k', color: chess.turn() })[0] : null; }
