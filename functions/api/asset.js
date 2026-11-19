// وسيط تنزيل للخامات وخرائط الإضاءة من المكتبات المجانية فقط (CC0).
// يُستخدم احتياطيًا إذا منعت المكتبة التنزيل المباشر من المتصفح. يمرّر الملف كما هو دون تخزينه.
const ALLOW = [
  'api.polyhaven.com', 'dl.polyhaven.org', 'cdn.polyhaven.com',
  'ambientcg.com', 'acg-download.struffelproductions.com', 'acg-media.struffelproductions.com',
];

export async function onRequestGet({ request }) {
  const u = new URL(request.url).searchParams.get('u');
  let target;
  try { target = new URL(u); } catch { return new Response('رابط غير صالح', { status: 400 }); }
  if (target.protocol !== 'https:' || !ALLOW.includes(target.hostname)) return new Response('المصدر غير مسموح', { status: 403 });
  let r;
  try { r = await fetch(target.toString(), { redirect: 'follow', headers: { 'user-agent': 'ITQAN-Tools/1.0 (+https://itqan-tools.pages.dev)' }, cf: { cacheTtl: 86400, cacheEverything: true } }); }
  catch { return new Response('تعذّر الوصول إلى المصدر', { status: 502 }); }
  const finalHost = new URL(r.url || target.toString()).hostname;
  if (!ALLOW.includes(finalHost)) return new Response('تحويل إلى مصدر غير مسموح', { status: 403 });
  const h = new Headers();
  for (const k of ['content-type', 'content-length', 'last-modified', 'etag']) { const v = r.headers.get(k); if (v) h.set(k, v); }
  h.set('cache-control', 'public, max-age=86400');
  h.set('access-control-allow-origin', '*');
  return new Response(r.body, { status: r.status, headers: h });
}
