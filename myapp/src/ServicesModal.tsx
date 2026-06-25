import { useState } from "react";
import type { Lang } from "./i18n";
import {
  Building2, ShieldCheck, Pill, Flame, Radio,
  Mail, Zap, Landmark, Globe, BellOff,
  FileText, CalendarDays, CreditCard, ClipboardList,
  X, ArrowRight, ArrowLeft,
} from "lucide-react";

interface Props {
  lang: Lang;
  onClose: () => void;
  onMapClick: () => void;
  onNewsletterClick: () => void;
  onEmergencyClick?: () => void;
}

/* ── Feature icon map ───────────────────────────────────────── */
type FeatureKey =
  | "hospital" | "police" | "pharmacy" | "fire" | "signal"
  | "mail" | "zap" | "landmark" | "globe" | "bellOff";

const FEATURE_ICONS: Record<FeatureKey, React.ReactNode> = {
  hospital:  <Building2 size={17} />,
  police:    <ShieldCheck size={17} />,
  pharmacy:  <Pill size={17} />,
  fire:      <Flame size={17} />,
  signal:    <Radio size={17} />,
  mail:      <Mail size={17} />,
  zap:       <Zap size={17} />,
  landmark:  <Landmark size={17} />,
  globe:     <Globe size={17} />,
  bellOff:   <BellOff size={17} />,
};

/* Coming soon icon map */
type ComingKey = "file" | "calendar" | "card" | "clipboard";
const COMING_ICONS: Record<ComingKey, React.ReactNode> = {
  file:      <FileText size={19} />,
  calendar:  <CalendarDays size={19} />,
  card:      <CreditCard size={19} />,
  clipboard: <ClipboardList size={19} />,
};

/* ── SVG Icons ─────────────────────────────────────────────── */
function IconMap() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="22" r="10" stroke="currentColor" strokeWidth="2.5" fill="none"/>
      <circle cx="24" cy="22" r="3.5" fill="currentColor"/>
      <path d="M24 32c0 0 10 8 10 14H14c0-6 10-14 10-14z" fill="currentColor" opacity=".18"/>
      <path d="M24 32c0 0 10 8 10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M24 32c0 0-10 8-10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 38h32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".4"/>
    </svg>
  );
}

function IconNewsletter() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="6" y="12" width="36" height="26" rx="4" stroke="currentColor" strokeWidth="2.5" fill="none"/>
      <path d="M6 18l18 11 18-11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M12 28h8M12 33h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".45"/>
    </svg>
  );
}

function PatternDots({ color }: { color: string }) {
  return (
    <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:.07, pointerEvents:"none" }}
      xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={`dots-${color.replace("#","")}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.8" fill={color}/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#dots-${color.replace("#","")})`}/>
    </svg>
  );
}

/* ── Services data ──────────────────────────────────────────── */
interface Feature { iconKey: FeatureKey; text: string }
interface ComingItem { id: string; iconKey: ComingKey; bg: string; color: string; title: string; desc: string }

