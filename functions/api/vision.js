import { json, err, getConfig, clientIp } from '../_lib/core.js';
import { callAI, extractJson } from '../_lib/ai.js';
import { toolsAiStatus, markDown } from '../_lib/status.js';

// قراءة الصور بالذكاء الاصطناعي لأدوات الموقع.
// المهام محددة على الخادم (لا يُقبل نص تعليمات من المتصفح)، فلا يمكن استخدام الخدمة لأغراض أخرى.
// الصور لا تُحفظ: تُرسل إلى المزوّد ثم تُهمل.

const MAX_B64 = 4_500_000; // نحو 3.3 ميجابايت للصورة
const MIMES = ['image/jpeg', 'image/png', 'image/webp'];

const SYSTEM = `أنت نظام دقيق لقراءة صور المستندات العربية والإنجليزية.
- انقل ما تراه في الصورة بأمانة تامة، ولا تضف معلومات من عندك، ولا تصحح الأخطاء الواردة في الأصل.
- أعد الرد على هيئة كائن JSON صالح واحد فقط مطابق للبنية المطلوبة، دون أي نص قبله أو بعده، ودون علامات Markdown.`;

const AR = ['أ', 'ب', 'ج', 'د', 'هـ'], EN = ['A', 'B', 'C', 'D', 'E'];

const TASKS = {
  omr: {
    maxTokens: 4000,
    valid: (p) => {
      const n = +p?.n, o = +p?.opts, r = +p?.rows, g = +p?.groups;
      return n >= 1 && n <= 300 && o >= 2 && o <= 5 && r >= 1 && r <= 100 && g >= 1 && g <= 12;
    },
    prompt: (p) => {
      const L = (p.rtl ? AR : EN).slice(0, +p.opts);
      return `[OMR]
الصورة ورقة إجابة اختيار من متعدد بنظام التظليل (Bubble sheet).
- عدد الأسئلة: ${+p.n}
- عدد الاختيارات لكل سؤال: ${+p.opts}، ورموزها بالترتيب: ${L.join('، ')}
- الأسئلة مرتبة في ${+p.groups} أعمدة، في كل عمود ${+p.rows} سؤالًا، والترقيم يتسلسل من أعلى إلى أسفل داخل العمود، ${p.rtl ? 'والعمود الأول هو الأيمن (ورقة عربية، والاختيار الأول «أ» هو الأقرب إلى رقم السؤال من جهة اليمين)' : 'والعمود الأول هو الأيسر (ورقة إنجليزية، والاختيار الأول A هو الأقرب إلى رقم السؤال من جهة اليسار)'}.

المطلوب لكل سؤال:
- رمز الدائرة المظللة.
- إذا شُطبت دائرة مظللة بعلامة X أو بخط وظُللت دائرة أخرى، فالإجابة هي الدائرة الأخرى غير المشطوبة.
- إذا لم تُظلل أي دائرة فاكتب "blank". وإذا ظُللت أكثر من دائرة دون شطب واضح فاكتب "multi".
- ضع "unsure": true إذا لم تكن متأكدًا من قراءة السؤال.
واقرأ كذلك اسم الطالب ورقمه إن كانا مكتوبين في الورقة، واتركهما فارغين إن لم يوجدا.

أعد JSON بهذه البنية تمامًا، وبعدد ${+p.n} عنصرًا في answers:
{"name": "", "id": "", "answers": [{"q": 1, "a": "${L[0]}", "unsure": false}]}`;
    },
  },
  ocr: {
    maxTokens: 8000,
    valid: () => true,
    prompt: () => `[OCR]
الصورة صفحة من مستند. استخرج نصها كاملًا بترتيب القراءة الصحيح، مع الحفاظ على بنيته:
- العناوين نوعها "heading"، والفقرات "paragraph"، والقوائم "list" مع بنودها في items، والجداول "table" مع صفوفها في rows (كل صف مصفوفة خلايا).
- حدد rtl بقيمة true إذا كانت لغة الصفحة الغالبة عربية.
- تجاهل الأختام والزخارف، واكتب [غير مقروء] مكان أي كلمة لا يمكن قراءتها.
أعد JSON بهذه البنية:
{"rtl": true, "blocks": [{"type": "heading", "text": ""}, {"type": "paragraph", "text": ""}, {"type": "list", "items": [""]}, {"type": "table", "rows": [["", ""]]}]}`,
  },
  table: {
    maxTokens: 8000,
    valid: () => true,
    prompt: () => `[TABLE]
الصورة صفحة من مستند. استخرج جميع الجداول الموجودة فيها بدقة:
- كل جدول مصفوفة صفوف، وكل صف مصفوفة خلايا نصية بالترتيب الظاهر في الجدول (من اليمين في الجداول العربية).
- الصف الأول هو رأس الجدول إن وجد. الخلايا المدمجة تُكرر قيمتها أو تُترك فارغة.
- الأرقام تُنقل كما هي بأرقام إنجليزية دون فواصل الآلاف.
- إذا لم توجد جداول فأعد البيانات النصية المرتبة في أعمدة واضحة جدولًا واحدًا، وإلا فأعد قائمة فارغة.
أعد JSON بهذه البنية:
{"tables": [{"title": "", "rows": [["", ""]]}]}`,
  },
};

