"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Lang } from "@/lib/kb";
import { t } from "@/lib/i18n";
import { missingFields, questions, valueOf } from "@/lib/policy";
import { buildCalendar, buildPlan, library, providerRequest, type PlannedAction } from "@/lib/actions";
import { buildSolutions } from "@/lib/solutions";
import { useDone, useProfile } from "@/lib/useProfile";
import ProfileForm from "./ProfileForm";

const VALID_PROFILES = ["dev", "product", "supplier", "shop"];

function fmt(iso: string, lang: Lang) {
  return new Date(iso + "T00:00:00").toLocaleDateString(lang === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function download(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Task({
  p,
  lang,
  done,
  toggle,
  company,
  sols
}: {
  p: PlannedAction;
  lang: Lang;
  done: boolean;
  toggle: () => void;
  company: string;
  sols: { name: string; status: string }[];
}) {
  const s = t(lang).actions;
  const [copied, setCopied] = useState(false);
  const x = p.action;
  const copy = async () => {
    const text = providerRequest(p, company, lang);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(s.copyRequest, text);
    }
  };
  return (
    <li className={`task${done ? " checked" : ""}`}>
      <div className="task-head">
        <input type="checkbox" id={`t-${x.id}`} checked={done} disabled={p.alreadyInPlace} onChange={toggle} />
        <label htmlFor={`t-${x.id}`}>{x.title[lang]}</label>
      </div>
      <div className="task-meta">
        {p.alreadyInPlace ? (
          <span className="pill ok">{s.inPlace} ✓</span>
        ) : (
          <span className={`pill due p${p.phase}`}>
            {s.due}: {fmt(p.due, lang)}
          </span>
        )}
        <span className="pill">
          {s.owner}: {p.owner.viaProvider ? s.viaProvider : p.owner.name || "—"}
        </span>
        <span className="pill">{library.effort[x.effort]?.[lang]}</span>
        <span className={`pill cost-${x.cost}`}>{library.cost[x.cost][lang]}</span>
      </div>
      <p className="task-why">{x.why[lang]}</p>
      <details>
        <summary>
          {s.how} · {s.evidence}
        </summary>
        <div className="task-body">
          {p.how.map((h) => (
            <div key={h.platform}>
              <b className="small">{s.platform[h.platform]}</b>
              <ol>
                {h.steps.map((st) => (
                  <li key={st}>{st}</li>
                ))}
              </ol>
            </div>
          ))}
          <p className="small">
            <b>{s.evidence}:</b> {x.evidence[lang]}
          </p>
          {sols.length > 0 && (
            <p className="small">
              <b>{t(lang).solutions.solution}:</b>{" "}
              {sols.map((o, i) => (
                <span key={o.name}>
                  {i > 0 && " · "}
                  <Link href={`/${lang}/solutions`}>{o.name}</Link> ({t(lang).solutions.status[o.status]})
                </span>
              ))}
            </p>
          )}
          <div className="tags">
            <span className="tag biz">
              {s.policy}: {p.policyTitle}
            </span>
            {p.domains.map((d) => (
              <span key={d} className="tag nca">
                {s.domain}: {d}
              </span>
            ))}
          </div>
          {p.owner.viaProvider && !p.alreadyInPlace && (
            <button type="button" className="chip" onClick={copy}>
              {copied ? s.copied : s.copyRequest}
            </button>
          )}
        </div>
      </details>
    </li>
  );
}

export default function ActionPlan({ lang }: { lang: Lang }) {
  const s = t(lang).actions;
  const search = useSearchParams();
  const fromUrl = search.get("p");
  const { answers, setAnswers, ready } = useProfile(
    fromUrl && VALID_PROFILES.includes(fromUrl) ? { profile: fromUrl } : undefined
  );
  const { done, setDone } = useDone();
  const plan = useMemo(() => buildPlan(answers, lang), [answers, lang]);
  const missing = missingFields(answers);
  const basicsKnown = !!answers.profile && !!answers.size;
  const company = valueOf("companyName", answers, lang) ?? "";
  const isDone = (p: PlannedAction) => p.alreadyInPlace || !!done[p.action.id];
  const doneCount = plan.filter(isDone).length;
  const cal = useMemo(() => buildCalendar(answers, lang, company), [answers, lang, company]);
  const solsByAction = useMemo(() => {
    const m: Record<string, { name: string; status: string }[]> = {};
    for (const x of buildSolutions(answers, plan, lang))
      for (const a of x.actions) (m[a.action.id] ??= []).push({ name: x.category.name[lang], status: x.status });
    return m;
  }, [answers, plan, lang]);

  return (
    <div className="stack-lg">
      <header className="stack">
        <p className="eyebrow">{s.eyebrow}</p>
        <h1>{s.heading}</h1>
        <p className="lede">{s.intro}</p>
      </header>

      <div className="builder">
        <div className="stack">
          <span className="step">{s.editProfile}</span>
          <ProfileForm lang={lang} answers={answers} setAnswers={setAnswers}>
            <div className="actions">
              <Link className="chip" href={`/${lang}/policies`}>
                {s.policiesLink}
              </Link>
            </div>
          </ProfileForm>
        </div>

        <div className="stack">
          {!ready ? null : !basicsKnown ? (
            <p className="note-box">{s.needProfile}</p>
          ) : (
            <>
              <div className="summary-bar">
                <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={plan.length} aria-valuenow={doneCount}>
                  <span style={{ width: `${plan.length ? (doneCount / plan.length) * 100 : 0}%` }} />
                </div>
                <b>{s.progress(doneCount, plan.length)}</b>
                {missing.length > 0 && <span className="muted small">{t(lang).policy.left(missing.length)}</span>}
              </div>

              <div className="calendar-box">
                <div className="stack" style={{ gap: 4 }}>
                  <b>{s.calendar}</b>
                  <span className="muted small">{s.calendarHelp}</span>
                  <ul className="cal-list small">
                    {cal.events.map((e) => (
                      <li key={e.title}>
                        {e.title}: {s.every(e.months)}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  className="btn"
                  disabled={!answers.effectiveDate}
                  onClick={() => download(`baseline-security-calendar-${lang}.ics`, "text/calendar;charset=utf-8", cal.ics)}
                >
                  {s.calendar} (.ics)
                </button>
              </div>

              {([1, 2, 3] as const).map((ph) => {
                const items = plan.filter((p) => p.phase === ph);
                if (!items.length) return null;
                return (
                  <section key={ph} className="stack">
                    <h2 className="phase-title">
                      <span className={`dot p${ph}`} aria-hidden="true" />
                      {s.phaseTitle[ph]}
                      <span className="muted small">
                        {" "}
                        · {items.filter(isDone).length}/{items.length}
                      </span>
                    </h2>
                    <ul className="tasks">
                      {items.map((p) => (
                        <Task
                          key={p.action.id}
                          p={p}
                          lang={lang}
                          company={company}
                          sols={solsByAction[p.action.id] ?? []}
                          done={isDone(p)}
                          toggle={() => setDone((d) => ({ ...d, [p.action.id]: !d[p.action.id] }))}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })}
              <p className="fine">
                {t(lang).disclaimer} · {questions.version}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
