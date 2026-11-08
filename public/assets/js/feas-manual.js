// الوضع اليدوي لدراسة الجدوى: محرر الأرقام المالية، والنصوص المبنية على القواعد دون ذكاء اصطناعي.
// يُستخدم أيضًا لتعديل أرقام أي دراسة أعدّها الذكاء الاصطناعي ثم إعادة حسابها.
import { h, ico, toast } from './ui.js';
import { normalizeInputs, computeModel, fmtMoney, fmtPct, fmtYears, currencyCode } from './finance.js';

const TABLES = [
  { key: 'equipment', title: 'المعدات والأجهزة', hint: 'كل ما يُشترى مرة واحدة من أجهزة وآلات وأثاث تشغيلي', cols: [['item', 'البند', 'text'], ['qty', 'الكمية', 'num'], ['unitCost', 'سعر الوحدة', 'num']] },
  { key: 'otherCapex', title: 'تكاليف رأسمالية أخرى', hint: 'التجهيز والديكور والأنظمة والمركبات وغيرها', cols: [['item', 'البند', 'text'], ['cost', 'التكلفة', 'num']] },
  { key: 'preOperating', title: 'مصروفات ما قبل التشغيل', hint: 'التراخيص والتصميم والتسويق الافتتاحي والتأمينات المستردة', cols: [['item', 'البند', 'text'], ['cost', 'التكلفة', 'num']] },
  { key: 'staffing', title: 'الهيكل الوظيفي', hint: 'الرواتب الشهرية شاملة البدلات', cols: [['role', 'الوظيفة', 'text'], ['count', 'العدد', 'num'], ['monthlySalary', 'الراتب الشهري', 'num']] },
  { key: 'monthlyOpex', title: 'المصروفات التشغيلية الشهرية', hint: 'دون الرواتب', cols: [['item', 'البند', 'text'], ['cost', 'المبلغ الشهري', 'num']] },
  { key: 'revenueStreams', title: 'الإيرادات (بالطاقة المستهدفة)', hint: 'نسبة التكلفة = تكلفة البضاعة أو المواد الخام من سعر البيع', cols: [['name', 'المنتج أو الخدمة', 'text'], ['unit', 'الوحدة', 'text'], ['unitPrice', 'سعر البيع', 'num'], ['monthlyVolume', 'الكمية الشهرية', 'num'], ['cogsPct', 'نسبة التكلفة ٪', 'num']] },
];
const ASSUMPTIONS = [
  ['rampUpYear1Pct', 'نسبة التشغيل في السنة الأولى ٪'], ['annualGrowthPct', 'النمو السنوي للإيرادات ٪'], ['costInflationPct', 'التضخم السنوي في التكاليف ٪'],
  ['discountRatePct', 'معدل الخصم ٪'], ['taxRatePct', 'نسبة الزكاة أو الضريبة ٪'], ['workingCapitalMonths', 'أشهر رأس المال العامل'], ['depreciationYears', 'سنوات الإهلاك'],
];

function taxFor(country = '') {
  if (/السعودية/.test(country)) return 2.5;
  if (/مصر/.test(country)) return 22.5;
  if (/الإمارات/.test(country)) return 9;
  if (/قطر|عُمان|عمان/.test(country)) return 15;
  if (/الكويت/.test(country)) return 15;
  if (/البحرين/.test(country)) return 0;
  return 15;
}

export function blankTechnical(answers) {
  const n = Math.max(1, parseInt(answers.employees) || 1);
  const opex = ['الكهرباء والمياه', 'الاتصالات والإنترنت', 'التسويق والإعلان', 'الصيانة', 'مصروفات إدارية أخرى'];
  if (answers.premises === 'مقر مستأجر') opex.unshift('الإيجار');
  return {
    equipment: [{ item: '', qty: 1, unitCost: '' }],
    otherCapex: [{ item: 'التجهيز والديكور', cost: '' }],
    preOperating: [{ item: 'التراخيص والتسجيل', cost: '' }, { item: 'التسويق الافتتاحي', cost: '' }],
    staffing: [{ role: 'موظف', count: n, monthlySalary: '' }],
    monthlyOpex: opex.map(item => ({ item, cost: '' })),
    revenueStreams: [{ name: '', unit: '', unitPrice: '', monthlyVolume: '', cogsPct: '' }],
    assumptions: { rampUpYear1Pct: 70, annualGrowthPct: 5, costInflationPct: 3, discountRatePct: 12, taxRatePct: taxFor(answers.country), workingCapitalMonths: 3, depreciationYears: 5 },
  };
}

