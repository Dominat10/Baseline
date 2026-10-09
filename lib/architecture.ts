import archRaw from "@/content/architecture.json";
import type { Lang, T } from "./kb";
import { effectiveAnswers, splitMulti, type Answers } from "./policy";
import type { PlannedAction } from "./actions";
import type { PlannedSolution, Status } from "./solutions";

type Cond = Record<string, string[]>;

interface Component {
  id: string;
  name: T;
  kind?: "platform";
  solution?: string;
  action?: string;
  when?: Cond[];
}

interface Library {
  version: string;
  layers: { id: string; title: T; sub: T; components: Component[] }[];
  external: { id: string; name: T; note: T; when: Cond[]; crossBorder?: boolean }[];
  decisions: { id: string; text: T; when?: Cond[] }[];
}

export const architecture = archRaw as unknown as Library;

/** "todo" = a process or setting still to do; "platform" = the company's core platform. */
export type BoxStatus = Status | "todo" | "platform";

export interface Box {
  id: string;
  name: string;
  status: BoxStatus;
  inPlace: boolean; // shown as solid in the "today" view
}

const matches = (c: Cond, a: Answers) => Object.entries(c).every(([k, v]) => splitMulti(a[k]).some((x) => v.includes(x)));
const applies = (w: Cond[] | undefined, a: Answers) => !w || w.some((c) => matches(c, a));

/** The company's target security architecture, built from its profile, action plan, solutions plan and ticks. */
export function buildArchitecture(
  raw: Answers,
  plan: PlannedAction[],
  sols: PlannedSolution[],
  done: Record<string, boolean>,
  lang: Lang
) {
  const a = effectiveAnswers(raw);
  const layers = architecture.layers
    .map((l) => ({
      id: l.id,
      title: l.title[lang],
      sub: l.sub[lang],
      boxes: l.components
        .filter((c) => applies(c.when, a))
        .map((c): Box | null => {
          if (c.kind === "platform") return { id: c.id, name: c.name[lang], status: "platform", inPlace: true };
          if (c.solution) {
            const s = sols.find((x) => x.category.id === c.solution);
            return s ? { id: c.id, name: c.name[lang], status: s.status, inPlace: s.status === "have" } : null;
          }
          if (c.action) {
            const p = plan.find((x) => x.action.id === c.action);
            if (!p) return null;
            const ok = p.alreadyInPlace || !!done[c.action];
            return { id: c.id, name: c.name[lang], status: ok ? "have" : "todo", inPlace: ok };
          }
          return null;
        })
        .filter((b): b is Box => !!b)
    }))
    .filter((l) => l.boxes.length > 0);

  const external = architecture.external
    .filter((e) => applies(e.when, a))
    .map((e) => ({ id: e.id, name: e.name[lang], note: e.note[lang], crossBorder: !!e.crossBorder }));

  const decisions = architecture.decisions.filter((d) => applies(d.when, a)).map((d) => d.text[lang]);
  const hosting = (a.hosting || "unsure") as "ksa" | "outside" | "unsure";
  const all = layers.flatMap((l) => l.boxes).filter((b) => b.status !== "platform");
  return { layers, external, decisions, hosting, score: { inPlace: all.filter((b) => b.inPlace).length, total: all.length } };
}
