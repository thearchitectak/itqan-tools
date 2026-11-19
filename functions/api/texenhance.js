import { json, err, getConfig, clientIp } from '../_lib/core.js';
import { toolsAiStatus, markDown } from '../_lib/status.js';
import { aiError } from '../_lib/ai.js';

// إعادة توليد صورة خامة كأنها ممسوحة بماسح خامات عالي الدقة، ومتكررة دون فواصل، عبر Gemini (تحرير الصور).
// التعليمات ثابتة على الخادم، والصورة لا تُحفظ. كل طلب يُحسب 3 صور من الحد اليومي.
const CATS = { marble: 'marble', wood: 'wood', floor_wood: 'wooden floor planks', stone: 'stone', concrete: 'concrete', plaster: 'plaster / painted wall', brick: 'brick wall', tiles: 'tiles', metal: 'metal', fabric: 'fabric', leather: 'leather', carpet: 'carpet', ground: 'ground' };
const FIN = { matte: 'matte', satin: 'satin', glossy: 'glossy' };
const prompt = (b) => `This photo shows a real material surface${CATS[b.category] ? ' (' + CATS[b.category] + ')' : ''}${FIN[b.finish] ? ', ' + FIN[b.finish] + ' finish' : ''}.
Recreate it as a professional PBR texture scan of the SAME material, as if captured by a dedicated high-resolution material scanner:
- Keep exactly the same material, colours, pattern, grain/veining style, scale of features and character as the photo.
- Perfectly top-down orthographic view, filling the whole square frame. No perspective, no objects, no borders, no text.
- Completely flat, even, shadowless diffuse lighting: remove all shadows, highlights, reflections, glare, vignetting and lighting gradients.
- Very sharp, crisp micro detail with no blur, noise, compression artifacts or watermarks.${b.seamless !== false ? `
- The image MUST tile seamlessly: the left edge must continue perfectly into the right edge and the top edge into the bottom edge, with no visible seams, no repeated obvious features near the borders, and uniform brightness and colour across the whole image.` : ''}
Return only the texture image, square.`;
const MAX_B64 = 4_500_000;

export async function onRequestPost({ request, env }) {
  const cfg = await getConfig(env), A = cfg.aiTools || {};
  if (A.enabled === false) return err('الذكاء الاصطناعي في الأدوات متوقف حاليًا.', 403);
  let b; try { b = await request.json(); } catch { return err('بيانات غير صالحة.'); }
  const img = b?.image;
  if (!img || !['image/jpeg', 'image/png'].includes(img.mime) || typeof img.data !== 'string' || !img.data.length) return err('لم تُرسل الصورة.');
  if (img.data.length > MAX_B64) return err('حجم الصورة كبير جدًا.', 413);

  const ip = clientIp(request), limit = Number(A.dailyImagesPerIp) || 0;
  let rlKey = null, used = 0;
  if (env.ITQAN_KV && limit > 0) {
    rlKey = `rlv:${new Date().toISOString().slice(0, 10)}:${ip}`;
    used = Number(await env.ITQAN_KV.get(rlKey)) || 0;
    if (used + 3 > limit) return json({ error: 'وصلت إلى الحد اليومي لاستخدام الذكاء الاصطناعي. يمكنك العودة غدًا.', limit: true }, 429);
  }
  const st = await toolsAiStatus(env, cfg, { probeNow: false });
  if (!st.gemini?.available) return json({ error: 'إعادة التوليد تحتاج إلى Gemini، وهو غير متاح حاليًا.', unavailable: true }, 503);

  let out;
  try {
    if (env.AI_MOCK === '1') out = { mime: img.mime, data: img.data }; // للتشغيل المحلي فقط
    else {
      if (!env.GEMINI_API_KEY) throw Object.assign(new Error('nokey'), { code: 'nokey' });
      const model = A.imageModel || 'gemini-2.5-flash-image';
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ inline_data: { mime_type: img.mime, data: img.data } }, { text: prompt(b) }] }], generationConfig: { responseModalities: ['IMAGE'] } }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw aiError('gemini', r.status, d?.error?.message);
      const part = (d.candidates?.[0]?.content?.parts || []).find(p => p.inlineData || p.inline_data);
      const inl = part && (part.inlineData || part.inline_data);
      if (!inl?.data) return err('لم يُرجع الذكاء الاصطناعي صورة. جرّب مرة أخرى أو استخدم التوضيح على الجهاز.', 502);
      out = { mime: inl.mimeType || inl.mime_type || 'image/png', data: inl.data };
    }
  } catch (e) {
    if (['credit', 'quota', 'auth', 'nokey'].includes(e.code)) { await markDown(env, 'gemini', e.code); return json({ error: 'إعادة التوليد غير متاحة حاليًا: ' + (e.code === 'quota' ? 'انتهت الحصة المتاحة، وقد يحتاج نموذج الصور إلى تفعيل الدفع في حساب Google.' : 'تحقق من مفتاح Gemini.'), unavailable: true }, 503); }
    return err('تعذّرت إعادة التوليد: ' + (e.message || 'خطأ غير معروف'), 502);
  }
  if (rlKey) { try { await env.ITQAN_KV.put(rlKey, String(used + 3), { expirationTtl: 90000 }); } catch { } }
  return json({ image: out });
}
