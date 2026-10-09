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
  if (f.type === "select" && !(f.options?.length)) errors.push(`field ${id}: select needs options`);
}
for (const file of ["information-security"]) {
  const pol = JSON.parse(readFileSync(new URL(`../content/policies/${file}.json`, import.meta.url)));
  pol.sections.forEach((sec, si) => {
    if (!sec.heading?.ar || !sec.heading?.en) errors.push(`${file} section ${si}: heading needs ar and en`);
    sec.blocks.forEach((b, bi) => {
      const where = `${file} section ${si} block ${bi}`;
      if (!b.text?.ar || !b.text?.en) errors.push(`${where}: text needs ar and en`);
      for (const lang of ["ar", "en"]) {
        for (const m of (b.text?.[lang] ?? "").matchAll(/\{\{(\w+)\}\}/g)) {
          if (!q.fields[m[1]]) errors.push(`${where}: unknown blank {{${m[1]}}} in ${lang}`);
        }
      }
      const blanks = (l) => [...(b.text?.[l] ?? "").matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort().join();
      if (blanks("ar") !== blanks("en")) errors.push(`${where}: ar and en use different blanks`);
      for (const [k, vals] of Object.entries(b.when ?? {})) {
        const field = q.fields[k];
        if (!field) errors.push(`${where}: condition on unknown field "${k}"`);
        else for (const v of vals) if (!field.options?.some((o) => o.value === v)) errors.push(`${where}: "${v}" isn't an option of ${k}`);
      }
    });
  });
}

if (errors.length) {
  console.error(`Knowledge base has ${errors.length} problem(s):\n- ` + errors.join("\n- "));
  process.exit(1);
}
console.log(`Knowledge base v${kb.version} OK: ${kb.items.length} items, ${profiles.length} profiles.`);
