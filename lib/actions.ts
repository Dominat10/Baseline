import actionsRaw from "@/content/actions.json";
import paramsRaw from "@/content/policies/parameters.json";
import { kb, type Lang, type T } from "./kb";
import { effectiveAnswers, policies, splitMulti, valueOf, type Answers } from "./policy";

type Cond = Record<string, string[]>;
type Platform = "m365" | "google" | "servers" | "cloud" | "default";

export interface Action {
  id: string;
  kind: "tech" | "gov" | "people";
  phase: 1 | 2 | 3;
  phaseFor?: Record<string, 1 | 2 | 3>;
  kb: string[];
  policy: string;
  capability?: string;
  when?: Cond | Cond[];
  title: T;
  why: T;
  how: Partial<Record<Platform, { ar: string[]; en: string[] }>>;
  evidence: T;
  effort: string;
  cost: "free" | "low" | "paid";
}

interface Library {
  version: string;
  effort: Record<string, T>;
  cost: Record<string, T>;
  actions: Action[];
}

export const library = actionsRaw as unknown as Library;

const matches = (c: Cond, a: Answers) => Object.entries(c).every(([k, v]) => splitMulti(a[k]).some((x) => v.includes(x)));
const applies = (w: Action["when"], a: Answers) => !w || (Array.isArray(w) ? w : [w]).some((c) => matches(c, a));

const PHASE_DAYS = { 1: 30, 2: 90, 3: 180 } as const;

export interface PlannedAction {
  action: Action;
  phase: 1 | 2 | 3;
  due: string; // ISO date
  owner: { name: string; viaProvider: boolean };
  alreadyInPlace: boolean;
  how: { platform: Platform; steps: string[] }[];
  policyTitle: string;
  domains: string[];
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Turns the company profile into a dated, owned, platform-specific action plan. */
export function buildPlan(raw: Answers, lang: Lang): PlannedAction[] {
  const a = effectiveAnswers(raw);
  const profiles = splitMulti(a.profile);
  const platforms = splitMulti(a.platform) as Platform[];
  const have = splitMulti(a.capabilities);
  const start = a.effectiveDate || new Date().toISOString().slice(0, 10);
  const ownerName = valueOf("ownerName", a, lang) ?? "";

  return library.actions
    .filter((x) => applies(x.when, a))
    .map((x) => {
      // Earliest phase across the business types the company picked; High tier pulls 6-month items into 90 days.
      let phase = Math.min(x.phase, ...profiles.map((p) => x.phaseFor?.[p] ?? x.phase)) as 1 | 2 | 3;
      if (a.tier === "high" && phase === 3) phase = 2;
      const viaProvider = x.kind === "tech" && a.itManagedBy === "provider";
      const specific = platforms.filter((p) => x.how[p]);
      const how = (specific.length ? specific : (["default"] as Platform[]))
        .filter((p) => x.how[p])
        .map((p) => ({ platform: p, steps: x.how[p]![lang] }));
      return {
        action: x,
        phase,
        due: addDays(start, PHASE_DAYS[phase]),
        owner: { name: ownerName, viaProvider },
        alreadyInPlace: !!x.capability && have.includes(x.capability),
        how,
        policyTitle: policies.find((p) => p.id === x.policy)?.title[lang] ?? x.policy,
        domains: x.kb
          .map((id) => kb.items.find((i) => i.id === id))
          .filter((i): i is (typeof kb.items)[number] => !!i && i.group === "nca")
          .map((i) => i.title[lang])
      };
    })
    .sort((p, q) => p.phase - q.phase || Number(p.alreadyInPlace) - Number(q.alreadyInPlace));
}

/** A ready-to-send message asking the outside IT provider to do a task. */
export function providerRequest(p: PlannedAction, company: string, lang: Lang): string {
  const date = new Date(p.due + "T00:00:00").toLocaleDateString(lang === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const steps = p.how.flatMap((h) => h.steps).map((s, i) => `${i + 1}. ${s}`).join("\n");
  return lang === "ar"
    ? `مرحبًا،\n\nضمن تطبيق سياسات الأمن السيبراني في ${company}، نرجو تنفيذ ما يلي قبل ${date}:\n\n${p.action.title.ar}\n\n${steps}\n\nونرجو تزويدنا بما يثبت التنفيذ: ${p.action.evidence.ar}\n\nشكرًا لكم.`
    : `Hello,\n\nAs part of applying ${company}'s cybersecurity policies, please complete the following by ${date}:\n\n${p.action.title.en}\n\n${steps}\n\nPlease send us evidence once done: ${p.action.evidence.en}\n\nThank you.`;
}

interface ScheduleItem {
  id: string;
  months?: Partial<Record<string, number>>;
  monthsFrom?: string;
  title: T;
  policy: string;
}

const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const enc = new TextEncoder();
/** RFC 5545: fold lines at 75 octets, never splitting a UTF-8 character (Arabic is 2 bytes a letter). */
const fold = (line: string) => {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > 74) {
      out.push(cur);
      cur = " ";
      bytes = 1;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n");
};

/** Recurring security calendar (.ics) with the frequencies the company's policies promise. */
export function buildCalendar(raw: Answers, lang: Lang, company: string): { ics: string; events: { title: string; months: number }[] } {
  const a = effectiveAnswers(raw);
  const schedule = (paramsRaw as unknown as { schedule: ScheduleItem[] }).schedule;
  const start = a.effectiveDate || new Date().toISOString().slice(0, 10);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const events: { title: string; months: number }[] = [];
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Baseline//Security calendar//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const item of schedule) {
    const months = item.monthsFrom ? Number(a[item.monthsFrom]) : item.months?.[a.tier];
    if (!months) continue;
    const first = new Date(start + "T00:00:00");
    first.setMonth(first.getMonth() + months);
    const day = first.toISOString().slice(0, 10).replace(/-/g, "");
    const next = new Date(first);
    next.setDate(next.getDate() + 1);
    const policyTitle = policies.find((p) => p.id === item.policy)?.title[lang] ?? "";
    const title = `${item.title[lang]} · ${company}`;
    const desc = lang === "ar" ? `مطلوب بموجب: ${policyTitle}. سجّل الدليل في ملف الأدلة.` : `Required by: ${policyTitle}. Save the evidence in your evidence folder.`;
    events.push({ title: item.title[lang], months });
    lines.push(
      "BEGIN:VEVENT",
      `UID:baseline-${item.id}-${day}@baseline.sa`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day}`,
      `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, "")}`,
      `RRULE:FREQ=MONTHLY;INTERVAL=${months}`,
      fold(`SUMMARY:${icsEscape(title)}`),
      fold(`DESCRIPTION:${icsEscape(desc)}`),
      "BEGIN:VALARM",
      "TRIGGER:-P7D",
      "ACTION:DISPLAY",
      fold(`DESCRIPTION:${icsEscape(title)}`),
      "END:VALARM",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return { ics: lines.join("\r\n"), events };
}
