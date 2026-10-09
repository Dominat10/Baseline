// Validates content/knowledge-base.json so a bad edit never reaches customers.
import { readFileSync } from "node:fs";

const kb = JSON.parse(readFileSync(new URL("../content/knowledge-base.json", import.meta.url)));
const errors = [];
const profiles = kb.profiles.map((p) => p.id);
const layers = Object.keys(kb.layers);
const groups = [...kb.groups.map((g) => g.id), "profile"];
const ids = new Set();

for (const i of kb.items) {
  const where = `item ${i.id}`;
  if (ids.has(i.id)) errors.push(`${where}: duplicate id`);
  ids.add(i.id);
  if (!groups.includes(i.group)) errors.push(`${where}: unknown group "${i.group}"`);
  for (const l of i.layers ?? []) if (!layers.includes(l)) errors.push(`${where}: unknown layer "${l}"`);
  for (const f of ["title", "what"]) {
    if (!i[f]?.ar || !i[f]?.en) errors.push(`${where}: ${f} needs both ar and en`);
  }
  if (i.group === "profile") {
    if (!profiles.includes(i.profile)) errors.push(`${where}: profile item needs a valid "profile"`);
    if (![1, 2, 3].includes(i.phase?.[i.profile])) errors.push(`${where}: needs phase 1-3 for ${i.profile}`);
  } else {
    for (const p of profiles) {
      if (![0, 1, 2, 3].includes(i.phase?.[p])) errors.push(`${where}: phase for "${p}" must be 0-3`);
    }
  }
}

// ---------- policies ----------
const q = JSON.parse(readFileSync(new URL("../content/policies/questions.json", import.meta.url)));
for (const st of q.steps) for (const f of st.fields) if (!q.fields[f]) errors.push(`questions step ${st.id}: unknown field "${f}"`);
for (const [id, f] of Object.entries(q.fields)) {
  if (!f.label?.ar || !f.label?.en) errors.push(`field ${id}: label needs ar and en`);
  for (const [k, vals] of Object.entries(f.showIf ?? {})) {
    const dep = q.fields[k];
    if (!dep) errors.push(`field ${id}: showIf on unknown field "${k}"`);
    else for (const v of vals) if (!dep.options?.some((o) => o.value === v)) errors.push(`field ${id}: showIf value "${v}" isn't an option of ${k}`);
  }
  if (f.exclusive && !f.options?.some((o) => o.value === f.exclusive)) errors.push(`field ${id}: exclusive "${f.exclusive}" isn't an option`);
  if ((f.type === "select" || f.type === "multi" || f.type === "derived") && !(f.options?.length)) errors.push(`field ${id}: select needs options`);
}
const params = JSON.parse(readFileSync(new URL("../content/policies/parameters.json", import.meta.url))).params;
const tiers = q.fields.tier.options.map((o) => o.value);
for (const [name, byTier] of Object.entries(params)) {
  for (const tr of tiers) if (!byTier[tr]?.ar || !byTier[tr]?.en) errors.push(`parameter ${name}: needs ar and en for tier "${tr}"`);
}
const sharedSections = JSON.parse(readFileSync(new URL("../content/policies/shared.json", import.meta.url))).sections;

function checkCond(when, where) {
  const conds = Array.isArray(when) ? when : when ? [when] : [];
  for (const c of conds) for (const [k, vals] of Object.entries(c)) {
    const field = q.fields[k];
    if (!field) errors.push(`${where}: condition on unknown field "${k}"`);
    else for (const v of vals) if (!field.options?.some((o) => o.value === v)) errors.push(`${where}: "${v}" isn't an option of ${k}`);
  }
}
function checkSection(sec, where) {
  if (!sec.heading?.ar || !sec.heading?.en) errors.push(`${where}: heading needs ar and en`);
  checkCond(sec.when, where);
  sec.blocks.forEach((b, bi) => {
    const w = `${where} block ${bi}`;
    if (!b.text?.ar || !b.text?.en) errors.push(`${w}: text needs ar and en`);
    const blanks = (l) => [...(b.text?.[l] ?? "").matchAll(/\{\{([\w.]+)\}\}/g)].map((m) => m[1]);
    for (const lang of ["ar", "en"]) for (const k of blanks(lang)) {
      if (k.startsWith("p.")) { if (!params[k.slice(2)]) errors.push(`${w}: unknown parameter {{${k}}}`); }
      else if (!q.fields[k]) errors.push(`${w}: unknown blank {{${k}}} in ${lang}`);
    }
    if (blanks("ar").sort().join() !== blanks("en").sort().join()) errors.push(`${w}: ar and en use different blanks`);
    checkCond(b.when, w);
  });
}
for (const [name, sec] of Object.entries(sharedSections)) checkSection(sec, `shared ${name}`);

