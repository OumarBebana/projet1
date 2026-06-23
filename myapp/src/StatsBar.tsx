import type { T, Lang } from "./i18n.ts";
import type { Article, Source } from "./App";

type Props = {
  totalSources?: number;
  sourcesWithRss?: number;
  todayArticles: number;
  weekArticles: number;
  lastUpdate: Date | null;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  t: T;
  lang?: Lang;
};

function formatRelativeTime(date: Date | null, t: T): string {
  if (!date) return "—";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t.stats.momentsAgo;
  if (diffMin < 60) return `${t.stats.minAgo} ${diffMin} ${t.stats.min}`;
  const diffHour = Math.floor(diffMin / 60);
  return `${t.stats.hourAgo} ${diffHour} ${t.stats.hour}`;
}

function AnimatedNumber({ value }: { value: number }) {
  return <h1 aria-label={String(value)}>{value}</h1>;
}

export default function StatsBar({
  totalSources,
  todayArticles,
  weekArticles,
  lastUpdate,
  isRefreshing,
  onRefresh,
  t,
}: Props) {
  return (
    <div className="stats-bar" role="region" aria-label="Statistics">

      <div className="stat-box">
        <AnimatedNumber value={totalSources ?? 0} />
        <p>{t.stats.ministries}</p>
      </div>

      <div className="stat-box">
        <AnimatedNumber value={todayArticles} />
        <p>{t.stats.today}</p>
      </div>

      <div className="stat-box">
        <AnimatedNumber value={weekArticles} />
        <p>{t.stats.thisWeek ?? "هذا الأسبوع"}</p>
      </div>

      <div className="stat-box">
        <h1 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-muted)" }}>
          {formatRelativeTime(lastUpdate, t)}
        </h1>
        <p>{t.stats.lastUpdate}</p>
      </div>

      <div className="stat-box stat-refresh">
        <button
          id="btn-refresh"
          className={`bw-refresh-btn ${isRefreshing ? "spinning" : ""}`}
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {isRefreshing ? t.refreshing : t.refresh}
        </button>
      </div>

    </div>
  );
}

/* ── Helpers used by App.tsx ── */
export function computeStats(articles: Article[], sources: Source[]) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Rolling 7-day window
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 6);

  const todayArticles = articles.filter(a => {
    if (!a.published_at) return false;
    return new Date(a.published_at) >= todayStart;
  }).length;

  const weekArticles = articles.filter(a => {
    if (!a.published_at) return false;
    return new Date(a.published_at) >= weekStart;
  }).length;

  const latestDate = articles
    .filter(a => a.published_at)
    .map(a => new Date(a.published_at!))
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  const activeSources = sources.filter(s => s.is_active).length;

  return { todayArticles, weekArticles, latestDate, activeSources };
}
