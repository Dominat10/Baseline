"use client";

import { useMemo, useState } from "react";
import type { Lang } from "@/lib/kb";
import { t } from "@/lib/i18n";
import { missingFields, policies, render, toWordHtml, type Segment } from "@/lib/policy";
import { useProfile } from "@/lib/useProfile";
import ProfileForm from "./ProfileForm";

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
  const [pIndex, setPIndex] = useState(0);
  const policy = policies[pIndex];
  const { answers, setAnswers } = useProfile();

  const doc = useMemo(() => render(policy, answers, lang), [policy, answers, lang]);
  const missing = missingFields(answers);
  const downloadWord = (all: boolean) => {
    const docs = all ? policies.map((p) => render(p, answers, lang)) : [doc];
    const html = toWordHtml(docs, lang, s.footer, all ? s.allTitle : doc.title);
    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = all ? `baseline-policies-${lang}.doc` : `${policy.id}-${lang}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="stack-lg">
      <header className="stack no-print">
        <p className="eyebrow">{s.eyebrow}</p>
        <h1>{s.heading}</h1>
        <p className="lede">{s.intro}</p>
        <p className="muted small">{s.privacy}</p>
      </header>

      <div className="builder">
        <ProfileForm lang={lang} answers={answers} setAnswers={setAnswers}>
          <div className="actions">
            <button type="button" className="btn" onClick={() => downloadWord(true)} disabled={missing.length > 0}>
              {s.wordAll}
            </button>
            <button type="button" className="chip" onClick={() => downloadWord(false)} disabled={missing.length > 0}>
              {s.word}
            </button>
            <button type="button" className="chip" onClick={() => window.print()} disabled={missing.length > 0}>
              {s.print}
            </button>
            {missing.length > 0 && <p className="muted small">{s.fillFirst}</p>}
          </div>
        </ProfileForm>

        <div className="stack">
        <div className="ptabs no-print" role="tablist" aria-label={s.policiesLabel}>
          {policies.map((p, i) => (
            <button key={p.id} type="button" role="tab" aria-selected={i === pIndex} onClick={() => setPIndex(i)}>
              <span>{i + 1}</span> {p.title[lang]}
            </button>
          ))}
        </div>
        <p className="muted small no-print">{policy.summary[lang]}</p>
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
    </div>
  );
}
