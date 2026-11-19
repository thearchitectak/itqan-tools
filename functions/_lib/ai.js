import { DEFAULT_MODELS } from '../../public/assets/js/defaults.js';

// استدعاء مزوّد الذكاء الاصطناعي المختار مع تفعيل البحث في الويب للحصول على أحدث بيانات السوق.
export async function callAI(env, { provider, model, system, prompt, webSearch, maxTokens = 16000, images = null, temperature = null }) {
  provider = provider || 'anthropic';
  if (env.AI_MOCK === '1' && env.AI_MOCK_FAIL_AT) { const st = prompt.includes('"executiveSummary"') ? 'summary' : prompt.includes('"equipment"') ? 'technical' : 'market'; if (env.AI_MOCK_FAIL_AT.split(',').includes(st)) throw aiError(provider, provider === 'gemini' ? 429 : 400, provider === 'gemini' ? 'quota exhausted' : 'Your credit balance is too low'); }
  if (env.AI_MOCK === '1' && images) { if (env.AI_MOCK_DOWN && env.AI_MOCK_DOWN.split(',').includes(provider)) throw aiError(provider, provider === 'gemini' ? 429 : 400, provider === 'gemini' ? 'quota exhausted' : 'Your credit balance is too low'); return mockVision(prompt); }
  if (env.AI_MOCK === '1') { if (env.AI_MOCK_DOWN && env.AI_MOCK_DOWN.split(',').includes(provider)) throw aiError(provider, provider === 'gemini' ? 429 : 400, provider === 'gemini' ? 'Resource has been exhausted (e.g. check quota).' : 'Your credit balance is too low to access the Anthropic API.'); return mock(prompt); }
  model = model || DEFAULT_MODELS[provider];
  if (provider === 'anthropic') return anthropic(env, model, system, prompt, webSearch, maxTokens, images, temperature);
  if (provider === 'gemini') return gemini(env, model, system, prompt, webSearch, maxTokens, images, temperature);
  if (provider === 'openai') return openai(env, model, system, prompt, webSearch, maxTokens);
  throw new Error('مزوّد الذكاء الاصطناعي غير معروف.');
}

async function anthropic(env, model, system, prompt, webSearch, maxTokens, images, temperature) {
  if (!env.ANTHROPIC_API_KEY) throw Object.assign(new Error('لم يُضبط مفتاح Claude.'), { code: 'nokey' });
  const content = images ? [...images.map(im => ({ type: 'image', source: { type: 'base64', media_type: im.mime, data: im.data } })), { type: 'text', text: prompt }] : prompt;
  const messages = [{ role: 'user', content }];
  const sources = [];
  let text = '';
  for (let turn = 0; turn < 4; turn++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages, ...(temperature != null ? { temperature } : {}), ...(webSearch ? { tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }] } : {}) }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw aiError('anthropic', r.status, data?.error?.message);
    for (const b of data.content || []) {
      if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) b.content.forEach(x => x.url && sources.push({ title: x.title || x.url, url: x.url }));
    }
    const texts = (data.content || []).filter(b => b.type === 'text').map(b => b.text);
    text += texts.join('');
    if (data.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: data.content });
  }
  return { text, sources };
}

async function gemini(env, model, system, prompt, webSearch, maxTokens, images, temperature) {
  if (!env.GEMINI_API_KEY) throw Object.assign(new Error('لم يُضبط مفتاح Gemini.'), { code: 'nokey' });
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [...(images || []).map(im => ({ inline_data: { mime_type: im.mime, data: im.data } })), { text: prompt }] }],
      ...(webSearch ? { tools: [{ google_search: {} }] } : {}),
      generationConfig: { maxOutputTokens: maxTokens, temperature: temperature ?? 0.4 },
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw aiError('gemini', r.status, data?.error?.message);
  const cand = data.candidates?.[0];
  const text = (cand?.content?.parts || []).map(p => p.text || '').join('');
  const sources = (cand?.groundingMetadata?.groundingChunks || []).map(c => c.web).filter(Boolean).map(w => ({ title: w.title || w.uri, url: w.uri }));
  return { text, sources };
}

