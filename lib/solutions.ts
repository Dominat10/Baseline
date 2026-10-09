import solutionsRaw from "@/content/solutions.json";
import type { Lang, T } from "./kb";
import { effectiveAnswers, splitMulti, type Answers } from "./policy";
import type { PlannedAction } from "./actions";

type Cond = Record<string, string[]>;
type Plat = "m365" | "google";

interface Category {
  id: string;
  kind: "tool" | "service";
  name: T;
  what: T;
  criteria: { ar: string[]; en: string[] };
  examples: string[];
  cost: "free" | "low" | "medium" | "high";
  covers: string[];
  phase: 1 | 2 | 3;
  included?: Partial<Record<Plat, { editions: string[]; product: T }>>;
  upgrade?: Partial<Record<Plat, string>>;
  addon?: Partial<Record<Plat, T>>;
  haveIf?: string;
  partial?: boolean;
  when?: Cond[];
}

interface Library {
  version: string;
  costBands: Record<string, T>;
  upgrades: Record<Plat, Record<string, T>>;
  disclosure: T;
  categories: Category[];
}

export const solutions = solutionsRaw as unknown as Library;

export type Status = "have" | "included" | "partial" | "unsure" | "upgrade" | "buy" | "service";
const RANK: Status[] = ["have", "included", "partial", "unsure", "upgrade", "buy", "service"];

/** Edition order, lowest first, so "upgrade" only ever points upward. */
const EDITION_ORDER: Record<Plat, string[]> = {
  m365: ["basic", "standard", "premium", "enterprise"],
  google: ["starter", "standard", "plus", "enterprise"]
};

export interface PlannedSolution {
  category: Category;
  status: Status;
  phase: 1 | 2 | 3;
  detail?: string; // product included, or the edition to upgrade to
  addon?: string;
  actions: PlannedAction[];
}

const matches = (c: Cond, a: Answers) => Object.entries(c).every(([k, v]) => splitMulti(a[k]).some((x) => v.includes(x)));

/** Cheapest path for each solution category the action plan actually needs. */
export function buildSolutions(raw: Answers, plan: PlannedAction[], lang: Lang): PlannedSolution[] {
  const a = effectiveAnswers(raw);
  const have = splitMulti(a.capabilities);
  const platforms = splitMulti(a.platform).filter((p): p is Plat => p === "m365" || p === "google");
  const out: PlannedSolution[] = [];

  for (const c of solutions.categories) {
    if (c.when && !c.when.some((w) => matches(w, a))) continue;
    const actions = plan.filter((p) => c.covers.includes(p.action.id));
    if (!actions.length) continue; // only solutions for tasks this company actually has
    const phase = Math.min(...actions.map((p) => p.phase)) as 1 | 2 | 3;

    let best: { status: Status; detail?: string; addon?: string } = { status: c.kind === "service" ? "service" : "buy" };
    const consider = (s: { status: Status; detail?: string; addon?: string }) => {
      if (RANK.indexOf(s.status) < RANK.indexOf(best.status)) best = s;
    };
    if (c.haveIf && have.includes(c.haveIf)) consider({ status: "have" });
    if (c.kind === "tool") {
      for (const p of platforms) {
        const lic = a[`${p}Licence`];
        const inc = c.included?.[p];
        if (inc && inc.editions.includes(lic)) consider({ status: c.partial ? "partial" : "included", detail: inc.product[lang] });
        else if (inc && lic === "unsure") consider({ status: "unsure", detail: inc.product[lang] });
        else if (c.upgrade?.[p]) {
          const target = c.upgrade[p]!;
          const order = EDITION_ORDER[p];
          if (order.indexOf(lic) > -1 && order.indexOf(lic) < order.indexOf(target)) {
            consider({ status: "upgrade", detail: solutions.upgrades[p][target][lang], addon: c.addon?.[p]?.[lang] });
          }
        }
      }
    }
    out.push({ category: c, phase, actions, ...best });
  }
  return out.sort((x, y) => x.phase - y.phase || RANK.indexOf(x.status) - RANK.indexOf(y.status));
}

/** Where one licence upgrade would cover several separate purchases. */
export function upgradeAdvice(list: PlannedSolution[]): { edition: string; names: string[] }[] {
  const byEdition = new Map<string, string[]>();
  for (const s of list) if (s.status === "upgrade" && s.detail) byEdition.set(s.detail, [...(byEdition.get(s.detail) ?? []), s.category.id]);
  return [...byEdition.entries()].filter(([, ids]) => ids.length >= 2).map(([edition, names]) => ({ edition, names }));
}
