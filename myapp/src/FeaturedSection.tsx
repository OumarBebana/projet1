import type { Article } from "./App";
import type { T, Lang } from "./i18n.ts";

type Props = {
  articles: Article[];
  lang: Lang;
  t: T;
  onArticleClick: (article: Article) => void;
};

export default function FeaturedSection({ articles, lang, t, onArticleClick }: Props) {
  if (articles.length === 0) return null;

  const main = articles[0];
  const rest = articles.slice(1, 5);

  return (
    <section className="bw-featured">
      <div className="bw-featured-header">
        <h2>{t.featured}</h2>
        <span className="bw-featured-count">{articles.length} {lang === "ar" ? "خبر" : "articles"}</span>
      </div>

      <div className="bw-featured-grid">
        {/* Main article */}
        <div
          className="bw-featured-card bw-featured-main"
          onClick={() => onArticleClick(main)}
        >
          <div className="bw-featured-body">
            <span className="bw-featured-source">
              {lang === "ar"
                ? (main.source.name_ar || main.source.name_fr || main.source.name)
                : (main.source.name_fr || main.source.name_ar || main.source.name)}
            </span>
            <h3 className="bw-featured-title">{main.title}</h3>
            {main.summary && <p className="bw-featured-summary">{main.summary}</p>}
            <span className="bw-featured-date">
              {main.published_at
                ? new Date(main.published_at).toLocaleDateString(
                    lang === "ar" ? "ar-MR" : "fr-FR",
                    { year: "numeric", month: "long", day: "numeric" }
                  )
                : ""}
            </span>
          </div>
        </div>

        {/* Side articles */}
        <div className="bw-featured-side">
          {rest.map((article) => (
            <div
              key={article.id}
              className="bw-featured-card"
              onClick={() => onArticleClick(article)}
            >
              <div className="bw-featured-body">
                <span className="bw-featured-source">
                  {lang === "ar"
                    ? (article.source.name_ar || article.source.name_fr || article.source.name)
                    : (article.source.name_fr || article.source.name_ar || article.source.name)}
                </span>
                <h3 className="bw-featured-title">{article.title}</h3>
                <span className="bw-featured-date">
                  {article.published_at
                    ? new Date(article.published_at).toLocaleDateString(
                        lang === "ar" ? "ar-MR" : "fr-FR",
                        { month: "short", day: "numeric" }
                      )
                    : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
