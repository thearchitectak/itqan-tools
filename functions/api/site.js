// يقرأ بيانات صاحب الموقع وقسم الدعم من «أدوات إتقان» (من خادم إلى خادم، فلا حاجة إلى تعديل ذلك الموقع)
// ويعيد الجزء العام فقط. يمكن تغيير المصدر بمتغير البيئة SHARED_SOURCE.
export async function onRequestGet({ env }) {
  const src = (env.SHARED_SOURCE || 'https://itqan-tools.pages.dev').replace(/\/+$/, '');
  try {
    const r = await fetch(src + '/api/config', { cf: { cacheTtl: 60 } });
    if (!r.ok) throw new Error('bad status ' + r.status);
    const cfg = await r.json();
    const body = { profile: cfg.profile || null, donation: cfg.donation || null, source: src };
    return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'unavailable' }), { status: 502, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  }
}
