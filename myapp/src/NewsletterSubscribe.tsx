import { useState, useCallback, useRef } from "react";
import { API_BASE } from "./config";
import {
  CalendarDays, CalendarRange, CheckCircle2, UserMinus,
  ArrowLeft, ArrowRight, PartyPopper,
  Newspaper, Landmark, Banknote, GraduationCap,
  Building2, Shield, Car, Zap, Wheat, Leaf, Scale, Globe,
  Check, ChevronLeft, ChevronRight,
} from "lucide-react";

type Frequency = "daily" | "weekly";
type Lang = "ar" | "fr";
type Step = "form" | "topics" | "success" | "already" | "unsubscribed";

interface SuccessPayload {
  email: string;
  topics: string[];
  frequency: Frequency;
  lang: Lang;
}

interface Props {
  onClose: () => void;
  onSuccess: (payload: SuccessPayload) => void;
  defaultLang?: Lang;
}

/* ── Translations ───────────────────────────────────────── */
const TX = {
  ar: {
    title: "النشرة البريدية",
    sub: "أخبار بوابة موريتانيا مباشرة إلى بريدك",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "example@email.com",
    freqLabel: "تكرار الإرسال",
    daily: "يومي", weekly: "أسبوعي",
    next: "التالي — اختر اهتماماتك",
    back: "رجوع",
    chooseTopics: "اختر موضوعاً أو أكثر",
    confirmSub: "تأكيد الاشتراك",
    subscribing: "جاري الاشتراك…",
    successTitle: "تم الاشتراك بنجاح!",
    successMsg: (email: string, freq: string) =>
      `ستصلك النشرة على ${email} بتكرار ${freq}`,
    close: "إغلاق",
    alreadyTitle: "أنت مشترك بالفعل",
    alreadyMsg: (email: string) =>
      `البريد ${email} مشترك في النشرة البريدية.`,
    unsubBtn: "إلغاء الاشتراك",
    unsubConfirmTitle: "تأكيد الإلغاء",
    unsubConfirmMsg: "هل أنت متأكد من إلغاء الاشتراك؟",
    unsubConfirmYes: "نعم، إلغاء",
    unsubConfirmNo: "لا، إبقاء",
    unsubbing: "جاري الإلغاء…",
    unsubDoneTitle: "تم إلغاء الاشتراك",
    unsubDoneMsg: (email: string) =>
      `تم إلغاء اشتراك ${email} بنجاح. لن تصلك رسائل بعد الآن.`,
    notSubTitle: "لست مشتركاً",
    notSubMsg: (email: string) =>
      `البريد ${email} غير مشترك في النشرة البريدية.`,
    subscribeNow: "اشترك الآن",
    errSelectTopic: "اختر موضوعاً واحداً على الأقل",
    errServer: "تعذر الاتصال بالخادم",
  },
  fr: {
    title: "Newsletter",
    sub: "Actualités de BAWABA.MR dans votre boîte mail",
    emailLabel: "Adresse e-mail",
    emailPlaceholder: "example@email.com",
    freqLabel: "Fréquence d'envoi",
    daily: "Quotidien", weekly: "Hebdomadaire",
    next: "Suivant — Choisir les sujets",
    back: "Retour",
    chooseTopics: "Choisissez un ou plusieurs sujets",
    confirmSub: "Confirmer l'abonnement",
    subscribing: "Abonnement en cours…",
    successTitle: "Abonnement confirmé !",
    successMsg: (email: string, freq: string) =>
      `Vous recevrez la newsletter à ${email} en mode ${freq}`,
    close: "Fermer",
    alreadyTitle: "Vous êtes déjà abonné",
    alreadyMsg: (email: string) =>
      `L'adresse ${email} est déjà abonnée à la newsletter.`,
    unsubBtn: "Se désabonner",
    unsubConfirmTitle: "Confirmer le désabonnement",
    unsubConfirmMsg: "Voulez-vous vraiment vous désabonner ?",
    unsubConfirmYes: "Oui, désabonner",
    unsubConfirmNo: "Non, garder",
    unsubbing: "Désabonnement en cours…",
    unsubDoneTitle: "Désabonnement effectué",
    unsubDoneMsg: (email: string) =>
      `L'adresse ${email} a été désabonnée avec succès.`,
    notSubTitle: "Non abonné",
    notSubMsg: (email: string) =>
      `L'adresse ${email} n'est pas abonnée à la newsletter.`,
    subscribeNow: "S'abonner",
    errSelectTopic: "Choisissez au moins un sujet",
    errServer: "Impossible de contacter le serveur",
  },
};

