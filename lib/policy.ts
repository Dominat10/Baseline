import questionsRaw from "@/content/policies/questions.json";
import infosecRaw from "@/content/policies/information-security.json";
import type { Lang, T } from "./kb";

export type Answers = Record<string, string>;

export interface Field {
  type: "text" | "select" | "multi" | "date" | "derived";
  /** For multi: an option that can't be combined with the others (e.g. "none"). */
  exclusive?: string;
  label: T;
  help?: T;
  placeholder?: T;
  options?: { value: string; label: T; targetDays?: number }[];
  default?: string;
  required?: boolean;
  /** Only ask this question when every listed field has at least one of the listed values. */
  showIf?: Record<string, string[]>;
}

export interface Questions {
  version: string;
  steps: { id: string; title: T; fields: string[] }[];
  fields: Record<string, Field>;
}

type Cond = Record<string, string[]>;
interface Block {
  text: T;
  /** One condition object (all must match), or a list of them (any may match). */
  when?: Cond | Cond[];
}

export interface PolicyTemplate {
  id: string;
  version: string;
  title: T;
  summary: T;
  sections: { heading: T; list?: boolean; numbered?: boolean; capabilities?: boolean; blocks: Block[] }[];
}

export const questions = questionsRaw as unknown as Questions;

/** Multi-select answers are stored as comma-separated option values. */
export const splitMulti = (v: string | undefined) => (v ?? "").split(",").filter(Boolean);