const POLICY_FILES = ["information-security", "acceptable-use", "access-control", "data-protection", "incident-response", "backup-recovery"];
const seen = new Map();
for (const file of POLICY_FILES) {
  const pol = JSON.parse(readFileSync(new URL(`../content/policies/${file}.json`, import.meta.url)));
  if (pol.id !== file) errors.push(`${file}: id must match file name`);
  pol.sections.forEach((sec, si) => {
    if (sec.include) { if (!sharedSections[sec.include]) errors.push(`${file}: unknown shared section "${sec.include}"`); return; }
    checkSection(sec, `${file} section ${si}`);
    // The same rule written twice (in any policy) is a sign of redundancy.
    for (const b of sec.blocks) {
      const key = b.text.en.trim();
      if (seen.has(key)) errors.push(`${file}: duplicate clause also in ${seen.get(key)}: "${key.slice(0, 60)}…"`);
      else seen.set(key, file);
    }
  });
}
if (!errors.length) console.log(`Policies OK: ${POLICY_FILES.length} policies, ${Object.keys(q.fields).length} fields, ${Object.keys(params).length} tier parameters.`);

// ---------- action library ----------
const lib = JSON.parse(readFileSync(new URL("../content/actions.json", import.meta.url)));
const kbIds = new Set(kb.items.map((i) => i.id));
const actionIds = new Set();
for (const a of lib.actions) {
  const w = `action ${a.id}`;
  if (actionIds.has(a.id)) errors.push(`${w}: duplicate id`);
  actionIds.add(a.id);
  if (!POLICY_FILES.includes(a.policy)) errors.push(`${w}: unknown policy "${a.policy}"`);
  for (const k of a.kb) if (!kbIds.has(k)) errors.push(`${w}: unknown knowledge-base item "${k}"`);
  for (const f of ["title", "why", "evidence"]) if (!a[f]?.ar || !a[f]?.en) errors.push(`${w}: ${f} needs ar and en`);
  if (!a.how?.default && !Object.keys(a.how ?? {}).length) errors.push(`${w}: needs how-to steps`);
  for (const [plat, st] of Object.entries(a.how ?? {})) if (st.ar?.length !== st.en?.length) errors.push(`${w}: ${plat} steps differ between ar and en`);
  if (!lib.effort[a.effort]) errors.push(`${w}: unknown effort "${a.effort}"`);
  if (!lib.cost[a.cost]) errors.push(`${w}: unknown cost "${a.cost}"`);
  if (a.capability && !q.fields.capabilities.options.some((o) => o.value === a.capability)) errors.push(`${w}: unknown capability "${a.capability}"`);
  checkCond(a.when, w);
}
for (const item of kb.items.filter((i) => i.group === "nca")) {
  if (!lib.actions.some((a) => !a.when && a.kb.includes(item.id))) errors.push(`mandatory NCA domain ${item.id} (${item.title.en}) has no action that always applies`);
}
for (const cap of q.fields.capabilities.options.filter((o) => o.value !== q.fields.capabilities.exclusive)) {
  if (!lib.actions.some((a) => a.capability === cap.value)) errors.push(`capability "${cap.value}" isn't linked to any action`);
}
if (!errors.length) console.log(`Actions OK: ${lib.actions.length} actions, all 13 mandatory NCA domains covered.`);