/* ── Topic icon map ─────────────────────────────────────── */
type TopicIconKey =
  | "all" | "government" | "economy" | "education"
  | "health" | "security" | "transport" | "energy"
  | "agriculture" | "environment" | "justice" | "foreign_affairs";

const TOPIC_ICONS: Record<TopicIconKey, React.ReactNode> = {
  all:            <Newspaper size={22} />,
  government:     <Landmark size={22} />,
  economy:        <Banknote size={22} />,
  education:      <GraduationCap size={22} />,
  health:         <Building2 size={22} />,
  security:       <Shield size={22} />,
  transport:      <Car size={22} />,
  energy:         <Zap size={22} />,
  agriculture:    <Wheat size={22} />,
  environment:    <Leaf size={22} />,
  justice:        <Scale size={22} />,
  foreign_affairs:<Globe size={22} />,
};

/* ── Topics ─────────────────────────────────────────────── */
interface Topic { id: TopicIconKey; label: string; color: string }

const TOPICS_AR: Topic[] = [
  { id:"all",             label:"كل الأخبار",           color:"#0d6b3c" },
  { id:"government",      label:"الحكومة والسياسة",      color:"#1d4ed8" },
  { id:"economy",         label:"الاقتصاد والمالية",     color:"#d97706" },
  { id:"education",       label:"التعليم",               color:"#7c3aed" },
  { id:"health",          label:"الصحة",                 color:"#dc2626" },
  { id:"security",        label:"الدفاع والأمن",         color:"#374151" },
  { id:"transport",       label:"النقل والمواصلات",      color:"#0891b2" },
  { id:"energy",          label:"الطاقة والبترول",       color:"#ca8a04" },
  { id:"agriculture",     label:"الزراعة والصيد",        color:"#65a30d" },
  { id:"environment",     label:"البيئة والمناخ",        color:"#16a34a" },
  { id:"justice",         label:"العدل والقضاء",         color:"#b45309" },
  { id:"foreign_affairs", label:"الشؤون الخارجية",      color:"#0f766e" },
];

const TOPICS_FR: Topic[] = [
  { id:"all",             label:"Toutes les actualités", color:"#0d6b3c" },
  { id:"government",      label:"Gouvernement",          color:"#1d4ed8" },
  { id:"economy",         label:"Économie & Finances",   color:"#d97706" },
  { id:"education",       label:"Éducation",             color:"#7c3aed" },
  { id:"health",          label:"Santé",                 color:"#dc2626" },
  { id:"security",        label:"Défense & Sécurité",    color:"#374151" },
  { id:"transport",       label:"Transport",             color:"#0891b2" },
  { id:"energy",          label:"Énergie & Pétrole",     color:"#ca8a04" },
  { id:"agriculture",     label:"Agriculture & Pêche",   color:"#65a30d" },
  { id:"environment",     label:"Environnement",         color:"#16a34a" },
  { id:"justice",         label:"Justice",               color:"#b45309" },
  { id:"foreign_affairs", label:"Affaires étrangères",   color:"#0f766e" },
];

