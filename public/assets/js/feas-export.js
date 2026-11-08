// إنشاء ملفي Word وExcel لدراسة الجدوى
import { libs } from './ui.js';
import { fmtMoney, fmtPct, fmtYears, currencyCode } from './finance.js';

const FONT = 'Arial';
const BRAND = '0F766E';

export async function buildDocx(R, M, CONFIG) {
  const D = await libs.docx();
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, PageBreak, Footer, Header, PageNumber } = D;
  const cur = currencyCode(R.answers.currency);
  const A = R.answers, mk = R.market || {}, tc = R.technical || {}, sm = R.summary || {};
  const run = (text, o = {}) => new TextRun({ text: String(text ?? ''), font: FONT, rightToLeft: true, size: o.size || 24, sizeComplexScript: o.size || 24, bold: o.bold, boldComplexScript: o.bold, color: o.color });
  const P = (text, o = {}) => new Paragraph({ bidirectional: true, alignment: o.align || AlignmentType.BOTH, spacing: { after: o.after ?? 120, line: 320, before: o.before || 0 }, children: Array.isArray(text) ? text : [run(text, o)] });
  const H1 = (text) => new Paragraph({ bidirectional: true, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.RIGHT, spacing: { before: 360, after: 160 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BRAND, space: 4 } }, children: [run(text, { size: 34, bold: true, color: BRAND })] });
  const H2 = (text) => new Paragraph({ bidirectional: true, heading: HeadingLevel.HEADING_2, alignment: AlignmentType.RIGHT, spacing: { before: 240, after: 100 }, children: [run(text, { size: 28, bold: true, color: '1F2937' })] });
  const bullets = (arr) => (arr || []).filter(Boolean).map(x => new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, spacing: { after: 60 }, children: [run('•  ' + x)] }));
  const paras = (text) => String(text || '').split(/\n+/).filter(s => s.trim()).map(s => P(s));
  const cell = (v, o = {}) => new TableCell({
    shading: o.head ? { type: ShadingType.CLEAR, fill: BRAND, color: 'auto' } : o.alt ? { type: ShadingType.CLEAR, fill: 'F1F5F4', color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ bidirectional: true, alignment: typeof v === 'number' ? AlignmentType.LEFT : AlignmentType.RIGHT, children: [run(typeof v === 'number' ? fmtMoney(v) : v, { size: 20, bold: o.head || o.bold, color: o.head ? 'FFFFFF' : undefined })] })],
  });
  const table = (head, rows, opts = {}) => new Table({
    visuallyRightToLeft: true, width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ tableHeader: true, children: head.map(x => cell(x, { head: true })) }), ...rows.map((r, i) => new TableRow({ children: r.map(c => cell(c, { alt: i % 2 === 1, bold: opts.boldLast && i === rows.length - 1 })) }))],
  });
  const gap = () => P('', { after: 80 });
  const rows = M.rows, T = M.totals, K = M.kpis, I = M.inputs;
  const date = new Date(R.createdAt).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
  const siteName = CONFIG.site.name;

  const cover = [
    P('', { after: 2400 }),
    P([run('دراسة جدوى اقتصادية', { size: 40, bold: true, color: '6B7280' })], { align: AlignmentType.CENTER, after: 500 }),
    P([run(A.projectName || 'المشروع', { size: 60, bold: true, color: BRAND })], { align: AlignmentType.CENTER, after: 400 }),
    P([run(`${A.city || ''}، ${A.country || ''}`, { size: 30 })], { align: AlignmentType.CENTER }),
    P([run(A.sector || '', { size: 26, color: '6B7280' })], { align: AlignmentType.CENTER }),
    P([run('تاريخ الإعداد: ' + date, { size: 24 })], { align: AlignmentType.CENTER, before: 1600 }),
    P([run(R.mode === 'manual' ? `أُعدّت عبر منصة ${siteName} بالوضع اليدوي اعتمادًا على أرقام صاحب المشروع` : R.mode === 'hybrid' ? `أُعدّت عبر منصة ${siteName} بمساعدة الذكاء الاصطناعي، وأُكملت بالوضع اليدوي` : `أُعدّت عبر منصة ${siteName} بمساعدة الذكاء الاصطناعي`, { size: 22, color: '6B7280' })], { align: AlignmentType.CENTER }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
  const toc = ['الملخص التنفيذي', 'وصف المشروع', 'دراسة السوق', 'تحليل SWOT', 'الدراسة الفنية', 'الدراسة القانونية والتنظيمية', 'الدراسة المالية', 'خطة التسويق', 'تحليل المخاطر', 'التوصيات والخطوات التالية', 'المصادر'];
  const content = [
    H1('محتويات الدراسة'), ...toc.map((x, i) => P(`${i + 1}. ${x}`, { after: 60 })), new Paragraph({ children: [new PageBreak()] }),

    H1('1. الملخص التنفيذي'), ...paras(sm.executiveSummary),
    H2('المؤشرات الرئيسية'),
    table(['المؤشر', 'القيمة'], [
      ['إجمالي الاستثمار المطلوب', fmtMoney(K.totalInvestment, cur)], ['حصة الملاك', fmtMoney(K.equity, cur)], ['التمويل (القرض)', fmtMoney(K.loan, cur)],
      ['صافي القيمة الحالية (NPV)', fmtMoney(K.npv, cur)], ['معدل العائد الداخلي (IRR)', fmtPct(K.irr)], ['فترة الاسترداد', fmtYears(K.paybackYears)],
      ['إيرادات السنة الأولى', fmtMoney(K.year1Revenue, cur)], ['صافي ربح السنة الأولى', fmtMoney(K.year1Net, cur)], ['متوسط صافي الربح السنوي', fmtMoney(K.avgAnnualNet, cur)],
      ['العائد السنوي على الاستثمار', fmtPct(K.roi)], ['نقطة التعادل (إيرادات شهرية)', fmtMoney(K.breakEvenRevenueMonthly, cur)], ['هامش الربح الإجمالي', fmtPct(K.grossMargin)],
    ]),
    gap(), H2('الحكم على الجدوى: ' + (sm.verdict || '')), ...paras(sm.verdictReason),
    ...(K.fundingGap > 0 ? [P(`تنبيه: يتجاوز إجمالي الاستثمار المطلوب رأس المال المتاح والتمويل بمقدار ${fmtMoney(K.fundingGap, cur)}، ويلزم سد هذه الفجوة أو تقليص التكاليف الاستثمارية.`, { bold: true, color: 'B45309' })] : []),

    H1('2. وصف المشروع'), ...paras(mk.projectDescription),
    H2('فكرة المشروع كما قدّمها صاحبه'), ...paras(A.projectIdea),
    H2('المنتجات والخدمات'), ...paras(A.products),
    ...(A.goals ? [H2('أهداف المشروع'), ...paras(A.goals)] : []),

    H1('3. دراسة السوق'), H2('نظرة عامة على القطاع'), ...paras(mk.market?.overview),
    H2('حجم السوق'), ...paras(mk.market?.marketSize),
    H2('الاتجاهات الحديثة في السوق'), ...bullets(mk.market?.trends),
    H2('الشرائح المستهدفة'), table(['الشريحة', 'الوصف'], (mk.market?.targetSegments || []).map(s => [s.segment, s.description])),
    H2('تحليل الطلب'), ...paras(mk.market?.demandAnalysis),
    H2('تحليل الأسعار'), ...paras(mk.market?.pricingAnalysis),
    H2('تحليل المنافسين'), table(['المنافس', 'النوع', 'نقاط القوة', 'نقاط الضعف'], (mk.market?.competitors || []).map(c => [c.name, c.type, c.strengths, c.weaknesses])),

    H1('4. تحليل SWOT'),
    H2('نقاط القوة'), ...bullets(mk.swot?.strengths), H2('نقاط الضعف'), ...bullets(mk.swot?.weaknesses),
    H2('الفرص'), ...bullets(mk.swot?.opportunities), H2('التهديدات'), ...bullets(mk.swot?.threats),

    H1('5. الدراسة الفنية'), H2('الموقع'), ...paras(tc.technical?.location), H2('التجهيز والمساحات'), ...paras(tc.technical?.layout),
    H2('دورة التشغيل'), ...paras(tc.technical?.operations),
    H2('المعدات والأجهزة'), table(['البند', 'الكمية', `سعر الوحدة (${cur})`, `الإجمالي (${cur})`], [...I.equipment.map(e => [e.item, String(e.qty), e.unitCost, e.qty * e.unitCost]), ['الإجمالي', '', '', T.equipmentTotal]], { boldLast: true }),
    H2('الهيكل الوظيفي'), table(['الوظيفة', 'العدد', `الراتب الشهري (${cur})`, `الإجمالي الشهري (${cur})`], [...I.staffing.map(s => [s.role, String(s.count), s.monthlySalary, s.count * s.monthlySalary]), ['الإجمالي', String(I.staffing.reduce((a, s) => a + s.count, 0)), '', T.payrollMonthly]], { boldLast: true }),
    ...((tc.technical?.suppliers || []).length ? [H2('الموردون'), ...bullets(tc.technical.suppliers)] : []),
    H2('الجدول الزمني للتنفيذ'), table(['المرحلة', 'المدة (أسابيع)'], (tc.technical?.timeline || []).map(x => [x.phase, String(x.weeks ?? '')])),

    H1('6. الدراسة القانونية والتنظيمية'),
    table(['الترخيص أو التسجيل', 'الجهة المختصة', `التكلفة التقديرية (${cur})`, 'ملاحظات'], (mk.legal?.licenses || []).map(l => [l.name, l.authority, Number(l.estimatedCost) || 0, l.notes || ''])),
    gap(), ...bullets(mk.legal?.regulations),

    H1('7. الدراسة المالية'),
    H2('7.1 التكاليف الاستثمارية'),
    table(['البند', `التكلفة (${cur})`], [['المعدات والأجهزة', T.equipmentTotal], ...I.otherCapex.map(e => [e.item, e.cost]), ...I.preOperating.map(e => [e.item + ' (ما قبل التشغيل)', e.cost]), [`رأس المال العامل (${I.wcMonths} أشهر تشغيل)`, T.workingCapital], ['إجمالي الاستثمار', T.totalInvestment]], { boldLast: true }),
    H2('7.2 مصادر التمويل'), table(['المصدر', `المبلغ (${cur})`], [['حصة الملاك', T.equity], ['القرض أو التمويل', T.loan], ['الإجمالي', T.totalInvestment]], { boldLast: true }),
    H2('7.3 المصروفات التشغيلية الشهرية'), table(['البند', `شهريًا (${cur})`, `سنويًا (${cur})`], [...I.monthlyOpex.map(e => [e.item, e.cost, e.cost * 12]), ['الرواتب والأجور', T.payrollMonthly, T.payrollMonthly * 12], ['الإجمالي', T.opexMonthly + T.payrollMonthly, (T.opexMonthly + T.payrollMonthly) * 12]], { boldLast: true }),
    H2('7.4 الإيرادات المتوقعة (بالطاقة المستهدفة)'), table(['المنتج أو الخدمة', 'سعر الوحدة', 'الكمية الشهرية', 'الإيراد الشهري', 'نسبة التكلفة'], [...I.revenueStreams.map(r => [r.name + (r.unit ? ` (${r.unit})` : ''), r.unitPrice, r.monthlyVolume, r.unitPrice * r.monthlyVolume, fmtPct(r.cogsPct)]), ['الإجمالي', '', '', T.baseRevenue / 12, fmtPct(T.cogsRatio)]], { boldLast: true }),
    H2('7.5 الافتراضات المالية'), table(['الافتراض', 'القيمة'], [['نسبة التشغيل في السنة الأولى', fmtPct(I.rampUp)], ['النمو السنوي في الإيرادات', fmtPct(I.growth)], ['التضخم السنوي في التكاليف', fmtPct(I.inflation)], ['معدل الخصم', fmtPct(I.discount)], ['نسبة الزكاة أو الضريبة', fmtPct(I.tax)], ['مدة الإهلاك', I.depYears + ' سنوات'], ...(T.loan ? [['معدل الفائدة السنوي', fmtPct(I.loanRate)], ['مدة القرض', I.loanYears + ' سنوات']] : [])]),
    ...bullets(I.notes),
    H2('7.6 قائمة الدخل التقديرية'), table(['البند', ...rows.map(r => 'السنة ' + r.year)], [['الإيرادات', ...rows.map(r => r.revenue)], ['تكلفة المبيعات', ...rows.map(r => r.cogs)], ['مجمل الربح', ...rows.map(r => r.gross)], ['المصروفات التشغيلية', ...rows.map(r => r.opex)], ['الربح قبل الفوائد والإهلاك', ...rows.map(r => r.ebitda)], ['الإهلاك', ...rows.map(r => r.depreciation)], ['الفوائد', ...rows.map(r => r.interest)], ['الضريبة أو الزكاة', ...rows.map(r => r.tax)], ['صافي الربح', ...rows.map(r => r.net)]], { boldLast: true }),
    H2('7.7 التدفقات النقدية'), table(['البند', ...rows.map(r => 'السنة ' + r.year)], [['صافي الربح', ...rows.map(r => r.net)], ['يضاف: الإهلاك', ...rows.map(r => r.depreciation)], ['يطرح: سداد أصل القرض', ...rows.map(r => r.principal)], ['صافي التدفق النقدي', ...rows.map(r => r.cashFlow)], ['التدفق النقدي التراكمي', ...rows.map(r => r.cumulative)]], { boldLast: true }),
    H2('7.8 مؤشرات التقييم المالي'),
    table(['المؤشر', 'القيمة', 'التفسير'], [
      ['صافي القيمة الحالية', fmtMoney(K.npv, cur), K.npv > 0 ? 'موجبة: يحقق المشروع عائدًا يفوق معدل الخصم' : 'سالبة: لا يغطي المشروع تكلفة رأس المال خلال مدة الدراسة'],
      ['معدل العائد الداخلي', fmtPct(K.irr), K.irr != null && K.irr > I.discount ? 'أعلى من معدل الخصم، وهو مؤشر إيجابي' : 'أقل من معدل الخصم أو غير محقق'],
      ['فترة الاسترداد', fmtYears(K.paybackYears), 'المدة اللازمة لاسترداد حصة الملاك من صافي التدفقات'],
      ['نقطة التعادل', fmtMoney(K.breakEvenRevenueMonthly, cur) + ' شهريًا', 'حجم الإيرادات الشهرية اللازم لتغطية جميع التكاليف في السنة الأولى'],
    ]),

    H1('8. خطة التسويق'), table(['القناة', 'الإجراء المقترح', 'حصة الميزانية'], (sm.marketingPlan || []).map(m => [m.channel, m.action, m.budgetShare || ''])),
    ...((sm.successFactors || []).length ? [H2('عوامل النجاح الرئيسية'), ...bullets(sm.successFactors)] : []),
    H1('9. تحليل المخاطر'), table(['الخطر', 'الاحتمال', 'الأثر', 'طريقة الحد منه'], (sm.risks || []).map(r => [r.risk, r.likelihood, r.impact, r.mitigation])),
    H1('10. التوصيات والخطوات التالية'), H2('التوصيات'), ...bullets(sm.recommendations), H2('الخطوات التالية'), ...bullets(sm.nextSteps),
    H1('11. المصادر'), ...sources(R).map(s => new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, spacing: { after: 40 }, children: [run('•  ' + s.title + (s.url ? ' — ' : ''), { size: 20 }), new TextRun({ text: s.url, font: FONT, size: 18, color: '1D4ED8' })] })),
    P('', { after: 200 }),
    P(R.mode === 'manual' ? 'تنبيه: أُعدّت هذه الدراسة بالوضع اليدوي، فاعتمدت أرقامها على ما أدخله صاحب المشروع، وبُنيت نصوصها وفق قواعد ثابتة. يُنصح بمراجعة الأرقام مع مختص قبل اتخاذ قرار الاستثمار.' : 'تنبيه: أُعدّت هذه الدراسة آليًا بمساعدة الذكاء الاصطناعي اعتمادًا على البيانات التي قدّمها صاحب المشروع والمعلومات المتاحة على الويب وقت الإعداد. الأرقام تقديرية، ويُنصح بالتحقق منها ومراجعتها مع مختص قبل اتخاذ قرار الاستثمار.', { size: 20, color: '6B7280' }),
  ];
  const doc = new Document({
    creator: siteName, title: 'دراسة جدوى ' + (A.projectName || ''), description: 'دراسة جدوى اقتصادية',
    styles: { default: { document: { run: { font: FONT, rightToLeft: true } } } },
    sections: [
      { properties: { page: { margin: { top: 1200, bottom: 1200, left: 1100, right: 1100 } } }, children: cover },
      {
        properties: { page: { margin: { top: 1200, bottom: 1200, left: 1100, right: 1100 } } },
        headers: { default: new Header({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.LEFT, children: [run('دراسة جدوى: ' + (A.projectName || ''), { size: 18, color: '9CA3AF' })] })] }) },
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: '6B7280' })] })] }) },
        children: content,
      },
    ],
  });
  return Packer.toBlob(doc);
}

