import { useState, useMemo } from "react";
import type { SourceWithArticles, Article } from "./App";
import type { T, Lang } from "./i18n";
import MauritaniaLogo from "./MauritaniaLogo";

type Props = {
  sourcesWithArticles: SourceWithArticles[];
  loading: boolean;
  error: string;
  lang: Lang;
  t: T;
  onArticleClick: (article: Article) => void;
};

/* ── Category filter config ── */
const CATEGORIES = [
  { key: "",           keys: [],                                                        slugs: [],                                                                                                                              arLabel: "الكل",             frLabel: "Tous"                         },
  { key: "government", keys: ["government", "justice", "foreign_affairs"],              slugs: ["presidence","primature","sgg","interieur","affaires-etrangeres","justice","fonction-publique","affaires-islamiques","defense"], arLabel: "الحكومة والسياسة", frLabel: "Gouvernement & Politique"     },
  { key: "economy",    keys: ["economy", "energy"],                                     slugs: ["economie-finances","commerce-tourisme","domaines","mines-industrie","energies-petrole","numerique"],                           arLabel: "الاقتصاد والمالية",frLabel: "Économie & Finances"          },
  { key: "edu_health", keys: ["education", "health", "social"],                         slugs: ["education","enseignement-superieur","jeunesse-sports","formation-professionnelle","sante","masef","culture"],                 arLabel: "التعليم والصحة",   frLabel: "Éducation & Santé"            },
  { key: "env_dev",    keys: ["environment", "agriculture", "transport"],               slugs: ["agriculture","elevage","peches","environnement","hydraulique","transports","habitat"],                                         arLabel: "البيئة والتنمية",  frLabel: "Environnement & Développement"},
  { key: "defense",    keys: ["security"],                                               slugs: ["interieur","defense"],                                                                                                         arLabel: "الدفاع والأمن",    frLabel: "Défense & Sécurité"           },
];

/* ── Derive a accent color per source slug ── */
function sourceColor(slug: string): string {
  const map: Record<string, string> = {
    presidence:        "#065f46",
    primature:         "#1e3a5f",
    sgg:               "#374151",
    interieur:         "#1d4ed8",
    "affaires-etrangeres": "#0f766e",
    defense:           "#374151",
    justice:           "#92400e",
    "affaires-islamiques": "#78350f",
    "fonction-publique": "#4c1d95",
    "economie-finances": "#b45309",
    "commerce-tourisme": "#d97706",
    domaines:          "#b45309",
    "mines-industrie": "#6b7280",
    "energies-petrole": "#ca8a04",
    numerique:         "#1d4ed8",
    education:         "#7c3aed",
    "enseignement-superieur": "#6d28d9",
    sante:             "#dc2626",
    masef:             "#be123c",
    culture:           "#9333ea",
    "jeunesse-sports": "#0891b2",
    agriculture:       "#65a30d",
    elevage:           "#65a30d",
    peches:            "#0369a1",
    environnement:     "#16a34a",
    hydraulique:       "#0284c7",
    transports:        "#0891b2",
    habitat:           "#a16207",
  };
  return map[slug] || "#0d6b3c";
}

function formatDate(dateStr: string | null, lang: Lang): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString(lang === "ar" ? "ar-MR" : "fr-FR", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return ""; }
}

/* ── Skeleton ── */
function SkeletonCard() {
  return (
    <div className="mc-card">
      <div className="mc-header mc-header-skeleton">
        <div className="mc-sk-circle" />
        <div className="mc-sk-line" style={{ width: "60%", height: 14 }} />
      </div>
      <div className="mc-body">
        {[90, 75, 85, 70, 80].map((w, i) => (
          <div key={i} className="mc-sk-line" style={{ width: `${w}%`, height: 13, marginBottom: 14 }} />
        ))}
      </div>
    </div>
  );
}

