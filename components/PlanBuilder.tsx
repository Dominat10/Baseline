"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Item, KnowledgeBase, Lang, LayerId, ProfileId } from "@/lib/kb";
import { t } from "@/lib/i18n";

type Size = "micro" | "sme" | "large";
type Filter = "all" | LayerId;
const KEY = "baseline-plan-v1";

interface Saved {
  profile?: ProfileId;
  size?: Size;
  checks?: Record<string, boolean>;
}

function load(): Saved {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export default function PlanBuilder({ lang, kb }: { lang: Lang; kb: KnowledgeBase }) {
  const s = t(lang);
  const search = useSearchParams();
  const [profile, setProfile] = useState<ProfileId | null>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = load();
    const fromUrl = search.get("p") as ProfileId | null;
    const valid = (p: string | null | undefined): p is ProfileId => !!p && kb.profiles.some((x) => x.id === p);
    setProfile(valid(fromUrl) ? fromUrl : valid(saved.profile) ? saved.profile : null);
    setSize(saved.size ?? null);
    setChecks(saved.checks ?? {});
    setReady(true);
  }, [search, kb.profiles]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ profile, size, checks }));
    } catch {
      /* storage unavailable: plan still works for this visit */
    }
  }, [profile, size, checks, ready]);

  const p = kb.profiles.find((x) => x.id === profile) ?? null;

  const plan = useMemo(() => {
    if (!profile) return null;
    const applies = (i: Item) => (i.profile ? i.profile === profile : true);
    const phaseOf = (i: Item) => i.phase[profile] ?? 0;
    const relevant = kb.items.filter(applies);
    const skipped = relevant.filter((i) => phaseOf(i) === 0).length;
    const shown = relevant.filter((i) => phaseOf(i) > 0 && (filter === "all" || i.layers.includes(filter)));
    const byPhase = kb.phases.map((ph) => ({
      ...ph,
      items: shown
        .filter((i) => phaseOf(i) === ph.n)
        .sort((a, b) => Number(!!b.profile) - Number(!!a.profile))
    }));
    return { byPhase, skipped, total: shown.length, done: shown.filter((i) => checks[i.id]).length };
  }, [profile, filter, checks, kb]);

  const toggle = (id: string) => setChecks((c) => ({ ...c, [id]: !c[id] }));

  return (
    <div className="stack-lg">
      <section className="stack">
        <span className="step">1 · {s.step1}</span>
        <div className="profiles" role="group" aria-label={s.step1}>
          {kb.profiles.map((x) => (
            <button
              key={x.id}
              type="button"
              className="pbtn"
              aria-pressed={profile === x.id}
              onClick={() => setProfile(x.id)}
            >
              <b>{x.name[lang]}</b>
              <span>{x.short[lang]}</span>
            </button>
          ))}
        </div>
      </section>

      {p && (
        <section className="stack">
          <span className="step">2 · {s.step2}</span>
          <div className="row" role="group" aria-label={s.step2}>
            {s.sizes.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="chip"
                aria-pressed={size === id}
                onClick={() => setSize(id as Size)}
              >
                {label}
              </button>
            ))}
          </div>
          {size && <p className="note-box">{s.sizeNote[size]}</p>}
        </section>
      )}

      {p && plan && (
        <>
          <div className="summary">
            <div>
              <small>{s.jewel}</small>
              <p>{p.jewel[lang]}</p>
            </div>
            <div>
              <small>{s.threat}</small>
              <p>{p.threat[lang]}</p>
            </div>
            <div>
              <small>{s.driver}</small>
              <p>{p.driver[lang]}</p>
            </div>
          </div>

          <div className="bar" role="toolbar">
            {(["all", "nca", "biz", "pdpl"] as Filter[]).map((f) => (
              <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f === "all" ? s.all : kb.layers[f][lang]}
              </button>
            ))}
            <div className="score">
              <b>{plan.done}</b> {s.of} {plan.total} {s.done} ·{" "}
              <button type="button" className="linkbtn" onClick={() => setChecks({})}>
                {s.reset}
              </button>
            </div>
          </div>

          {plan.byPhase.map(
            (ph) =>
              ph.items.length > 0 && (
                <section key={ph.n} className="stack">
                  <div>
                    <h2 className="phase-title">
                      <span className={`dot p${ph.n}`} aria-hidden="true" />
                      {ph.title[lang]}
                    </h2>
                    <p className="muted small">{ph.sub[lang]}</p>
                  </div>
                  <ul className="list">
                    {ph.items.map((i) => (
                      <li key={i.id} className={`item${checks[i.id] ? " checked" : ""}`}>
                        <input type="checkbox" id={i.id} checked={!!checks[i.id]} onChange={() => toggle(i.id)} />
                        <label htmlFor={i.id}>{i.title[lang]}</label>
                        <p className="what">{i.what[lang]}</p>
                        <div className="tags">
                          {i.layers.map((l) => (
                            <span key={l} className={`tag ${l}`}>
                              {kb.layers[l][lang]}
                            </span>
                          ))}
                          {i.profile && <span className="tag prof">{s.profileTag}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )
          )}

          {plan.skipped > 0 && <p className="muted small">{s.notApplicable(plan.skipped)}</p>}

          <footer className="fine">
            <p>{s.disclaimer}</p>
            <p>
              {s.kbVersion}: {kb.version} ({kb.updated}) · {s.sources}:{" "}
              {kb.sources.map((src, n) => (
                <span key={src.id}>
                  {n > 0 && " · "}
                  <a href={src.url} target="_blank" rel="noopener noreferrer">
                    {src.name[lang]}
                  </a>
                </span>
              ))}
            </p>
          </footer>
        </>
      )}
    </div>
  );
}
