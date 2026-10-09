"use client";

import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { Lang } from "@/lib/kb";
import { t } from "@/lib/i18n";
import { deriveTier, isVisible, missingFields, questions, splitMulti, type Answers } from "@/lib/policy";

/** The one company questionnaire. Used by every page, so each question is answered once. */
export default function ProfileForm({
  lang,
  answers,
  setAnswers,
  children
}: {
  lang: Lang;
  answers: Answers;
  setAnswers: Dispatch<SetStateAction<Answers>>;
  children?: ReactNode;
}) {
  const s = t(lang).policy;
  const [step, setStep] = useState(0);
  const missing = missingFields(answers);
  const set = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v.slice(0, 120) }));
  const toggleMulti = (id: string, v: string) =>
    setAnswers((a) => {
      const ex = questions.fields[id].exclusive;
      let cur = splitMulti(a[id]);
      if (cur.includes(v)) cur = cur.filter((x) => x !== v);
      else cur = v === ex ? [v] : [...cur.filter((x) => x !== ex), v];
      return { ...a, [id]: cur.join(",") };
    });
  const current = questions.steps[step];
  const tier = deriveTier(answers);

  return (
    <section className="form no-print" aria-label={s.formLabel}>
          <ol className="tabs">
            {questions.steps.map((st, i) => {
              const left = st.fields.filter((f) => missing.includes(f)).length;
              return (
                <li key={st.id}>
                  <button type="button" aria-current={i === step ? "step" : undefined} onClick={() => setStep(i)}>
                    <span>{i + 1}</span> {st.title[lang]}
                    {left === 0 && <b aria-label={s.complete}> ✓</b>}
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="stack">
            {current.fields.filter((id) => isVisible(id, answers)).map((id) => {
              const f = questions.fields[id];
              return (
                <div key={id} className="field">
                  {f.type === "select" || f.type === "multi" ? (
                    <span className="flabel" id={`l-${id}`}>{f.label[lang]}</span>
                  ) : (
                    <label className="flabel" htmlFor={`f-${id}`}>{f.label[lang]}</label>
                  )}
                  {f.type === "select" ? (
                    <div className="row" role="radiogroup" aria-labelledby={`l-${id}`}>
                      {f.options!.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          className="chip"
                          role="radio"
                          aria-checked={answers[id] === o.value}
                          onClick={() => set(id, o.value)}
                        >
                          {o.label[lang]}
                        </button>
                      ))}
                    </div>
                  ) : f.type === "multi" ? (
                    <div className="row" role="group" aria-labelledby={`l-${id}`}>
                      {f.options!.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          className="chip"
                          role="checkbox"
                          aria-checked={splitMulti(answers[id]).includes(o.value)}
                          onClick={() => toggleMulti(id, o.value)}
                        >
                          {o.label[lang]}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      id={`f-${id}`}
                      type={f.type}
                      value={answers[id] ?? ""}
                      placeholder={f.placeholder?.[lang]}
                      maxLength={120}
                      autoComplete="off"
                      onChange={(e) => set(id, e.target.value)}
                    />
                  )}
                  {f.help && <p className="muted small">{f.help[lang]}</p>}
                </div>
              );
            })}
          </div>

          <div className="row between">
            <button type="button" className="chip" disabled={step === 0} onClick={() => setStep(step - 1)}>
              {s.back}
            </button>
            {step < questions.steps.length - 1 ? (
              <button type="button" className="btn" onClick={() => setStep(step + 1)}>
                {s.next}
              </button>
            ) : (
              <span className="muted small">{missing.length ? s.left(missing.length) : s.allSet}</span>
            )}
          </div>

          <div className={`tier tier-${tier.tier}`} aria-live="polite">
            <b>
              {s.tierLabel}: {questions.fields.tier.options!.find((o) => o.value === tier.tier)!.label[lang]}
            </b>
            <span className="small">
              {tier.reasons.length ? `${s.because} ${tier.reasons.map((r) => s.reasons[r]).join(lang === "ar" ? "، " : ", ")}.` : s.basicWhy}
            </span>
          </div>

      {children}
    </section>
  );
}
