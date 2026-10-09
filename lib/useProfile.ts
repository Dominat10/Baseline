"use client";

import { useEffect, useState } from "react";
import { questions, type Answers } from "./policy";

const KEY = "baseline-profile-v1";
const OLD_POLICY_KEY = "baseline-policy-v1";
const OLD_PLAN_KEY = "baseline-plan-v1";

function read(key: string): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

/**
 * The one company profile every page reads and writes: answer once, use everywhere.
 * Stays in this browser only. Older saved answers are carried over the first time.
 */
export function useProfile(prefill?: Partial<Answers>) {
  const [answers, setAnswers] = useState<Answers>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let saved = read(KEY) as Answers;
    if (!Object.keys(saved).length) {
      saved = { ...(read(OLD_POLICY_KEY) as Answers) };
      const plan = read(OLD_PLAN_KEY) as { profile?: string; size?: string };
      if (!saved.profile && plan.profile) saved.profile = plan.profile;
      if (!saved.size && plan.size) saved.size = plan.size;
    }
    for (const [k, v] of Object.entries(prefill ?? {})) if (v && !saved[k]) saved[k] = v;
    for (const [id, f] of Object.entries(questions.fields)) if (f.default && !saved[id]) saved[id] = f.default;
    if (!saved.effectiveDate) saved.effectiveDate = new Date().toISOString().slice(0, 10);
    setAnswers(saved);
    setReady(true);
    // prefill is read once on load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(answers));
    } catch {
      /* storage unavailable: everything still works for this visit */
    }
  }, [answers, ready]);

  return { answers, setAnswers, ready };
}

/** Per-task "done" ticks, kept separately from the profile. */
export function useDone() {
  const KEY_DONE = "baseline-actions-v1";
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setDone(read(KEY_DONE) as Record<string, boolean>);
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY_DONE, JSON.stringify(done));
    } catch {
      /* storage unavailable */
    }
  }, [done, ready]);
  return { done, setDone };
}
