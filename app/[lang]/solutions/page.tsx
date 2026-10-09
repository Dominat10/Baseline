import { notFound } from "next/navigation";
import { isLang } from "@/lib/kb";
import SolutionsPlan from "@/components/SolutionsPlan";

export default async function SolutionsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return <SolutionsPlan lang={lang} />;
}
