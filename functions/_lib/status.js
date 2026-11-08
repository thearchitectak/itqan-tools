import { DEFAULT_MODELS } from '../../public/assets/js/defaults.js';
import { classify } from './ai.js';

// حالة توفر طبقات دراسة الجدوى الثلاث.
// - الطبقة التي ينفد رصيدها أو تتجاوز حصتها تُعلَّم «غير متاحة» مؤقتًا في KV، ثم يُعاد فحصها تلقائيًا.
// - يُجرى فحص خفيف للمفتاح كل 30 دقيقة على الأكثر، وتكلفته لا تُذكر.

const DOWN_TTL = { credit: 3600, auth: 3600, quota: 3 * 3600, nokey: 600 };
const OK_TTL = { anthropic: 1800, gemini: 6 * 3600 };
const keyName = { anthropic: 'ANTHROPIC_API_KEY', gemini: 'GEMINI_API_KEY' };

// موعد تجدد الحصة اليومية المجانية لـ Gemini: منتصف الليل بتوقيت المحيط الهادئ (America/Los_Angeles)
export function nextPacificMidnight(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(now).map(p => [p.type, p.value]));
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const offset = asUTC - Math.floor(now.getTime() / 1000) * 1000; // فرق توقيت المحيط الهادئ عن UTC
  return new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day + 1) - offset);
}

export async function markDown(env, provider, code) {
  if (!env.ITQAN_KV || !DOWN_TTL[code]) return;
  try {
    let ttl = DOWN_TTL[code], resetAt = null;
    if (provider === 'gemini' && code === 'quota') { resetAt = nextPacificMidnight(); ttl = Math.max(60, Math.ceil((resetAt - Date.now()) / 1000) + 60); }
    await env.ITQAN_KV.put(`ai-down:${provider}`, JSON.stringify({ code, at: new Date().toISOString(), resetAt: resetAt && resetAt.toISOString() }), { expirationTtl: ttl });
    await env.ITQAN_KV.delete(`ai-ok:${provider}`);
  } catch { }
}

export async function clearStatus(env) {
  if (!env.ITQAN_KV) return;
  for (const p of ['anthropic', 'gemini']) { try { await env.ITQAN_KV.delete(`ai-down:${p}`); await env.ITQAN_KV.delete(`ai-ok:${p}`); } catch { } }
}

async function probe(env, provider, cfg) {
  if (env.AI_MOCK === '1') {
    if (env.AI_MOCK_DOWN && env.AI_MOCK_DOWN.split(',').includes(provider)) return provider === 'gemini' ? 'quota' : 'credit';
    return null;
  }
  try {
    if (provider === 'anthropic') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: cfg.feasibility.modes.anthropic.model || DEFAULT_MODELS.anthropic, max_tokens: 1, messages: [{ role: 'user', content: '.' }] }),
      });
      if (r.ok) return null;
      const d = await r.json().catch(() => ({}));
      const c = classify('anthropic', r.status, d?.error?.message);
      return ['credit', 'auth'].includes(c) ? c : null; // الضغط المؤقت لا يعطّل الطبقة
    }
    if (provider === 'gemini') {
      // قائمة النماذج طلب مجاني يتحقق من صلاحية المفتاح
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': env.GEMINI_API_KEY } });
      if (r.ok) return null;
      const d = await r.json().catch(() => ({}));
      const c = classify('gemini', r.status, d?.error?.message);
      return ['auth', 'quota'].includes(c) ? c : null;
    }
  } catch { return null; }
  return null;
}

export async function providerStatus(env, cfg, { probeNow = true } = {}) {
  const modes = cfg.feasibility.modes;
  const out = { manual: { available: modes.manual.enabled !== false, reason: modes.manual.enabled === false ? 'disabled' : null } };
  for (const p of ['anthropic', 'gemini']) {
    if (modes[p].enabled === false) { out[p] = { available: false, reason: 'disabled' }; continue; }
    if (!env[keyName[p]]) { out[p] = { available: false, reason: 'nokey' }; continue; }
    let down = null, ok = null;
    if (env.ITQAN_KV) { try { down = await env.ITQAN_KV.get(`ai-down:${p}`, 'json'); ok = await env.ITQAN_KV.get(`ai-ok:${p}`); } catch { } }
    if (down) { out[p] = { available: false, reason: down.code, since: down.at, resetAt: down.resetAt || null }; continue; }
    if (!ok && probeNow && env.ITQAN_KV) {
      const bad = await probe(env, p, cfg);
      if (bad) { await markDown(env, p, bad); out[p] = { available: false, reason: bad, resetAt: p === 'gemini' && bad === 'quota' ? nextPacificMidnight().toISOString() : null }; continue; }
      try { await env.ITQAN_KV.put(`ai-ok:${p}`, '1', { expirationTtl: OK_TTL[p] }); } catch { }
    }
    out[p] = { available: true, reason: null };
  }
  if (cfg.feasibility.enabled === false) for (const k of Object.keys(out)) out[k] = { available: false, reason: 'disabled' };
  return out;
}
