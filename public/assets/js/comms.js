// لوحة التواصل في غرف اللعب عبر الإنترنت: محادثة كتابية، وميكروفون وكاميرا اختياريان (مغلقان عند الدخول)
// الصوت والصورة يُرسلان مباشرة بين أجهزة اللاعبين عبر PeerJS، ولا يمرّان بأي خادم للموقع.
import { h, ico, t, addDict, toast, sound } from './core.js';

addDict({
  ar: {
    cm_chat: 'المحادثة', cm_send: 'إرسال', cm_placeholder: 'اكتب رسالة…', cm_mic: 'الميكروفون', cm_cam: 'الكاميرا', cm_on: 'تشغيل', cm_off: 'إيقاف',
    cm_micOn: 'شغّل الميكروفون', cm_micOff: 'أوقف الميكروفون', cm_camOn: 'شغّل الكاميرا', cm_camOff: 'أوقف الكاميرا',
    cm_denied: 'لم يُسمح بالوصول إلى {what}. تحقق من إذن المتصفح.', cm_noDevice: 'لم يُعثر على {what} في هذا الجهاز.', cm_you: 'أنت',
    cm_empty: 'لا رسائل بعد. الميكروفون والكاميرا مغلقان، ويمكنك تشغيلهما متى شئت.', cm_tapSound: 'اضغط لتشغيل الصوت', cm_hint: 'الميكروفون والكاميرا اختياريان ومغلقان عند الدخول.',
  },
  en: {
    cm_chat: 'Chat', cm_send: 'Send', cm_placeholder: 'Type a message…', cm_mic: 'microphone', cm_cam: 'camera', cm_on: 'On', cm_off: 'Off',
    cm_micOn: 'Turn microphone on', cm_micOff: 'Turn microphone off', cm_camOn: 'Turn camera on', cm_camOff: 'Turn camera off',
    cm_denied: 'Access to the {what} was not allowed. Check your browser permission.', cm_noDevice: 'No {what} was found on this device.', cm_you: 'You',
    cm_empty: 'No messages yet. Your microphone and camera are off; turn them on whenever you like.', cm_tapSound: 'Tap to enable sound', cm_hint: 'Microphone and camera are optional and off when you join.',
  },
});

if (!document.getElementById('comms-css')) document.head.append(h('link', { id: 'comms-css', rel: 'stylesheet', href: new URL('../css/comms.css', import.meta.url).href }));

export class Comms {
  // peer: كائن PeerJS الخاص بهذا اللاعب
  // me: { id, name }   sendChat(text): إرسال رسالة نصية عبر قناة اللعبة
  constructor({ peer, me, sendChat }) {
    this.peer = peer; this.me = me; this.sendChat = sendChat;
    this.roster = []; this.out = new Map(); this.inCalls = new Map(); this.remote = new Map();
    this.mic = false; this.cam = false; this.stream = null; this.open = false; this.unread = 0;
    this._onCall = (call) => this._answer(call);
    peer?.on('call', this._onCall);
    this._build();
  }
  // ----- الواجهة -----
  _build() {
    this.badge = h('span', { class: 'cm-badge hidden' });
    this.fab = h('button', { class: 'cm-fab', type: 'button', title: t('cm_chat'), onclick: () => this.toggle() }, ico('send', 22), this.badge);
    this.micBtn = h('button', { class: 'cm-tg', type: 'button', onclick: () => this.setMic(!this.mic) });
    this.camBtn = h('button', { class: 'cm-tg', type: 'button', onclick: () => this.setCam(!this.cam) });
    this.videos = h('div', { class: 'cm-videos' });
    this.list = h('div', { class: 'cm-list' }, h('p', { class: 'cm-empty' }, t('cm_empty')));
    this.input = h('input', { class: 'input', maxlength: 300, placeholder: t('cm_placeholder'), onkeydown: (e) => { if (e.key === 'Enter') this._send(); } });
    this.panel = h('div', { class: 'cm-panel hidden', role: 'dialog' },
      h('div', { class: 'cm-head' }, h('b', { class: 'grow' }, t('cm_chat')), this.micBtn, this.camBtn, h('button', { class: 'icon-btn', type: 'button', onclick: () => this.toggle(false), 'aria-label': t('close') }, ico('x', 18))),
      this.videos, this.list,
      h('div', { class: 'cm-input' }, this.input, h('button', { class: 'btn sm', type: 'button', onclick: () => this._send() }, t('cm_send'))));
    this.root = h('div', { class: 'cm-root' }, this.panel, this.fab);
    document.body.append(this.root);
    this._refreshButtons();
  }
  _refreshButtons() {
    this.micBtn.className = 'cm-tg' + (this.mic ? ' on' : ''); this.micBtn.title = t(this.mic ? 'cm_micOff' : 'cm_micOn');
    this.micBtn.innerHTML = ''; this.micBtn.append(ico(this.mic ? 'mic' : 'mic-off', 18));
    this.camBtn.className = 'cm-tg' + (this.cam ? ' on' : ''); this.camBtn.title = t(this.cam ? 'cm_camOff' : 'cm_camOn');
    this.camBtn.innerHTML = ''; this.camBtn.append(ico(this.cam ? 'video' : 'video-off', 18));
    this.fab.classList.toggle('live', this.mic || this.cam);
  }
  toggle(force) {
    this.open = force ?? !this.open;
    this.panel.classList.toggle('hidden', !this.open);
    if (this.open) { this.unread = 0; this.badge.classList.add('hidden'); setTimeout(() => this.input.focus(), 50); this.list.scrollTop = this.list.scrollHeight; }
  }
  _send() {
    const text = this.input.value.trim(); if (!text) return;
    this.input.value = '';
    this.sendChat(text);
    this.addChat({ name: this.me.name, text, mine: true });
  }
  addChat({ name, text, mine = false }) {
    this.list.querySelector('.cm-empty')?.remove();
    this.list.append(h('div', { class: 'cm-msg' + (mine ? ' mine' : '') }, h('small', {}, mine ? t('cm_you') : name), h('span', {}, String(text).slice(0, 300))));
    this.list.scrollTop = this.list.scrollHeight;
    if (!mine && !this.open) { this.unread++; this.badge.textContent = this.unread; this.badge.classList.remove('hidden'); sound('notify'); }
  }

