import Link from "next/link";
import { kb, isLang, type LayerId } from "@/lib/kb";
import { t } from "@/lib/i18n";
import { notFound } from "next/navigation";

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const s = t(lang);
  const counts = (id: LayerId) => kb.items.filter((i) => i.layers.includes(id)).length;
  return (
    <div className="stack-lg">
      <section className="hero">
        <p className="eyebrow">{s.tagline}</p>
        <h1>{s.heroTitle}</h1>
        <p className="lede">{s.heroBody}</p>
        <div className="row">
          <Link className="btn" href={`/${lang}/plan`}>{s.cta}</Link>
          <span className="muted small">{s.free}</span>
        </div>
      </section>

      <section className="stack">
        <h2>{s.how}</h2>
        <ol className="steps">
          {s.howSteps.map(([title, body]) => (
            <li key={title}>
              <b>{title}</b>
              <span>{body}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="stack">
        <h2>{s.layersTitle}</h2>
        <div className="layers">
          {(Object.keys(kb.layers) as LayerId[]).map((id) => (
            <div key={id} className={`layer ${id}`}>
              <b>{kb.layers[id][lang]}</b>
              <span className="num">{counts(id)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="profiles-preview">
        {kb.profiles.map((p) => (
          <Link key={p.id} href={`/${lang}/plan?p=${p.id}`} className="pcard">
            <b>{p.name[lang]}</b>
            <span>{p.short[lang]}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
