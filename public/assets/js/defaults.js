// الإعدادات الافتراضية للموقع — مصدر واحد تستخدمه الواجهة ولوحة التحكم ودوال الخادم.
// أي قيمة تُحفظ من لوحة التحكم تُدمج فوق هذه القيم.

export const CATEGORIES = [
  { id: 'organize', title: 'تنظيم ملفات PDF' },
  { id: 'convert', title: 'التحويل من PDF وإليه' },
  { id: 'edit', title: 'تحرير ملفات PDF' },
  { id: 'codes', title: 'الباركود ورموز QR' },
  { id: 'business', title: 'الأعمال والذكاء الاصطناعي' },
  { id: 'custom', title: 'خدمات إضافية' },
];

// الأدوات المدمجة في الموقع (الكود الخاص بكل أداة موجود في ملفات الواجهة)
export const BUILTIN_TOOLS = [
  { id: 'merge', category: 'organize', icon: 'combine', color: '#e5322d', title: 'دمج ملفات PDF', desc: 'اجمع عدة ملفات PDF في ملف واحد بالترتيب الذي تختاره.' },
  { id: 'split', category: 'organize', icon: 'scissors', color: '#e5322d', title: 'تقسيم ملف PDF', desc: 'افصل صفحات الملف إلى ملفات مستقلة، أو قسّمه حسب نطاقات تحددها.' },
  { id: 'remove-pages', category: 'organize', icon: 'file-minus', color: '#e5322d', title: 'حذف صفحات', desc: 'احذف الصفحات التي لا تحتاج إليها من ملف PDF.' },
  { id: 'extract-pages', category: 'organize', icon: 'file-output', color: '#e5322d', title: 'استخراج صفحات', desc: 'استخرج صفحات محددة من الملف في ملف PDF جديد.' },
  { id: 'organize', category: 'organize', icon: 'layout-grid', color: '#e5322d', title: 'ترتيب صفحات PDF', desc: 'أعد ترتيب الصفحات بالسحب والإفلات، أو احذف منها ما تشاء.' },
  { id: 'compress', category: 'organize', icon: 'minimize-2', color: '#2f9e44', title: 'ضغط ملف PDF', desc: 'قلّل حجم الملف مع الحفاظ على أفضل جودة ممكنة.' },

  { id: 'img-to-pdf', category: 'convert', icon: 'image', color: '#f59f00', title: 'تحويل الصور إلى PDF', desc: 'حوّل صور JPG و PNG و WEBP إلى ملف PDF واحد.' },
  { id: 'pdf-to-img', category: 'convert', icon: 'images', color: '#f59f00', title: 'تحويل PDF إلى صور', desc: 'حوّل كل صفحة من صفحات الملف إلى صورة عالية الجودة.' },
  { id: 'word-to-pdf', category: 'convert', icon: 'file-text', color: '#1c7ed6', title: 'تحويل وورد إلى PDF', desc: 'حوّل مستندات Word ‏(DOCX) إلى ملفات PDF.' },
  { id: 'pdf-to-word', category: 'convert', icon: 'file-type', color: '#1c7ed6', title: 'تحويل PDF إلى وورد', desc: 'حوّل ملف PDF إلى مستند Word قابل للتحرير.' },
  { id: 'excel-to-pdf', category: 'convert', icon: 'sheet', color: '#2b8a3e', title: 'تحويل إكسل إلى PDF', desc: 'حوّل جداول Excel إلى ملف PDF منسّق.' },
  { id: 'pdf-to-excel', category: 'convert', icon: 'sheet', color: '#2b8a3e', title: 'تحويل PDF إلى إكسل', desc: 'استخرج النصوص والجداول من ملف PDF إلى ملف Excel.' },

  { id: 'rotate', category: 'edit', icon: 'rotate-cw', color: '#7048e8', title: 'تدوير صفحات PDF', desc: 'دوّر جميع الصفحات أو صفحات بعينها بالزاوية التي تريدها.' },
  { id: 'watermark', category: 'edit', icon: 'stamp', color: '#7048e8', title: 'إضافة علامة مائية', desc: 'أضف نصًا أو صورة علامةً مائية على صفحات الملف.' },
  { id: 'page-numbers', category: 'edit', icon: 'list-ordered', color: '#7048e8', title: 'ترقيم صفحات PDF', desc: 'أضف أرقام الصفحات بالموضع والتنسيق اللذين تفضلهما.' },
  { id: 'sign', category: 'edit', icon: 'pen-tool', color: '#7048e8', title: 'توقيع ملف PDF', desc: 'ارسم توقيعك أو ارفع صورته وضعه على الصفحات المطلوبة.' },

  { id: 'qr', category: 'codes', icon: 'qr-code', color: '#0f766e', title: 'مولّد رمز QR الدائم', desc: 'أنشئ رموز QR ثابتة تعمل مدى الحياة مجانًا، دون اشتراك ودون انتهاء صلاحية.' },
  { id: 'barcode', category: 'codes', icon: 'barcode', color: '#0f766e', title: 'مولّد الباركود الخطي', desc: 'أنشئ باركود المنتجات (EAN و UPC و Code 128 وغيرها) بصيغ PNG و SVG.' },

  { id: 'feasibility', category: 'business', icon: 'sparkles', color: '#c2255c', title: 'دراسة الجدوى بالذكاء الاصطناعي', desc: 'أجب عن أسئلة مشروعك، واحصل على دراسة جدوى متكاملة بصيغتي Word و Excel مبنية على أحدث بيانات السوق.' },
];

