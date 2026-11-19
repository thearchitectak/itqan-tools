// الإعدادات الافتراضية للموقع — مصدر واحد تستخدمه الواجهة ولوحة التحكم ودوال الخادم.
// أي قيمة تُحفظ من لوحة التحكم تُدمج فوق هذه القيم.

export const CATEGORIES = [
  { id: 'organize', title: 'تنظيم ملفات PDF' },
  { id: 'convert', title: 'التحويل من PDF وإليه' },
  { id: 'edit', title: 'تحرير ملفات PDF' },
  { id: 'codes', title: 'الباركود ورموز QR' },
  { id: 'exams', title: 'الاختبارات والتصحيح' },
  { id: 'civil', title: 'الحاسبات الإنشائية والكميات' },
  { id: 'arch', title: 'أدوات المعماري' },
  { id: 'survey', title: 'المساحة والمخططات' },
  { id: 'business', title: 'الأعمال والذكاء الاصطناعي' },
  { id: 'custom', title: 'خدمات إضافية' },
];

// الأدوات المدمجة في الموقع (الكود الخاص بكل أداة موجود في ملفات الواجهة)
// المجموعات الكبرى في الصفحة الرئيسية؛ تنسدل تحت كل مجموعة أقسامها وأدواتها.
// أي قسم لا يرد هنا يظهر تحت «خدمات إضافية».
export const GROUPS = [
  { id: 'general', title: 'الأدوات العامة', icon: 'layers', color: '#e5322d', desc: 'تنظيم ملفات PDF وتحويلها وتحريرها، وإنشاء رموز QR والباركود.', cats: ['organize', 'convert', 'edit', 'codes'] },
  { id: 'edu', title: 'الأدوات التعليمية', icon: 'graduation-cap', color: '#2456a6', desc: 'أدوات المعلم: تصحيح الاختبارات ورصد الدرجات.', cats: ['exams'] },
  { id: 'eng', title: 'الأدوات الهندسية', icon: 'hard-hat', color: '#b45309', desc: 'حاسبات إنشائية وكميات، وأدوات المعماري، والمساحة والمخططات، مع اختيار الكود.', cats: ['civil', 'arch', 'survey'] },
  { id: 'business', title: 'الأعمال والمشاريع', icon: 'briefcase', color: '#c2255c', desc: 'دراسات الجدوى والتخطيط المالي للمشروعات.', cats: ['business'] },
  { id: 'more', title: 'خدمات إضافية', icon: 'sparkles', color: '#495057', desc: 'خدمات وروابط مختارة.', cats: ['custom'] },
];
export const groupOf = (cat) => (GROUPS.find(g => g.cats.includes(cat)) || GROUPS[GROUPS.length - 1]).id;

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

  { id: 'omr', category: 'exams', icon: 'clipboard-check', color: '#2456a6', badge: 'جديد', title: 'مصحح ورق التظليل', desc: 'صحّح أوراق الإجابة المظللة (البابل شيت) من صورها أو ملفات PDF على جهازك، واستخرج الدرجات إلى Excel والأوراق المصححة إلى PDF.' },

  { id: 'loads', category: 'civil', icon: 'weight', color: '#b45309', title: 'حساب الأحمال', desc: 'احسب الأحمال الميتة والحية وحمل الحوائط، وتركيبات الأحمال المصعّدة حسب الكود، وحمل المبنى الكلي.' },
  { id: 'col-layout', category: 'civil', icon: 'grid-3x3', color: '#b45309', badge: 'جديد', title: 'توزيع الأعمدة على اللوحة المعمارية', desc: 'ارفع اللوحة صورةً أو PDF أو DXF، ليقترح الموقع مواضع الأعمدة ويصممها مع القواعد، ثم صدّرها إلى AutoCAD و Revit.' },
  { id: 'col-design', category: 'civil', icon: 'columns-3', color: '#b45309', title: 'تصميم الأعمدة', desc: 'احسب أبعاد العمود وعدد أسياخ الحديد وقطرها والكانات وخلطة الخرسانة، مع قطاع توضيحي.' },
  { id: 'footings', category: 'civil', icon: 'square-dashed-bottom', color: '#b45309', title: 'تصميم القواعد المنفصلة', desc: 'احسب أبعاد القاعدة وسماكتها وتسليحها، وتحقّق من الثقب والقص، مع مسقط وقطاع توضيحيين.' },
  { id: 'rebar', category: 'civil', icon: 'construction', color: '#b45309', title: 'حاسبة حديد التسليح', desc: 'احسب أوزان الحديد وعدد الأسياخ بالأقطار المتداولة، مع طول التراكب ونسبة الهالك والتكلفة.' },
  { id: 'concrete', category: 'civil', icon: 'cuboid', color: '#b45309', title: 'حاسبة الخرسانة والمواد', desc: 'احسب حجم الخرسانة للعناصر الإنشائية وكميات الأسمنت والرمل والركام والماء حسب الخلطة.' },
  { id: 'excavation', category: 'civil', icon: 'shovel', color: '#b45309', title: 'حاسبة الحفر والردم', desc: 'احسب حجم الحفر بميول جانبية، والردم المطلوب، والكمية الزائدة للنقل مع معامل الانتفاش.' },
  { id: 'sizing', category: 'civil', icon: 'columns-3', color: '#b45309', title: 'التقدير المبدئي للأبعاد', desc: 'قدّر سماكة البلاطات وعمق الكمرات ومساحة الأعمدة والقواعد تقديرًا أوليًا حسب الكود.' },
  { id: 'pipes', category: 'civil', icon: 'droplets', color: '#b45309', title: 'تصريف المواسير (مانينج)', desc: 'احسب سعة المواسير وسرعة الجريان عند الامتلاء الكامل والجزئي، أو القطر المطلوب لتصريف معيّن.' },
  { id: 'boq', category: 'civil', icon: 'clipboard-list', color: '#b45309', title: 'جدول الكميات (BOQ)', desc: 'أنشئ جدول كميات بالبنود والوحدات والأسعار، وصدّره إلى Excel بمعادلات حية.' },
  { id: 'build-cost', category: 'civil', icon: 'banknote', color: '#b45309', title: 'التكلفة التقديرية للبناء', desc: 'قدّر تكلفة البناء بالمتر المربع حسب الدولة ومستوى التشطيب وعدد الأدوار.' },

  { id: 'stairs', category: 'arch', icon: 'footprints', color: '#1d4ed8', title: 'حاسبة السلالم', desc: 'احسب عدد الدرجات وارتفاع القائمة وعرض النائمة وطول السلم، وتحقّق منها وفق الكود.' },
  { id: 'ramp-slope', category: 'arch', icon: 'triangle-right', color: '#1d4ed8', title: 'حاسبة الانحدار والمنحدرات', desc: 'حوّل بين النسبة المئوية والزاوية والنسبة، واحسب طول منحدر ذوي الإعاقة وفق الكود.' },
  { id: 'openings', category: 'arch', icon: 'sun-medium', color: '#1d4ed8', title: 'نسبة الفتحات للإضاءة والتهوية', desc: 'قارن مساحة النوافذ بمساحة أرضية الفراغ، وتحقّق من الحد الأدنى للإضاءة والتهوية الطبيعية.' },
  { id: 'scale', category: 'arch', icon: 'pencil-ruler', color: '#1d4ed8', title: 'حاسبة مقياس الرسم', desc: 'حوّل الأبعاد بين الرسم والطبيعة بأي مقياس، واعرف المقياس المناسب لحجم الورقة.' },
  { id: 'units', category: 'arch', icon: 'arrow-left-right', color: '#1d4ed8', title: 'محوّل الوحدات الهندسية', desc: 'حوّل الأطوال والمساحات (الفدان والقيراط والدونم) والحجوم والأوزان والإجهادات والقوى.' },

  { id: 'coord-area', category: 'survey', icon: 'land-plot', color: '#047857', title: 'مساحة الأرض من الإحداثيات', desc: 'أدخل إحداثيات أركان القطعة أو الصقها من Excel، واحصل على المساحة والمحيط وأطوال الأضلاع ورسم القطعة.' },
  { id: 'utm', category: 'survey', icon: 'locate-fixed', color: '#047857', title: 'تحويل الإحداثيات (UTM)', desc: 'حوّل بين الإحداثيات الجغرافية (خط الطول والعرض) وإحداثيات UTM، لنقطة واحدة أو لقائمة نقاط.' },
  { id: 'leveling', category: 'survey', icon: 'mountain', color: '#047857', title: 'حاسبة الميزانية والمناسيب', desc: 'احسب المناسيب من قراءات الميزان بطريقة سطح الميزان أو الارتفاع والانخفاض، مع التحقق الحسابي.' },
  { id: 'pdf-compare', category: 'survey', icon: 'git-compare', color: '#047857', title: 'مقارنة نسختين من المخطط', desc: 'قارن مراجعتين من مخطط PDF واعرض الفروق بالألوان: المحذوف بالأحمر والمضاف بالأخضر.' },
  { id: 'pdf-measure', category: 'survey', icon: 'ruler', color: '#047857', title: 'القياس على المخطط', desc: 'افتح مخطط PDF، واضبط مقياس الرسم، ثم قِس الأطوال والمساحات مباشرة على الصفحة.' },

  { id: 'feasibility', category: 'business', icon: 'sparkles', color: '#c2255c', title: 'دراسة الجدوى بالذكاء الاصطناعي', desc: 'أجب عن أسئلة مشروعك، واحصل على دراسة جدوى متكاملة بصيغتي Word و Excel، بالذكاء الاصطناعي وأحدث بيانات السوق أو بإدخال أرقامك يدويًا.' },
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
    tagline: 'أدوات PDF، ورموز QR دائمة، ومصحح للاختبارات، وحاسبات هندسية، ودراسات جدوى بالذكاء الاصطناعي — مجانًا وفي مكان واحد.',
    owner: 'المهندس/ أحمد خالد',
    primaryColor: '#0f766e',
    accentColor: '#f59e0b',
    announcement: '',
    contactEmail: '',
    about: 'منصة مجانية مفتوحة المصدر تقدم أدوات عملية للتعامل مع ملفات PDF، وإنشاء رموز QR والباركود الدائمة، وأداة لتصحيح أوراق الاختبارات المظللة، وحاسبات هندسية للمعماريين والمدنيين وفق الكود المصري والسعودي والعالمي، وإعداد دراسات الجدوى بمساعدة الذكاء الاصطناعي.',
    privacy: 'تُعالَج ملفات PDF والصور والمستندات والحسابات الهندسية داخل متصفحك مباشرة، ولا تُرفع إلى أي خادم. أما دراسة الجدوى فتُرسل إجاباتك عن الأسئلة إلى خدمة الذكاء الاصطناعي لإعداد الدراسة فقط، ولا تُحفظ لدينا.',
    footer: 'جميع الحقوق محفوظة',
  },
  // الملف التعريفي للمالك: الاسم وروابط التواصل فقط (اسم المستخدم أو الرابط الكامل)
  profile: {
    enabled: true,
    name: 'المهندس/ أحمد خالد',
    photo: '', // صورة شخصية مرفوعة من لوحة التحكم
    links: { whatsapp: '', phone: '', email: '', telegram: '', x: '', instagram: '', snapchat: '', tiktok: '', youtube: '', linkedin: '', facebook: '', threads: '', github: '', website: '' },
  },
  // قسم دعم استمرار الأدوات
  donation: {
    enabled: true,
    title: 'ادعم استمرار الأدوات المجانية',
    text: 'جميع الأدوات في المنصة مجانية، وستبقى كذلك. إن أفادتك، فمساهمتك مهما كانت تساعد على تغطية تكاليف التشغيل والذكاء الاصطناعي، وتطوير أدوات جديدة.',
    accounts: [], // { bank, holder, iban, number, country, note }
    links: [],    // { label, url }
    thanks: 'شكرًا لدعمك، فبمساهمتك تستمر الأدوات مجانية للجميع.',
  },
  // إعدادات الأدوات الهندسية
  eng: {
    defaultCode: 'sa', // الكود الافتراضي عند أول زيارة: eg | sa | intl
    priceNote: 'أسعار استرشادية لسوق نوفمبر 2026، عدّلها من لوحة التحكم.',
    // أسعار المتر المربع لمسطحات البناء: العظم + إضافة التشطيب لكل مستوى
    costRates: {
      eg: { currency: 'جنيه', shell: 4500, finish: { none: 0, economy: 3500, standard: 5500, lux: 8000 } },
      sa: { currency: 'ريال', shell: 600, finish: { none: 0, economy: 500, standard: 1000, lux: 2000 } },
    },
  },
  // تخصيصات الأدوات المدمجة: { [id]: { enabled, title, desc, order } }
  tools: {},
  // خدمات يضيفها المالك من لوحة التحكم
  customServices: [],
  // الذكاء الاصطناعي داخل الأدوات: خيار إضافي بجانب المعالجة على الجهاز
  aiTools: {
    enabled: true,
    providers: { anthropic: { enabled: true, model: '' }, gemini: { enabled: true, model: '' } },
    autoFallback: true,         // الانتقال إلى المزوّد الآخر تلقائيًا عند تعذّر المختار
    dailyImagesPerIp: 60,       // عدد الصور (الأوراق أو الصفحات) المسموح به لكل مستخدم يوميًا
  },
  feasibility: {
    enabled: true,
    // طبقات الخدمة الثلاث: يختار المستخدم بينها، وتُعطَّل الطبقة غير المتاحة تلقائيًا
    modes: {
      anthropic: { enabled: true, model: '' }, // فارغ = النموذج الافتراضي
      gemini: { enabled: true, model: '' },
      manual: { enabled: true },
    },
    defaultMode: 'anthropic', // anthropic | gemini | manual
    autoFallback: true,       // الانتقال تلقائيًا إلى Gemini إذا تعذّر Claude أثناء الإعداد
    webSearch: true,
    dailyLimitPerIp: 3,
    extraInstructions: '',
    sections: DEFAULT_FEASIBILITY_SECTIONS,
  },
};

