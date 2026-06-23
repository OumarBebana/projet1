import { useState, useEffect, useRef } from "react";
import type { Lang } from "./i18n";

/* ─── Types ────────────────────────────────────────────────── */
type InterestItem = { key: string; labelAr: string; labelFr: string; icon: string; color: string };
type Tab = "subscribe" | "unsubscribe";

/* ─── Data ─────────────────────────────────────────────────── */
const INTERESTS: InterestItem[] = [
  { key: "government",     labelAr: "الحكومة",    labelFr: "Gouvernement",        icon: "🏛", color: "#6366f1" },
  { key: "economy",        labelAr: "الاقتصاد",   labelFr: "Économie",            icon: "💰", color: "#f59e0b" },
  { key: "education",      labelAr: "التعليم",    labelFr: "Éducation",           icon: "📚", color: "#3b82f6" },
  { key: "health",         labelAr: "الصحة",      labelFr: "Santé",               icon: "🏥", color: "#ef4444" },
  { key: "security",       labelAr: "الأمن",      labelFr: "Sécurité",            icon: "🛡", color: "#8b5cf6" },
  { key: "transport",      labelAr: "النقل",      labelFr: "Transport",           icon: "🚗", color: "#06b6d4" },
  { key: "energy",         labelAr: "الطاقة",     labelFr: "Énergie",             icon: "⚡", color: "#eab308" },
  { key: "agriculture",    labelAr: "الزراعة",    labelFr: "Agriculture",         icon: "🌾", color: "#22c55e" },
  { key: "environment",    labelAr: "البيئة",     labelFr: "Environnement",       icon: "🌿", color: "#10b981" },
  { key: "justice",        labelAr: "العدل",      labelFr: "Justice",             icon: "⚖", color: "#f97316" },
  { key: "foreign_affairs",labelAr: "الخارجية",  labelFr: "Affaires étrangères", icon: "🌍", color: "#0d6b3c" },
  { key: "social",         labelAr: "الاجتماعي", labelFr: "Social",              icon: "🤝", color: "#ec4899" },
];

const STATS = [
  { icon: "📰", valueAr: "٥٠+", valueFr: "50+", labelAr: "خبر أسبوعياً", labelFr: "Actus/semaine" },
  { icon: "✉️", valueAr: "٩٨٪", valueFr: "98%", labelAr: "معدل الوصول",  labelFr: "Taux d'envoi"  },
];

const NAV_ITEMS: { key: Tab; icon: string; labelAr: string; labelFr: string }[] = [
  { key: "subscribe",   icon: "✉️", labelAr: "اشتراك جديد",    labelFr: "S'abonner"    },
  { key: "unsubscribe", icon: "🚫", labelAr: "إلغاء الاشتراك", labelFr: "Se désabonner" },
];

/* ─── Confetti ──────────────────────────────────────────────── */
function Confetti() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const colors = ["#0d6b3c","#f0c040","#6366f1","#ef4444","#3b82f6","#fff"];
    for (let i = 0; i < 60; i++) {
      const d = document.createElement("div");
      Object.assign(d.style, {
        position: "absolute", left: `${Math.random() * 100}%`, top: "-10px",
        width: `${6 + Math.random() * 8}px`, height: `${6 + Math.random() * 8}px`,
        borderRadius: Math.random() > .5 ? "50%" : "2px",
        background: colors[Math.floor(Math.random() * colors.length)],
        animation: `nl-confetti ${1.5 + Math.random()}s ${Math.random() * .5}s ease-in forwards`,
        transform: `rotate(${Math.random()*360}deg)`,
      });
      el.appendChild(d);
    }
    return () => { while (el.firstChild) el.removeChild(el.firstChild); };
  }, []);
  return <div ref={ref} style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden", zIndex:10 }} />;
}

