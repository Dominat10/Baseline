import { Suspense } from "react";
import { notFound } from "next/navigation";
import { kb, isLang } from "@/lib/kb";
import PlanBuilder from "@/components/PlanBuilder";

export default async function PlanPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <Suspense>
      <PlanBuilder lang={lang} kb={kb} />
    </Suspense>
  );
}