/* ── Main ── */
export default function NewsFeed({ sourcesWithArticles, loading, error, lang, t, onArticleClick }: Props) {
  const isAr = lang === "ar";
  const [activeCategory, setActiveCategory] = useState("");

  const activeCat = useMemo(() =>
    CATEGORIES.find(c => c.key === activeCategory) ?? null,
    [activeCategory]
  );

  const filtered = useMemo(() => {
    const catActive = !!activeCat && activeCat.key !== "";
    return sourcesWithArticles
      .map(({ source, articles }) => {
        if (catActive && !activeCat.slugs.includes(source.slug)) return null;
        let arts = articles;
        if (catActive && activeCat.keys.length > 0)
          arts = arts.filter(a => activeCat.keys.includes(a.category));
        return { source, articles: arts };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [sourcesWithArticles, activeCat]);

  if (error) return <p className="bw-error">⚠️ {error}</p>;

  if (loading) return (
    <section className="bw-news-section">
      <div className="mc-grid">
        {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </section>
  );

  if (sourcesWithArticles.length === 0)
    return <p className="bw-empty">📰 {t.empty}</p>;

  return (
    <section className="bw-news-section">

      {/* ── Category filter strip ── */}
      <div className="nf-cat-strip" style={{ marginBottom: 28 }}>
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            className={`nf-cat-pill${activeCategory === c.key ? " nf-cat-active" : ""}`}
          >
            {isAr ? c.arLabel : c.frLabel}
          </button>
        ))}
      </div>

      {/* ── Cards grid ── */}
      <div className="mc-grid">
        {filtered.map(({ source, articles }) => {
          const name    = isAr
            ? (source.name_ar || source.name_fr || source.name)
            : (source.name_fr || source.name_ar || source.name);
          const color   = sourceColor(source.slug);
          const targetLang = isAr ? "ar" : "fr";
          const langFiltered = articles.filter(a => a.language === targetLang);
          // Fallback: show other-language articles only when NO articles in the target language exist
          const top5 = (langFiltered.length > 0 ? langFiltered : articles).slice(0, 5);
          const isFallback = top5.length > 0 && top5.every(a => a.language !== targetLang);

          return (
            <article key={source.id} className="mc-card">

              {/* ── Header ── */}
              <div className="mc-header" style={{ background: `linear-gradient(135deg, ${color}f0, ${color})` }}>
                <div className="mc-logo">
                  <MauritaniaLogo size={26} />
                </div>
                <div className="mc-header-text">
                  <div className="mc-ministry-name" title={name}>{name}</div>
                  <div className="mc-article-count">
                    {articles.length} {isAr ? "خبر" : "article"}
                    {isFallback && (
                      <span style={{ marginInlineStart: 6, fontSize: 10, opacity: 0.8, fontWeight: 600 }}>
                        ({isAr ? "FR" : "AR"})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── News list ── */}
              <div className="mc-body">
                {top5.length === 0 ? (
                  <div className="mc-empty">
                    <span style={{ fontSize: 28 }}>📭</span>
                    <span>{isAr ? "لا توجد أخبار حالياً" : "Aucune actualité"}</span>
                  </div>
                ) : top5.map((a, idx) => (
                  <div
                    key={a.id}
                    className={`mc-item${idx === top5.length - 1 ? " mc-item-last" : ""}`}
                    style={{ borderInlineStart: `2.5px solid ${color}` }}
                  >
                    <button
                      className="mc-title"
                      onClick={() => onArticleClick(a)}
                      title={a.title}
                    >
                      {a.title}
                    </button>
                    {a.published_at && (
                      <div className="mc-date">
                        🕐 {formatDate(a.published_at, lang)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Footer ── */}
              <div className="mc-footer">
                <button
                  className="mc-footer-btn mc-all-news"
                  style={{ color: color, borderColor: color + "33", background: color + "0d" }}
                  onClick={() => {
                    if (top5[0]) onArticleClick(top5[0]);
                  }}
                >
                  {isAr ? "كل الأخبار" : "Toutes les actualités"} →
                </button>

                {source.website_url && (
                  <a
                    href={source.website_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mc-footer-btn mc-official"
                  >
                    🌐 {isAr ? "الموقع الرسمي" : "Site officiel"}
                  </a>
                )}
              </div>

            </article>
          );
        })}
      </div>

    </section>
  );
}
