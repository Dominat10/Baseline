import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LANGS, isLang } from "@/lib/kb";
import { t } from "@/lib/i18n";
import "../globals.css";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const s = t(lang);
  return { title: `${s.brand} · ${s.brandAr}`, description: s.tagline };
}

export default async function LangLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const s = t(lang);
  const other = lang === "ar" ? "en" : "ar";
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=Noto+Kufi+Arabic:wght@600;700&display=swap"
        />
      </head>
      <body>
        <header className="topbar no-print">
          <Link href={`/${lang}`} className="logo">
            <span className="mark" aria-hidden="true" />
            {s.brand} <span className="logo-ar">· {s.brandAr}</span>
          </Link>
          <nav className="nav">
            <Link href={`/${lang}/plan`}>{s.nav.plan}</Link>
            <Link href={`/${lang}/solutions`}>{s.nav.solutions}</Link>
            <Link href={`/${lang}/policies`}>{s.nav.policies}</Link>
            <Link href={`/${other}`} className="lang" hrefLang={other}>
              {s.switchLang}
            </Link>
          </nav>
        </header>
        <main className="wrap">{children}</main>
        <footer className="footer no-print">{s.footer}</footer>
      </body>
    </html>
  );
}