function joinList(items: string[], lang: Lang): string {
  if (items.length < 2) return items.join("");
  if (lang === "ar") return items.slice(0, -1).join("، ") + "، و" + items[items.length - 1];
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

const matches = (cond: Record<string, string[]>, answers: Answers) =>
  Object.entries(cond).every(([k, vals]) => splitMulti(answers[k]).some((v) => vals.includes(v)));

export const isVisible = (id: string, answers: Answers) => {
  const f = questions.fields[id];
  return !!f && f.type !== "derived" && (!f.showIf || matches(f.showIf, answers));
};

export type Tier = "basic" | "enhanced" | "high";
export type TierReason = "sensitiveRegulated" | "health" | "saasToGov" | "large" | "sensitive" | "regulatedClients" | "consumers" | "offshore" | "hostedOutside";

/** Strictness tier, worked out from answers (never asked). Reasons explain it to the user. */
export function deriveTier(answers: Answers): { tier: Tier; reasons: TierReason[] } {
  const has = (k: string, ...v: string[]) => splitMulti(answers[k]).some((x) => v.includes(x));
  const sensitive = has("personalData", "ids", "financial", "health");
  const regulated = has("clients", "government", "finance");
  const saas = isVisible("saasToGov", answers) && answers.saasToGov === "yes";
  const high: TierReason[] = [];
  if (sensitive && regulated) high.push("sensitiveRegulated");
  if (has("personalData", "health")) high.push("health");
  if (saas) high.push("saasToGov");
  if (answers.size === "large") high.push("large");
  if (high.length) return { tier: "high", reasons: high };
  const enh: TierReason[] = [];
  if (sensitive) enh.push("sensitive");
  if (regulated) enh.push("regulatedClients");
  if (has("clients", "consumers")) enh.push("consumers");
  if (has("workforce", "offshore")) enh.push("offshore");
  if (answers.hosting === "outside") enh.push("hostedOutside");
  return { tier: enh.length ? "enhanced" : "basic", reasons: enh };
}

/** Answers as the policy sees them: hidden questions dropped, derived values added. */
export function effectiveAnswers(answers: Answers): Answers {
  const out: Answers = {};
  for (const [k, v] of Object.entries(answers)) if (isVisible(k, answers)) out[k] = v;
  out.tier = deriveTier(answers).tier;
  return out;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const policies: PolicyTemplate[] = [infosecRaw as unknown as PolicyTemplate];

/** A piece of rendered text: plain, a filled-in answer, or a blank still to fill. */
export interface Segment {
  text: string;
  kind: "plain" | "filled" | "blank";
}

export interface RenderedSection {
  heading: string;
  style: "para" | "list" | "numbered";
  items: Segment[][];
}

export interface RenderedPolicy {
  title: string;
  meta: { label: string; value: Segment[] }[];
  sections: RenderedSection[];
}

const META_LABELS = {
  ar: { company: "الشركة", version: "الإصدار", owner: "مالك السياسة", approver: "المعتمِد", effective: "تاريخ السريان", review: "المراجعة القادمة", tier: "مستوى الصرامة", inPlace: "مطبَّق", by: "مستهدف بحلول" },
  en: { company: "Company", version: "Version", owner: "Policy owner", approver: "Approved by", effective: "Effective date", review: "Next review", tier: "Strictness level", inPlace: "in place", by: "target" }
};

/** Human-readable value for a field, or null if it hasn't been answered. */
export function valueOf(id: string, answers: Answers, lang: Lang): string | null {
  const field = questions.fields[id];
  const raw = (answers[id] ?? "").trim();
  if (!field || !raw) return null;
  if (field.type === "select" || field.type === "derived") {
    const opt = field.options?.find((o) => o.value === raw);
    return opt ? opt.label[lang] : null;
  }
  if (field.type === "multi") {
    const labels = splitMulti(raw)
      .map((v) => field.options?.find((o) => o.value === v)?.label[lang])
      .filter((x): x is string => !!x);
    return labels.length ? joinList(labels, lang) : null;
  }
  if (field.type === "date") return formatDate(raw, lang);
  return raw;
}

function formatDate(iso: string, lang: Lang): string | null {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(lang === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function nextReview(answers: Answers, lang: Lang): string | null {
  const start = answers.effectiveDate;
  const months = Number(answers.reviewMonths);
  if (!start || !months) return null;
  const d = new Date(start + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + months);
  return formatDate(d.toISOString().slice(0, 10), lang);
}

function fill(template: string, answers: Answers, lang: Lang): Segment[] {
  const out: Segment[] = [];
  const re = /\{\{(\w+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template))) {
    if (m.index > last) out.push({ text: template.slice(last, m.index), kind: "plain" });
    const v = valueOf(m[1], answers, lang);
    const label = questions.fields[m[1]]?.label[lang] ?? m[1];
    out.push(v ? { text: v, kind: "filled" } : { text: label, kind: "blank" });
    last = m.index + m[0].length;
  }
  if (last < template.length) out.push({ text: template.slice(last), kind: "plain" });
  return out;
}

function applies(block: Block, answers: Answers): boolean {
  if (!block.when) return true;
  const any = Array.isArray(block.when) ? block.when : [block.when];
  return any.some((c) => matches(c, answers));
}

/** One line per capability: in place, or the date it must be in place by. */
function capabilityRows(answers: Answers, lang: Lang): Segment[][] {
  const L = META_LABELS[lang];
  const f = questions.fields.capabilities;
  if (!answers.capabilities) return [];
  const have = splitMulti(answers.capabilities);
  return (f.options ?? [])
    .filter((o) => o.value !== f.exclusive)
    .map((o) => {
      if (have.includes(o.value)) return [{ text: `${o.label[lang]}: ${L.inPlace} ✓`, kind: "filled" } as Segment];
      const due = answers.effectiveDate ? formatDate(addDays(answers.effectiveDate, o.targetDays ?? 90), lang) : null;
      return [
        { text: `${o.label[lang]}: ${L.by} `, kind: "plain" } as Segment,
        due ? ({ text: due, kind: "filled" } as Segment) : ({ text: questions.fields.effectiveDate.label[lang], kind: "blank" } as Segment)
      ];
    });
}

export function render(policy: PolicyTemplate, raw: Answers, lang: Lang): RenderedPolicy {
  const answers = effectiveAnswers(raw);
  const L = META_LABELS[lang];
  const seg = (id: string): Segment[] => fill(`{{${id}}}`, answers, lang);
  const review = nextReview(answers, lang);
  const ownerName = valueOf("ownerName", answers, lang);
  const ownerTitle = valueOf("ownerTitle", answers, lang);
  return {
    title: policy.title[lang],
    meta: [
      { label: L.company, value: seg("companyName") },
      { label: L.version, value: [{ text: "1.0", kind: "plain" }] },
      {
        label: L.owner,
        value: ownerName && ownerTitle ? [{ text: `${ownerName} (${ownerTitle})`, kind: "filled" }] : seg("ownerName")
      },
      { label: L.approver, value: seg("approverTitle") },
      { label: L.effective, value: seg("effectiveDate") },
      {
        label: L.review,
        value: review ? [{ text: review, kind: "filled" }] : seg("effectiveDate")
      },
      { label: L.tier, value: seg("tier") }
    ],
    sections: policy.sections
      .map((s) => ({
        heading: s.heading[lang],
        style: (s.numbered ? "numbered" : s.list ? "list" : "para") as RenderedSection["style"],
        items: [
          ...s.blocks.filter((b) => applies(b, answers)).map((b) => fill(b.text[lang], answers, lang)),
          ...(s.capabilities ? capabilityRows(answers, lang) : [])
        ]
      }))
      .filter((s) => s.items.length > 0)
  };
}

export function missingFields(answers: Answers): string[] {
  return Object.entries(questions.fields)
    .filter(([id, f]) => f.required && isVisible(id, answers) && !(answers[id] ?? "").trim())
    .map(([id]) => id);
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const segHtml = (segs: Segment[]) =>
  segs.map((s) => (s.kind === "blank" ? `<span style="background:#fff3c4">[${esc(s.text)}]</span>` : esc(s.text))).join("");

/** A self-contained HTML document that Word opens directly. Every user value is escaped. */
export function toWordHtml(p: RenderedPolicy, lang: Lang, footer: string): string {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const align = lang === "ar" ? "right" : "left";
  const font = lang === "ar" ? "'Arial', 'Traditional Arabic', sans-serif" : "'Calibri', 'Arial', sans-serif";
  const meta = p.meta
    .map((m) => `<tr><td style="padding:4px 10px;border:1px solid #ccc;background:#f3f5f4;width:30%"><b>${esc(m.label)}</b></td><td style="padding:4px 10px;border:1px solid #ccc">${segHtml(m.value)}</td></tr>`)
    .join("");
  const body = p.sections
    .map((s, i) => {
      const items =
        s.style === "para"
          ? s.items.map((it) => `<p>${segHtml(it)}</p>`).join("")
          : `<${s.style === "numbered" ? "ol" : "ul"}>${s.items.map((it) => `<li style="margin-bottom:6px">${segHtml(it)}</li>`).join("")}</${s.style === "numbered" ? "ol" : "ul"}>`;
      return `<h2 style="font-size:14pt;color:#1d6b4c">${i + 1}. ${esc(s.heading)}</h2>${items}`;
    })
    .join("");
  return `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(p.title)}</title></head>
<body style="font-family:${font};font-size:11pt;line-height:1.6;direction:${dir};text-align:${align}">
<h1 style="font-size:20pt">${esc(p.title)}</h1>
<table style="border-collapse:collapse;width:100%;margin-bottom:16px">${meta}</table>
${body}
<p style="margin-top:28px">__________________________<br>${esc(lang === "ar" ? "التوقيع والتاريخ" : "Signature and date")}</p>
<p style="font-size:9pt;color:#777;margin-top:24px">${esc(footer)}</p>
</body></html>`;
}