export const MODE_IDS = ['anthropic', 'gemini', 'manual'];
export const MODE_INFO = {
  anthropic: { title: 'Claude', sub: 'الأدق تحليلًا', desc: 'تحليل معمّق وأرقام من أحدث بيانات السوق عبر البحث في الويب.' },
  gemini: { title: 'Gemini', sub: 'مجاني', desc: 'دراسة كاملة مع البحث في Google، بحصة استخدام يومية مجانية.' },
  manual: { title: 'الوضع اليدوي', sub: 'دون ذكاء اصطناعي', desc: 'تُدخل الأرقام بنفسك، ويحسب الموقع النموذج المالي ويُخرج الدراسة فورًا.' },
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
  if (!Array.isArray(cfg.donation.accounts)) cfg.donation.accounts = [];
  if (!Array.isArray(cfg.donation.links)) cfg.donation.links = [];
  if (!['eg', 'sa', 'intl'].includes(cfg.eng.defaultCode)) cfg.eng.defaultCode = 'sa';
  // ترحيل الإعدادات القديمة (مزوّد واحد) إلى نظام الطبقات
  const f = cfg.feasibility;
  if (f.provider && MODE_IDS.includes(f.provider)) {
    if (!saved?.feasibility?.defaultMode) f.defaultMode = f.provider;
    if (f.model && !f.modes[f.provider].model) f.modes[f.provider].model = f.model;
  }
  delete f.provider; delete f.model;
  if (!MODE_IDS.includes(f.defaultMode)) f.defaultMode = 'anthropic';
  return cfg;
}

// قائمة الأدوات النهائية بعد تطبيق تخصيصات المالك (للعرض في الصفحة الرئيسية)
export function resolveTools(cfg) {
  const list = BUILTIN_TOOLS.map((t, i) => {
    const o = cfg.tools?.[t.id] || {};
    return { ...t, builtin: true, enabled: o.enabled !== false, title: o.title || t.title, desc: o.desc || t.desc, order: Number.isFinite(o.order) ? o.order : i, badge: o.badge || t.badge || '' };
  });
  (cfg.customServices || []).forEach((s, i) => {
    list.push({ id: 's-' + s.id, serviceId: s.id, builtin: false, category: s.category || 'custom', icon: s.icon || 'zap', color: s.color || '#495057', title: s.title, desc: s.desc || '', enabled: s.enabled !== false, order: Number.isFinite(s.order) ? s.order : 100 + i, type: s.type, url: s.url, badge: s.badge || '' });
  });
  if (cfg.feasibility?.enabled === false) list.forEach(t => { if (t.id === 'feasibility') t.enabled = false; });
  return list.sort((a, b) => a.order - b.order);
}
