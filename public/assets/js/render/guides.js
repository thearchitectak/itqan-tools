// نصوص الشرح والنصائح العربية المرفقة مع كل خامة.

const LINE = '────────────────────────────────────────';
const sizeTxt = (i) => (i.sizeW ? `${i.sizeW} × ${i.sizeH || i.sizeW} متر` : 'غير محدد في المصدر؛ قدّره من حجم الوحدة المتكررة في الصورة');
const mapsList = (i, names) => i.maps.map(k => `  • ${names[k]}`).join('\n');

const C_NAMES = { basecolor: 'BaseColor ← خانة Base color', roughness: 'Roughness ← خانة Roughness (وضع Roughness)', normal: 'Normal ← عبر CoronaNormal في خانة Base bump', ao: 'AO ← اختياري (انظر الملاحظات)', height: 'Displacement ← خانة Displacement', metal: 'Metalness ← خانة Metalness', opacity: 'Opacity ← خانة Opacity' };
const V_NAMES = { basecolor: 'Diffuse ← خانة Diffuse', roughness: 'Roughness ← خانة Reflection glossiness بعد تفعيل Use roughness', normal: 'Normal ← عبر VRayNormalMap في خانة Bump بقيمة 100', ao: 'AO ← اختياري (انظر الملاحظات)', height: 'Displacement ← خانة Displacement أو معدِّل VRayDisplacementMod', metal: 'Metalness ← خانة Metalness', opacity: 'Opacity ← خانة Opacity' };

export function coronaGuide(i) {
  return `أدوات إتقان — شرح إعداد الخامة في Corona Renderer
${LINE}
الخامة: ${i.titleAr || i.title}  (${i.key})
المصدر: ${i.source} — الترخيص: ${i.license}
المقاس الحقيقي للخريطة: ${sizeTxt(i)}
الإصدار المستهدف: 3ds Max 2025 مع أحدث إصدار من Corona (المادة الفيزيائية Corona Physical Material).

الطريقة السريعة (موصى بها)
${LINE}
1) حدّد العناصر في المشهد.
2) اسحب الملف ${i.key}_Corona.ms إلى نافذة العرض في ماكس (أو Scripting ← Run Script).
3) تُنشأ الخامة وتُطبَّق على العناصر مع معدِّل UVW Map بالمقاس الحقيقي، وتظهر في خانة محرر الخامات النشطة.
وإذا شغّلت سكربت المكتبة ITQAN_Materials_Setup.ms مرة واحدة، فستجد الخامة أيضًا في مكتبة ITQAN_Corona.mat.

الطريقة اليدوية
${LINE}
1) أنشئ خامة Corona Physical Material.
2) اربط الخرائط كما يلي:
${mapsList(i, C_NAMES)}
3) إعدادات الألوان (مهم جدًا للواقعية):
  • خريطة BaseColor فقط تُفتح بإعداد الألوان التلقائي (sRGB).
  • باقي الخرائط (Roughness و Normal و Displacement و Metalness و Opacity) تُفتح بقيمة Gamma = 1.0
    أو Color space = Raw، وإلا ستظهر الخامة لامعة أو باهتة بشكل غير واقعي.
4) خريطة Normal بصيغة DirectX المناسبة لماكس. إذا ظهرت البروزات مقلوبة (الفواصل بارزة بدل أن تكون غائرة)
   فعّل Flip green داخل CoronaNormal.
5) ${i.metal ? 'الخامة معدنية: اجعل Metalness = Metal، واترك IOR على قيمته الافتراضية.' : 'الخامة غير معدنية: اترك Metalness = Non-metal، و IOR بين 1.45 و 1.6 حسب نوعها.'}
6) الإزاحة (Displacement): ${i.displaceCm > 0 ? `مفعّلة بارتفاع ${i.displaceCm} سم. للأسطح البعيدة عطّلها لتوفير الذاكرة، واكتفِ بالـ Normal.` : 'غير مفعّلة افتراضيًا لهذا النوع؛ يكفي الـ Normal. فعّلها للقطات القريبة جدًا فقط، بقيمة Max بين 0.5 و 2 سم.'}
7) المقاس: أضف معدِّل UVW Map من نوع Box بطول وعرض ${i.sizeW ? i.sizeW + ' متر' : 'المقاس الحقيقي للخامة'}، ولا تعتمد على Tiling عشوائي.

ملاحظات
${LINE}
  • خريطة AO لا تُستخدم في Corona Physical Material لأن المحرك يحسب الظلال الفيزيائية بنفسه. استخدمها فقط
    إن أردت تعميق الفواصل: امزجها مع BaseColor عبر CoronaMix بوضع Multiply وبنسبة لا تتجاوز 30%.
  • لإخفاء التكرار في المساحات الكبيرة استخدم CoronaMappingRandomizer على الخرائط كلها.
  • لا تستخدم Color Correction على خرائط البيانات (Roughness و Normal)، بل على BaseColor فقط.
`;
}