  // ----- قائمة المشاركين -----
  setRoster(list) {
    this.roster = (list || []).filter(x => x && x.id);
    const others = this.roster.filter(x => x.id !== this.me.id).map(x => x.id);
    // الاتصال باللاعبين الجدد إذا كان البث مفتوحًا
    if (this.stream) for (const id of others) if (!this.out.has(id)) this._call(id);
    // إغلاق اتصالات من غادروا
    for (const id of [...this.out.keys()]) if (!others.includes(id)) { try { this.out.get(id).close(); } catch { } this.out.delete(id); }
    for (const id of [...this.remote.keys()]) if (!others.includes(id)) this._removeRemote(id);
    this._renderVideos();
  }
  nameOf(id) { return this.roster.find(x => x.id === id)?.name || '…'; }

  // ----- الصوت والصورة -----
  async setMic(on) { if (on === this.mic) return; this.mic = on; if (!(await this._rebuild('mic'))) this.mic = false; this._refreshButtons(); }
  async setCam(on) { if (on === this.cam) return; this.cam = on; if (!(await this._rebuild('cam'))) this.cam = false; this._refreshButtons(); }
  async _rebuild(changed) {
    // إيقاف البث السابق
    for (const c of this.out.values()) { try { c.close(); } catch { } }
    this.out.clear();
    if (this.stream) { this.stream.getTracks().forEach(tr => tr.stop()); this.stream = null; }
    if (!this.mic && !this.cam) { this._renderVideos(); return true; }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: this.mic ? { echoCancellation: true, noiseSuppression: true } : false, video: this.cam ? { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' } : false });
    } catch (e) {
      const what = t(changed === 'cam' ? 'cm_cam' : 'cm_mic');
      toast(e?.name === 'NotFoundError' ? t('cm_noDevice', { what }) : t('cm_denied', { what }), true);
      if (changed === 'cam') this.cam = false; else this.mic = false;
      if (this.mic || this.cam) return this._rebuild(changed === 'cam' ? 'mic' : 'cam').then(() => false);
      this._renderVideos(); return false;
    }
    for (const r of this.roster) if (r.id !== this.me.id) this._call(r.id);
    this._renderVideos();
    return true;
  }
  _call(id) {
    if (!this.peer || !this.stream) return;
    try {
      const call = this.peer.call(id, this.stream, { metadata: { name: this.me.name } });
      if (!call) return;
      this.out.set(id, call);
      call.on('close', () => { if (this.out.get(id) === call) this.out.delete(id); });
      call.on('error', () => { if (this.out.get(id) === call) this.out.delete(id); });
    } catch { }
  }
  _answer(call) {
    // نستقبل فقط (نرسل بثنا في اتصال مستقل عند تشغيل الميكروفون أو الكاميرا)
    try { call.answer(); } catch { return; }
    const id = call.peer;
    const prev = this.inCalls.get(id); if (prev && prev !== call) { try { prev.close(); } catch { } }
    this.inCalls.set(id, call);
    call.on('stream', (s) => { this.remote.set(id, s); this._renderVideos(); });
    call.on('close', () => { if (this.inCalls.get(id) === call) { this.inCalls.delete(id); this._removeRemote(id); } });
  }
  _removeRemote(id) { this.remote.delete(id); this._renderVideos(); }
  _renderVideos() {
    this.videos.innerHTML = '';
    const tiles = [];
    if (this.stream && this.cam) tiles.push({ id: this.me.id, name: t('cm_you'), stream: this.stream, mine: true });
    for (const [id, s] of this.remote) tiles.push({ id, name: this.nameOf(id), stream: s });
    for (const tl of tiles) {
      const hasVideo = tl.stream.getVideoTracks().length > 0;
      const media = h(hasVideo ? 'video' : 'audio', { autoplay: true, playsinline: true });
      media.srcObject = tl.stream; if (tl.mine) media.muted = true;
      const tile = h('div', { class: 'cm-tile' + (hasVideo ? '' : ' audio') }, media, h('span', { class: 'cm-name' }, hasVideo ? '' : ico('mic', 14), tl.name));
      media.play?.().catch(() => { tile.append(h('button', { class: 'btn sm cm-unmute', type: 'button', onclick: (e) => { media.play().catch(() => { }); e.currentTarget.remove(); } }, t('cm_tapSound'))); this.toggle(true); });
      this.videos.append(tile);
    }
    this.videos.classList.toggle('hidden', !tiles.length);
    this.fab.classList.toggle('incoming', this.remote.size > 0);
  }
  destroy() {
    try { this.peer?.off('call', this._onCall); } catch { }
    for (const c of [...this.out.values(), ...this.inCalls.values()]) { try { c.close(); } catch { } }
    if (this.stream) this.stream.getTracks().forEach(tr => tr.stop());
    this.root.remove();
  }
}
