"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/kb";
import { t } from "@/lib/i18n";
import { missingFields, policies, questions, render, splitMulti, toWordHtml, type Answers, type Segment } from "@/lib/policy";

const KEY = "baseline-policy-v1";
const PLAN_KEY = "baseline-plan-v1";

function Seg({ s }: { s: Segment[] }) {
  return (
    <>
      {s.map((x, i) =>
        x.kind === "blank" ? (
          <mark key={i} className="blank">[{x.text}]</mark>
        ) : x.kind === "filled" ? (
          <span key={i} className="filled">{x.text}</span>
        ) : (
          <span key={i}>{x.text}</span>
        )
      )}
    </>
  );
}

export default function PolicyBuilder({ lang }: { lang: Lang }) {
  const s = t(lang).policy;
  const policy = policies[0];
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let saved: Answers = {};
    try {
      saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      const plan = JSON.parse(localStorage.getItem(PLAN_KEY) || "{}");
      if (!saved.profile && plan.profile) saved.profile = plan.profile;
      if (!saved.size && plan.size) saved.size = plan.size;
    } catch {
      /* storage unavailable */
    }
    for (const [id, f] of Object.entries(questions.fields)) {
      if (f.default && !saved[id]) saved[id] = f.default;
    }
    if (!saved.effectiveDate) saved.effectiveDate = new Date().toISOString().slice(0, 10);
    setAnswers(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(answers));
    } catch {
      /* storage unavailable */
    }
  }, [answers, ready]);

  const doc = useMemo(() => render(policy, answers, lang), [policy, answers, lang]);
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

  const downloadWord = () => {
    const html = toWordHtml(doc, lang, s.footer);
    const blob = new Blob(["﻿", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${policy.id}-${lang}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="stack-lg">
      <header className="stack no-print">
        <p className="eyebrow">{s.eyebrow}</p>
        <h1>{policy.title[lang]}</h1>
        <p className="lede">{policy.summary[lang]}</p>
        <p className="muted small">{s.privacy}</p>
      </header>

      <div className="builder">
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
            {current.fields.map((id) => {
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

          <div className="actions">
            <button type="button" className="btn" onClick={downloadWord} disabled={missing.length > 0}>
              {s.word}
            </button>
            <button type="button" className="chip" onClick={() => window.print()} disabled={missing.length > 0}>
              {s.print}
            </button>
            {missing.length > 0 && <p className="muted small">{s.fillFirst}</p>}
          </div>
        </section>

        <article className="paper" aria-label={s.previewLabel}>
          <h1 className="paper-title">{doc.title}</h1>
          <table className="meta">
            <tbody>
              {doc.meta.map((m) => (
                <tr key={m.label}>
                  <th scope="row">{m.label}</th>
                  <td>
                    <Seg s={m.value} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {doc.sections.map((sec, i) => (
            <section key={sec.heading}>
              <h2>
                {i + 1}. {sec.heading}
              </h2>
              {sec.style === "para" ? (
                sec.items.map((it, j) => (
                  <p key={j}>
                    <Seg s={it} />
                  </p>
                ))
              ) : sec.style === "numbered" ? (
                <ol>
                  {sec.items.map((it, j) => (
                    <li key={j}>
                      <Seg s={it} />
                    </li>
                  ))}
                </ol>
              ) : (
                <ul>
                  {sec.items.map((it, j) => (
                    <li key={j}>
                      <Seg s={it} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <p className="sign">
            __________________________
            <br />
            {s.signature}
          </p>
          <p className="paper-foot">{s.footer}</p>
        </article>
      </div>
    </div>
  );
}