export function vrayGuide(i) {
  return `أدوات إتقان — شرح إعداد الخامة في V-Ray
${LINE}
الخامة: ${i.titleAr || i.title}  (${i.key})
المصدر: ${i.source} — الترخيص: ${i.license}
المقاس الحقيقي للخريطة: ${sizeTxt(i)}
الإصدار المستهدف: 3ds Max 2025 مع أحدث إصدار من V-Ray (VRayMtl بنظام Metalness/Roughness).

الطريقة السريعة (موصى بها)
${LINE}
1) حدّد العناصر في المشهد.
2) اسحب الملف ${i.key}_VRay.ms إلى نافذة العرض في ماكس (أو Scripting ← Run Script).
3) تُنشأ الخامة وتُطبَّق مع معدِّل UVW Map بالمقاس الحقيقي، وتظهر في خانة محرر الخامات النشطة.
وتجدها كذلك في مكتبة ITQAN_VRay.mat بعد تشغيل سكربت المكتبة.

الطريقة اليدوية
${LINE}
1) أنشئ خامة VRayMtl.
2) من لوحة BRDF: اختر النوع GGX، وفعّل Use roughness.
3) اجعل لون Reflect أبيض تمامًا (255) واترك Fresnel مفعّلًا.
4) اربط الخرائط:
${mapsList(i, V_NAMES)}
5) استخدم VRayBitmap لكل الخرائط:
  • Diffuse ← Color space = sRGB.
  • باقي الخرائط ← Color space = Linear (Raw)، وإلا تفسد قيم اللمعان والبروز.
6) خريطة Normal بصيغة DirectX المناسبة لماكس. إذا ظهرت البروزات مقلوبة ففعّل Flip green في VRayNormalMap.
7) ${i.metal ? 'الخامة معدنية: اجعل Metalness = 1.0 مع Reflect أبيض.' : 'الخامة غير معدنية: Metalness = 0، و Fresnel IOR بين 1.45 و 1.6.'}
8) الإزاحة: ${i.displaceCm > 0 ? `مقترحة بارتفاع ${i.displaceCm} سم. الأفضل استخدام معدِّل VRayDisplacementMod بنوع 2D mapping على العنصر بدل خانة الخامة.` : 'غير لازمة لهذا النوع؛ يكفي الـ Normal.'}
9) المقاس: معدِّل UVW Map من نوع Box بطول وعرض ${i.sizeW ? i.sizeW + ' متر' : 'المقاس الحقيقي للخامة'}.

ملاحظات
${LINE}
  • AO اختياري: يمكن مزجه مع Diffuse عبر VRayCompTex (Multiply) بنسبة خفيفة، أو تركه لأن V-Ray يحسب الظلال فيزيائيًا.
  • لإخفاء التكرار استخدم VRayUVWRandomizer على كل الخرائط بالإعدادات نفسها.
  • لتنعيم حواف العناصر الحادة أضف VRayEdgesTex أو خيار Round edges في خانة Bump.
`;
}