/* ── Component ──────────────────────────────────────────── */
export default function NewsletterSubscribe({ onClose, onSuccess, defaultLang = "ar" }: Props) {
  const [step, setStep]           = useState<Step>("form");
  const [lang, setLang]           = useState<Lang>(defaultLang);
  const [email, setEmail]         = useState("");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [topics, setTopics]       = useState<string[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [confirmUnsub, setConfirmUnsub] = useState(false);

  const isAr   = lang === "ar";
  const t      = TX[lang];
  const TOPICS = isAr ? TOPICS_AR : TOPICS_FR;
  const validEmail = email.includes("@") && email.includes(".");

  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEmailChange = useCallback((val: string) => {
    setEmail(val);
    setStep("form");
    setError("");
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (!val.includes("@") || !val.includes(".")) return;
    checkTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/newsletter/check/?email=${encodeURIComponent(val.trim().toLowerCase())}`);
        const d   = await res.json();
        if (d.subscribed) setStep("already");
      } catch { /* ignore */ }
    }, 500);
  }, []);

  const toggleTopic = (id: string) => {
    if (id === "all") { setTopics(["all"]); return; }
    setTopics(prev => {
      const clean = prev.filter(i => i !== "all");
      return clean.includes(id) ? clean.filter(i => i !== id) : [...clean, id];
    });
  };

  const handleSubscribe = async () => {
    if (!topics.length) { setError(t.errSelectTopic); return; }
    setLoading(true); setError("");
    try {
      await fetch(`${API_BASE}/newsletter/subscribe/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), interests: topics, frequency, lang }),
      });
      setStep("success");
      onSuccess({ email: email.trim().toLowerCase(), topics, frequency, lang });
    } catch {
      setError(t.errServer);
    } finally { setLoading(false); }
  };

  const handleUnsubscribe = async () => {
    setLoading(true); setError("");
    try {
      await fetch(`${API_BASE}/newsletter/manage/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), action: "unsubscribe" }),
      });
      setConfirmUnsub(false);
      setStep("unsubscribed");
    } catch {
      setError(t.errServer);
    } finally { setLoading(false); }
  };

  const freqLabel = (f: Frequency) =>
    f === "daily"
      ? (isAr ? "يومي" : "quotidien")
      : (isAr ? "أسبوعي" : "hebdomadaire");

  /* ─────────────────── RENDER ─────────────────────────── */
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} dir={isAr ? "rtl" : "ltr"} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={S.header}>
          <div style={S.headerIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="5" width="20" height="14" rx="3" stroke="white" strokeWidth="1.8" fill="none"/>
              <path d="M2 9l10 6 10-6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="19" cy="7" r="4" fill="#22c55e"/>
              <path d="M17 7l1.5 1.5L21 6" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={S.headerTitle}>{t.title}</div>
            <div style={S.headerSub}>{t.sub}</div>
          </div>
          <button style={S.langToggle} onClick={() => setLang(l => l === "ar" ? "fr" : "ar")}>
            {lang === "ar" ? "FR" : "AR"}
          </button>
          <button style={S.closeBtn} onClick={onClose}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ══ STEP: form ══ */}
        {step === "form" && (
          <div style={S.body}>
            <div style={S.fieldGroup}>
              <label style={S.label}>{t.emailLabel}</label>
              <input
                type="email" value={email} dir="ltr"
                onChange={e => handleEmailChange(e.target.value)}
                placeholder={t.emailPlaceholder}
                style={S.input}
              />
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>{t.freqLabel}</label>
              <div style={S.freqRow}>
                {(["daily","weekly"] as Frequency[]).map(f => (
                  <button key={f}
                    style={{ ...S.freqBtn, ...(frequency===f ? S.freqActive : {}) }}
                    onClick={() => setFrequency(f)}>
                    <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
                      {f === "daily"
                        ? <CalendarDays size={16}/>
                        : <CalendarRange size={16}/>}
                      {f === "daily" ? t.daily : t.weekly}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <button
              disabled={!validEmail}
              style={{ ...S.btnPrimary, opacity: validEmail ? 1 : 0.45,
                display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
              onClick={() => { if (validEmail) setStep("topics"); }}>
              {isAr ? <><ArrowLeft size={16}/> {t.next}</> : <>{t.next} <ArrowRight size={16}/></>}
            </button>
          </div>
        )}

        {/* ══ STEP: topics ══ */}
        {step === "topics" && (
          <div style={S.body}>
            <div style={S.stepNav}>
              <button style={S.backBtn}
                onClick={() => setStep("form")}
                title={t.back}>
                <span style={{ display:"flex", alignItems:"center", gap:5 }}>
                  {isAr ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
                  {t.back}
                </span>
              </button>
              <span style={S.stepHint}>{t.chooseTopics}</span>
            </div>
            <div style={S.topicsGrid}>
              {TOPICS.map(topic => {
                const active = topics.includes(topic.id);
                return (
                  <button key={topic.id} onClick={() => toggleTopic(topic.id)}
                    style={{ ...S.topicCard, borderColor: active ? topic.color : "#e5e7eb",
                      background: active ? topic.color+"12" : "#fff" }}>
                    <span style={{ color: active ? topic.color : "#9ca3af",
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {TOPIC_ICONS[topic.id]}
                    </span>
                    <span style={{ fontSize:12, fontWeight:700, color: active ? topic.color : "#374151", lineHeight:1.3 }}>
                      {topic.label}
                    </span>
                    {active && (
                      <div style={{ position:"absolute", top:6, left:6, width:17, height:17,
                        borderRadius:"50%", background:topic.color,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        color:"#fff" }}>
                        <Check size={10} strokeWidth={3}/>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {error && <div style={S.errorBox}>{error}</div>}
            <button disabled={loading || !topics.length}
              style={{ ...S.btnPrimary, opacity: topics.length ? 1 : 0.45,
                display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
              onClick={handleSubscribe}>
              <CheckCircle2 size={17}/>
              {loading ? t.subscribing : t.confirmSub}
            </button>
          </div>
        )}

        {/* ══ STEP: success ══ */}
        {step === "success" && (
          <div style={{ ...S.body, textAlign:"center", padding:"48px 28px", alignItems:"center" }}>
            <PartyPopper size={64} color="#0d6b3c" strokeWidth={1.5} style={{ marginBottom:14 }}/>
            <div style={S.stateTitle}>{t.successTitle}</div>
            <div style={S.stateDesc}>{t.successMsg(email, freqLabel(frequency))}</div>
            <button style={{ ...S.btnPrimary, padding:"10px 32px", width:"auto" }} onClick={onClose}>
              {t.close}
            </button>
          </div>
        )}

        {/* ══ STEP: already subscribed ══ */}
        {step === "already" && (
          <div style={{ ...S.body, alignItems:"center", textAlign:"center", padding:"36px 28px" }}>
            <div style={S.statusIconWrap}>
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="20" fill="#dcfce7"/>
                <path d="M13 22l6 6 12-12" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ ...S.stateTitle, color:"#15803d" }}>{t.alreadyTitle}</div>
            <div style={{ ...S.stateDesc, marginBottom:28 }}>{t.alreadyMsg(email)}</div>

            {!confirmUnsub ? (
              <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%", maxWidth:320 }}>
                <button style={S.btnPrimary} onClick={onClose}>{t.close}</button>
                <button style={{ ...S.btnDanger,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
                  onClick={() => setConfirmUnsub(true)}>
                  <UserMinus size={16}/> {t.unsubBtn}
                </button>
              </div>
            ) : (
              <div style={S.confirmBox}>
                <div style={S.confirmTitle}>{t.unsubConfirmTitle}</div>
                <div style={S.confirmMsg}>{t.unsubConfirmMsg}</div>
                {error && <div style={S.errorBox}>{error}</div>}
                <div style={{ display:"flex", gap:10 }}>
                  <button style={S.btnSecondary} onClick={() => setConfirmUnsub(false)}
                    disabled={loading}>
                    {t.unsubConfirmNo}
                  </button>
                  <button style={S.btnDangerSolid} onClick={handleUnsubscribe}
                    disabled={loading}>
                    {loading ? t.unsubbing : t.unsubConfirmYes}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ STEP: unsubscribed ══ */}
        {step === "unsubscribed" && (
          <div style={{ ...S.body, alignItems:"center", textAlign:"center", padding:"36px 28px" }}>
            <div style={S.statusIconWrap}>
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="20" fill="#fee2e2"/>
                <path d="M14 22h16" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"/>
                <rect x="2" y="5" width="20" height="14" rx="2" stroke="#dc2626" strokeWidth="1.6"
                  fill="none" transform="translate(10 8)"/>
              </svg>
            </div>
            <div style={{ ...S.stateTitle, color:"#b91c1c" }}>{t.unsubDoneTitle}</div>
            <div style={S.stateDesc}>{t.unsubDoneMsg(email)}</div>

            <div style={S.notSubBadge}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#dc2626" strokeWidth="1.4"/>
                <path d="M4 7h6" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {t.notSubTitle}
            </div>
            <div style={{ ...S.stateDesc, fontSize:12.5, color:"#9ca3af" }}>
              {t.notSubMsg(email)}
            </div>

            <div style={{ display:"flex", gap:10, marginTop:8, flexWrap:"wrap", justifyContent:"center" }}>
              <button style={{ ...S.btnPrimary, padding:"10px 24px", width:"auto" }}
                onClick={() => { setStep("form"); setEmail(""); setTopics([]); setConfirmUnsub(false); }}>
                {t.subscribeNow}
              </button>
              <button style={{ ...S.btnSecondary, padding:"10px 24px" }} onClick={onClose}>
                {t.close}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────── */
const S: Record<string, React.CSSProperties> = {
  overlay: {
    position:"fixed", inset:0,
    background:"rgba(0,0,0,0.52)", backdropFilter:"blur(7px)",
    display:"flex", alignItems:"center", justifyContent:"center",
    zIndex:9500, padding:16,
    fontFamily:"Cairo, Tajawal, sans-serif",
  },
  modal: {
    background:"#f8f7f4", borderRadius:18,
    width:"100%", maxWidth:620,
    maxHeight:"92vh", overflowY:"auto",
    boxShadow:"0 20px 60px rgba(0,0,0,.24), 0 4px 16px rgba(0,0,0,.1)",
    animation:"nl-modal-in .28s cubic-bezier(.2,.8,.4,1)",
  },
  header: {
    background:"linear-gradient(135deg,#063f3b,#0a5c45)",
    padding:"16px 20px",
    display:"flex", alignItems:"center", gap:12,
    borderRadius:"18px 18px 0 0",
  },
  headerIcon: {
    width:44, height:44, borderRadius:12,
    background:"rgba(255,255,255,.14)", border:"1.5px solid rgba(255,255,255,.2)",
    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
  },
  headerTitle: { color:"#fff", fontSize:16, fontWeight:800 },
  headerSub:   { color:"#a7d8d0", fontSize:11.5, marginTop:2 },
  langToggle: {
    background:"rgba(255,255,255,.18)", border:"1.5px solid rgba(255,255,255,.3)",
    color:"#fff", borderRadius:20, padding:"4px 14px",
    fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0,
  },
  closeBtn: {
    width:32, height:32, borderRadius:"50%",
    background:"rgba(255,255,255,.14)", border:"1.5px solid rgba(255,255,255,.2)",
    display:"flex", alignItems:"center", justifyContent:"center",
    cursor:"pointer", fontFamily:"inherit", flexShrink:0,
  },
  body:       { padding:"24px 24px 28px", display:"flex", flexDirection:"column", gap:18 },
  fieldGroup: { display:"flex", flexDirection:"column", gap:6 },
  label:      { fontSize:12.5, fontWeight:700, color:"#555" },
  input: {
    height:48, border:"1.5px solid #e0ddd5", borderRadius:10,
    padding:"0 14px", fontSize:14, fontFamily:"inherit",
    outline:"none", color:"#111", background:"#fff",
    transition:"border-color .15s",
  },
  freqRow:   { display:"flex", gap:10 },
  freqBtn: {
    flex:1, padding:"11px 0", borderRadius:10,
    border:"1.5px solid #e0ddd5", background:"#fff",
    fontSize:13, fontWeight:600, cursor:"pointer",
    fontFamily:"inherit", color:"#555", transition:"all .15s",
  },
  freqActive: { borderColor:"#0d6b3c", background:"#e8f5ee", color:"#0d6b3c" },
  btnPrimary: {
    width:"100%", padding:"13px 0", borderRadius:10,
    border:"none", background:"linear-gradient(135deg,#065f46,#0d6b3c)",
    color:"#fff", fontWeight:800, fontSize:15,
    cursor:"pointer", fontFamily:"inherit", transition:"opacity .15s",
  },
  btnSecondary: {
    flex:1, padding:"11px 0", borderRadius:10,
    border:"1.5px solid #e0ddd5", background:"#fff",
    color:"#555", fontWeight:700, fontSize:13,
    cursor:"pointer", fontFamily:"inherit",
  },
  btnDanger: {
    width:"100%", padding:"12px 0", borderRadius:10,
    border:"1.5px solid #fca5a5", background:"#fff5f5",
    color:"#dc2626", fontWeight:700, fontSize:14,
    cursor:"pointer", fontFamily:"inherit", transition:"all .15s",
  },
  btnDangerSolid: {
    flex:1, padding:"11px 0", borderRadius:10,
    border:"none", background:"#dc2626",
    color:"#fff", fontWeight:700, fontSize:13,
    cursor:"pointer", fontFamily:"inherit",
  },
  stepNav:    { display:"flex", alignItems:"center", gap:12 },
  backBtn: {
    background:"#f0ede5", border:"none", borderRadius:8,
    padding:"7px 14px", fontSize:13, fontWeight:700,
    cursor:"pointer", fontFamily:"inherit", color:"#444", flexShrink:0,
  },
  stepHint:   { fontSize:12.5, color:"#888" },
  topicsGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(128px,1fr))", gap:8 },
  topicCard: {
    border:"1.5px solid #e5e7eb", borderRadius:12,
    padding:"12px 8px", cursor:"pointer", background:"#fff",
    display:"flex", flexDirection:"column", alignItems:"center", gap:6,
    textAlign:"center", fontFamily:"inherit", position:"relative",
    transition:"all .12s",
  },
  errorBox: {
    background:"#fef3c7", border:"1.5px solid #fde68a",
    color:"#92400e", borderRadius:10, padding:"10px 14px",
    fontSize:13, fontWeight:700,
  },
  statusIconWrap: { marginBottom:14 },
  stateTitle: { fontSize:20, fontWeight:900, color:"#111", marginBottom:8 },
  stateDesc:  { fontSize:13.5, color:"#666", lineHeight:1.7, marginBottom:22 },
  confirmBox: {
    background:"#fff5f5", border:"1.5px solid #fca5a5",
    borderRadius:14, padding:"18px 20px",
    width:"100%", maxWidth:360,
    display:"flex", flexDirection:"column", gap:12,
  },
  confirmTitle: { fontSize:15, fontWeight:800, color:"#b91c1c" },
  confirmMsg:   { fontSize:13, color:"#555", lineHeight:1.6 },
  notSubBadge: {
    display:"inline-flex", alignItems:"center", gap:6,
    background:"#fee2e2", border:"1.5px solid #fca5a5",
    color:"#dc2626", borderRadius:20, padding:"5px 14px",
    fontSize:13, fontWeight:700, marginBottom:8, marginTop:4,
  },
};