async function openai(env, model, system, prompt, webSearch, maxTokens) {
  if (!env.OPENAI_API_KEY) throw new Error('لم يُضبط مفتاح OPENAI_API_KEY.');
  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { authorization: 'Bearer ' + env.OPENAI_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ model, instructions: system, input: prompt, max_output_tokens: maxTokens, ...(webSearch ? { tools: [{ type: 'web_search' }] } : {}) }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('خطأ من خدمة OpenAI: ' + (data?.error?.message || r.status));
  let text = data.output_text || ''; const sources = [];
  for (const o of data.output || []) for (const c of o.content || []) {
    if (!data.output_text && c.type === 'output_text') text += c.text;
    for (const a of c.annotations || []) if (a.url) sources.push({ title: a.title || a.url, url: a.url });
  }
  return { text, sources };
}

// استخراج كائن JSON من نص الرد
export function extractJson(text) {
  let s = String(text || '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1].includes('{')) s = fence[1];
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('لم يرجع الذكاء الاصطناعي بيانات منظمة.');
  s = s.slice(a, b + 1);
  try { return JSON.parse(s); }
  catch {
    // إزالة الفواصل الزائدة وعلامات الاستشهاد إن وجدت
    const cleaned = s.replace(/,\s*([}\]])/g, '$1').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ');
    return JSON.parse(cleaned);
  }
}

// وضع تجريبي للتشغيل المحلي فقط (AI_MOCK=1): يعيد بيانات ثابتة دون الاتصال بأي مزوّد
function mock(prompt) {
  const m = prompt.includes('"executiveSummary"') ? 'summary' : prompt.includes('"equipment"') ? 'technical' : 'market';
  const D = {
    market: { projectDescription: 'مقهى مختص يقدم القهوة المختصة والحلويات في حي سكني حيوي.', market: { overview: 'يشهد قطاع المقاهي نموًا ملحوظًا.', marketSize: 'يقدر حجم سوق القهوة بنحو 4 مليارات ريال (تقديري).', trends: ['انتشار القهوة المختصة', 'نمو الطلب عبر التطبيقات'], targetSegments: [{ segment: 'الشباب', description: 'من 18 إلى 35 عامًا' }], demandAnalysis: 'طلب مرتفع في المساء.', pricingAnalysis: 'متوسط سعر الكوب 16 إلى 22 ريالًا.', competitors: [{ name: 'مقاهٍ مختصة محلية', type: 'مباشر', strengths: 'ولاء العملاء', weaknesses: 'محدودية المواقف' }] }, swot: { strengths: ['موقع مميز'], weaknesses: ['علامة جديدة'], opportunities: ['نمو السوق'], threats: ['منافسة شديدة'] }, legal: { licenses: [{ name: 'السجل التجاري', authority: 'وزارة التجارة', estimatedCost: 1200, notes: '' }], regulations: ['اشتراطات البلدية'] } },
    technical: { technical: { location: 'محل على شارع تجاري', layout: '120 م²', operations: 'من 6 صباحًا إلى 12 ليلًا', suppliers: ['محامص محلية'], timeline: [{ phase: 'التجهيز', weeks: 8 }] }, equipment: [{ item: 'آلة إسبريسو', qty: 1, unitCost: 45000 }, { item: 'مطحنة', qty: 2, unitCost: 9000 }], otherCapex: [{ item: 'الديكور والتجهيز', cost: 120000 }], preOperating: [{ item: 'التراخيص والتصميم', cost: 15000 }], staffing: [{ role: 'باريستا', count: 4, monthlySalary: 5000 }, { role: 'مدير', count: 1, monthlySalary: 9000 }], monthlyOpex: [{ item: 'الإيجار', cost: 12000 }, { item: 'الكهرباء والمياه', cost: 3500 }, { item: 'التسويق', cost: 4000 }], revenueStreams: [{ name: 'مشروبات', unit: 'كوب', unitPrice: 18, monthlyVolume: 6000, cogsPct: 30 }, { name: 'حلويات', unit: 'قطعة', unitPrice: 22, monthlyVolume: 1500, cogsPct: 45 }], assumptions: { annualGrowthPct: 6, costInflationPct: 3, rampUpYear1Pct: 70, discountRatePct: 12, taxRatePct: 2.5, workingCapitalMonths: 3, depreciationYears: 5, notes: ['افتراضات تجريبية'] } },
    summary: { executiveSummary: 'يظهر المشروع مؤشرات إيجابية.', verdict: 'مجدٍ', verdictReason: 'صافي القيمة الحالية موجبة.', marketingPlan: [{ channel: 'إنستغرام', action: 'حملات محلية', budgetShare: '40٪' }], risks: [{ risk: 'ارتفاع الإيجار', likelihood: 'متوسط', impact: 'مرتفع', mitigation: 'عقد طويل الأجل' }], successFactors: ['جودة المنتج'], recommendations: ['البدء بقائمة مختصرة'], nextSteps: ['اختيار الموقع'] },
  };
  return { text: JSON.stringify(D[m]), sources: [{ title: 'مصدر تجريبي', url: 'https://example.com' }] };
}

