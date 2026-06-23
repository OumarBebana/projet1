import Header from "./Header";
import NewsFeed from "./NewsFeed";
import NewsletterSubscribe from "./NewsletterSubscribe";
import GovernmentMap from "./GovernmentMap";
import EmergencyMap from "./EmergencyMap";
import StatsBar, { computeStats } from "./StatsBar";
import ArticleModal from "./ArticleModal";
import ServicesModal from "./ServicesModal";
import { useState, useEffect, useCallback, Component, type ReactNode } from "react";
import { translations, type T, type Lang } from "./i18n";
import "./App.css";

/* ── Error Boundary — prevents full white page on crash ── */
class MapErrorBoundary extends Component<{children:ReactNode;onReset:()=>void},{err:boolean;msg:string}> {
  state={err:false,msg:""};
  static getDerivedStateFromError(e:any){return {err:true,msg:String(e?.message||e||"unknown")};}
  componentDidCatch(e:any,info:any){console.error("[MapErrorBoundary]",e,info?.componentStack);}
  render(){
    if (this.state.err) return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60vh",gap:16,fontFamily:"Cairo,sans-serif",direction:"rtl",padding:20}}>
        <div style={{fontSize:48}}>⚠️</div>
        <div style={{fontWeight:900,fontSize:18,color:"#dc2626"}}>حدث خطأ في الخريطة</div>
        <div style={{fontSize:12,color:"#888",background:"#f5f5f5",borderRadius:8,padding:"8px 14px",maxWidth:400,wordBreak:"break-all",direction:"ltr",textAlign:"left"}}>{this.state.msg}</div>
        <button onClick={()=>{this.setState({err:false,msg:""});this.props.onReset();}} style={{padding:"10px 24px",background:"#0d6b3c",color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
          🔄 إعادة المحاولة
        </button>
      </div>
    );
    return this.props.children;
  }
}

const API_BASE = "/api";

export type Source = {
  id: number;
  name: string;
  name_fr: string;
  name_ar: string;
  slug: string;
  website_url: string;
  logo_url: string;
  is_active: boolean;
  sort_order: number;
  last_fetched_at: string | null;
};

export type Article = {
  id: number;
  title: string;
  url: string;
  summary: string;
  content: string;
  image_url: string;
  published_at: string | null;
  language: string;
  category: string;
  is_breaking: boolean;
  created_at: string;
  source: Source;
};

export type SourceWithArticles = {
  source: Source;
  articles: Article[];
};

function App() {
  const [showMap, setShowMap] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [breakingNews, setBreakingNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<Lang>("ar");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showNewsletter, setShowNewsletter] = useState(false);
  const [showServices, setShowServices]     = useState(false);
  const [apiStats, setApiStats] = useState<{
    today: number; thisWeek: number;
    sourcesActive: number; latestPublished: Date | null;
  } | null>(null);

  const t: T = translations[language];

  const loadArticles = useCallback((lang: Lang) => {
    const otherLang: Lang = lang === "ar" ? "fr" : "ar";
    return Promise.all([
      fetch(`${API_BASE}/articles/?per_source=5&lang=${lang}`).then((r) => r.json()),
      fetch(`${API_BASE}/articles/?per_source=5&lang=${otherLang}`).then((r) => r.json()),
      fetch(`${API_BASE}/sources/`).then((r) => r.json()),
      fetch(`${API_BASE}/breaking/?lang=${lang}`).then((r) => r.json()).catch(() => ({ results: [] })),
      fetch(`${API_BASE}/latest-titles/?n=15&lang=${lang}`).then((r) => r.json()).catch(() => []),
      // Real stats from DB (today/week counts by published_at)
      fetch(`${API_BASE}/stats/`).then((r) => r.json()).catch(() => null),
    ]).then(([primaryArts, fallbackArts, srcs, breaking, latestTitles, stats]) => {
      const primary: Article[] = primaryArts.results || primaryArts || [];
      const fallback: Article[] = fallbackArts.results || fallbackArts || [];

      const primarySlugs = new Set(primary.map((a) => a.source?.slug));
      const merged = [
        ...primary,
        ...fallback.filter((a) => !primarySlugs.has(a.source?.slug)),
      ];

      setArticles(merged);
      setSources(srcs.results || srcs || []);

      const breakingItems = breaking.results || breaking || [];
      const latestItems = latestTitles.results || latestTitles || [];
      setBreakingNews(breakingItems.length > 0 ? breakingItems : latestItems);

      // Store real stats from API
      if (stats?.articles) {
        setApiStats({
          today:         stats.articles.today     ?? 0,
          thisWeek:      stats.articles.this_week ?? 0,
          sourcesActive: stats.sources?.active    ?? 0,
          latestPublished: stats.latest_published ? new Date(stats.latest_published) : null,
        });
      }
    });
  }, []);

  const fetchData = useCallback((lang?: Lang) => {
    const currentLang = lang || language;
    setLoading(true);
    setError("");
    loadArticles(currentLang)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [language, loadArticles]);

  useEffect(() => {
    fetchData(language);
    const interval = setInterval(() => fetchData(language), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [language]);

  const handleRefreshFromSites = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await fetch(`${API_BASE}/fetch-now/`, { method: "POST" });
      await loadArticles(language);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [language, loadArticles]);

  const toggleMap = () => setShowMap((v) => !v);
  const toggleDark = () => setIsDark((v) => !v);
  const toggleLang = () => setLanguage((v) => (v === "ar" ? "fr" : "ar"));

  const articlesBySource: SourceWithArticles[] = sources.map((src) => ({
    source: src,
    articles: articles.filter((a) => a.source?.slug === src.slug),
  }));

  return (
    <div className="app" dir={language === "ar" ? "rtl" : "ltr"} data-theme={isDark ? "dark" : "light"}>
      <Header
        isDark={isDark}
        onToggleDark={toggleDark}
        lang={language}
        onToggleLang={toggleLang}
        t={t}
        tickerTitles={breakingNews}
        onMapClick={toggleMap}
        onServicesClick={() => setShowServices(true)}
      />

      <main className="main-content">
        {showEmergency ? (
          <MapErrorBoundary onReset={() => setShowEmergency(false)}>
            <EmergencyMap lang={language} onBack={() => setShowEmergency(false)} />
          </MapErrorBoundary>
        ) : showMap ? (
          <MapErrorBoundary onReset={toggleMap}>
            <GovernmentMap lang={language} onBack={toggleMap} />
          </MapErrorBoundary>
        ) : (
          <>
            <StatsBar
              totalSources={apiStats?.sourcesActive ?? sources.filter(s => s.is_active).length}
              todayArticles={apiStats?.today ?? computeStats(articles, sources).todayArticles}
              weekArticles={apiStats?.thisWeek ?? computeStats(articles, sources).weekArticles}
              lastUpdate={apiStats?.latestPublished ?? computeStats(articles, sources).latestDate}
              isRefreshing={loading}
              onRefresh={handleRefreshFromSites}
              t={t}
              lang={language}
            />
            <NewsFeed
              sourcesWithArticles={articlesBySource}
              loading={loading}
              error={error}
              lang={language}
              t={t}
              onArticleClick={setSelectedArticle}
            />
          </>
        )}
      </main>

      <ArticleModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
        lang={language}
      />

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-content">
          <p className="footer-title">
            <strong>BAWABA.MR</strong> -{" "}
            {language === "ar"
              ? "بوابة الأخبار الحكومية الموريتانية"
              : "Portail d'actualités gouvernementales mauritaniennes"}
          </p>
          <p className="footer-description">
            {language === "ar"
              ? "جميع المعلومات مصدرها المواقع الرسمية للوزارات والمؤسسات الحكومية"
              : "Toutes les informations proviennent des sites officiels des ministères et institutions gouvernementales"}
          </p>
          <p className="footer-copyright">
            © {new Date().getFullYear()} BAWABA.MR -{" "}
            {language === "ar" ? "جميع الحقوق محفوظة." : "Tous droits réservés."}
          </p>
        </div>
      </footer>

      {/* Services Modal */}
      {showServices && (
        <ServicesModal
          lang={language}
          onClose={() => setShowServices(false)}
          onMapClick={() => { setShowServices(false); toggleMap(); }}
          onNewsletterClick={() => { setShowServices(false); setShowNewsletter(true); }}
          onEmergencyClick={() => { setShowServices(false); setShowEmergency(true); }}
        />
      )}

      {/* Newsletter Modal */}
      {showNewsletter && (
        <NewsletterSubscribe
          defaultLang={language}
          onClose={() => setShowNewsletter(false)}
          onSuccess={({ topics, frequency, email, lang }) => {
            console.log("اشتراك جديد:", { topics, frequency, email, lang });
          }}
        />
      )}
    </div>
  );
}

export default App;