const DATA = {
  ar: {
    title: "الخدمات الرقمية",
    subtitle: "بوابة موريتانيا — خدمات حكومية",
    choose: "اختر الخدمة التي تريدها",
    openBtn: "فتح الخدمة",
    comingSoon: "خدمات قريباً",
    soon: "قريباً",
    services: [
      {
        id: "emergency",
        badge: "طوارئ",
        title: "خريطة الطوارئ",
        desc: "اعثر على أقرب مستشفى، مفوضية شرطة، صيدلية مناوبة وحماية مدنية — بأسرع طريق وفي أي وقت.",
        features: [
          { iconKey: "hospital" as FeatureKey, text: "أقرب مستشفى فوراً" },
          { iconKey: "police"   as FeatureKey, text: "أقرب مفوضية شرطة" },
          { iconKey: "pharmacy" as FeatureKey, text: "صيدلية مناوبة ليلاً" },
          { iconKey: "fire"     as FeatureKey, text: "حماية مدنية" },
          { iconKey: "signal"   as FeatureKey, text: "مشاركة موقعك في الطوارئ" },
        ] as Feature[],
        palette: {
          grad1: "#7c2d12", grad2: "#c2410c",
          light: "#fff7ed", accent: "#ea580c",
          badgeBg: "#fed7aa", badgeText: "#9a3412",
          btnFrom: "#c2410c", btnTo: "#ea580c",
        },
      },
      {
        id: "newsletter",
        badge: "جديد",
        title: "النشرة البريدية",
        desc: "اشترك واستقبل أهم الأخبار الحكومية مباشرةً في بريدك حسب اهتماماتك ووزارتك المفضلة.",
        features: [
          { iconKey: "mail"     as FeatureKey, text: "ملخص يومي أو أسبوعي" },
          { iconKey: "zap"      as FeatureKey, text: "تنبيهات فورية للأخبار العاجلة" },
          { iconKey: "landmark" as FeatureKey, text: "تصفية حسب الوزارة" },
          { iconKey: "globe"    as FeatureKey, text: "باللغتين العربية والفرنسية" },
          { iconKey: "bellOff"  as FeatureKey, text: "إلغاء الاشتراك في أي وقت" },
        ] as Feature[],
        palette: {
          grad1: "#14532d", grad2: "#166534",
          light: "#f0fdf4", accent: "#16a34a",
          badgeBg: "#bbf7d0", badgeText: "#14532d",
          btnFrom: "#15803d", btnTo: "#16a34a",
        },
      },
    ],
    coming: [
      { id:"tracking",     iconKey:"file"      as ComingKey, bg:"#eff6ff", color:"#1d4ed8", title:"تتبع الطلبات",    desc:"تتبع حالة وثيقتك أو طلبك الحكومي" },
      { id:"appointments", iconKey:"calendar"  as ComingKey, bg:"#fdf4ff", color:"#9333ea", title:"حجز مواعيد",      desc:"احجز موعدك في الوزارات إلكترونياً" },
      { id:"payments",     iconKey:"card"      as ComingKey, bg:"#fff7ed", color:"#ea580c", title:"الدفع الإلكتروني", desc:"سداد الرسوم والمستحقات الحكومية" },
      { id:"docs",         iconKey:"clipboard" as ComingKey, bg:"#f0fdf4", color:"#15803d", title:"الوثائق الرسمية", desc:"تحميل نماذج الطلبات الرسمية" },
    ] as ComingItem[],
  },
  fr: {
    title: "Services numériques",
    subtitle: "BAWABA.MR — Services gouvernementaux",
    choose: "Choisissez un service",
    openBtn: "Ouvrir",
    comingSoon: "Bientôt disponible",
    soon: "Bientôt",
    services: [
      {
        id: "emergency",
        badge: "Urgences",
        title: "Carte d'urgence",
        desc: "Trouvez l'hôpital, le commissariat, la pharmacie de garde ou la protection civile les plus proches — rapidement.",
        features: [
          { iconKey: "hospital" as FeatureKey, text: "Hôpital le plus proche" },
          { iconKey: "police"   as FeatureKey, text: "Commissariat de police" },
          { iconKey: "pharmacy" as FeatureKey, text: "Pharmacie de garde" },
          { iconKey: "fire"     as FeatureKey, text: "Protection civile" },
          { iconKey: "signal"   as FeatureKey, text: "Partage de position d'urgence" },
        ] as Feature[],
        palette: {
          grad1: "#7c2d12", grad2: "#c2410c",
          light: "#fff7ed", accent: "#ea580c",
          badgeBg: "#fed7aa", badgeText: "#9a3412",
          btnFrom: "#c2410c", btnTo: "#ea580c",
        },
      },
      {
        id: "newsletter",
        badge: "Nouveau",
        title: "Newsletter",
        desc: "Abonnez-vous pour recevoir l'actualité gouvernementale mauritanienne directement dans votre boîte mail.",
        features: [
          { iconKey: "mail"     as FeatureKey, text: "Résumé quotidien ou hebdomadaire" },
          { iconKey: "zap"      as FeatureKey, text: "Alertes urgentes en temps réel" },
          { iconKey: "landmark" as FeatureKey, text: "Filtrage par ministère" },
          { iconKey: "globe"    as FeatureKey, text: "En arabe et en français" },
          { iconKey: "bellOff"  as FeatureKey, text: "Désinscription à tout moment" },
        ] as Feature[],
        palette: {
          grad1: "#14532d", grad2: "#166534",
          light: "#f0fdf4", accent: "#16a34a",
          badgeBg: "#bbf7d0", badgeText: "#14532d",
          btnFrom: "#15803d", btnTo: "#16a34a",
        },
      },
    ],
    coming: [
      { id:"tracking",     iconKey:"file"      as ComingKey, bg:"#eff6ff", color:"#1d4ed8", title:"Suivi des demandes",    desc:"Suivez l'état de votre dossier" },
      { id:"appointments", iconKey:"calendar"  as ComingKey, bg:"#fdf4ff", color:"#9333ea", title:"Prise de rendez-vous",  desc:"Réservez en ligne dans les ministères" },
      { id:"payments",     iconKey:"card"      as ComingKey, bg:"#fff7ed", color:"#ea580c", title:"Paiement en ligne",      desc:"Réglez les frais gouvernementaux" },
      { id:"docs",         iconKey:"clipboard" as ComingKey, bg:"#f0fdf4", color:"#15803d", title:"Documents officiels",   desc:"Téléchargez les formulaires officiels" },
    ] as ComingItem[],
  },
};