// محرر الأرقام: يعيد عنصر الصفحة، ويستدعي onDone(technical) عند الضغط على زر الإنشاء
export function financialEditor({ answers, technical, title, intro, notice, action, onDone, onCancel }) {
  const T = structuredClone(technical);
  for (const t of TABLES) if (!Array.isArray(T[t.key])) T[t.key] = [];
  T.assumptions = { ...blankTechnical(answers).assumptions, ...(T.assumptions || {}) };
  const cur = currencyCode(answers.currency);
  const kpiBox = h('div', { class: 'kpis' });
  const refresh = () => {
    let m; try { m = computeModel(normalizeInputs(T, answers)); } catch { return; }
    const k = m.kpis;
    kpiBox.innerHTML = '';
    [['إجمالي الاستثمار', fmtMoney(k.totalInvestment, cur)], ['إيرادات السنة الأولى', fmtMoney(k.year1Revenue, cur)], ['صافي ربح السنة الأولى', fmtMoney(k.year1Net, cur)], ['صافي القيمة الحالية', fmtMoney(k.npv, cur)], ['معدل العائد الداخلي', fmtPct(k.irr)], ['فترة الاسترداد', fmtYears(k.paybackYears)]]
      .forEach(([a, b]) => kpiBox.append(h('div', { class: 'kpi' }, h('span', {}, a), h('b', {}, b))));
  };
  const sections = TABLES.map(t => {
    const body = h('tbody');
    const draw = () => {
      body.innerHTML = '';
      T[t.key].forEach((row, i) => {
        body.append(h('tr', {}, ...t.cols.map(([k, , type]) => {
          const inp = h('input', { class: 'input', value: row[k] ?? '', dir: type === 'num' ? 'ltr' : null, inputmode: type === 'num' ? 'decimal' : null, placeholder: type === 'num' ? '0' : '' });
          inp.oninput = () => { row[k] = inp.value; refresh(); };
          return h('td', {}, inp);
        }), h('td', { style: { width: '40px' } }, h('button', { class: 'icon-btn', type: 'button', title: 'حذف البند', onclick: () => { T[t.key].splice(i, 1); draw(); refresh(); } }, ico('trash-2', 16)))));
      });
    };
    draw();
    const add = h('button', { class: 'btn light sm', type: 'button', onclick: () => { T[t.key].push(Object.fromEntries(t.cols.map(([k]) => [k, k === 'qty' || k === 'count' ? 1 : '']))); draw(); } }, ico('plus', 14), 'إضافة بند');
    return h('div', { style: { marginTop: '18px' } }, h('h3', { style: { margin: '0 0 2px' } }, `${t.title} (${cur})`), h('small', { class: 'muted' }, t.hint),
      h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl edit-tbl' }, h('thead', {}, h('tr', {}, ...t.cols.map(([, l]) => h('th', {}, l)), h('th'))), body)), add);
  });
  const asm = h('div', { class: 'opts' }, ASSUMPTIONS.map(([k, l]) => {
    const inp = h('input', { class: 'input', dir: 'ltr', inputmode: 'decimal', value: T.assumptions[k] ?? '' });
    inp.oninput = () => { T.assumptions[k] = inp.value; refresh(); };
    return h('label', { class: 'field' }, h('span', {}, l), inp);
  }));
  const go = h('button', { class: 'btn' }, ico('check', 18), action || 'إنشاء الدراسة');
  go.onclick = () => {
    const I = normalizeInputs(T, answers);
    if (!I.revenueStreams.some(r => r.unitPrice > 0 && r.monthlyVolume > 0)) return toast('أدخل منتجًا واحدًا على الأقل بسعر بيع وكمية شهرية.', true);
    if (I.equipment.every(e => !e.unitCost) && I.otherCapex.every(e => !e.cost) && I.preOperating.every(e => !e.cost)) return toast('أدخل تكلفة استثمارية واحدة على الأقل.', true);
    const clean = structuredClone(T);
    for (const t of TABLES) clean[t.key] = clean[t.key].filter(r => Object.entries(r).some(([k, v]) => !['qty', 'count'].includes(k) && String(v ?? '').trim()));
    onDone(clean);
  };
  refresh();
  return h('div', { class: 'panel' },
    h('h2', { style: { marginTop: 0 } }, title || 'أرقام المشروع'), notice || null, intro ? h('p', { class: 'muted' }, intro) : null,
    h('div', { class: 'note info' }, 'تتحدّث المؤشرات أسفل الصفحة فور تعديل أي رقم. اكتب الأرقام بعملة الدراسة دون فواصل.'),
    ...sections,
    h('h3', { style: { marginTop: '22px' } }, 'الافتراضات المالية'), asm,
    h('h3', { style: { marginTop: '22px' } }, 'المؤشرات المتوقعة'), kpiBox,
    h('div', { class: 'actions' }, onCancel ? h('button', { class: 'btn light', onclick: onCancel }, ico('arrow-right', 18), 'رجوع') : null, go));
}

// ===== نصوص الدراسة في الوضع اليدوي (قواعد ثابتة دون ذكاء اصطناعي) =====

const lines = (s) => String(s || '').split(/[\n،,؛;]+/).map(x => x.trim()).filter(x => x.length > 1);

export function verdictFor(model) {
  const k = model.kpis, I = model.inputs;
  if (k.npv > 0 && k.irr != null && k.irr > I.discount && k.paybackYears != null && k.paybackYears <= I.years * 0.6) return 'مجدٍ';
  if (k.npv > 0 || (k.paybackYears != null && k.paybackYears <= I.years)) return 'مجدٍ بشروط';
  return 'غير مجدٍ';
}

export function manualMarket(answers) {
  const comps = lines(answers.competitors);
  return {
    projectDescription: `${answers.projectName || 'المشروع'} مشروع في قطاع ${answers.sector || 'غير محدد'} بمدينة ${answers.city || ''}، ${answers.country || ''}. ${answers.projectIdea || ''}`.trim(),
    market: {
      overview: `أُعدّت هذه الدراسة بالوضع اليدوي، فاعتمد هذا القسم على المعلومات التي قدّمها صاحب المشروع. يُنصح باستكماله ببيانات حديثة عن القطاع في ${answers.city || 'المدينة المستهدفة'}.`,
      marketSize: 'لم يُقدَّر حجم السوق في الوضع اليدوي. يمكن الاستعانة بتقارير الهيئات الإحصائية والغرف التجارية في الدولة.',
      trends: [],
      targetSegments: answers.targetCustomers ? [{ segment: 'العملاء المستهدفون', description: answers.targetCustomers }] : [],
      demandAnalysis: answers.targetCustomers ? `يستهدف المشروع: ${answers.targetCustomers}` : '',
      pricingAnalysis: answers.products ? `المنتجات والأسعار المقترحة: ${answers.products}` : '',
      competitors: comps.map(c => ({ name: c, type: 'حدده صاحب المشروع', strengths: '', weaknesses: '' })),
    },
    swot: {
      strengths: [...lines(answers.advantage), 'معرفة صاحب المشروع بالسوق المحلي'].slice(0, 5),
      weaknesses: ['علامة تجارية جديدة تحتاج إلى بناء الثقة', 'محدودية الخبرة التشغيلية في البداية'],
      opportunities: ['نمو الطلب في القطاع', 'التوسع عبر القنوات الإلكترونية ووسائل التواصل'],
      threats: ['المنافسة القائمة في السوق', 'ارتفاع التكاليف التشغيلية والإيجارات', 'تغيّر الأنظمة والرسوم الحكومية'],
    },
    legal: { licenses: [], regulations: ['يلزم التحقق من التراخيص والاشتراطات النظامية لدى الجهات المختصة في الدولة قبل البدء.'] },
    sources: [],
  };
}

export function manualSummary(model, answers) {
  const k = model.kpis, I = model.inputs, cur = currencyCode(answers.currency);
  const verdict = verdictFor(model);
  const recs = [];
  if (k.fundingGap > 0) recs.push(`توفير تمويل إضافي بقيمة ${fmtMoney(k.fundingGap, cur)} لسد فجوة التمويل، أو تقليص التكاليف الاستثمارية.`);
  if (k.year1Revenue && k.breakEvenRevenueAnnual && k.year1Revenue < k.breakEvenRevenueAnnual) recs.push('إيرادات السنة الأولى أقل من نقطة التعادل؛ يُنصح بخطة تسويق مكثفة في الأشهر الأولى أو خفض التكاليف الثابتة.');
  if (k.grossMargin < 0.3) recs.push('هامش الربح الإجمالي منخفض؛ راجع أسعار البيع أو تكلفة المواد والموردين.');
  if (k.paybackYears == null) recs.push('لا يُسترد رأس المال خلال مدة الدراسة؛ أعد النظر في حجم الاستثمار أو نموذج الإيرادات.');
  recs.push('التحقق من الأسعار والتكاليف بعروض أسعار فعلية من الموردين قبل التنفيذ.', 'مراجعة الدراسة مع مختص مالي قبل اتخاذ قرار الاستثمار.');
  const channels = Array.isArray(answers.salesChannels) && answers.salesChannels.length ? answers.salesChannels : ['وسائل التواصل الاجتماعي', 'محل أو فرع فعلي'];
  return {
    executiveSummary: [
      `تتناول هذه الدراسة مشروع «${answers.projectName || ''}» في ${answers.city || ''}، ${answers.country || ''}. يبلغ إجمالي الاستثمار المطلوب ${fmtMoney(k.totalInvestment, cur)}، منها ${fmtMoney(k.equity, cur)} حصة الملاك${k.loan ? ` و${fmtMoney(k.loan, cur)} تمويل` : ''}.`,
      `تُقدَّر إيرادات السنة الأولى بنحو ${fmtMoney(k.year1Revenue, cur)} بصافي ربح ${fmtMoney(k.year1Net, cur)}، ومتوسط صافي ربح سنوي ${fmtMoney(k.avgAnnualNet, cur)} على مدى ${I.years} سنوات.`,
      `صافي القيمة الحالية ${fmtMoney(k.npv, cur)} عند معدل خصم ${fmtPct(I.discount)}، ومعدل العائد الداخلي ${fmtPct(k.irr)}، وفترة الاسترداد ${fmtYears(k.paybackYears)}.`,
    ].join('\n'),
    verdict,
    verdictReason: verdict === 'مجدٍ' ? 'صافي القيمة الحالية موجب، ومعدل العائد الداخلي أعلى من معدل الخصم، ويُسترد رأس المال في مدة مناسبة.' : verdict === 'مجدٍ بشروط' ? 'يحقق المشروع عائدًا، لكن بعض المؤشرات تحتاج إلى تحسين قبل التنفيذ، كما توضح التوصيات.' : 'لا تغطي التدفقات النقدية المتوقعة تكلفة الاستثمار خلال مدة الدراسة وفق الأرقام المدخلة.',
    marketingPlan: channels.map(c => ({ channel: c, action: 'حملات مستهدفة للعملاء في نطاق المشروع مع عروض افتتاحية', budgetShare: '' })),
    risks: [
      { risk: 'انخفاض المبيعات عن المتوقع', likelihood: 'متوسط', impact: 'مرتفع', mitigation: 'تسويق مكثف في البداية ومتابعة شهرية للمبيعات' },
      { risk: 'ارتفاع التكاليف التشغيلية', likelihood: 'متوسط', impact: 'متوسط', mitigation: 'عقود طويلة الأجل مع الموردين ومراقبة المصروفات' },
      { risk: 'دخول منافسين جدد', likelihood: 'مرتفع', impact: 'متوسط', mitigation: 'تعزيز الميزة التنافسية وولاء العملاء' },
      { risk: 'تأخر التراخيص أو التجهيز', likelihood: 'متوسط', impact: 'متوسط', mitigation: 'البدء المبكر في الإجراءات وجدول زمني احتياطي' },
      { risk: 'نقص السيولة في الأشهر الأولى', likelihood: 'متوسط', impact: 'مرتفع', mitigation: `الاحتفاظ برأس مال عامل يكفي ${I.wcMonths} أشهر على الأقل` },
    ],
    successFactors: ['جودة المنتج أو الخدمة', 'اختيار الموقع المناسب', 'الإدارة المالية المنضبطة'],
    recommendations: recs,
    nextSteps: ['الحصول على عروض أسعار فعلية', 'اختيار الموقع وتوقيع العقد', 'استخراج التراخيص', 'التجهيز والتوظيف', 'الافتتاح والتسويق'],
  };
}
