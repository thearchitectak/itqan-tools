import { json, getConfig, requireAdmin } from '../_lib/core.js';
import { providerStatus, clearStatus } from '../_lib/status.js';

// حالة توفر طبقات دراسة الجدوى (Claude / Gemini / يدوي)
export async function onRequestGet({ request, env }) {
  const cfg = await getConfig(env);
  const url = new URL(request.url);
  if (url.searchParams.get('refresh') === '1' && await requireAdmin(request, env)) await clearStatus(env);
  const status = await providerStatus(env, cfg);
  return json({ status, defaultMode: cfg.feasibility.defaultMode, autoFallback: cfg.feasibility.autoFallback !== false });
}