export const DEFAULT_FEASIBILITY_SECTIONS = [
  {
    id: 'basics', title: 'البيانات الأساسية للمشروع', fields: [
      { id: 'projectName', label: 'اسم المشروع', type: 'text', required: true, placeholder: 'مثال: مقهى مختص في حي النرجس' },
      { id: 'projectIdea', label: 'وصف فكرة المشروع', type: 'textarea', required: true, placeholder: 'اشرح الفكرة وما الذي سيقدمه المشروع ولمن' },
      { id: 'sector', label: 'قطاع المشروع', type: 'select', required: true, options: ['تجاري (بيع بالتجزئة أو الجملة)', 'مطاعم ومقاهٍ وأغذية', 'صناعي', 'خدمي', 'تقني وتطبيقات', 'تعليمي وتدريبي', 'صحي وطبي', 'زراعي وحيواني', 'سياحي وفندقي', 'عقاري ومقاولات', 'أخرى'] },
      { id: 'country', label: 'الدولة', type: 'select', required: true, options: ['المملكة العربية السعودية', 'جمهورية مصر العربية', 'الإمارات العربية المتحدة', 'الكويت', 'قطر', 'البحرين', 'سلطنة عُمان', 'الأردن', 'المغرب', 'دولة أخرى'] },
      { id: 'city', label: 'المدينة أو المنطقة', type: 'text', required: true, placeholder: 'مثال: الرياض' },
      { id: 'currency', label: 'عملة الدراسة', type: 'select', required: true, options: ['ريال سعودي (SAR)', 'جنيه مصري (EGP)', 'درهم إماراتي (AED)', 'دينار كويتي (KWD)', 'ريال قطري (QAR)', 'دينار بحريني (BHD)', 'ريال عُماني (OMR)', 'دينار أردني (JOD)', 'درهم مغربي (MAD)', 'دولار أمريكي (USD)'] },
    ]
  },
  {
    id: 'funding', title: 'رأس المال والتمويل', fields: [
      { id: 'capital', label: 'رأس المال المتاح للاستثمار', type: 'number', required: true, placeholder: 'المبلغ بعملة الدراسة' },
      { id: 'fundingSource', label: 'مصدر التمويل', type: 'select', required: true, options: ['تمويل ذاتي بالكامل', 'قرض أو تمويل بنكي', 'شركاء ومستثمرون', 'تمويل مختلط'] },
      { id: 'loanAmount', label: 'قيمة القرض أو التمويل (إن وجد)', type: 'number', required: false, placeholder: '0' },
      { id: 'loanRate', label: 'نسبة الفائدة أو المرابحة السنوية ٪ (إن وجدت)', type: 'number', required: false, placeholder: 'مثال: 7' },
      { id: 'loanYears', label: 'مدة السداد بالسنوات (إن وجدت)', type: 'number', required: false, placeholder: 'مثال: 5' },
    ]
  },
  {
    id: 'market', title: 'السوق والعملاء', fields: [
      { id: 'products', label: 'المنتجات أو الخدمات وأسعارها التقريبية', type: 'textarea', required: true, placeholder: 'مثال: قهوة مختصة بسعر 18، حلويات بسعر 22 ...' },
      { id: 'targetCustomers', label: 'العملاء المستهدفون', type: 'textarea', required: true, placeholder: 'من هم عملاؤك؟ أعمارهم، اهتماماتهم، قدرتهم الشرائية' },
      { id: 'competitors', label: 'المنافسون الذين تعرفهم', type: 'textarea', required: false, placeholder: 'اذكر أسماء المنافسين أو طبيعتهم إن وجدت' },
      { id: 'advantage', label: 'الميزة التنافسية لمشروعك', type: 'textarea', required: false, placeholder: 'ما الذي يميزك عن المنافسين؟' },
      { id: 'salesChannels', label: 'قنوات البيع', type: 'multiselect', required: false, options: ['محل أو فرع فعلي', 'متجر إلكتروني', 'تطبيقات التوصيل', 'وسائل التواصل الاجتماعي', 'البيع للشركات', 'الموزعون والوكلاء'] },
    ]
  },
  {
    id: 'operations', title: 'التشغيل', fields: [
      { id: 'premises', label: 'مقر المشروع', type: 'select', required: true, options: ['مقر مستأجر', 'مقر مملوك', 'من المنزل', 'إلكتروني بالكامل'] },
      { id: 'area', label: 'المساحة التقريبية بالمتر المربع', type: 'number', required: false, placeholder: 'مثال: 120' },
      { id: 'employees', label: 'عدد العاملين المتوقع', type: 'number', required: false, placeholder: 'مثال: 6' },
      { id: 'equipment', label: 'المعدات والتجهيزات التي تعرفها', type: 'textarea', required: false, placeholder: 'اذكر ما تعرفه من معدات أو تجهيزات وأسعارها إن توفرت' },
    ]
  },
  {
    id: 'goals', title: 'الأهداف والتوقعات', fields: [
      { id: 'studyYears', label: 'مدة الدراسة المالية', type: 'select', required: true, options: ['3 سنوات', '5 سنوات', '7 سنوات', '10 سنوات'] },
      { id: 'expectedSales', label: 'المبيعات الشهرية المتوقعة (إن كانت لديك تقديرات)', type: 'number', required: false, placeholder: 'اتركه فارغًا ليقدّرها النظام' },
      { id: 'goals', label: 'أهدافك من المشروع', type: 'textarea', required: false, placeholder: 'مثال: استرداد رأس المال خلال سنتين، التوسع إلى فرع ثانٍ ...' },
      { id: 'notes', label: 'ملاحظات إضافية', type: 'textarea', required: false, placeholder: 'أي معلومات أخرى تساعد على دقة الدراسة' },
    ]
  },
];