// وضع تجريبي لقراءة الصور: يعيد نتيجة ثابتة بحسب نوع المهمة
function mockVision(prompt) {
  if (prompt.includes('[OMR]')) {
    const n = Number((prompt.match(/عدد الأسئلة: (\d+)/) || [])[1]) || 0;
    return { text: JSON.stringify({ name: 'طالب تجريبي', id: '1001', answers: Array.from({ length: n }, (_, i) => ({ q: i + 1, a: i === 2 ? 'blank' : 'أ' })) }), sources: [] };
  }
  if (prompt.includes('[SHOT]')) return { text: JSON.stringify({ shot: { type: 'interior', time: 'day', lighting_ar: 'إضاءة نهارية ناعمة من نافذة جانبية كبيرة.', hdri_keywords: ['clear sky', 'midday'] }, materials: [
    { name_ar: 'رخام أبيض مصقول بعروق رمادية', where_ar: 'الأرضية', category: 'marble', keywords: ['white', 'marble', 'polished'], color: 'white', finish: 'glossy', metal: false, tile_m: 0.6 },
    { name_ar: 'باركيه خشب بلوط فاتح', where_ar: 'أرضية غرفة المعيشة', category: 'floor_wood', keywords: ['oak', 'wood', 'floor', 'planks'], color: 'light brown', finish: 'satin', metal: false, tile_m: 0.2 },
    { name_ar: 'قماش كتان رمادي', where_ar: 'الكنبة', category: 'fabric', keywords: ['linen', 'fabric', 'grey'], color: 'grey', finish: 'matte', metal: false, tile_m: null },
    { name_ar: 'نحاس مطلي مصقول بنقش زخرفي نادر', where_ar: 'إطار المرآة', category: 'metal', keywords: ['ornate', 'brass', 'engraved'], color: 'gold', finish: 'glossy', metal: true, tile_m: null }] }), sources: [] };
  if (prompt.includes('[TABLE]')) return { text: JSON.stringify({ tables: [{ title: 'جدول تجريبي', rows: [['البند', 'الكمية', 'السعر'], ['أسمنت', '10', '250']] }] }), sources: [] };
  return { text: JSON.stringify({ rtl: true, blocks: [{ type: 'heading', text: 'عنوان تجريبي' }, { type: 'paragraph', text: 'فقرة مستخرجة من صورة الصفحة.' }, { type: 'list', items: ['بند أول', 'بند ثانٍ'] }, { type: 'table', rows: [['أ', 'ب'], ['1', '2']] }] }), sources: [] };
}

// تصنيف أخطاء المزوّد: credit (نفد الرصيد) | quota (تجاوز الحصة) | auth (مفتاح غير صالح) | busy (ضغط مؤقت) | other
export function classify(provider, status, msg = '') {
  const m = String(msg);
  if (provider === 'anthropic') {
    if (/credit balance|billing|purchase credits/i.test(m) || status === 402) return 'credit';
    if (status === 401 || status === 403) return 'auth';
    if (status === 429 || status === 529 || status >= 500) return 'busy';
    return 'other';
  }
  if (provider === 'gemini') {
    if (status === 429 || /quota|exhausted/i.test(m)) return 'quota';
    if (status === 401 || status === 403 || /api key not valid|permission/i.test(m)) return 'auth';
    if (status >= 500) return 'busy';
    return 'other';
  }
  return 'other';
}
export function aiError(provider, status, msg) {
  const code = classify(provider, status, msg);
  const name = provider === 'anthropic' ? 'Claude' : provider === 'gemini' ? 'Gemini' : provider;
  const text = { credit: `نفد رصيد ${name}.`, quota: `تجاوز ${name} حصة الاستخدام المجانية الحالية.`, auth: `مفتاح ${name} غير صالح.`, busy: `خدمة ${name} مشغولة حاليًا.` }[code] || `خطأ من خدمة ${name}: ${msg || status}`;
  return Object.assign(new Error(text), { code, provider, status });
}
