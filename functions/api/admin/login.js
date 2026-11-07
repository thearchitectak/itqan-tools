import { json, err, clientIp, safeEqual, signToken, SESSION_COOKIE } from '../../_lib/core.js';

const MAX_FAILS = 5, LOCK_MIN = 15;

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) return err('لم تُضبط كلمة مرور المالك بعد. أضف المتغير السري ADMIN_PASSWORD في إعدادات Cloudflare.', 503);
  const ip = clientIp(request); const key = 'login-fail:' + ip;
  const fails = env.ITQAN_KV ? Number(await env.ITQAN_KV.get(key)) || 0 : 0;
  if (fails >= MAX_FAILS) return err(`تجاوزت عدد المحاولات المسموح به. حاول مجددًا بعد ${LOCK_MIN} دقيقة.`, 429);
  let body = {}; try { body = await request.json(); } catch { }
  await new Promise(r => setTimeout(r, 400));
  const okUser = !env.ADMIN_USERNAME || safeEqual((body.username || '').trim(), env.ADMIN_USERNAME);
  if (!okUser || !safeEqual(body.password || '', env.ADMIN_PASSWORD)) {
    if (env.ITQAN_KV) await env.ITQAN_KV.put(key, String(fails + 1), { expirationTtl: LOCK_MIN * 60 });
    return err('بيانات الدخول غير صحيحة.', 401);
  }
  if (env.ITQAN_KV && fails) await env.ITQAN_KV.delete(key);
  const hours = 12;
  const token = await signToken(env, { role: 'admin', exp: Date.now() + hours * 3600e3 });
  return json({ ok: true }, 200, { 'set-cookie': `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${hours * 3600}` });
}