export const DEFAULT_CONFIG = {
  version: 1,
  site: {
    name: 'أدوات إتقان',
    nameEn: 'ITQAN Tools',
    tagline: 'أدوات PDF، ورموز QR دائمة، ودراسات جدوى بالذكاء الاصطناعي — مجانًا وفي مكان واحد.',
    owner: 'المهندس/ أحمد خالد',
    primaryColor: '#0f766e',
    accentColor: '#f59e0b',
    announcement: '',
    contactEmail: '',
    about: 'منصة مجانية مفتوحة المصدر تقدم أدوات عملية للتعامل مع ملفات PDF، وإنشاء رموز QR والباركود الدائمة، وإعداد دراسات الجدوى بمساعدة الذكاء الاصطناعي.',
    privacy: 'تُعالَج ملفات PDF والصور والمستندات داخل متصفحك مباشرة، ولا تُرفع إلى أي خادم. أما دراسة الجدوى فتُرسل إجاباتك عن الأسئلة إلى خدمة الذكاء الاصطناعي لإعداد الدراسة فقط، ولا تُحفظ لدينا.',
    footer: 'جميع الحقوق محفوظة',
  },
  // تخصيصات الأدوات المدمجة: { [id]: { enabled, title, desc, order } }
  tools: {},
  // خدمات يضيفها المالك من لوحة التحكم
  customServices: [],
  feasibility: {
    enabled: true,
    provider: 'anthropic', // anthropic | gemini | openai
    model: '',            // فارغ = النموذج الافتراضي للمزوّد
    webSearch: true,
    dailyLimitPerIp: 3,
    extraInstructions: '',
    sections: DEFAULT_FEASIBILITY_SECTIONS,
  },
};

export const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-5-5',
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-5',
};

function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

export function deepMerge(base, over) {
  if (!isObj(over)) return over === undefined ? base : over;
  const out = { ...base };
  for (const k of Object.keys(over)) {
    out[k] = isObj(base?.[k]) && isObj(over[k]) ? deepMerge(base[k], over[k]) : over[k];
  }
  return out;
}

export function mergeConfig(saved) {
  const cfg = deepMerge(structuredClone(DEFAULT_CONFIG), saved || {});
  if (!Array.isArray(cfg.feasibility.sections) || !cfg.feasibility.sections.length) cfg.feasibility.sections = structuredClone(DEFAULT_FEASIBILITY_SECTIONS);
  if (!Array.isArray(cfg.customServices)) cfg.customServices = [];
  return cfg;
}

// قائمة الأدوات النهائية بعد تطبيق تخصيصات المالك (للعرض في الصفحة الرئيسية)
export function resolveTools(cfg) {
  const list = BUILTIN_TOOLS.map((t, i) => {
    const o = cfg.tools?.[t.id] || {};
    return { ...t, builtin: true, enabled: o.enabled !== false, title: o.title || t.title, desc: o.desc || t.desc, order: Number.isFinite(o.order) ? o.order : i, badge: o.badge || '' };
  });
  (cfg.customServices || []).forEach((s, i) => {
    list.push({ id: 's-' + s.id, serviceId: s.id, builtin: false, category: s.category || 'custom', icon: s.icon || 'zap', color: s.color || '#495057', title: s.title, desc: s.desc || '', enabled: s.enabled !== false, order: Number.isFinite(s.order) ? s.order : 100 + i, type: s.type, url: s.url, badge: s.badge || '' });
  });
  if (cfg.feasibility?.enabled === false) list.forEach(t => { if (t.id === 'feasibility') t.enabled = false; });
  return list.sort((a, b) => a.order - b.order);
}