export default function ServicesModal({ lang, onClose, onMapClick: _onMapClick, onNewsletterClick, onEmergencyClick }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const isAr = lang === "ar";
  const d = DATA[lang];

  const open = (id: string) => {
    onClose();
    if (id === "emergency") onEmergencyClick?.();
    else if (id === "newsletter") onNewsletterClick();
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} dir={isAr ? "rtl" : "ltr"} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={S.header}>
          <div style={S.headerCircle1} />
          <div style={S.headerCircle2} />
          <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", gap:14 }}>
            <div style={S.headerIconWrap}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="2" y="2" width="10" height="10" rx="2.5" fill="white" opacity=".9"/>
                <rect x="16" y="2" width="10" height="10" rx="2.5" fill="white" opacity=".6"/>
                <rect x="2" y="16" width="10" height="10" rx="2.5" fill="white" opacity=".6"/>
                <rect x="16" y="16" width="10" height="10" rx="2.5" fill="white" opacity=".3"/>
                <circle cx="21" cy="21" r="4" fill="#22c55e"/>
                <path d="M19 21l1.5 1.5L23 19" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div style={S.headerTitle}>{d.title}</div>
              <div style={S.headerSub}>{d.subtitle}</div>
            </div>
          </div>
          <button style={S.closeBtn} onClick={onClose} aria-label="close">
            <X size={14} color="white"/>
          </button>
        </div>

        {/* ── Body ── */}
        <div style={S.body}>
          <p style={S.chooseLabel}>{d.choose}</p>

          {/* ── Main service cards ── */}
          <div style={S.cardsGrid}>
            {d.services.map(svc => {
              const isHov = hovered === svc.id;
              const Icon = svc.id === "emergency" ? IconMap : IconNewsletter;
              return (
                <div
                  key={svc.id}
                  style={{
                    ...S.card,
                    background: svc.palette.light,
                    borderColor: isHov ? svc.palette.accent : "#e5e7eb",
                    transform: isHov ? "translateY(-4px)" : "none",
                    boxShadow: isHov
                      ? `0 12px 32px ${svc.palette.accent}28, 0 2px 8px rgba(0,0,0,.06)`
                      : "0 2px 8px rgba(0,0,0,.05)",
                  }}
                  onMouseEnter={() => setHovered(svc.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* Card top gradient band */}
                  <div style={{
                    ...S.cardBand,
                    background: `linear-gradient(135deg, ${svc.palette.grad1}, ${svc.palette.grad2})`,
                  }}>
                    <PatternDots color="#fff" />
                    <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div style={{ ...S.cardIconCircle, background: "rgba(255,255,255,.18)" }}>
                        <span style={{ color:"white" }}>
                          <Icon />
                        </span>
                      </div>
                      <span style={{ ...S.badge, background: svc.palette.badgeBg, color: svc.palette.badgeText }}>
                        {svc.badge}
                      </span>
                    </div>
                    <div style={S.cardBandTitle}>{svc.title}</div>
                    <div style={S.cardBandDesc}>{svc.desc}</div>
                  </div>

                  {/* Features list */}
                  <div style={S.featuresWrap}>
                    {svc.features.map((f, i) => (
                      <div key={i} style={S.featureRow}>
                        <span style={{ color: svc.palette.accent, flexShrink:0, display:"flex", alignItems:"center" }}>
                          {FEATURE_ICONS[f.iconKey]}
                        </span>
                        <span style={S.featureText}>{f.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div style={S.cardCta}>
                    <button
                      onClick={() => open(svc.id)}
                      style={{
                        ...S.ctaBtn,
                        background: `linear-gradient(135deg, ${svc.palette.btnFrom}, ${svc.palette.btnTo})`,
                        boxShadow: `0 4px 14px ${svc.palette.accent}40`,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      }}
                    >
                      {isAr ? <><ArrowLeft size={15}/> {d.openBtn}</> : <>{d.openBtn} <ArrowRight size={15}/></>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Coming soon ── */}
          <div style={S.dividerRow}>
            <div style={S.divLine} />
            <span style={S.divLabel}>{d.comingSoon}</span>
            <div style={S.divLine} />
          </div>

          <div style={S.comingGrid}>
            {d.coming.map(item => (
              <div key={item.id} style={S.comingCard}>
                <div style={{ ...S.comingIcon, background: item.bg, color: item.color }}>
                  {COMING_ICONS[item.iconKey]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.comingTitle}>
                    {item.title}
                    <span style={S.soonTag}>{d.soon}</span>
                  </div>
                  <div style={S.comingDesc}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Styles ── */
const S: Record<string, React.CSSProperties> = {
  overlay: {
    position:"fixed", inset:0,
    background:"rgba(15,20,30,0.55)",
    backdropFilter:"blur(8px)",
    display:"flex", alignItems:"flex-end", justifyContent:"center",
    zIndex:9000, padding:0,
  },
  modal: {
    background:"#f9fafb",
    borderRadius:"20px 20px 0 0",
    width:"100%", maxWidth:"100%",
    maxHeight:"92vh", overflowY:"auto",
    boxShadow:"0 -8px 40px rgba(0,0,0,0.22)",
    animation:"sv-down .3s cubic-bezier(.2,.8,.4,1)",
  },
  header: {
    background:"linear-gradient(135deg,#052e16,#14532d,#166534)",
    padding:"20px 24px",
    display:"flex", alignItems:"center", justifyContent:"space-between",
    borderRadius:"20px 20px 0 0",
    position:"relative", overflow:"hidden",
  },
  headerCircle1: {
    position:"absolute", width:180, height:180, borderRadius:"50%",
    background:"rgba(255,255,255,.04)", top:-60, right:-40, pointerEvents:"none",
  },
  headerCircle2: {
    position:"absolute", width:120, height:120, borderRadius:"50%",
    background:"rgba(255,255,255,.04)", bottom:-50, left:80, pointerEvents:"none",
  },
  headerIconWrap: {
    width:52, height:52, borderRadius:14,
    background:"rgba(255,255,255,.12)", border:"1.5px solid rgba(255,255,255,.2)",
    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
  },
  headerTitle: { color:"white", fontSize:17, fontWeight:800, letterSpacing:.3 },
  headerSub: { color:"#6ee7b7", fontSize:11.5, marginTop:3, fontWeight:500 },
  closeBtn: {
    width:34, height:34, borderRadius:"50%",
    background:"rgba(255,255,255,.12)", border:"1.5px solid rgba(255,255,255,.2)",
    display:"flex", alignItems:"center", justifyContent:"center",
    cursor:"pointer", flexShrink:0, position:"relative", zIndex:1,
    transition:"background .15s",
  },
  body: { padding:"16px 14px 20px" },
  chooseLabel: { textAlign:"center", fontSize:13, color:"#9ca3af", marginBottom:20, fontWeight:500 },
  cardsGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:14 },
  card: {
    borderRadius:16, border:"2px solid #e5e7eb",
    display:"flex", flexDirection:"column",
    transition:"all .22s cubic-bezier(.2,.8,.4,1)",
    overflow:"hidden",
  },
  cardBand: {
    padding:"20px 20px 16px",
    position:"relative", overflow:"hidden",
  },
  cardIconCircle: {
    width:72, height:72, borderRadius:18,
    display:"flex", alignItems:"center", justifyContent:"center",
    backdropFilter:"blur(4px)",
    marginBottom:14,
  },
  cardBandTitle: { color:"white", fontSize:17, fontWeight:800, marginBottom:7, lineHeight:1.3 },
  cardBandDesc: { color:"rgba(255,255,255,.82)", fontSize:12.5, lineHeight:1.65 },
  badge: {
    fontSize:10.5, padding:"4px 10px", borderRadius:20,
    fontWeight:700, letterSpacing:.4, flexShrink:0,
  },
  featuresWrap: { padding:"14px 18px", flex:1 },
  featureRow: {
    display:"flex", alignItems:"center", gap:10,
    padding:"7px 0", borderBottom:"1px solid #f3f4f6",
  },
  featureText: { fontSize:13, color:"#374151", fontWeight:500, lineHeight:1.4 },
  cardCta: { padding:"14px 18px 18px" },
  ctaBtn: {
    width:"100%", padding:"12px 0", borderRadius:10,
    border:"none", color:"white", fontSize:14, fontWeight:700,
    cursor:"pointer", fontFamily:"inherit",
    transition:"opacity .15s, transform .15s",
    letterSpacing:.3,
  },
  dividerRow: { display:"flex", alignItems:"center", gap:12, margin:"22px 0 14px" },
  divLine: { flex:1, height:1, background:"#e5e7eb" },
  divLabel: { fontSize:11.5, color:"#9ca3af", whiteSpace:"nowrap", fontWeight:600, letterSpacing:.3 },
  comingGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  comingCard: {
    background:"white", border:"1.5px solid #f3f4f6",
    borderRadius:12, padding:"12px 14px",
    display:"flex", alignItems:"center", gap:12,
    opacity:.78, transition:"opacity .15s",
  },
  comingIcon: {
    width:38, height:38, borderRadius:10,
    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
  },
  comingTitle: {
    fontSize:13, fontWeight:700, color:"#1f2937", marginBottom:3,
    display:"flex", alignItems:"center", gap:7,
  },
  soonTag: {
    fontSize:10, padding:"2px 8px", borderRadius:20,
    background:"#f3f4f6", color:"#6b7280", fontWeight:600,
  },
  comingDesc: { fontSize:11.5, color:"#9ca3af", lineHeight:1.5 },
};
