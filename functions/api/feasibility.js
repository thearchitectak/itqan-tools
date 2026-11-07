import { json, err, getConfig, clientIp, signToken, verifyToken } from '../_lib/core.js';
import { callAI, extractJson } from '../_lib/ai.js';

const SYSTEM = (extra) => `أنت مستشار خبير في إعداد دراسات الجدوى الاقتصادية للمشروعات في العالم العربي.
- اكتب جميع النصوص باللغة العربية الفصحى السليمة فقط، بأسلوب مهني واضح، ودون أي عبارات عامية.
- استخدم البحث في الويب للحصول على أحدث البيانات المتاحة (العام الحالي ${new Date().getFullYear()} أو أحدث ما يتوفر) عن السوق والأسعار والرواتب والإيجارات والأنظمة في الدولة والمدينة المحددتين.
- قدّم أرقامًا واقعية ومحافظة بعملة الدراسة المحددة، ولا تبالغ في الإيرادات أو تقلل التكاليف.
- إذا لم تجد رقمًا دقيقًا فقدّم أفضل تقدير مهني واذكر أنه تقديري.
- أعد الرد على هيئة كائن JSON صالح واحد فقط مطابق للبنية المطلوبة، دون أي نص قبله أو بعده، ودون علامات Markdown.
- الأرقام في JSON تُكتب أرقامًا مجردة (مثل 15000) دون فواصل أو رموز عملات.
${extra ? '- تعليمات إضافية من إدارة المنصة: ' + extra : ''}`;

function answersText(answers, sections) {
  const lines = [];
  for (const s of sections) {
    lines.push(`## ${s.title}`);
    for (const f of s.fields) {
      let v = answers?.[f.id];
      if (Array.isArray(v)) v = v.join('، ');
      if (v === undefined || v === null || String(v).trim() === '') continue;
      lines.push(`- ${f.label}: ${String(v).slice(0, 3000)}`);
    }
  }
  return lines.join('\n');
}

const SCHEMA_MARKET = `{
  "projectDescription": "وصف احترافي للمشروع في فقرتين",
  "market": {
    "overview": "نظرة عامة على القطاع في الدولة والمدينة مع أحدث المؤشرات",
    "marketSize": "حجم السوق ومعدل نموه مع ذكر السنة والمصدر",
    "trends": ["اتجاه حديث في السوق"],
    "targetSegments": [{ "segment": "اسم الشريحة", "description": "وصفها وحجمها التقريبي" }],
    "demandAnalysis": "تحليل الطلب المتوقع",
    "pricingAnalysis": "تحليل الأسعار السائدة في السوق مقارنة بأسعار المشروع",
    "competitors": [{ "name": "اسم المنافس أو فئته", "type": "مباشر أو غير مباشر", "strengths": "نقاط القوة", "weaknesses": "نقاط الضعف" }]
  },
  "swot": { "strengths": [""], "weaknesses": [""], "opportunities": [""], "threats": [""] },
  "legal": {
    "licenses": [{ "name": "اسم الترخيص أو التسجيل", "authority": "الجهة المختصة", "estimatedCost": 0, "notes": "ملاحظات" }],
    "regulations": ["اشتراط نظامي مهم"]
  }
}`;

const SCHEMA_TECH = `{
  "technical": {
    "location": "مواصفات الموقع المقترح ومعايير اختياره",
    "layout": "التجهيز الداخلي والمساحات",
    "operations": "وصف دورة التشغيل اليومية",
    "suppliers": ["نوع المورد أو اسمه"],
    "timeline": [{ "phase": "مرحلة التنفيذ", "weeks": 2 }]
  },
  "equipment": [{ "item": "معدة أو جهاز", "qty": 1, "unitCost": 0 }],
  "otherCapex": [{ "item": "تجهيزات وديكورات أو مركبات أو أنظمة", "cost": 0 }],
  "preOperating": [{ "item": "مصروفات ما قبل التشغيل مثل التراخيص والتصميم والتسويق الافتتاحي", "cost": 0 }],
  "staffing": [{ "role": "المسمى الوظيفي", "count": 1, "monthlySalary": 0 }],
  "monthlyOpex": [{ "item": "مصروف تشغيلي شهري (الإيجار، الكهرباء والمياه، التسويق، الصيانة، الاشتراكات، ...) دون الرواتب", "cost": 0 }],
  "revenueStreams": [{ "name": "المنتج أو الخدمة", "unit": "وحدة البيع", "unitPrice": 0, "monthlyVolume": 0, "cogsPct": 0 }],
  "assumptions": {
    "annualGrowthPct": 0, "costInflationPct": 0, "rampUpYear1Pct": 0, "discountRatePct": 0, "taxRatePct": 0,
    "workingCapitalMonths": 3, "depreciationYears": 5,
    "notes": ["تفسير مختصر لكل افتراض ومصدره"]
  }
}`;

const SCHEMA_SUMMARY = `{
  "executiveSummary": "ملخص تنفيذي احترافي في ثلاث فقرات يذكر أهم الأرقام",
  "verdict": "مجدٍ أو مجدٍ بشروط أو غير مجدٍ",
  "verdictReason": "سبب الحكم في فقرة",
  "marketingPlan": [{ "channel": "القناة التسويقية", "action": "الإجراء المقترح", "budgetShare": "النسبة المقترحة من ميزانية التسويق" }],
  "risks": [{ "risk": "الخطر", "likelihood": "منخفض أو متوسط أو مرتفع", "impact": "منخفض أو متوسط أو مرتفع", "mitigation": "طريقة الحد منه" }],
  "successFactors": ["عامل نجاح"],
  "recommendations": ["توصية عملية"],
  "nextSteps": ["خطوة تالية مرتبة زمنيًا"]
}`;

