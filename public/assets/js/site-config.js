// بيانات صاحب الموقع وقسم الدعم.
// عند النشر على Cloudflare Pages تُقرأ هذه البيانات تلقائيًا من «أدوات إتقان» عبر /api/site
// (أي تعديل في لوحة تحكم أدوات إتقان يظهر هنا أيضًا). القيم التالية احتياطية تُستخدم إذا تعذّر ذلك.
export const SITE_CONFIG = {
  // مصدر البيانات المشتركة: موقع أدوات إتقان
  sharedSource: 'https://itqan-tools.pages.dev',
  profile: {
    enabled: true,
    name: 'المهندس/ أحمد خالد',
    nameEn: 'Eng. Ahmed Khaled',
    photo: '',
    // اسم المستخدم أو الرابط الكامل أو الرقم لكل وسيلة
    links: { whatsapp: '', phone: '', email: '', telegram: '', x: '', instagram: '', snapchat: '', tiktok: '', youtube: '', linkedin: '', facebook: '', threads: '', github: '', website: 'itqan-tools.pages.dev' },
  },
  donation: {
    enabled: true,
    accounts: [], // { bank, holder, iban, number, country, note, qr }
    links: [],    // { label, url }
    // إذا لم تتوفر حسابات، يُوجَّه زر الدعم إلى صفحة الدعم في أدوات إتقان
    fallbackUrl: 'https://itqan-tools.pages.dev/#/support',
  },
};
