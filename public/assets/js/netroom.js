// غرف اللعب عبر الإنترنت لعدة لاعبين (اتصال مباشر بين المتصفحات عبر PeerJS، دون خادم خاص بالموقع)
// المضيف ينشئ غرفة برقم من 6 أرقام وكلمة سر، ويدير حالة اللعبة، والضيوف يرسلون أفعالهم إليه.
const PREFIX = 'itqan-play-';
let loading = null;
export function loadPeer() {
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
function openPeer(id) {
  return new Promise((resolve, reject) => {
    // يمكن تحديد خادم PeerJS خاص بتعريف window.ITQAN_PEER_CONFIG
    const opts = { debug: 0, ...(window.ITQAN_PEER_CONFIG || {}) };
    const peer = id ? new window.Peer(id, opts) : new window.Peer(opts);
    const to = setTimeout(() => fail(Object.assign(new Error('timeout'), { type: 'timeout' })), 12000);
    const fail = (e) => { clearTimeout(to); try { peer.destroy(); } catch { } reject(e); };
    peer.once('open', () => { clearTimeout(to); peer.off('error', fail); peer.on('disconnected', () => { try { peer.reconnect(); } catch { } }); resolve(peer); });
    peer.once('error', fail);
  });
}
const code6 = () => String(Math.floor(100000 + Math.random() * 900000));

export class HostRoom {
  // h: { onJoin(id, info), onLeave(id), onMessage(id, msg) }
  constructor(game, { password, max = 3 }, h) { this.game = game; this.password = String(password || ''); this.max = max; this.h = h; this.conns = new Map(); this.locked = false; this.closed = false; }
  async open() {
    await loadPeer();
    for (let i = 0; i < 4; i++) {
      const code = code6();
      try { this.peer = await openPeer(PREFIX + this.game + '-' + code); this.code = code; break; }
      catch (e) { if (e?.type !== 'unavailable-id' || i === 3) throw e; }
    }
    this.peer.on('connection', (conn) => {
      conn.on('data', (msg) => {
        if (msg?.type === 'hello') {
          const deny = (reason) => { conn.send({ type: 'denied', reason }); setTimeout(() => conn.close(), 300); };
          if (String(msg.password || '') !== this.password) return deny('password');
          if (this.locked) return deny('started');
          if (this.conns.size >= this.max) return deny('full');
          this.conns.set(conn.peer, conn);
          conn.send({ type: 'welcome', id: conn.peer });
          this.h.onJoin?.(conn.peer, msg.info || {});
        } else if (this.conns.has(conn.peer)) this.h.onMessage?.(conn.peer, msg);
      });
      const gone = () => { if (this.conns.delete(conn.peer) && !this.closed) this.h.onLeave?.(conn.peer); };
      conn.on('close', gone); conn.on('error', gone);
    });
    return this.code;
  }
  send(id, msg) { try { const c = this.conns.get(id); c?.open && c.send(msg); } catch { } }
  broadcast(msg) { for (const id of this.conns.keys()) this.send(id, msg); }
  close() { this.closed = true; for (const c of this.conns.values()) { try { c.close(); } catch { } } try { this.peer?.destroy(); } catch { } }
}

export class GuestRoom {
  // h: { onMessage(msg), onLeave() }
  constructor(game, h) { this.game = game; this.h = h; this.closed = false; }
  async join(code, password, info) {
    await loadPeer();
    this.peer = await openPeer(undefined);
    return new Promise((resolve, reject) => {
      const conn = this.peer.connect(PREFIX + this.game + '-' + String(code).trim(), { reliable: true });
      const to = setTimeout(() => reject(Object.assign(new Error('timeout'), { type: 'timeout' })), 15000);
      this.peer.on('error', (e) => { clearTimeout(to); reject(e); });
      conn.on('open', () => conn.send({ type: 'hello', password, info }));
      conn.on('data', (msg) => {
        if (msg?.type === 'denied') { clearTimeout(to); reject(Object.assign(new Error(msg.reason), { type: 'denied-' + msg.reason })); return; }
        if (msg?.type === 'welcome') { clearTimeout(to); this.conn = conn; this.id = msg.id; resolve(msg.id); return; }
        if (this.conn) this.h.onMessage?.(msg);
      });
      const gone = () => { if (!this.closed && this.conn) this.h.onLeave?.(); };
      conn.on('close', gone); conn.on('error', gone);
    });
  }
  send(msg) { try { this.conn?.open && this.conn.send(msg); } catch { } }
  close() { this.closed = true; try { this.conn?.close(); } catch { } try { this.peer?.destroy(); } catch { } }
}

// تحويل أخطاء الاتصال إلى مفاتيح رسائل
export function netError(e) {
  const ty = e?.type || '';
  if (ty === 'peer-unavailable') return 'net_notFound';
  if (ty === 'denied-password') return 'net_badPass';
  if (ty === 'denied-full') return 'net_full';
  if (ty === 'denied-started') return 'net_started';
  if (ty === 'timeout') return 'net_timeout';
  return 'net_error';
}
