// اللعب عبر الإنترنت بين متصفحين مباشرة (WebRTC عبر PeerJS)، دون خادم خاص بالموقع.
// المضيف ينشئ غرفة برقم من 6 أرقام وكلمة سر، والضيف يدخل الرقم وكلمة السر.
const PREFIX = 'itqan-play-chess-';
let loading = null;
function loadPeerJs() {
  if (window.Peer) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = new URL('../../vendor/peerjs.min.js', import.meta.url).href;
    s.onload = () => res(); s.onerror = () => { loading = null; rej(new Error('peerjs')); };
    document.head.append(s);
  });
  return loading;
}
const code6 = () => String(Math.floor(100000 + Math.random() * 900000));

export class Room {
  constructor(handlers) { this.h = handlers; this.peer = null; this.conn = null; this.closed = false; }

  // إنشاء غرفة
  async host({ password, name, color }) {
    await loadPeerJs();
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = code6();
      try { await this._open(PREFIX + code); this.code = code; break; }
      catch (e) { if (e?.type !== 'unavailable-id' || attempt === 3) throw e; }
    }
    this.role = 'host'; this.password = password; this.name = name; this.color = color;
    this.peer.on('connection', (conn) => {
      conn.on('data', (msg) => {
        if (msg?.type === 'hello') {
          if (this.conn && this.conn.open) { conn.send({ type: 'denied', reason: 'full' }); setTimeout(() => conn.close(), 300); return; }
          if (String(msg.password || '') !== String(this.password || '')) { conn.send({ type: 'denied', reason: 'password' }); setTimeout(() => conn.close(), 300); return; }
          this._bind(conn);
          const myColor = this.color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : this.color;
          conn.send({ type: 'start', hostName: this.name, hostColor: myColor });
          this.h.onStart?.({ opponent: String(msg.name || '').slice(0, 24), myColor });
        }
      });
    });
    return this.code;
  }

  // الانضمام إلى غرفة
  async join({ code, password, name }) {
    await loadPeerJs();
    await this._open(undefined);
    this.role = 'guest';
    return new Promise((resolve, reject) => {
      const conn = this.peer.connect(PREFIX + String(code).trim(), { reliable: true });
      const to = setTimeout(() => reject(Object.assign(new Error('timeout'), { type: 'timeout' })), 15000);
      this.peer.on('error', (e) => { clearTimeout(to); reject(e); });
      conn.on('open', () => conn.send({ type: 'hello', password, name }));
      conn.on('data', (msg) => {
        if (msg?.type === 'denied') { clearTimeout(to); reject(Object.assign(new Error(msg.reason), { type: 'denied-' + msg.reason })); }
        if (msg?.type === 'start') {
          clearTimeout(to); this._bind(conn);
          const myColor = msg.hostColor === 'w' ? 'b' : 'w';
          this.h.onStart?.({ opponent: String(msg.hostName || '').slice(0, 24), myColor });
          resolve();
        }
      });
    });
  }

  _open(id) {
    return new Promise((resolve, reject) => {
      // يمكن تحديد خادم PeerJS خاص بتعريف window.ITQAN_PEER_CONFIG قبل تحميل الصفحة
      const opts = { debug: 0, ...(window.ITQAN_PEER_CONFIG || {}) };
      const peer = id ? new window.Peer(id, opts) : new window.Peer(opts);
      const to = setTimeout(() => onErr(Object.assign(new Error('timeout'), { type: 'timeout' })), 12000);
      const onErr = (e) => { clearTimeout(to); try { peer.destroy(); } catch { } reject(e); };
      peer.once('open', () => { clearTimeout(to); peer.off('error', onErr); this.peer = peer; peer.on('error', (e) => this.h.onError?.(e)); peer.on('disconnected', () => { if (!this.closed) try { peer.reconnect(); } catch { } }); resolve(); });
      peer.once('error', onErr);
    });
  }
  _bind(conn) {
    this.conn = conn;
    conn.on('data', (msg) => { if (msg && msg.type !== 'hello' && msg.type !== 'start') this.h.onMessage?.(msg); });
    conn.on('close', () => { if (!this.closed) this.h.onLeave?.(); });
    conn.on('error', () => { if (!this.closed) this.h.onLeave?.(); });
  }
  send(msg) { try { this.conn?.open && this.conn.send(msg); } catch { } }
  close() { this.closed = true; try { this.conn?.close(); } catch { } try { this.peer?.destroy(); } catch { } }
}