const TIPS = {
  marble: ['الرخام المصقول يعكس محيطه بوضوح: تأكد أن خريطة Roughness داكنة (قيم منخفضة)، وأضف طبقة Clearcoat خفيفة في Corona لمحاكاة التلميع.', 'غيّر اتجاه العروق بين البلاطات بتدوير UVW Map أو باستخدام Randomizer حتى لا يظهر التكرار.', 'أضف فواصل البلاطات بخريطة منفصلة أو بقطع العنصر (Chamfer صغير 1 مم) لتظهر الحواف.'],
  wood: ['الخشب يتغير لمعانه مع اتجاه الألياف: ادمج خريطة Roughness مع Falloff خفيف إن أردت لمعة أكثر واقعية.', 'دوّر الخريطة لتوافق اتجاه الألواح الحقيقي في التصميم.'],
  floor_wood: ['اجعل الألواح عناصر منفصلة أو استخدم Floor Generator مع Randomizer ليختلف لون كل لوح قليلًا.', 'أضف Chamfer صغيرًا (1 إلى 2 مم) لحواف الألواح لتلتقط الضوء.', 'الباركيه المعالج بالورنيش يحتاج Roughness بين 0.25 و 0.4 تقريبًا.'],
  stone: ['فعّل الإزاحة (Displacement) للأحجار في اللقطات القريبة؛ فهي التي تصنع الفرق في الواقعية.', 'امزج طبقة اتساخ خفيفة (Dirt/AO) في الزوايا وأسفل الجدران.'],
  concrete: ['الخرسانة المكشوفة تبدو أوقع مع بقع وتفاوت لوني: امزج خريطة ثانية بقناع Noise كبير.', 'أظهر فواصل الشدات وفتحات الربط إن كانت خرسانة معمارية.'],
  plaster: ['المحارة والدهانات تحتاج Roughness عاليًا (0.6 إلى 0.9) وخريطة Normal خفيفة جدًا.', 'لا تجعل الجدران مثالية تمامًا: أضف تفاوتًا بسيطًا في اللون عبر Noise كبير جدًا.'],
  paint: ['الدهان المطفي Roughness بين 0.7 و 0.9، والنصف لامع بين 0.35 و 0.5.'],
  brick: ['فعّل الإزاحة لإظهار عمق العراميس في اللقطات القريبة، واستخدم Normal فقط للبعيدة.', 'غيّر لون الطوب عشوائيًا قليلًا باستخدام Randomizer أو Multi-Sub مع Random ID.'],
  tiles: ['تأكد أن مقاس البلاطة في UVW Map يطابق المقاس الحقيقي (مثل 60×60 سم).', 'الفواصل الغائرة تحتاج Normal أو Displacement، ولونها أغمق قليلًا من البلاطة.'],
  ceramic: ['السيراميك اللامع يعكس الإضاءة بقوة: Roughness منخفض جدًا، وراقب انعكاسات النوافذ في اللقطة.'],
  terrazzo: ['التيرازو المصقول يحتاج Roughness منخفضًا ولمعة Clearcoat خفيفة.'],
  metal: ['المعادن لا لون Diffuse لها عمليًا: يأتي لونها من الانعكاس، فاعتمد على Metalness = 1.', 'أضف خدوشًا وبصمات خفيفة في خريطة Roughness لكسر الكمال الرقمي.'],
  fabric: ['الأقمشة تحتاج Sheen في Corona Physical (أو Sheen في VRayMtl) لإظهار الوبرة على الحواف.', 'استخدم Normal قويًا نسبيًا للنسيج، وقلّل الانعكاس إلى أدنى حد.'],
  leather: ['الجلد يحتاج Roughness متوسطًا (0.4 إلى 0.6) مع تفاوت خفيف، وطبقة Clearcoat للجلد المعالج.'],
  carpet: ['للسجاد الكثيف استخدم CoronaHair/VRayFur في اللقطات القريبة، أو الإزاحة القوية في البعيدة.'],
  wallpaper: ['ورق الحائط مطفي غالبًا: Roughness عالٍ، ونقشة مطابقة للمقاس الحقيقي للفة.'],
  glass: ['الزجاج لا يحتاج خرائط غالبًا: استخدم Refraction = 1 و IOR = 1.52 وفعّل Thin للزجاج الرقيق.'],
  asphalt: ['أضف بقع رطوبة وزيوت وخطوط الطلاء بطبقات منفصلة للواقعية.'],
  ground: ['امزج أكثر من خامة أرض بقناع Noise كبير لتجنّب التكرار في المساحات الواسعة.'],
  grass: ['النجيل الحقيقي يحتاج عناصر ثلاثية الأبعاد (Scatter/Forest) في اللقطات القريبة؛ الخامة وحدها للبعيد فقط.'],
  gravel: ['فعّل الإزاحة القوية للحصى، أو استخدم Scatter لحصى ثلاثي الأبعاد في المقدمة.'],
};
const COMMON = [
  'استخدم المقاس الحقيقي دائمًا (Real-World): الخطأ في المقاس أكثر ما يفضح الريندر.',
  'لا يوجد في الطبيعة سطح نظيف تمامًا: أضف طبقة عيوب خفيفة (بصمات، غبار، تفاوت لوني) بنسبة 5% إلى 15%.',
  'اضبط الإضاءة أولًا ثم الخامات: الخامة تُحكم عليها تحت إضاءة واقعية (HDRI أو شمس وسماء).',
  'استخدم نظام ألوان صحيحًا: BaseColor بإعداد sRGB وباقي الخرائط Linear/Raw.',
  'الحواف الحادة تمامًا غير واقعية: Chamfer صغير أو Round Edges يلتقط الضوء ويضيف واقعية كبيرة.',
  'اختبر الخامة على كرة أو مكعب في مشهد اختبار (Material Preview) قبل اعتمادها.',
];