function sources(R) {
  const seen = new Set(); const out = [];
  for (const s of [...(R.market?.sources || []), ...(R.technical?.sources || []), ...(R.summary?.sources || [])]) if (s?.url && !seen.has(s.url)) { seen.add(s.url); out.push(s); }
  return out.length ? out : [{ title: R.mode === 'manual' ? 'أرقام هذه الدراسة مقدّمة من صاحب المشروع (الوضع اليدوي)' : 'لم يُرجع مزوّد الذكاء الاصطناعي روابط مصادر لهذه الدراسة', url: '' }];
}

export async function buildXlsx(R, M, CONFIG) {
  const ExcelJS = await libs.exceljs();
  const wb = new ExcelJS.Workbook(); wb.creator = CONFIG.site.name; wb.created = new Date();
  wb.calcProperties = { fullCalcOnLoad: true };
  const cur = currencyCode(R.answers.currency) || '';
  const I = M.inputs, T = M.totals, rows = M.rows, N = I.years;
  const MONEY = '#,##0;[Red]-#,##0', PCT = '0.0%';
  const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  const totFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4F1' } };
  const border = { top: { style: 'thin', color: { argb: 'FFD1D5DB' } }, bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }, left: { style: 'thin', color: { argb: 'FFD1D5DB' } }, right: { style: 'thin', color: { argb: 'FFD1D5DB' } } };
  const sheet = (name, widths) => { const ws = wb.addWorksheet(name, { views: [{ rightToLeft: true, showGridLines: false }] }); ws.columns = widths.map(w => ({ width: w })); return ws; };
  const title = (ws, text, cols) => { ws.mergeCells(1, 1, 1, cols); const c = ws.getCell(1, 1); c.value = text; c.font = { bold: true, size: 15, color: { argb: 'FF0F766E' }, name: 'Arial' }; ws.getRow(1).height = 26; };
  const header = (ws, r, vals) => { vals.forEach((v, i) => { const c = ws.getCell(r, i + 1); c.value = v; c.fill = headFill; c.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial' }; c.border = border; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; }); ws.getRow(r).height = 22; };
  const styleRow = (ws, r, n, total = false) => { for (let i = 1; i <= n; i++) { const c = ws.getCell(r, i); c.border = border; c.font = { name: 'Arial', bold: total }; if (total) c.fill = totFill; if (typeof c.value === 'number' || c.value?.formula) c.numFmt = c.numFmt || MONEY; } };
  const F = (formula, result) => ({ formula, result: Number.isFinite(result) ? result : 0 });
  const q = (n) => `'${n}'`;

  // ===== الافتراضات =====
  const S_A = 'الافتراضات'; const wa = sheet(S_A, [46, 18, 60]);
  title(wa, 'الافتراضات المالية — يمكنك تعديل القيم في العمود الثاني فتتحدث جميع الأوراق تلقائيًا', 3);
  header(wa, 3, ['الافتراض', 'القيمة', 'ملاحظة']);
  const assum = [
    ['نسبة النمو السنوي للإيرادات', I.growth, PCT], ['نسبة التضخم السنوي في التكاليف', I.inflation, PCT], ['نسبة التشغيل في السنة الأولى', I.rampUp, PCT],
    ['معدل الخصم', I.discount, PCT], ['نسبة الزكاة أو الضريبة', I.tax, PCT], ['أشهر رأس المال العامل', I.wcMonths, '0'], ['سنوات الإهلاك', I.depYears, '0'],
    ['قيمة القرض', T.loan, MONEY], ['معدل الفائدة السنوي', I.loanRate, PCT], ['مدة القرض بالسنوات', I.loanYears, '0'], ['رأس المال المتاح', I.capital, MONEY],
  ];
  assum.forEach(([l, v, f], i) => { const r = 4 + i; wa.getCell(r, 1).value = l; const c = wa.getCell(r, 2); c.value = v; c.numFmt = f; c.font = { color: { argb: 'FF1D4ED8' }, bold: true }; styleRow(wa, r, 3); c.font = { color: { argb: 'FF1D4ED8' }, bold: true, name: 'Arial' }; });
  (I.notes || []).forEach((n, i) => { wa.getCell(17 + i, 1).value = '• ' + n; wa.mergeCells(17 + i, 1, 17 + i, 3); wa.getCell(17 + i, 1).alignment = { wrapText: true }; });
  if ((I.notes || []).length) wa.getCell(16, 1).value = 'مسوّغات الافتراضات:';
  const A = (i) => `${q(S_A)}!$B$${4 + i}`; // 0 نمو، 1 تضخم، 2 تشغيل، 3 خصم، 4 ضريبة، 5 أشهر رأس المال العامل، 6 إهلاك، 7 قرض، 8 فائدة، 9 مدة، 10 رأس المال

  // ===== التكاليف الاستثمارية =====
  const S_C = 'التكاليف الاستثمارية'; const wc = sheet(S_C, [44, 12, 18, 18]);
  title(wc, `التكاليف الاستثمارية (${cur})`, 4); header(wc, 3, ['المعدات والأجهزة', 'الكمية', 'سعر الوحدة', 'الإجمالي']);
  let r = 4; const eqStart = r;
  I.equipment.forEach(e => { wc.getRow(r).values = [e.item, e.qty, e.unitCost]; wc.getCell(r, 4).value = F(`B${r}*C${r}`, e.qty * e.unitCost); styleRow(wc, r, 4); wc.getCell(r, 2).numFmt = '0'; r++; });
  wc.getCell(r, 1).value = 'إجمالي المعدات'; wc.getCell(r, 4).value = F(`SUM(D${eqStart}:D${Math.max(eqStart, r - 1)})`, T.equipmentTotal); styleRow(wc, r, 4, true); const eqTot = r; r += 2;
  header(wc, r, ['تكاليف رأسمالية أخرى', '', '', 'التكلفة']); r++; const ocStart = r;
  I.otherCapex.forEach(e => { wc.getCell(r, 1).value = e.item; wc.getCell(r, 4).value = e.cost; styleRow(wc, r, 4); r++; });
  wc.getCell(r, 1).value = 'إجمالي التكاليف الرأسمالية الأخرى'; wc.getCell(r, 4).value = F(I.otherCapex.length ? `SUM(D${ocStart}:D${r - 1})` : '0', T.otherCapexTotal); styleRow(wc, r, 4, true); const ocTot = r; r += 2;
  header(wc, r, ['مصروفات ما قبل التشغيل', '', '', 'التكلفة']); r++; const poStart = r;
  I.preOperating.forEach(e => { wc.getCell(r, 1).value = e.item; wc.getCell(r, 4).value = e.cost; styleRow(wc, r, 4); r++; });
  wc.getCell(r, 1).value = 'إجمالي مصروفات ما قبل التشغيل'; wc.getCell(r, 4).value = F(I.preOperating.length ? `SUM(D${poStart}:D${r - 1})` : '0', T.preOpTotal); styleRow(wc, r, 4, true); const poTot = r;
  const C_CAPEX = `(${q(S_C)}!$D$${eqTot}+${q(S_C)}!$D$${ocTot})`, C_PREOP = `${q(S_C)}!$D$${poTot}`;

  // ===== التكاليف التشغيلية =====
  const S_O = 'التكاليف التشغيلية'; const wo = sheet(S_O, [40, 12, 18, 18]);
  title(wo, `التكاليف التشغيلية (${cur})`, 4); header(wo, 3, ['المصروف', '', 'شهريًا', 'سنويًا']);
  r = 4; const opStart = r;
  I.monthlyOpex.forEach(e => { wo.getCell(r, 1).value = e.item; wo.getCell(r, 3).value = e.cost; wo.getCell(r, 4).value = F(`C${r}*12`, e.cost * 12); styleRow(wo, r, 4); r++; });
  wo.getCell(r, 1).value = 'إجمالي المصروفات التشغيلية'; wo.getCell(r, 3).value = F(I.monthlyOpex.length ? `SUM(C${opStart}:C${r - 1})` : '0', T.opexMonthly); wo.getCell(r, 4).value = F(`C${r}*12`, T.opexMonthly * 12); styleRow(wo, r, 4, true); const opTot = r; r += 2;
  header(wo, r, ['الوظيفة', 'العدد', 'الراتب الشهري', 'إجمالي الرواتب الشهرية']); r++; const stStart = r;
  I.staffing.forEach(s => { wo.getRow(r).values = [s.role, s.count, s.monthlySalary]; wo.getCell(r, 4).value = F(`B${r}*C${r}`, s.count * s.monthlySalary); styleRow(wo, r, 4); wo.getCell(r, 2).numFmt = '0'; r++; });
  wo.getCell(r, 1).value = 'إجمالي الرواتب'; wo.getCell(r, 2).value = F(I.staffing.length ? `SUM(B${stStart}:B${r - 1})` : '0', I.staffing.reduce((a, s) => a + s.count, 0)); wo.getCell(r, 4).value = F(I.staffing.length ? `SUM(D${stStart}:D${r - 1})` : '0', T.payrollMonthly); styleRow(wo, r, 4, true); wo.getCell(r, 2).numFmt = '0'; const stTot = r;
  const O_MONTHLY = `(${q(S_O)}!$C$${opTot}+${q(S_O)}!$D$${stTot})`;

  // ===== الإيرادات =====
  const S_R = 'الإيرادات'; const wr = sheet(S_R, [34, 14, 14, 14, 16, 18, 12, 18]);
  title(wr, `الإيرادات المتوقعة بالطاقة المستهدفة (${cur})`, 8); header(wr, 3, ['المنتج أو الخدمة', 'الوحدة', 'سعر الوحدة', 'الكمية الشهرية', 'الإيراد الشهري', 'الإيراد السنوي', 'نسبة التكلفة', 'تكلفة المبيعات السنوية']);
  r = 4; const rvStart = r;
  I.revenueStreams.forEach(s => { wr.getRow(r).values = [s.name, s.unit, s.unitPrice, s.monthlyVolume]; wr.getCell(r, 5).value = F(`C${r}*D${r}`, s.unitPrice * s.monthlyVolume); wr.getCell(r, 6).value = F(`E${r}*12`, s.unitPrice * s.monthlyVolume * 12); wr.getCell(r, 7).value = s.cogsPct; wr.getCell(r, 8).value = F(`F${r}*G${r}`, s.unitPrice * s.monthlyVolume * 12 * s.cogsPct); styleRow(wr, r, 8); wr.getCell(r, 7).numFmt = PCT; wr.getCell(r, 4).numFmt = '#,##0'; r++; });
  wr.getCell(r, 1).value = 'الإجمالي'; wr.getCell(r, 5).value = F(`SUM(E${rvStart}:E${r - 1})`, T.baseRevenue / 12); wr.getCell(r, 6).value = F(`SUM(F${rvStart}:F${r - 1})`, T.baseRevenue); wr.getCell(r, 8).value = F(`SUM(H${rvStart}:H${r - 1})`, T.baseCogs); wr.getCell(r, 7).value = F(`IF(F${r}=0,0,H${r}/F${r})`, T.cogsRatio); styleRow(wr, r, 8, true); wr.getCell(r, 7).numFmt = PCT; const rvTot = r;
  const R_REV = `${q(S_R)}!$F$${rvTot}`, R_COGS = `${q(S_R)}!$H$${rvTot}`;

  // ===== القوائم المالية =====
  const S_P = 'القوائم المالية'; const wp = sheet(S_P, [34, ...Array(N + 1).fill(16)]);
  title(wp, `قائمة الدخل والتدفقات النقدية التقديرية (${cur})`, N + 2);
  const col = (y) => wp.getColumn(y + 2).letter; // y=0 عمود B
  header(wp, 3, ['البند', 'السنة 0', ...rows.map(x => 'السنة ' + x.year)]);
  const L = ['السنة', 'الإيرادات', 'تكلفة المبيعات', 'مجمل الربح', 'المصروفات التشغيلية', 'الربح قبل الفوائد والإهلاك', 'الإهلاك', 'الفوائد', 'الربح قبل الضريبة', 'الضريبة أو الزكاة', 'صافي الربح', 'سداد أصل القرض', 'صافي التدفق النقدي', 'التدفق النقدي التراكمي'];
  L.forEach((l, i) => { wp.getCell(4 + i, 1).value = l; });
  const RW = Object.fromEntries(['year', 'rev', 'cogs', 'gross', 'opex', 'ebitda', 'dep', 'int', 'ebt', 'tax', 'net', 'prin', 'cf', 'cum'].map((k, i) => [k, 4 + i]));
  const equityF = `${C_CAPEX}+${C_PREOP}+${A(5)}*${O_MONTHLY}-MIN(${A(7)},${C_CAPEX}+${C_PREOP}+${A(5)}*${O_MONTHLY})`;
  wp.getCell(RW.year, 2).value = 0;
  wp.getCell(RW.cf, 2).value = F(`-(${equityF})`, -T.equity);
  wp.getCell(RW.cum, 2).value = F(`B${RW.cf}`, -T.equity);
  rows.forEach((x) => {
    const c = col(x.year), p = col(x.year - 1);
    const set = (k, f, v) => wp.getCell(`${c}${RW[k]}`).value = F(f, v);
    wp.getCell(`${c}${RW.year}`).value = x.year;
    set('rev', `${R_REV}*IF(${c}$${RW.year}=1,${A(2)},1)*(1+${A(0)})^(${c}$${RW.year}-1)`, x.revenue);
    set('cogs', `${R_COGS}*IF(${c}$${RW.year}=1,${A(2)},1)*(1+${A(0)})^(${c}$${RW.year}-1)`, x.cogs);
    set('gross', `${c}${RW.rev}-${c}${RW.cogs}`, x.gross);
    set('opex', `${O_MONTHLY}*12*(1+${A(1)})^(${c}$${RW.year}-1)`, x.opex);
    set('ebitda', `${c}${RW.gross}-${c}${RW.opex}`, x.ebitda);
    set('dep', `IF(${c}$${RW.year}<=${A(6)},(${C_CAPEX}+${C_PREOP})/${A(6)},0)`, x.depreciation);
    set('int', `IF(AND(${A(7)}>0,${c}$${RW.year}<=${A(9)}),-IPMT(${A(8)},${c}$${RW.year},${A(9)},MIN(${A(7)},${C_CAPEX}+${C_PREOP}+${A(5)}*${O_MONTHLY})),0)`, x.interest);
    set('ebt', `${c}${RW.ebitda}-${c}${RW.dep}-${c}${RW.int}`, x.ebt);
    set('tax', `MAX(0,${c}${RW.ebt})*${A(4)}`, x.tax);
    set('net', `${c}${RW.ebt}-${c}${RW.tax}`, x.net);
    set('prin', `IF(AND(${A(7)}>0,${c}$${RW.year}<=${A(9)}),-PPMT(${A(8)},${c}$${RW.year},${A(9)},MIN(${A(7)},${C_CAPEX}+${C_PREOP}+${A(5)}*${O_MONTHLY})),0)`, x.principal);
    set('cf', `${c}${RW.net}+${c}${RW.dep}-${c}${RW.prin}`, x.cashFlow);
    set('cum', `${p}${RW.cum}+${c}${RW.cf}`, x.cumulative);
  });
  for (let i = 0; i < L.length; i++) { styleRow(wp, 4 + i, N + 2, ['gross', 'ebitda', 'net', 'cf'].includes(Object.keys(RW)[i])); if (i === 0) for (let k = 2; k <= N + 2; k++) wp.getCell(4, k).numFmt = '0'; }
  const last = col(N);

  // ===== الملخص =====
  const S_S = 'الملخص'; const ws = sheet(S_S, [42, 24, 50]);
  title(ws, 'ملخص دراسة الجدوى: ' + (R.answers.projectName || ''), 3);
  ws.getCell(2, 1).value = `${R.answers.city || ''}، ${R.answers.country || ''} — العملة: ${cur}`; ws.getCell(2, 1).font = { color: { argb: 'FF6B7280' } };
  header(ws, 4, ['المؤشر', 'القيمة', 'ملاحظة']);
  const K = M.kpis;
  const P = (cell) => `${q(S_P)}!${cell}`;
  const summary = [
    ['إجمالي الاستثمار المطلوب', F(`${C_CAPEX}+${C_PREOP}+${A(5)}*${O_MONTHLY}`, K.totalInvestment), MONEY, 'المعدات والتجهيزات + ما قبل التشغيل + رأس المال العامل'],
    ['التمويل (القرض)', F(`MIN(${A(7)},B5)`, K.loan), MONEY, ''],
    ['حصة الملاك', F(`B5-B6`, K.equity), MONEY, ''],
    ['رأس المال المتاح', F(A(10), K.capitalAvailable), MONEY, ''],
    ['فجوة التمويل', F(`MAX(0,B5-B8-B6)`, K.fundingGap), MONEY, 'إذا كانت أكبر من صفر فيلزم تمويل إضافي'],
    ['صافي القيمة الحالية (NPV)', F(`NPV(${A(3)},${P(`C${RW.cf}:${last}${RW.cf}`)})+${P(`B${RW.cf}`)}`, K.npv), MONEY, 'موجبة = المشروع مجدٍ عند معدل الخصم المحدد'],
    ['معدل العائد الداخلي (IRR)', F(`IFERROR(IRR(${P(`B${RW.cf}:${last}${RW.cf}`)}),"غير محقق")`, K.irr ?? 0), PCT, 'يُقارن بمعدل الخصم'],
    ['فترة الاسترداد (سنوات)', K.paybackYears == null ? 'لا يتحقق خلال مدة الدراسة' : Number(K.paybackYears.toFixed(2)), '0.00', 'محسوبة من التدفق النقدي التراكمي'],
    ['إيرادات السنة الأولى', F(P(`C${RW.rev}`), K.year1Revenue), MONEY, ''],
    ['صافي ربح السنة الأولى', F(P(`C${RW.net}`), K.year1Net), MONEY, ''],
    ['متوسط صافي الربح السنوي', F(`AVERAGE(${P(`C${RW.net}:${last}${RW.net}`)})`, K.avgAnnualNet), MONEY, ''],
    ['العائد السنوي على الاستثمار', F(`IF(B5=0,0,B15/B5)`, K.roi ?? 0), PCT, 'متوسط صافي الربح ÷ إجمالي الاستثمار'],
    ['نقطة التعادل (إيرادات سنوية)', F(`IFERROR((${P(`C${RW.opex}`)}+${P(`C${RW.dep}`)}+${P(`C${RW.int}`)})/(1-${q(S_R)}!$G$${rvTot}),0)`, K.breakEvenRevenueAnnual ?? 0), MONEY, 'الإيرادات اللازمة لتغطية جميع تكاليف السنة الأولى'],
    ['نقطة التعادل (إيرادات شهرية)', F(`B17/12`, K.breakEvenRevenueMonthly ?? 0), MONEY, ''],
    ['الحكم على الجدوى', R.summary?.verdict || '', null, ''],
  ];
  summary.forEach(([l, v, f, n], i) => { const rr = 5 + i; ws.getCell(rr, 1).value = l; ws.getCell(rr, 2).value = v; ws.getCell(rr, 3).value = n; styleRow(ws, rr, 3); if (f) ws.getCell(rr, 2).numFmt = f; ws.getCell(rr, 3).font = { color: { argb: 'FF6B7280' }, name: 'Arial' }; });
  ws.getCell(5 + summary.length - 1, 2).font = { bold: true, name: 'Arial' };
  ws.getCell(22, 1).value = 'الخلايا الزرقاء في ورقة «الافتراضات» وجميع الأسعار والكميات قابلة للتعديل، وتُعاد الحسابات تلقائيًا.'; ws.mergeCells(22, 1, 22, 3); ws.getCell(22, 1).font = { italic: true, color: { argb: 'FF6B7280' } };

  // ===== السوق والمخاطر =====
  const wm = sheet('المنافسون', [28, 16, 50, 50]); title(wm, 'تحليل المنافسين', 4); header(wm, 3, ['المنافس', 'النوع', 'نقاط القوة', 'نقاط الضعف']);
  (R.market?.market?.competitors || []).forEach((c, i) => { wm.getRow(4 + i).values = [c.name, c.type, c.strengths, c.weaknesses]; styleRow(wm, 4 + i, 4); wm.getRow(4 + i).alignment = { wrapText: true, vertical: 'top' }; });
  const wk = sheet('المخاطر', [44, 14, 14, 60]); title(wk, 'مصفوفة المخاطر', 4); header(wk, 3, ['الخطر', 'الاحتمال', 'الأثر', 'طريقة الحد منه']);
  (R.summary?.risks || []).forEach((x, i) => { wk.getRow(4 + i).values = [x.risk, x.likelihood, x.impact, x.mitigation]; styleRow(wk, 4 + i, 4); wk.getRow(4 + i).alignment = { wrapText: true, vertical: 'top' }; });

  // ترتيب الأوراق: الملخص أولًا
  const order = [S_S, S_A, S_C, S_O, S_R, S_P, 'المنافسون', 'المخاطر'];
  order.forEach((n, i) => { wb.getWorksheet(n).orderNo = i; });
  wb.views = [{ activeTab: 0 }];
  return new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