function buildPrompt(stage, answers, cfg, context) {
  const info = answersText(answers, cfg.feasibility.sections);
  if (stage === 'market') return `فيما يلي بيانات مشروع قدّمها صاحبه:\n${info}\n\nالمطلوب: إعداد دراسة السوق والدراسة القانونية للمشروع اعتمادًا على أحدث البيانات المتاحة على الويب للدولة والمدينة المحددتين. اذكر من 3 إلى 8 منافسين أو فئات منافسة، ومن 4 إلى 6 عناصر في كل جزء من تحليل SWOT.\nأعد JSON بالبنية التالية تمامًا:\n${SCHEMA_MARKET}`;
  if (stage === 'technical') return `بيانات المشروع:\n${info}\n\nخلاصة دراسة السوق السابقة:\n${JSON.stringify(context?.market || {}).slice(0, 12000)}\n\nالمطلوب: إعداد الدراسة الفنية والمدخلات المالية التفصيلية للمشروع بأسعار السوق الحالية في المدينة المحددة (أسعار المعدات، الإيجارات، الرواتب، المرافق). راعِ رأس المال المتاح الذي حدده صاحب المشروع، والتزم بعدد العاملين وأسعار المنتجات إن ذكرها. اجعل cogsPct نسبة مئوية من سعر البيع (مثل 35)، وrampUpYear1Pct نسبة التشغيل في السنة الأولى من الطاقة المستهدفة (مثل 70)، وtaxRatePct نسبة الزكاة أو ضريبة الدخل المطبقة في الدولة. لا تضع الرواتب ضمن monthlyOpex.\nأعد JSON بالبنية التالية تمامًا:\n${SCHEMA_TECH}`;
  return `بيانات المشروع:\n${info}\n\nالمؤشرات المالية المحسوبة من النموذج المالي:\n${JSON.stringify(context?.kpis || {})}\n\nخلاصة السوق:\n${JSON.stringify(context?.market || {}).slice(0, 6000)}\n\nالمطلوب: إعداد الملخص التنفيذي والحكم على جدوى المشروع بناءً على هذه المؤشرات (صافي القيمة الحالية، معدل العائد الداخلي، فترة الاسترداد، نقطة التعادل)، مع خطة تسويق ومصفوفة مخاطر من 5 إلى 8 مخاطر وتوصيات عملية. لا تحتاج إلى البحث في الويب إلا عند الضرورة.\nأعد JSON بالبنية التالية تمامًا:\n${SCHEMA_SUMMARY}`;
}

function validateAnswers(answers, sections) {
  if (!answers || typeof answers !== 'object') return 'لم تُرسل الإجابات.';
  for (const s of sections) for (const f of s.fields) {
    if (!f.required) continue;
    const v = answers[f.id];
    if (v === undefined || v === null || (Array.isArray(v) ? !v.length : !String(v).trim())) return `الحقل «${f.label}» مطلوب.`;
  }
  return null;
}

export async function onRequestPost({ request, env }) {
  const cfg = await getConfig(env);
  if (cfg.feasibility.enabled === false) return err('خدمة دراسة الجدوى متوقفة مؤقتًا.', 403);
  let body; try { body = await request.json(); } catch { return err('بيانات غير صالحة.'); }
  const raw = JSON.stringify(body);
  if (raw.length > 120_000) return err('حجم البيانات كبير جدًا.');
  const { stage, answers, context, ticket } = body;
  if (!['market', 'technical', 'summary'].includes(stage)) return err('مرحلة غير معروفة.');
  const v = validateAnswers(answers, cfg.feasibility.sections); if (v) return err(v);
  const ip = clientIp(request);

  let newTicket = null;
  if (stage === 'market') {
    // حد الاستخدام اليومي لكل مستخدم
    const limit = Number(cfg.feasibility.dailyLimitPerIp) || 0;
    if (env.ITQAN_KV && limit > 0) {
      const day = new Date().toISOString().slice(0, 10); const key = `rl:${day}:${ip}`;
      const used = Number(await env.ITQAN_KV.get(key)) || 0;
      if (used >= limit) return err(`وصلت إلى الحد اليومي المسموح به (${limit} دراسات). يمكنك المحاولة غدًا.`, 429);
      await env.ITQAN_KV.put(key, String(used + 1), { expirationTtl: 90000 });
    }
    newTicket = await signToken(env, { ip, exp: Date.now() + 2 * 3600e3, t: 'feas' });
  } else {
    const t = await verifyToken(env, ticket);
    if (!t || t.t !== 'feas' || t.ip !== ip) return err('انتهت صلاحية جلسة إعداد الدراسة. ابدأ من جديد.', 403);
  }

  try {
    const res = await callAI(env, {
      provider: cfg.feasibility.provider, model: cfg.feasibility.model,
      system: SYSTEM(cfg.feasibility.extraInstructions), prompt: buildPrompt(stage, answers, cfg, context),
      webSearch: cfg.feasibility.webSearch !== false && stage !== 'summary',
      maxTokens: stage === 'technical' ? 12000 : 10000,
    });
    const data = extractJson(res.text);
    const seen = new Set();
    data.sources = (res.sources || []).filter(s => s.url && !seen.has(s.url) && seen.add(s.url)).slice(0, 25);
    if (stage === 'summary' && env.ITQAN_KV) {
      try { const u = (await env.ITQAN_KV.get('usage:feasibility', 'json')) || { total: 0 }; u.total++; u.last = new Date().toISOString(); await env.ITQAN_KV.put('usage:feasibility', JSON.stringify(u)); } catch { }
    }
    return json({ data, ticket: newTicket || ticket });
  } catch (e) {
    return err('تعذّر إعداد هذا الجزء من الدراسة: ' + e.message, 502);
  }
}
