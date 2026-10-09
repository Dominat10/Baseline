"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/kb";
import { t } from "@/lib/i18n";
import { buildPlan } from "@/lib/actions";
import { buildSolutions } from "@/lib/solutions";
import { buildArchitecture } from "@/lib/architecture";
import { useDone, useProfile } from "@/lib/useProfile";
import ProfileForm from "./ProfileForm";

// Statuses that mean "available without buying anything" share one colour.
const COLOR: Record<string, string> = { have: "have", included: "included", partial: "included", unsure: "included", upgrade: "upgrade", buy: "buy", service: "service", todo: "todo", platform: "platform" };

export default function Architecture({ lang }: { lang: Lang }) {
  const s = t(lang).arch;
  const a = t(lang).actions;
  const { answers, setAnswers, ready } = useProfile();
  const { done } = useDone();
  const [view, setView] = useState<"target" | "today">("target");
  const plan = useMemo(() => buildPlan(answers, lang), [answers, lang]);
  const sols = useMemo(() => buildSolutions(answers, plan, lang), [answers, plan, lang]);
  const arch = useMemo(() => buildArchitecture(answers, plan, sols, done, lang), [answers, plan, sols, done, lang]);
  const basicsKnown = !!answers.profile && !!answers.size && !!answers.platform;
  // Open the questions once on arrival if they're missing; after that the user decides (never snaps shut mid-answer).
  const [drawer, setDrawer] = useState<boolean | null>(null);
  useEffect(() => {
    if (ready && drawer === null) setDrawer(!basicsKnown);
  }, [ready, drawer, basicsKnown]);

  return (
    <div className="stack-lg">
      <header className="stack no-print">
        <p className="eyebrow">{s.eyebrow}</p>
        <h1>{s.heading}</h1>
        <p className="lede">{s.intro}</p>
      </header>

      <details
        className="no-print profile-drawer"
        open={!!drawer}
        onToggle={(e) => setDrawer((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary>{a.editProfile}</summary>
        <ProfileForm lang={lang} answers={answers} setAnswers={setAnswers} />
      </details>

      {ready && !basicsKnown ? (
        <p className="note-box">{a.needProfile}</p>
      ) : ready ? (
        <>
          <div className="arch-bar no-print">
            <div className="seg" role="tablist">
              {(["today", "target"] as const).map((v) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}>
                  {s[v]}
                </button>
              ))}
            </div>
            <b>{s.inPlace(arch.score.inPlace, arch.score.total)}</b>
            <button type="button" className="chip" onClick={() => window.print()}>
              {s.print}
            </button>
          </div>

          <div className="legend">
            {["have", "included", "upgrade", "buy", "service", "todo"].map((k) => (
              <span key={k} className={`bx-key c-${k}`}>
                {s.legend[k]}
              </span>
            ))}
          </div>

          <div className={`arch view-${view}`}>
            <div className="arch-people">
              <b>👤 {s.people}</b>
              <span className="arrow">↓ {s.flow}</span>
            </div>
            {arch.layers.map((l, i) => (
              <section key={l.id} className="layer-row">
                <div className="layer-label">
                  <span className="layer-n">{i + 1}</span>
                  <b>{l.title}</b>
                  <span>{l.sub}</span>
                  {l.id === "data" && (
                    <span className={`region r-${arch.hosting}`}>
                      {s.dataRegion}: {s.region[arch.hosting]}
                    </span>
                  )}
                </div>
                <ul className="boxes">
                  {l.boxes.map((b) => (
                    <li key={b.id} className={`bx c-${COLOR[b.status]}${b.inPlace ? " on" : ""}`} title={s.legend[COLOR[b.status]]}>
                      {b.name}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {arch.external.length > 0 && (
              <section className="outside">
                <b>{s.outside}</b>
                <ul>
                  {arch.external.map((e) => (
                    <li key={e.id} className={e.crossBorder ? "cross" : ""}>
                      <b>
                        ⇄ {e.name}
                        {e.crossBorder && <em> · {s.crossBorder}</em>}
                      </b>
                      <span>{e.note}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <section className="stack">
            <h2>{s.decisions}</h2>
            <ol className="decisions">
              {arch.decisions.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ol>
          </section>
        </>
      ) : null}
    </div>
  );
}
