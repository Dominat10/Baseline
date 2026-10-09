"use client";

import { useMemo } from "react";
import type { Lang } from "@/lib/kb";
import { t } from "@/lib/i18n";
import { isVisible } from "@/lib/policy";
import { buildPlan } from "@/lib/actions";
import { buildSolutions, solutions, upgradeAdvice, type PlannedSolution } from "@/lib/solutions";
import { useProfile } from "@/lib/useProfile";
import ProfileForm from "./ProfileForm";

const GROUP: Record<string, string> = { have: "have", included: "included", partial: "included", unsure: "included", upgrade: "upgrade", buy: "buy", service: "service" };

function Card({ s: x, lang }: { s: PlannedSolution; lang: Lang }) {
  const s = t(lang).solutions;
  const c = x.category;
  return (
    <li className={`sol st-${x.status}`}>
      <div className="sol-head">
        <b>{c.name[lang]}</b>
        <span className={`pill status st-${x.status}`}>{s.status[x.status]}</span>
      </div>
      <p className="muted small">{c.what[lang]}</p>
      {x.detail && (
        <p className="small sol-detail">
          {x.status === "upgrade" ? "⬆️ " : "🔓 "}
          {x.detail}
          {x.addon ? ` · ${x.addon}` : ""}
        </p>
      )}
      <div className="task-meta" style={{ paddingInlineStart: 0 }}>
        <span className="pill">
          {s.cost}: {solutions.costBands[c.cost][lang]}
        </span>
        <span className="pill">
          {s.covers}: {x.actions.map((a) => a.action.title[lang]).join(" · ")}
        </span>
      </div>
      {!["have", "included"].includes(x.status) && (
        <details>
          <summary>
            {s.criteria} · {s.examples}
          </summary>
          <div className="task-body">
            <ul className="small">
              {c.criteria[lang].map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
            <p className="small">
              <b>{s.examples}:</b> {c.examples.length ? c.examples.join(" · ") : s.noExamples}
            </p>
          </div>
        </details>
      )}
    </li>
  );
}

export default function SolutionsPlan({ lang }: { lang: Lang }) {
  const s = t(lang).solutions;
  const a = t(lang).actions;
  const { answers, setAnswers, ready } = useProfile();
  const plan = useMemo(() => buildPlan(answers, lang), [answers, lang]);
  const list = useMemo(() => buildSolutions(answers, plan, lang), [answers, plan, lang]);
  const advice = upgradeAdvice(list);
  const basicsKnown = !!answers.profile && !!answers.size && !!answers.platform;
  const licenceMissing =
    (isVisible("m365Licence", answers) && !answers.m365Licence) || (isVisible("googleLicence", answers) && !answers.googleLicence);
  const counts = list.reduce<Record<string, number>>((m, x) => ((m[GROUP[x.status]] = (m[GROUP[x.status]] ?? 0) + 1), m), {});
  const nameOf = (id: string) => solutions.categories.find((c) => c.id === id)!.name[lang];

  return (
    <div className="stack-lg">
      <header className="stack">
        <p className="eyebrow">{s.eyebrow}</p>
        <h1>{s.heading}</h1>
        <p className="lede">{s.intro}</p>
      </header>
      <div className="builder">
        <div className="stack">
          <span className="step">{a.editProfile}</span>
          <ProfileForm lang={lang} answers={answers} setAnswers={setAnswers} />
        </div>
        <div className="stack">
          {!ready ? null : !basicsKnown ? (
            <p className="note-box">{a.needProfile}</p>
          ) : (
            <>
              <div className="sol-summary">
                {(["have", "included", "upgrade", "buy", "service"] as const).map((k) => (
                  <div key={k} className={`st-${k}`}>
                    <b>{counts[k] ?? 0}</b>
                    <span>{s.summary[k]}</span>
                  </div>
                ))}
              </div>
              {licenceMissing && <p className="note-box">{s.needLicence}</p>}
              {advice.map((ad) => (
                <div key={ad.edition} className="upgrade-box">
                  <b>⬆️ {s.upgradeTitle}</b>
                  <p className="small">{s.upgradeBody(ad.edition, ad.names.map(nameOf).join(lang === "ar" ? "، " : ", "))}</p>
                </div>
              ))}
              {([1, 2, 3] as const).map((ph) => {
                const items = list.filter((x) => x.phase === ph);
                if (!items.length) return null;
                return (
                  <section key={ph} className="stack">
                    <h2 className="phase-title">
                      <span className={`dot p${ph}`} aria-hidden="true" />
                      {a.phaseTitle[ph]}
                    </h2>
                    <ul className="tasks">
                      {items.map((x) => (
                        <Card key={x.category.id} s={x} lang={lang} />
                      ))}
                    </ul>
                  </section>
                );
              })}
              <p className="fine">{solutions.disclosure[lang]}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