// توحيد نتيجة المصحح: تحويل الرموز إلى أرقام الاختيارات (0 = أ / A، و-1 = فارغ أو غير صالح)
function normOmr(data, p) {
  const L = (p.rtl ? AR : EN).slice(0, +p.opts), alt = (p.rtl ? EN : AR).slice(0, +p.opts);
  const ans = Array.from({ length: +p.n }, () => ({ a: -1, unsure: true, multi: false }));
  for (const x of Array.isArray(data?.answers) ? data.answers : []) {
    const q = +x?.q; if (!(q >= 1 && q <= +p.n)) continue;
    const v = String(x?.a ?? '').trim().replace('ه', 'هـ').replace(/^هـ+$/, 'هـ');
    let a = L.indexOf(v); if (a < 0) a = alt.indexOf(v.toUpperCase()); if (a < 0 && /^\d$/.test(v) && +v >= 1 && +v <= +p.opts) a = +v - 1;
    ans[q - 1] = { a, unsure: !!x?.unsure || v === 'multi', multi: v === 'multi' };
  }
  return { name: String(data?.name || '').slice(0, 80), id: String(data?.id || '').slice(0, 40), answers: ans };
}

export async function onRequestGet({ env }) {
  const cfg = await getConfig(env);
  const status = await toolsAiStatus(env, cfg);
  return json({ status, enabled: cfg.aiTools?.enabled !== false });
}

export async function onRequestPost({ request, env }) {
  const cfg = await getConfig(env), A = cfg.aiTools || {};
  if (A.enabled === false) return err('الذكاء الاصطناعي في الأدوات متوقف حاليًا.', 403);
  let body; try { body = await request.json(); } catch { return err('بيانات غير صالحة.'); }
  const task = TASKS[body?.task];
  if (!task) return err('مهمة غير معروفة.');
  const params = body.params || {};
  if (!task.valid(params)) return err('إعدادات المهمة غير صالحة.');
  const img = body.image;
  if (!img || !MIMES.includes(img.mime) || typeof img.data !== 'string' || !img.data.length) return err('لم تُرسل الصورة.');
  if (img.data.length > MAX_B64) return err('حجم الصورة كبير جدًا.', 413);

  // حد الاستخدام اليومي لكل مستخدم (بعدد الصور)
  const ip = clientIp(request), limit = Number(A.dailyImagesPerIp) || 0;
  let rlKey = null, used = 0;
  if (env.ITQAN_KV && limit > 0) {
    rlKey = `rlv:${new Date().toISOString().slice(0, 10)}:${ip}`;
    used = Number(await env.ITQAN_KV.get(rlKey)) || 0;
    if (used >= limit) return json({ error: `وصلت إلى الحد اليومي للقراءة بالذكاء الاصطناعي (${limit} صورة). أكمل بالمعالجة على جهازك، أو عُد غدًا.`, limit: true }, 429);
  }

  const want = body.provider === 'anthropic' ? 'anthropic' : 'gemini';
  const status = await toolsAiStatus(env, cfg, { probeNow: false });
  const order = [want]; if (A.autoFallback !== false) order.push(want === 'anthropic' ? 'gemini' : 'anthropic');
  const cands = order.filter(p => status[p]?.available);
  if (!cands.length) return json({ error: 'الذكاء الاصطناعي غير متاح حاليًا. استخدم المعالجة على جهازك.', unavailable: true, status }, 503);

  let res = null, prov = null, lastErr = null;
  for (const p of cands) {
    try {
      res = await callAI(env, { provider: p, model: A.providers?.[p]?.model || '', system: SYSTEM, prompt: task.prompt(params), maxTokens: task.maxTokens, images: [{ mime: img.mime, data: img.data }], temperature: 0 });
      prov = p; break;
    } catch (e) {
      lastErr = e;
      if (['credit', 'quota', 'auth', 'nokey'].includes(e.code)) { await markDown(env, p, e.code); continue; }
      if (e.code === 'busy') continue;
      break;
    }
  }
  if (!res) return json({ error: 'تعذّرت القراءة بالذكاء الاصطناعي: ' + (lastErr?.message || 'خطأ غير معروف'), unavailable: ['credit', 'quota', 'auth', 'nokey'].includes(lastErr?.code) }, 502);

  let data;
  try { data = extractJson(res.text); } catch (e) { return err('تعذّر فهم رد الذكاء الاصطناعي، فأعد المحاولة.', 502); }
  if (body.task === 'omr') data = normOmr(data, params);
  if (rlKey) { try { await env.ITQAN_KV.put(rlKey, String(used + 1), { expirationTtl: 90000 }); } catch { } }
  if (env.ITQAN_KV) { try { const k = 'usage:vision', u = (await env.ITQAN_KV.get(k, 'json')) || {}; u[body.task] = (u[body.task] || 0) + 1; u.last = new Date().toISOString(); await env.ITQAN_KV.put(k, JSON.stringify(u)); } catch { } }
  return json({ data, provider: prov, fallback: prov !== want ? { from: want, to: prov } : null, remaining: limit > 0 ? Math.max(0, limit - used - 1) : null });
}
