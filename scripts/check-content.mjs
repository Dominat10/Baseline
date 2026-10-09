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

if (errors.length) {
  console.error(`Knowledge base has ${errors.length} problem(s):\n- ` + errors.join("\n- "));
  process.exit(1);
}
console.log(`Knowledge base v${kb.version} OK: ${kb.items.length} items, ${profiles.length} profiles.`);