// ---------- solutions ----------
const sol = JSON.parse(readFileSync(new URL("../content/solutions.json", import.meta.url)));
const editions = { m365: q.fields.m365Licence.options.map((o) => o.value), google: q.fields.googleLicence.options.map((o) => o.value) };
const catIds = new Set();
for (const c of sol.categories) {
  const w = `solution ${c.id}`;
  if (catIds.has(c.id)) errors.push(`${w}: duplicate id`);
  catIds.add(c.id);
  for (const f of ["name", "what"]) if (!c[f]?.ar || !c[f]?.en) errors.push(`${w}: ${f} needs ar and en`);
  if (c.criteria.ar.length !== c.criteria.en.length) errors.push(`${w}: criteria differ between ar and en`);
  if (!sol.costBands[c.cost]) errors.push(`${w}: unknown cost band "${c.cost}"`);
  for (const id of c.covers) if (!actionIds.has(id)) errors.push(`${w}: covers unknown action "${id}"`);
  for (const [p, inc] of Object.entries(c.included ?? {})) for (const e of inc.editions) if (!editions[p]?.includes(e)) errors.push(`${w}: unknown ${p} edition "${e}"`);
  for (const [p, e] of Object.entries(c.upgrade ?? {})) if (!sol.upgrades[p]?.[e]) errors.push(`${w}: upgrade target ${p}/${e} has no name`);
  if (c.haveIf && !q.fields.capabilities.options.some((o) => o.value === c.haveIf)) errors.push(`${w}: unknown capability "${c.haveIf}"`);
  if (c.kind === "tool" && !c.examples.length) errors.push(`${w}: tools need at least one labelled example`);
  checkCond(c.when, w);
}
if (!sol.disclosure?.ar || !sol.disclosure?.en) errors.push("solutions: vendor disclosure text is required");
if (!errors.length) console.log(`Solutions OK: ${sol.categories.length} categories.`);

// ---------- architecture ----------
const arch = JSON.parse(readFileSync(new URL("../content/architecture.json", import.meta.url)));
const compIds = new Set();
for (const l of arch.layers) {
  if (!l.title?.ar || !l.title?.en || !l.sub?.ar || !l.sub?.en) errors.push(`layer ${l.id}: title/sub need ar and en`);
  for (const c of l.components) {
    const w = `component ${c.id}`;
    if (compIds.has(c.id)) errors.push(`${w}: duplicate id`);
    compIds.add(c.id);
    if (!c.name?.ar || !c.name?.en) errors.push(`${w}: name needs ar and en`);
    if (!c.kind && !c.solution && !c.action) errors.push(`${w}: must link to a solution or an action`);
    if (c.solution && !catIds.has(c.solution)) errors.push(`${w}: unknown solution "${c.solution}"`);
    if (c.action && !actionIds.has(c.action)) errors.push(`${w}: unknown action "${c.action}"`);
    checkCond(c.when, w);
  }
}
for (const e of arch.external) { if (!e.name?.ar || !e.note?.en) errors.push(`external ${e.id}: needs ar and en`); checkCond(e.when, `external ${e.id}`); }
for (const d of arch.decisions) { if (!d.text?.ar || !d.text?.en) errors.push(`decision ${d.id}: needs ar and en`); checkCond(d.when, `decision ${d.id}`); }
// Every solution category should appear somewhere in the architecture picture.
for (const c of sol.categories) if (!arch.layers.some((l) => l.components.some((x) => x.solution === c.id))) errors.push(`solution ${c.id} isn't shown in any architecture layer`);
if (!errors.length) console.log(`Architecture OK: ${arch.layers.length} layers, ${compIds.size} components, ${arch.decisions.length} decisions.`);

if (errors.length) {
  console.error(`Knowledge base has ${errors.length} problem(s):\n- ` + errors.join("\n- "));
  process.exit(1);
}
console.log(`Knowledge base v${kb.version} OK: ${kb.items.length} items, ${profiles.length} profiles.`);
