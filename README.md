# Baseline · أساس

The cybersecurity baseline for Saudi SMEs: pick your business type, get a 30 / 90 / 180-day plan that combines NCA's mandatory controls (NCNICC-1:2025, Category B), personal data protection (PDPL), and what large clients expect from suppliers.

Arabic (default, RTL) and English.

## How it's built

```
content/knowledge-base.json   ← all the expertise lives here (controls, profiles, priorities)
lib/                          ← types and UI text (ar/en)
components/PlanBuilder.tsx    ← the interactive plan
app/[lang]/                   ← pages: / (landing) and /plan
scripts/check-content.mjs     ← validates the knowledge base on every build
```

The knowledge is **data, not code**: consultants improve the product by editing one JSON file (see `CONTENT.md`). A bad edit fails the build instead of reaching customers.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000 → redirects to /ar
npm run build      # validates content, then builds
```

## Stage 1 scope

- Public, free, no sign-up; answers saved only in the visitor's browser
- No personal data collected yet (no accounts, no forms)
- Deployed on Vercel from the `main` branch
