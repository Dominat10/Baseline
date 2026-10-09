import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isLang } from "@/lib/kb";
import ActionPlan from "@/components/ActionPlan";

export default async function PlanPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <Suspense>
      <ActionPlan lang={lang} />
    </Suspense>
  );
}
