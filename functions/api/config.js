import { getConfig, json } from '../_lib/core.js';

// الإعدادات العامة للموقع (لا تحتوي على أي مفاتيح أو أسرار)
export async function onRequestGet({ env }) {
  const cfg = await getConfig(env);
  const pub = structuredClone(cfg);
  delete pub.feasibility.extraInstructions;
  return json(pub, 200, { 'cache-control': 'public, max-age=30' });
}