/* ─── Interest Grid ─────────────────────────────────────────── */
function InterestGrid({ list, setList, isAr }: { list: string[]; setList: (v:string[])=>void; isAr: boolean }) {
  const allKeys = INTERESTS.map(i => i.key);
  const allSelected = allKeys.every(k => list.includes(k));
  const toggle = (key: string) => setList(list.includes(key) ? list.filter(k => k !== key) : [...list, key]);
  return (
    <div>
      {/* Select all pill */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <span style={{ fontSize:12.5, fontWeight:700, color:"var(--text-muted)" }}>
          {isAr ? `${list.length} مجال مختار من ${allKeys.length}` : `${list.length}/${allKeys.length} sélectionnés`}
        </span>
        <button onClick={() => setList(allSelected ? [] : allKeys)} style={{
          display:"flex", alignItems:"center", gap:6, padding:"5px 14px",
          border:`1.5px solid ${allSelected ? "#0d6b3c" : "var(--border)"}`, borderRadius:20,
          background: allSelected ? "#0d6b3c" : "transparent",
          color: allSelected ? "#fff" : "var(--text-muted)",
          cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:12, transition:"all .2s",
        }}>
          {allSelected ? "✓" : "○"} {isAr ? (allSelected ? "إلغاء الكل" : "تحديد الكل") : (allSelected ? "Tout désélec." : "Tout sélec.")}
        </button>
      </div>
      {/* 3-column grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:7 }}>
        {INTERESTS.map(item => {
          const active = list.includes(item.key);
          return (
            <button key={item.key} onClick={() => toggle(item.key)} style={{
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              gap:5, padding:"12px 6px",
              border:`2px solid ${active ? item.color : "var(--border)"}`, borderRadius:12,
              background: active ? item.color + "18" : "var(--bg)",
              color: active ? item.color : "var(--text-muted)",
              cursor:"pointer", fontFamily:"inherit", fontWeight:800, fontSize:11,
              textAlign:"center", transition:"all .18s", position:"relative",
              boxShadow: active ? `0 3px 12px ${item.color}30` : "none",
            }}>
              {active && (
                <div style={{ position:"absolute", top:5, right:isAr?undefined:5, left:isAr?5:undefined, width:14, height:14, borderRadius:"50%", background:item.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"#fff", fontWeight:900 }}>✓</div>
              )}
              <span style={{ fontSize:22 }}>{item.icon}</span>
              <span style={{ lineHeight:1.2 }}>{isAr ? item.labelAr : item.labelFr}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Preview Modal ─────────────────────────────────────────── */
function PreviewModal({ lang, interests, onClose }: { lang: Lang; interests: string[]; onClose: () => void }) {
  const isAr = lang === "ar";
  const selected = INTERESTS.filter(i => interests.includes(i.key));
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"#000b", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:16, maxWidth:560, width:"100%", maxHeight:"80vh", overflowY:"auto", padding:32, animation:"nl-slide-up .25s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ margin:0, color:"#0d6b3c", fontSize:16, fontWeight:800 }}>👁 {isAr?"معاينة النشرة":"Aperçu de la newsletter"}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#666" }}>✕</button>
        </div>
        <div style={{ border:"1px solid #e5e7eb", borderRadius:12, overflow:"hidden" }}>
          <div style={{ background:"linear-gradient(135deg,#084d2b,#0c7c3e)", padding:"28px 24px", textAlign:"center", color:"#fff" }}>
            <div style={{ fontSize:28, marginBottom:6 }}>🇲🇷</div>
            <div style={{ fontWeight:800, fontSize:22 }}>BAWABA.MR</div>
            <div style={{ fontSize:13, opacity:.85, marginTop:4 }}>{isAr?"النشرة اليومية":"Newsletter quotidienne"}</div>
          </div>
          <div style={{ padding:"20px 24px" }}>
            {selected.slice(0, 3).map(item => (
              <div key={item.key} style={{ borderBottom:"1px solid #f3f4f6", padding:"12px 0", display:"flex", gap:10 }}>
                <span style={{ fontSize:20 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:"#0c7c3e", marginBottom:4 }}>{isAr?item.labelAr:item.labelFr}</div>
                  <div style={{ fontSize:13, color:"#374151", fontWeight:600 }}>{isAr?`خبر نموذجي في ${item.labelAr}...`:`Actualité exemple — ${item.labelFr}...`}</div>
                  <div style={{ fontSize:12, color:"#9ca3af", marginTop:4 }}>{isAr?"اقرأ المزيد ←":"Lire la suite →"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ MAIN COMPONENT ════════════════════════════ */
type Props = { lang?: Lang };

export default function NewsletterSmart({ lang = "ar" }: Props) {
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const [activeTab, setActiveTab]       = useState<Tab>("subscribe");
  const [subEmail, setSubEmail]         = useState("");
  const [interests, setInterests]       = useState<string[]>(["government", "education"]);
  const [subMsg, setSubMsg]             = useState("");
  const [subMsgType, setSubMsgType]     = useState<"success"|"error">("success");
  const [subLoading, setSubLoading]     = useState(false);
  const [subDone, setSubDone]           = useState(false);
  const [step, setStep]                 = useState(0);  // 0=interests, 1=frequency, 2=email
  const [frequency, setFrequency]       = useState<"daily"|"weekly"|"monthly">("daily");
  const [showPreview, setShowPreview]   = useState(false);
  const [speaking, setSpeaking]         = useState(false);
  const [unsubEmail, setUnsubEmail]     = useState("");
  const [unsubMsg, setUnsubMsg]         = useState("");
  const [unsubMsgType, setUnsubMsgType] = useState<"success"|"error">("success");
  const [unsubLoading, setUnsubLoading] = useState(false);
  const [unsubDone, setUnsubDone]       = useState(false);
  const [unsubConfirm, setUnsubConfirm] = useState(false);

  const subscribe = async () => {
    if (!subEmail.includes("@")) { setSubMsg(isAr?"أدخل بريداً صحيحاً":"Email invalide"); setSubMsgType("error"); return; }
    if (interests.length === 0)  { setSubMsg(isAr?"اختر مجالاً واحداً":"Choisissez un domaine"); setSubMsgType("error"); return; }
    setSubLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribe/", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email:subEmail.trim().toLowerCase(), interests, language:lang, frequency }) });
      if (res.ok) { setSubDone(true); setSubEmail(""); }
      else { const d = await res.json(); setSubMsg(d.error||d.message||"خطأ"); setSubMsgType("error"); }
    } catch { setSubMsg("Network error"); setSubMsgType("error"); }
    finally { setSubLoading(false); }
  };

  const confirmUnsubscribe = async () => {
    setUnsubLoading(true); setUnsubConfirm(false);
    try {
      const res = await fetch("/api/newsletter/unsubscribe/", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email:unsubEmail.trim().toLowerCase() }) });
      if (res.ok) { setUnsubDone(true); setUnsubEmail(""); }
      else { const d = await res.json(); setUnsubMsg(d.error||"خطأ"); setUnsubMsgType("error"); }
    } catch { setUnsubMsg("Network error"); setUnsubMsgType("error"); }
    finally { setUnsubLoading(false); }
  };

  return (
    <div dir={dir} style={{ display:"flex", height:"100%", minHeight:580, fontFamily:"Cairo,Tajawal,Inter,sans-serif", borderRadius:20, overflow:"hidden", background:"var(--bg)" }}>

      <style>{`
        @keyframes nl-confetti { to { transform:translateY(400px) rotate(720deg); opacity:0 } }
        @keyframes nl-slide-up { from { transform:translateY(14px); opacity:0 } to { transform:none; opacity:1 } }
        @keyframes nl-pop { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        .nl-input { width:100%; padding:11px 16px; border-radius:10px; border:2px solid var(--border); font-size:14px; font-family:inherit; outline:none; background:var(--bg); color:var(--text); box-sizing:border-box; transition:border-color .2s; }
        .nl-input:focus { border-color:var(--green); box-shadow:0 0 0 4px #0d6b3c12; }
        .nl-btn-green { padding:12px 24px; border-radius:10px; border:none; background:var(--green); color:#fff; font-weight:800; font-size:14px; cursor:pointer; font-family:inherit; transition:background .15s; width:100%; }
        .nl-btn-green:hover:not(:disabled) { background:var(--green-dark); }
        .nl-btn-green:disabled { background:var(--border); color:var(--text-muted); cursor:not-allowed; }
        .nl-msg-success { background:var(--green-light); color:var(--green); border:1.5px solid #0d6b3c22; border-radius:10px; padding:10px 14px; font-size:13px; font-weight:700; margin-top:12px; }
        .nl-msg-error { background:var(--red-light); color:var(--red); border:1.5px solid #c2102f22; border-radius:10px; padding:10px 14px; font-size:13px; font-weight:700; margin-top:12px; }
      `}</style>

      {/* ═══ LEFT SIDEBAR ═══ */}
      <div style={{ width:230, background:"linear-gradient(180deg,#063d22 0%,#0a5c30 50%,#0d6b3c 100%)", display:"flex", flexDirection:"column", flexShrink:0, padding:"24px 14px 20px" }}>
        {/* Brand */}
        <div style={{ textAlign:"center", marginBottom:24, paddingBottom:20, borderBottom:"1px solid rgba(255,255,255,.12)" }}>
          <div style={{ fontSize:32, marginBottom:4 }}>🇲🇷</div>
          <div style={{ color:"#fff", fontWeight:900, fontSize:15 }}>BAWABA.MR</div>
          <div style={{ color:"rgba(255,255,255,.55)", fontSize:10.5, marginTop:2 }}>{isAr ? "النشرة البريدية" : "Newsletter officielle"}</div>
        </div>
        {/* Stats — 2 items side by side */}
        <div style={{ display:"flex", gap:8, marginBottom:22 }}>
          {STATS.map(s => (
            <div key={s.labelAr} style={{ flex:1, background:"rgba(255,255,255,.1)", borderRadius:12, padding:"12px 8px", textAlign:"center", border:"1px solid rgba(255,255,255,.08)" }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{s.icon}</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:16, lineHeight:1 }}>{isAr ? s.valueAr : s.valueFr}</div>
              <div style={{ color:"rgba(255,255,255,.6)", fontSize:10, marginTop:4, lineHeight:1.3 }}>{isAr ? s.labelAr : s.labelFr}</div>
            </div>
          ))}
        </div>
        {/* Nav */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
          <div style={{ color:"rgba(255,255,255,.4)", fontSize:9.5, fontWeight:700, letterSpacing:1, marginBottom:8, padding:"0 4px", textTransform:"uppercase" }}>
            {isAr ? "القائمة" : "Menu"}
          </div>
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.key;
            return (
              <button key={item.key} onClick={() => { setActiveTab(item.key); setSubMsg(""); setUnsubMsg(""); }}
                style={{
                  display:"flex", alignItems:"center", gap:10, padding:"11px 14px",
                  border:"none", borderRadius:12, cursor:"pointer", fontFamily:"inherit",
                  fontSize:13, fontWeight:700, textAlign:"start", width:"100%", transition:"all .18s",
                  background: isActive ? "rgba(255,255,255,.18)" : "transparent",
                  color: isActive ? "#fff" : "rgba(255,255,255,.6)",
                  boxShadow: isActive ? "inset 0 0 0 1.5px rgba(255,255,255,.25)" : "none",
                }}>
                <span style={{ fontSize:15 }}>{item.icon}</span>
                <span style={{ flex:1 }}>{isAr ? item.labelAr : item.labelFr}</span>
                {isActive && <div style={{ width:6, height:6, borderRadius:"50%", background:"#fff" }} />}
              </button>
            );
          })}
        </div>
        {/* Buttons */}
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:16 }}>
          <button onClick={() => setShowPreview(true)} style={{
            padding:"9px 14px", border:"1.5px solid rgba(255,255,255,.25)",
            borderRadius:10, background:"transparent", color:"rgba(255,255,255,.75)",
            fontFamily:"inherit", fontWeight:700, fontSize:12, cursor:"pointer",
            display:"flex", alignItems:"center", gap:8, justifyContent:"center", transition:"all .18s",
          }}
            onMouseEnter={e => (e.currentTarget.style.background="rgba(255,255,255,.12)")}
            onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
            👁 {isAr ? "معاينة النشرة" : "Aperçu newsletter"}
          </button>
          {/* TTS audio button */}
          <button onClick={() => {
            if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
            const selectedInterests = INTERESTS.filter(i => interests.includes(i.key));
            const text = isAr
              ? `مرحباً! هذه نشرة بوابة موريتانيا. اشتراكك يشمل مجالات: ${selectedInterests.map(i=>i.labelAr).join(' و')}. ستصلك الأخبار ${frequency==="daily"?"يومياً":frequency==="weekly"?"أسبوعياً":"شهرياً"}.`
              : `Bonjour ! Voici la newsletter de Bawaba Mauritanie. Votre abonnement couvre : ${selectedInterests.map(i=>i.labelFr).join(', ')}. Vous recevrez des actualités ${frequency==="daily"?"quotidiennement":frequency==="weekly"?"chaque semaine":"chaque mois"}.`;
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = isAr ? "ar-SA" : "fr-FR";
            utter.rate = 0.9;
            utter.onend = () => setSpeaking(false);
            setSpeaking(true);
            window.speechSynthesis.speak(utter);
          }} style={{
            padding:"9px 14px", border:"1.5px solid rgba(255,255,255,.25)",
            borderRadius:10, background: speaking ? "rgba(255,200,0,.2)" : "transparent",
            color: speaking ? "#ffd700" : "rgba(255,255,255,.75)",
            fontFamily:"inherit", fontWeight:700, fontSize:12, cursor:"pointer",
            display:"flex", alignItems:"center", gap:8, justifyContent:"center", transition:"all .18s",
          }}>
            {speaking ? "⏹" : "🔊"} {isAr ? (speaking?"إيقاف الصوت":"استمع للنشرة") : (speaking?"Arrêter":"Écouter la newsletter")}
          </button>
        </div>
      </div>

      {/* ═══ MAIN PANEL ═══ */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"var(--bg-card)" }}>
        {/* Header */}
        <div style={{ padding:"20px 28px 16px", borderBottom:"1px solid var(--border)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            <div style={{ flex:1 }}>
              <h2 style={{ margin:0, fontSize:17, fontWeight:900, color:"var(--text-h)" }}>
                {activeTab === "subscribe"   && (isAr ? "✉️ اشتراك جديد"    : "✉️ Nouvel abonnement")}
                {activeTab === "unsubscribe" && (isAr ? "🚫 إلغاء الاشتراك" : "🚫 Se désabonner")}
              </h2>
              <p style={{ margin:"4px 0 0", fontSize:12, color:"var(--text-muted)" }}>
                {activeTab === "subscribe"   && (isAr ? "اختر اهتماماتك وأدخل بريدك الإلكتروني"  : "Choisissez vos intérêts et entrez votre e-mail")}
                {activeTab === "unsubscribe" && (isAr ? "يمكنك إعادة الاشتراك في أي وقت"        : "Vous pouvez vous réabonner à tout moment")}
              </p>
            </div>
            {activeTab === "subscribe" && !subDone && (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {[isAr?"الاهتمامات":"Intérêts", isAr?"التكرار":"Fréquence", isAr?"البريد":"E-mail"].map((label, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:26, height:26, borderRadius:"50%", fontWeight:800, fontSize:11.5, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .3s", background:i<=step?"var(--green)":"var(--border)", color:i<=step?"#fff":"var(--text-muted)" }}>
                      {i < step ? "✓" : i+1}
                    </div>
                    <span style={{ fontSize:11.5, fontWeight:i===step?700:500, color:i===step?"var(--text-h)":"var(--text-muted)" }}>{label}</span>
                    {i < 2 && <div style={{ width:16, height:2, background:step>i?"var(--green)":"var(--border)", borderRadius:2, transition:"background .3s" }} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>

          {/* ── SUBSCRIBE ── */}
          {activeTab === "subscribe" && (
            <div style={{ animation:"nl-slide-up .25s ease", maxWidth:520 }}>
              {subDone ? (
                <div style={{ position:"relative", textAlign:"center", padding:"60px 20px" }}>
                  <Confetti />
                  <div style={{ fontSize:64, animation:"nl-pop .5s ease" }}>🎉</div>
                  <h3 style={{ color:"var(--green)", fontSize:22, fontWeight:900, margin:"16px 0 8px" }}>{isAr?"تم الاشتراك بنجاح!":"Abonnement confirmé !"}</h3>
                  <p style={{ color:"var(--text-muted)", fontSize:14, maxWidth:300, margin:"0 auto 24px" }}>{isAr?"سيصلك تأكيد على بريدك الإلكتروني قريباً.":"Un e-mail de confirmation vous sera envoyé."}</p>
                  <button onClick={() => { setSubDone(false); setStep(0); setSubMsg(""); }} style={{ padding:"12px 36px", borderRadius:30, border:"none", background:"var(--green)", color:"#fff", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
                    {isAr?"اشتراك جديد":"Nouvel abonnement"}
                  </button>
                </div>
              ) : step === 0 ? (
                /* ── STEP 0: Interests ── */
                <>
                  <div style={{ marginBottom:8, fontSize:14, fontWeight:700, color:"var(--text-h)" }}>🎯 {isAr?"اختر المجالات التي تهمك":"Choisissez vos centres d'intérêt"}</div>
                  <p style={{ fontSize:12.5, color:"var(--text-muted)", marginBottom:16 }}>{isAr?"أخبار مخصصة بالذكاء الاصطناعي حسب اهتماماتك":"Actualités personnalisées par IA selon vos intérêts"}</p>
                  <InterestGrid list={interests} setList={setInterests} isAr={isAr} />
                  {subMsg && <div className={`nl-msg-${subMsgType}`}>{subMsg}</div>}
                  <button onClick={() => { if (interests.length === 0) { setSubMsg(isAr?"اختر مجالاً":"Choisissez un domaine"); setSubMsgType("error"); return; } setSubMsg(""); setStep(1); }} className="nl-btn-green" style={{ marginTop:20 }}>
                    {isAr?"التالي: تكرار الإرسال ←":"Suivant : Fréquence →"}
                  </button>
                </>
              ) : step === 1 ? (
                /* ── STEP 1: Frequency ── */
                <div style={{ animation:"nl-slide-up .2s ease" }}>
                  <div style={{ marginBottom:8, fontSize:14, fontWeight:700, color:"var(--text-h)" }}>⏰ {isAr?"اختر تكرار الإرسال":"Choisissez la fréquence"}</div>
                  <p style={{ fontSize:12.5, color:"var(--text-muted)", marginBottom:20 }}>{isAr?"متى تريد استقبال النشرة البريدية؟":"À quelle fréquence souhaitez-vous recevoir la newsletter ?"}</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {([
                      { val:"daily",   icon:"☀️", ar:"يومياً",         fr:"Chaque jour",    descAr:"صباح كل يوم",                descFr:"Chaque matin",              badge:"أكثر شيوعاً" },
                      { val:"weekly",  icon:"📅", ar:"أسبوعياً",        fr:"Chaque semaine", descAr:"ملخص نهاية الأسبوع",         descFr:"Résumé de fin de semaine",  badge:"" },
                      { val:"monthly", icon:"📆", ar:"شهرياً",          fr:"Chaque mois",    descAr:"ملخص شامل نهاية الشهر",      descFr:"Résumé mensuel complet",    badge:"" },
                    ] as const).map(f => {
                      const active = frequency === f.val;
                      return (
                        <button key={f.val} onClick={() => setFrequency(f.val)} style={{
                          display:"flex", alignItems:"center", gap:14, padding:"14px 18px",
                          border:`2px solid ${active ? "var(--green)" : "var(--border)"}`,
                          borderRadius:14, background: active ? "var(--green-light)" : "var(--bg)",
                          cursor:"pointer", fontFamily:"inherit", textAlign:"start", transition:"all .2s", position:"relative",
                        }}>
                          <div style={{ width:44, height:44, borderRadius:12, background: active ? "var(--green)" : "var(--border-light)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0, transition:"background .2s" }}>
                            {f.icon}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:800, fontSize:14, color: active ? "var(--green)" : "var(--text-h)" }}>
                              {isAr ? f.ar : f.fr}
                            </div>
                            <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>
                              {isAr ? f.descAr : f.descFr}
                            </div>
                          </div>
                          {f.badge && (
                            <span style={{ background:"var(--gold)", color:"#fff", fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:20, position:"absolute", top:8, left:isAr?8:undefined, right:isAr?undefined:8 }}>
                              {f.badge}
                            </span>
                          )}
                          {active && (
                            <div style={{ width:22, height:22, borderRadius:"50%", background:"var(--green)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:12, fontWeight:900, flexShrink:0 }}>✓</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {/* Notification options */}
                  <div style={{ marginTop:20, padding:"14px 16px", background:"var(--bg)", borderRadius:12, border:"1.5px solid var(--border)" }}>
                    <div style={{ fontWeight:700, fontSize:12.5, color:"var(--text-h)", marginBottom:10 }}>
                      🚨 {isAr?"التنبيهات الفورية":"Alertes immédiates"}
                    </div>
                    <div style={{ fontSize:12, color:"var(--text-muted)", lineHeight:1.6 }}>
                      {isAr ? "ستصلك أيضاً تنبيهات فورية عند نشر أخبار عاجلة من المؤسسات التي تتابعها." : "Vous recevrez également des alertes immédiates lors de la publication d'actualités urgentes."}
                    </div>
                    <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ background:"#dc2626", color:"#fff", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 }}>🚨 {isAr?"عاجل":"URGENT"}</span>
                      <span style={{ fontSize:11.5, color:"var(--text-muted)" }}>{isAr?"تُرسل تلقائياً دائماً":"Toujours envoyées automatiquement"}</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:10, marginTop:20 }}>
                    <button onClick={() => { setStep(0); setSubMsg(""); }} style={{ padding:"12px 20px", borderRadius:10, border:"1.5px solid var(--border)", background:"var(--bg)", color:"var(--text)", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>{isAr?"← السابق":"← Retour"}</button>
                    <button onClick={() => setStep(2)} className="nl-btn-green" style={{ flex:1, width:"auto" }}>{isAr?"التالي: أدخل بريدك ←":"Suivant : E-mail →"}</button>
                  </div>
                </div>
              ) : (
                /* ── STEP 2: Email ── */
                <>
                  {/* Summary */}
                  <div style={{ background:"var(--green-light)", borderRadius:12, padding:"12px 16px", marginBottom:16, border:"1.5px solid #0d6b3c22" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"var(--green)", marginBottom:8 }}>✅ {isAr?"ملخص اشتراكك الذكي":"Résumé de votre abonnement"}</div>
                    <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4, flex:1 }}>
                        {INTERESTS.filter(i => interests.includes(i.key)).map(item => (
                          <span key={item.key} style={{ display:"inline-flex", alignItems:"center", gap:3, fontSize:11, background:"var(--green)", color:"#fff", padding:"2px 8px", borderRadius:20, fontWeight:600 }}>
                            {item.icon} {isAr?item.labelAr:item.labelFr}
                          </span>
                        ))}
                      </div>
                      <span style={{ background:"var(--gold-light)", color:"var(--gold)", border:"1.5px solid var(--gold)", borderRadius:20, padding:"3px 10px", fontSize:11.5, fontWeight:800, whiteSpace:"nowrap" }}>
                        {frequency === "daily" ? (isAr?"☀️ يومياً":"☀️ Quotidien") : frequency === "weekly" ? (isAr?"📅 أسبوعياً":"📅 Hebdo") : (isAr?"📆 شهرياً":"📆 Mensuel")}
                      </span>
                    </div>
                  </div>
                  <label style={{ fontSize:14, fontWeight:700, color:"var(--text-h)", display:"block", marginBottom:8 }}>{isAr?"📧 البريد الإلكتروني":"📧 Adresse e-mail"}</label>
                  <input type="email" value={subEmail} onChange={e => setSubEmail(e.target.value)} onKeyDown={e => e.key==="Enter"&&subscribe()} placeholder={isAr?"example@email.com":"exemple@email.com"} dir="ltr" className="nl-input" />
                  {subMsg && <div className={`nl-msg-${subMsgType}`}>{subMsg}</div>}
                  <div style={{ display:"flex", gap:10, marginTop:16 }}>
                    <button onClick={() => { setStep(1); setSubMsg(""); }} style={{ padding:"12px 20px", borderRadius:10, border:"1.5px solid var(--border)", background:"var(--bg)", color:"var(--text)", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>{isAr?"← السابق":"← Retour"}</button>
                    <button onClick={subscribe} disabled={subLoading} className="nl-btn-green" style={{ flex:1, width:"auto" }}>{subLoading?(isAr?"⏳ جاري...":"⏳ En cours..."):(isAr?"اشترك الآن ✨":"S'abonner ✨")}</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── UNSUBSCRIBE ── */}
          {activeTab === "unsubscribe" && (
            <div style={{ animation:"nl-slide-up .25s ease", maxWidth:480 }}>
              {unsubDone ? (
                <div style={{ textAlign:"center", padding:"60px 20px" }}>
                  <div style={{ fontSize:56 }}>✅</div>
                  <h3 style={{ fontWeight:900, color:"var(--text-h)", fontSize:18, margin:"16px 0 8px" }}>{isAr?"تم إلغاء الاشتراك":"Désabonnement effectué"}</h3>
                  <p style={{ color:"var(--text-muted)", fontSize:13 }}>{isAr?"سنفتقدك! يمكنك الاشتراك مجدداً في أي وقت 👋":"On vous manquera ! Vous pouvez vous réabonner à tout moment 👋"}</p>
                  <button onClick={() => { setUnsubDone(false); setActiveTab("subscribe"); }} style={{ marginTop:20, padding:"10px 28px", borderRadius:10, border:"none", background:"var(--green)", color:"#fff", fontWeight:800, cursor:"pointer", fontFamily:"inherit", fontSize:14 }}>{isAr?"اشتراك جديد":"Se réabonner"}</button>
                </div>
              ) : unsubConfirm ? (
                <div style={{ textAlign:"center", padding:"48px 20px" }}>
                  <div style={{ fontSize:56 }}>🤔</div>
                  <h3 style={{ fontWeight:800, color:"var(--text-h)", margin:"16px 0 8px" }}>{isAr?"هل أنت متأكد؟":"Êtes-vous sûr(e) ?"}</h3>
                  <p style={{ color:"var(--text-muted)", fontSize:13, marginBottom:24 }}>{isAr?"سيتوقف إرسال النشرة إلى بريدك.":"Vous ne recevrez plus notre newsletter."}</p>
                  <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
                    <button onClick={() => setUnsubConfirm(false)} style={{ padding:"10px 28px", borderRadius:10, border:"2px solid var(--border)", background:"var(--bg)", color:"var(--text)", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{isAr?"لا، إلغاء الأمر":"Non, annuler"}</button>
                    <button onClick={confirmUnsubscribe} style={{ padding:"10px 28px", borderRadius:10, border:"none", background:"#dc2626", color:"#fff", fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>{isAr?"نعم، إلغاء الاشتراك":"Oui, se désabonner"}</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:12, padding:"14px 18px", marginBottom:20, fontSize:13, color:"#92400e", display:"flex", gap:10 }}>
                    <span>⚠️</span>
                    <span>{isAr?"سيتوقف إرسال النشرة إلى بريدك. يمكنك الاشتراك مجدداً في أي وقت.":"Vous ne recevrez plus notre newsletter. Vous pouvez vous réabonner à tout moment."}</span>
                  </div>
                  <label style={{ fontSize:14, fontWeight:700, color:"var(--text-h)", display:"block", marginBottom:8 }}>{isAr?"📧 بريدك الإلكتروني":"📧 Votre adresse e-mail"}</label>
                  <input type="email" value={unsubEmail} onChange={e => setUnsubEmail(e.target.value)} onKeyDown={e => e.key==="Enter"&&unsubEmail.includes("@")&&setUnsubConfirm(true)} placeholder={isAr?"example@email.com":"exemple@email.com"} dir="ltr" className="nl-input" />
                  {unsubMsg && <div className={`nl-msg-${unsubMsgType}`}>{unsubMsg}</div>}
                  <button onClick={() => { if(!unsubEmail.includes("@")){ setUnsubMsg(isAr?"أدخل بريداً صحيحاً":"Email invalide"); setUnsubMsgType("error"); return; } setUnsubConfirm(true); }} disabled={unsubLoading} style={{ marginTop:16, padding:"12px 24px", borderRadius:10, border:"none", background:"#dc2626", color:"#fff", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"inherit", width:"100%", transition:"background .15s" }}>
                    {unsubLoading?(isAr?"⏳ جاري الإلغاء...":"⏳ En cours..."):(isAr?"إلغاء الاشتراك":"Se désabonner")}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showPreview && <PreviewModal lang={lang} interests={interests} onClose={() => setShowPreview(false)} />}
    </div>
  );
}
