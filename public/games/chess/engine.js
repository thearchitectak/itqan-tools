// غلاف محرك Stockfish (يعمل داخل Web Worker في متصفح اللاعب، دون أي خادم)
const ENGINE_URL = new URL('../../vendor/stockfish/stockfish-19-lite-single.js', import.meta.url);

export class Engine {
  constructor() {
    this.worker = null; this.ready = null; this.listeners = new Set(); this.busy = Promise.resolve();
  }
  start() {
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve, reject) => {
      try { this.worker = new Worker(ENGINE_URL); }
      catch (e) { reject(e); return; }
      const to = setTimeout(() => reject(new Error('engine timeout')), 20000);
      this.worker.onmessage = (e) => {
        const line = typeof e.data === 'string' ? e.data : String(e.data?.data ?? '');
        if (line === 'uciok') { this.send('isready'); }
        if (line === 'readyok' && to) { clearTimeout(to); resolve(); }
        this.listeners.forEach(f => f(line));
      };
      this.worker.onerror = (e) => { clearTimeout(to); reject(e); };
      this.send('uci');
    });
    return this.ready;
  }
  send(cmd) { this.worker?.postMessage(cmd); }
  stop() { this.send('stop'); }
  terminate() { try { this.worker?.terminate(); } catch { } this.worker = null; this.ready = null; }

  // يشغّل أمر بحث ويعيد السطور حتى bestmove (العمليات تُنفّذ بالتتابع)
  _run(setup, goCmd, onInfo) {
    const job = this.busy.then(() => this.start()).then(() => new Promise((resolve) => {
      for (const c of setup) this.send(c);
      const f = (line) => {
        if (line.startsWith('info')) onInfo?.(line);
        else if (line.startsWith('bestmove')) { this.listeners.delete(f); resolve(line.split(/\s+/)[1]); }
      };
      this.listeners.add(f);
      this.send(goCmd);
    }));
    this.busy = job.catch(() => { });
    return job;
  }

  // نقلة الكمبيوتر حسب المستوى
  bestMove(fen, level) {
    const L = LEVELS[level] || LEVELS.medium;
    return this._run([
      'setoption name MultiPV value 1',
      `setoption name UCI_LimitStrength value ${L.elo ? 'true' : 'false'}`,
      ...(L.elo ? [`setoption name UCI_Elo value ${L.elo}`] : []),
      `setoption name Skill Level value ${L.skill}`,
      'ucinewgame', 'isready', `position fen ${fen}`,
    ], L.go);
  }

  // تحليل متعدد الخيارات للمساعد: يعيد أفضل الخطوط مرتبة
  analyze(fen, { multipv = 5, depth = 14, movetime = 2500 } = {}) {
    const lines = new Map();
    return this._run([
      `setoption name MultiPV value ${multipv}`,
      'setoption name UCI_LimitStrength value false',
      'setoption name Skill Level value 20',
      'isready', `position fen ${fen}`,
    ], `go depth ${depth} movetime ${movetime}`, (line) => {
      const m = parseInfo(line); if (!m) return;
      const prev = lines.get(m.multipv);
      if (!prev || m.depth >= prev.depth) lines.set(m.multipv, m);
    }).then((best) => {
      const arr = [...lines.values()].sort((a, b) => a.multipv - b.multipv);
      if (!arr.length && best && best !== '(none)') arr.push({ multipv: 1, depth: 0, cp: 0, mate: null, pv: [best] });
      return arr;
    });
  }
}

export const LEVELS = {
  easy: { elo: 1320, skill: 0, go: 'go depth 3 movetime 150', random: 0.3 },
  medium: { elo: 1750, skill: 8, go: 'go movetime 450', random: 0 },
  hard: { elo: 0, skill: 20, go: 'go movetime 1300', random: 0 },
};

function parseInfo(line) {
  if (!/ pv /.test(line) || !/ score /.test(line)) return null;
  const g = (re) => { const m = line.match(re); return m ? m[1] : null; };
  const depth = +g(/ depth (\d+)/) || 0;
  const multipv = +g(/ multipv (\d+)/) || 1;
  const cp = g(/ score cp (-?\d+)/), mate = g(/ score mate (-?\d+)/);
  if (/ (upperbound|lowerbound) /.test(line)) return null;
  const pv = line.split(' pv ')[1].trim().split(/\s+/);
  return { depth, multipv, cp: cp != null ? +cp : null, mate: mate != null ? +mate : null, pv };
}
