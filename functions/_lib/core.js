import { mergeConfig } from '../../public/assets/js/defaults.js';

export const CONFIG_KEY = 'site-config';

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
}
export const err = (message, status = 400) => json({ error: message }, status);

export async function getConfig(env) {
  let saved = null;
  if (env.ITQAN_KV) { try { saved = await env.ITQAN_KV.get(CONFIG_KEY, 'json'); } catch { } }
  return mergeConfig(saved);
}

export function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '0.0.0.0';
}

const enc = new TextEncoder();
function b64url(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function secret(env) { return env.SESSION_SECRET || ('itqan:' + (env.ADMIN_PASSWORD || 'unset')); }
async function hmac(env, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret(env)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}
export async function signToken(env, payload) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  return body + '.' + await hmac(env, body);
}
export async function verifyToken(env, token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!safeEqual(sig, await hmac(env, body))) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));
    if (p.exp && Date.now() > p.exp) return null;
    return p;
  } catch { return null; }
}
export function safeEqual(a, b) {
  a = String(a ?? ''); b = String(b ?? '');
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export const SESSION_COOKIE = 'itq_admin';
export function getCookie(request, name) {
  const c = request.headers.get('cookie') || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}
export async function requireAdmin(request, env) {
  const t = await verifyToken(env, getCookie(request, SESSION_COOKIE));
  return t && t.role === 'admin' ? t : null;
}
