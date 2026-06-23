import { useEffect } from "react";
import type { Article } from "./App";
import type { Lang } from "./i18n";

type Props = {
  article: Article | null;
  onClose: () => void;
  lang?: Lang;
};

function formatDate(dateStr: string | null, lang: Lang = "ar"): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString(lang === "ar" ? "ar-MR" : "fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}


export default function ArticleModal({ article, onClose, lang = "ar" }: Props) {
  useEffect(() => {
    if (!article) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [article, onClose]);

  if (!article) return null;

  const sourceName =
    lang === "ar"
      ? article.source.name_ar || article.source.name_fr || article.source.name
      : article.source.name_fr || article.source.name_ar || article.source.name;


  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="bw-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={article.title}
      onClick={handleOverlayClick}
    >
      <div className="bw-modal">
        {/* Header */}
        <div className="bw-modal-header">
          <p className="bw-modal-title">{article.title}</p>
          <button
            className="bw-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Meta */}
        <div className="bw-modal-meta">
          <span className="bw-modal-source">🏛 {sourceName}</span>
          {article.published_at && (
            <span>📅 {formatDate(article.published_at, lang)}</span>
          )}
        </div>

        {/* Body */}
        <div className="bw-modal-body">
          {/* Article image */}
          {article.image_url && (
            <img
              src={article.image_url}
              alt={article.title}
              className="bw-modal-image"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}

          {/* Summary block */}
          {article.summary && (
            <div className="bw-modal-summary">{article.summary}</div>
          )}

          {/* Full content */}
          {article.content ? (
            <div className="bw-modal-content">
              {article.content.split("\n\n").map((para, i) =>
                para.trim() ? <p key={i}>{para.trim()}</p> : null
              )}
            </div>
          ) : (
            <div className="bw-modal-empty">
              <p>{lang === "ar" ? "لا يوجد محتوى متاح" : "Aucun contenu disponible"}</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>
                {lang === "ar"
                  ? "انقر على رابط المصدر لقراءة المقال كاملاً"
                  : "Cliquez sur le lien source pour lire l'article complet"}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bw-modal-footer">
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer noopener"
            className="bw-modal-external-link"
          >
            {lang === "ar" ? "📖 قراءة المقال كاملاً" : "📖 Lire l'article complet"}
            {lang === "ar" ? " ←" : " →"}
          </a>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {article.source.website_url && (
              <a
                href={article.source.website_url}
                target="_blank"
                rel="noreferrer noopener"
                style={{ color: "var(--text-muted)" }}
              >
                {lang === "ar" ? "الموقع الرسمي" : "Site officiel"}
              </a>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
