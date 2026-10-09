import { notFound } from "next/navigation";
import { isLang } from "@/lib/kb";
import PolicyBuilder from "@/components/PolicyBuilder";

export default async function PoliciesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return <PolicyBuilder lang={lang} />;
}