export function tipsText(i) {
  const t = TIPS[i.category] || [];
  return `أدوات إتقان — نصائح للحصول على أفضل نتيجة واقعية
${LINE}
الخامة: ${i.titleAr || i.title}
${i.finish ? `التشطيب المطلوب: ${({ matte: 'مطفي', satin: 'نصف لامع', glossy: 'لامع' })[i.finish] || i.finish}\n` : ''}
نصائح خاصة بهذا النوع
${LINE}
${(t.length ? t : ['راجع الخامة تحت الإضاءة النهائية للمشهد وعدّل Roughness حسب التشطيب المطلوب.']).map(x => '• ' + x).join('\n')}

نصائح عامة
${LINE}
${COMMON.map(x => '• ' + x).join('\n')}
${i.finish === 'glossy' ? '\n• التشطيب لامع: خفّض قيم Roughness بإضافة Output أو Color Correction على خريطة Roughness فقط.' : ''}${i.finish === 'matte' ? '\n• التشطيب مطفي: ارفع قيم Roughness قليلًا حتى تختفي الانعكاسات الواضحة.' : ''}
${i.ai ? '\nتنبيه: هذه الخامة مولّدة بالذكاء الاصطناعي وخرائطها مستخرجة حسابيًا من الصورة، فجودتها أقل من الخامات الممسوحة ضوئيًا. استخدمها للأسطح البعيدة أو الثانوية.' : ''}
`;
}

export function readmeText() {
  return `أدوات إتقان — مكتبة خامات إتقان
${LINE}
هذا المجلد هو مكتبة خاماتك الدائمة. كل خامة تجهّزها من موقع أدوات إتقان تُحفظ فيه، وتبقى معك حتى لو غيّرت البرنامج أو الجهاز.

محتويات المجلد
  • Materials\\  : كل خامة في مجلد باسمها، وبداخله مجلدان: _Corona و _VRay، مع ملفات الشرح والنصائح.
  • HDRI\\       : خرائط الإضاءة البيئية.
  • IES\\        : ملفات توزيع إضاءة السبوتات.
  • ITQAN_Materials_Setup.ms : سكربت إعداد مكتبة 3ds Max.

ربط المجلد بـ 3ds Max (مرة واحدة فقط)
  1) افتح 3ds Max.
  2) اسحب الملف ITQAN_Materials_Setup.ms إلى نافذة العرض (أو Scripting ← Run Script).
  3) ستُنشأ مكتبتان: ITQAN_Corona.mat و ITQAN_VRay.mat داخل هذا المجلد.
  4) افتح المكتبة مرة واحدة من Slate Material Editor: قائمة Material/Map Browser ← Open Material Library.
بعدها تُحدَّث المكتبة تلقائيًا كلما فتحت 3ds Max وأضفت خامات جديدة إلى المجلد.
ويمكنك تحديثها يدويًا بإضافة الزر «ITQAN Materials» من Customize ← Customize User Interface ← الفئة ITQAN.

إذا نقلت المجلد إلى مكان آخر، فشغّل ITQAN_Materials_Setup.ms مرة أخرى من مكانه الجديد.

جميع الخامات من Poly Haven و ambientCG بترخيص CC0 (مجانية للاستخدام التعليمي والتجاري).
`;
}
