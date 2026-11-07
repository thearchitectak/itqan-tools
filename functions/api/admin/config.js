import { json, err, getConfig, requireAdmin, CONFIG_KEY } from '../../_lib/core.js';
import { mergeConfig } from '../../../public/assets/js/defaults.js';

function envStatus(env) {
  return {
    kv: !!env.ITQAN_KV,
    anthropic: !!env.ANTHROPIC_API_KEY,
    gemini: !!env.GEMINI_API_KEY,
    openai: !!env.OPENAI_API_KEY,
    username: !!env.ADMIN_USERNAME,
    sessionSecret: !!env.SESSION_SECRET,
  };
}

export async function onRequestGet({ request, env }) {
  if (!await requireAdmin(request, env)) return err('غير مصرح.', 401);
  const cfg = await getConfig(env);
  let usage = null;
  if (env.ITQAN_KV) { try { usage = await env.ITQAN_KV.get('usage:feasibility', 'json'); } catch { } }
  return json({ config: cfg, env: envStatus(env), usage });
}

export async function onRequestPut({ request, env }) {
  if (!await requireAdmin(request, env)) return err('غير مصرح.', 401);
  if (!env.ITQAN_KV) return err('لم يُربط مخزن البيانات ITQAN_KV بالموقع بعد، لذا لا يمكن حفظ الإعدادات. راجع دليل التشغيل.', 503);
  let body; try { body = await request.json(); } catch { return err('بيانات غير صالحة.'); }
  const raw = JSON.stringify(body);
  if (raw.length > 5_000_000) return err('حجم الإعدادات كبير جدًا.');
  const cfg = mergeConfig(body);
  cfg.updatedAt = new Date().toISOString();
  await env.ITQAN_KV.put(CONFIG_KEY, JSON.stringify(cfg));
  return json({ ok: true, config: cfg });
}
