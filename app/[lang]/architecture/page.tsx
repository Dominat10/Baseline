import { notFound } from "next/navigation";
import { isLang } from "@/lib/kb";
import Architecture from "@/components/Architecture";

export default async function ArchitecturePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return <Architecture lang={lang} />;
}
