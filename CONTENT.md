# Editing the knowledge base

Everything customers see in a plan comes from `content/knowledge-base.json`.

## An item

```json
{
  "id": "nca-04",
  "group": "nca",                 // nca | rec | biz | pdpl | profile
  "layers": ["nca", "biz"],       // which tags it shows: nca, biz, pdpl
  "phase": { "dev": 2, "product": 2, "supplier": 1, "shop": 1 },
  "title": { "ar": "…", "en": "…" },
  "what":  { "ar": "…", "en": "…" }
}
```

- **phase**: per business type. `1` = first 30 days, `2` = first 90 days, `3` = within 6 months, `0` = doesn't apply.
- **Profile-only items** use `"group": "profile"`, a `"profile"` field, and a phase only for that profile.
- Every text needs **both Arabic and English**. Arabic is Modern Standard Arabic.

## Rules

1. Mandatory NCA items stay mandatory. Phase only changes the *order*, never whether it's required.
2. Any claim about a regulation must be traceable to a source in `"sources"`.
3. Bump `"version"` and `"updated"` with every change.
4. Run `npm run check-content` before committing.
