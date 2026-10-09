import type { Lang } from "./kb";

const ui = {
  ar: {
    brand: "Baseline",
    brandAr: "أساس",
    tagline: "خطة الأمن السيبراني المناسبة لنوع عملك",
    heroTitle: "خطة أمن سيبراني مبنية على نوع عملك، لا على قائمة عامة",
    heroBody:
      "الضوابط واحدة لكل الشركات، لكن ترتيب الأولويات يختلف حسب نوع العمل. اختر نوع شركتك واحصل على خطة واضحة لأول 30 يومًا و90 يومًا و6 أشهر، تجمع متطلبات الهيئة الوطنية للأمن السيبراني وحماية البيانات وما يطلبه العملاء الكبار.",
    cta: "اعرف خطتك",
    how: "كيف يعمل",
    howSteps: [
      ["اختر نوع عملك", "شركة برمجيات، منتج رقمي، مورّد خدمات، أو متجر إلكتروني."],
      ["حدد حجم شركتك", "لنعرف ما الإلزامي عليك من ضوابط الهيئة."],
      ["احصل على خطتك", "بنود مرتبة على 3 مراحل، وعلّم على ما لديك لترى أين تقف."]
    ],
    layersTitle: "ثلاث طبقات في خطة واحدة",
    free: "مجاني، ولا يتطلب تسجيلًا. إجاباتك تبقى في متصفحك.",
    step1: "ما نوع عملك؟",
    step2: "كم عدد موظفيك؟",
    sizes: [
      ["micro", "أقل من 6"],
      ["sme", "6 إلى 249"],
      ["large", "250 أو أكثر"]
    ],
    sizeNote: {
      micro: "ضوابط الهيئة غير إلزامية لحجمك حاليًا، لكن تطبيقها يحمي عملك ويجهزك للعملاء الكبار.",
      sme: "أنت ضمن الفئة (ب) غالبًا: البنود المعلّمة «الهيئة» إلزامية عليك. التصنيف يعتمد أيضًا على الإيرادات (من 3 إلى 200 مليون ريال).",
      large: "أنت ضمن الفئة (أ) غالبًا، وعليك 65 ضابطًا. هذه الخطة تغطي الأساسيات فقط."
    },
    jewel: "الأصل الأهم",
    threat: "أكبر خطر",
    driver: "المحرك الأساسي",
    all: "الكل",
    done: "متوفر",
    of: "من",
    reset: "مسح",
    profileTag: "خاص بنوع عملك",
    notApplicable: (n: number) => `${n} بنود لا تنطبق على نوع عملك وتم استبعادها.`,
    disclaimer:
      "هذه الخطة إرشادية ولا تُعد تقييم امتثال رسميًا. تقييمات الامتثال الرسمية تتم عبر جهات مرخصة من الهيئة الوطنية للأمن السيبراني. ترتيب المراحل رأي مهني ويتم تحديثه باستمرار.",
    kbVersion: "إصدار قاعدة المعرفة",
    sources: "المصادر",
    switchLang: "English",
    footer: "Baseline: خط الأساس السيبراني للشركات الصغيرة والمتوسطة في السعودية."
  },
  en: {
    brand: "Baseline",
    brandAr: "أساس",
    tagline: "The cybersecurity plan that fits your business",
    heroTitle: "A cybersecurity plan built around your business, not a generic checklist",
    heroBody:
      "The controls are the same for every company, but the priorities change with the business. Pick your business type and get a clear plan for the first 30 days, 90 days and 6 months, combining NCA requirements, data protection, and what large clients expect.",
    cta: "Get your plan",
    how: "How it works",
    howSteps: [
      ["Pick your business type", "Software house, digital product, service supplier, or online store."],
      ["Tell us your size", "So we know which NCA controls are mandatory for you."],
      ["Get your plan", "Items in 3 phases. Tick what you have and see where you stand."]
    ],
    layersTitle: "Three layers, one plan",
    free: "Free, no sign-up. Your answers stay in your browser.",
    step1: "What kind of business are you?",
    step2: "How many employees?",
    sizes: [
      ["micro", "Fewer than 6"],
      ["sme", "6 to 249"],
      ["large", "250 or more"]
    ],
    sizeNote: {
      micro: "NCA controls aren't mandatory at your size yet, but applying them protects your business and gets you ready for large clients.",
      sme: "You're likely Category B: items tagged \"NCA\" are mandatory for you. Classification also depends on revenue (SAR 3M to 200M).",
      large: "You're likely Category A, with 65 controls. This plan covers the basics only."
    },
    jewel: "Crown jewel",
    threat: "Biggest threat",
    driver: "Main driver",
    all: "All",
    done: "in place",
    of: "of",
    reset: "Reset",
    profileTag: "Specific to your business",
    notApplicable: (n: number) => `${n} items don't apply to your business type and were left out.`,
    disclaimer:
      "This plan is guidance, not an official compliance assessment. Official assessments are done by NCA-licensed providers. Phase order is professional judgment and is updated over time.",
    kbVersion: "Knowledge base version",
    sources: "Sources",
    switchLang: "العربية",
    footer: "Baseline: the cybersecurity baseline for Saudi SMEs."
  }
};

export type UI = (typeof ui)["en"];
export function t(lang: Lang): UI {
  return ui[lang] as UI;
}
