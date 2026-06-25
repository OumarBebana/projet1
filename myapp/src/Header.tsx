import "./Header.css";
import type { T, Lang } from "./i18n.ts";
import MauritaniaLogo from "./MauritaniaLogo.tsx";
import { Sun, Moon, Map } from "lucide-react";

type TickerItem = {
  id: number;
  title: string;
  url?: string;
  source_name?: string;
  is_breaking?: boolean;
};

type Props = {
  isDark: boolean;
  onToggleDark: () => void;
  lang: Lang;
  onToggleLang: () => void;
  t: T;
  tickerTitles: TickerItem[];
  onMapClick: () => void;
  onServicesClick: () => void;
};

export default function Header({
  isDark,
  onToggleDark,
  lang,
  onToggleLang,
  t,
  tickerTitles,
  onMapClick,
  onServicesClick,
}: Props) {
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 640;
  const fallback = t.ticker.map((text, i) => ({ id: i, title: text }));
  const tickerItems: TickerItem[] =
    tickerTitles.length > 0 ? tickerTitles : fallback;
  const doubled = [...tickerItems, ...tickerItems];

  const themeText = isDark
    ? (lang === "ar" ? "وضع مضيء" : "Mode clair")
    : (lang === "ar" ? "وضع داكن" : "Mode sombre");
  const themeIcon = isDark ? <Sun size={15} /> : <Moon size={15} />;

  return (
    <header className="bw-header">
      {/* Flag strip */}
      <div className="bw-header-strip" />

      <div className="bw-header-inner">
        {/* Logo */}
        <div className="bw-header-logo">
          <MauritaniaLogo size={isMobile ? 30 : 46} />
          <div className="bw-header-title">
            <h1>{isMobile ? "BAWABA.MR" : t.title}</h1>
            {!isMobile && <span>{t.subtitle}</span>}
          </div>
        </div>

        {/* Controls */}
        <div className="bw-controls">
          <button
            className="bw-services-btn"
            onClick={onServicesClick}
            title={lang === "ar" ? "الخدمات الرقمية" : "Services numériques"}
          >
            {/* Digital services grid — uses currentColor so it adapts to theme */}
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
              <rect x="1"   y="1"   width="5" height="5" rx="1.2" fill="currentColor" opacity=".9"/>
              <rect x="9"   y="1"   width="5" height="5" rx="1.2" fill="currentColor" opacity=".65"/>
              <rect x="1"   y="9"   width="5" height="5" rx="1.2" fill="currentColor" opacity=".65"/>
              <rect x="9"   y="9"   width="5" height="5" rx="1.2" fill="currentColor" opacity=".4"/>
              <circle cx="11.5" cy="11.5" r="2.8" fill="var(--green)"/>
              <path d="M10.3 11.5l1 1 1.8-1.8" stroke="white" strokeWidth="1.1"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!isMobile && (lang === "ar" ? "الخدمات" : "Services")}
          </button>

          <button
            className="bw-lang-btn"
            onClick={onToggleLang}
            title={lang === "ar" ? "Switch to French" : "التبديل إلى العربية"}
            aria-label="Toggle language"
          >
            {lang === "ar" ? "AR" : "FR"}
          </button>

          <button
            className="bw-theme-btn"
            onClick={onToggleDark}
            title={isDark ? "Light mode" : "Dark mode"}
            aria-label="Toggle theme"
          >
            <span className="bw-theme-icon">{themeIcon}</span>
            {!isMobile && <span className="bw-theme-text">{themeText}</span>}
          </button>

          <button
            className="bw-map-btn"
            onClick={onMapClick}
            title={lang === "ar" ? "خريطة الوزارات" : "Carte des ministères"}
            aria-label="Map"
          >
            <Map size={17} />
          </button>
        </div>
      </div>

      {/* Breaking news ticker bar */}
      {(() => {
        const hasRealBreaking = tickerItems.some(i => i.is_breaking);
        const tickerLabel = hasRealBreaking
          ? (lang === "ar" ? "عاجل" : "URGENT")
          : (lang === "ar" ? "آخر الأخبار" : "Dernières actualités");
        const tickerAriaLabel = lang === "ar"
          ? (hasRealBreaking ? "شريط الأخبار العاجلة" : "شريط آخر الأخبار")
          : (hasRealBreaking ? "Fil d'actualités urgentes" : "Fil des dernières actualités");
        return (
          <div className={`breaking-wrapper${hasRealBreaking ? " breaking-wrapper--urgent" : ""}`}
            aria-live="polite" aria-label={tickerAriaLabel}>
            <div className={`breaking-label${hasRealBreaking ? " breaking-label--urgent" : ""}`}>
              {hasRealBreaking && <span className="breaking-dot" />}
              {tickerLabel}
            </div>
            <div className="breaking-content">
              <div className="breaking-track">
                {doubled.map((item, idx) => (
                  <a
                    key={`${item.id}-${idx}`}
                    href={item.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`breaking-item${item.is_breaking ? " breaking-item--urgent" : ""}`}
                  >
                    {item.source_name ? (
                      <span className="breaking-source">{item.source_name}</span>
                    ) : null}
                    {item.is_breaking ? (
                      <span className="breaking-badge">
                        {lang === "ar" ? "عاجل" : "URGENT"}
                      </span>
                    ) : null}
                    <span>{item.title}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </header>
  );
}
