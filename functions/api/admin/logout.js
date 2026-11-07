import { json, SESSION_COOKIE } from '../../_lib/core.js';

export async function onRequestPost() {
  return json({ ok: true }, 200, { 'set-cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
}
