import { useState } from "react";
import type { Lang } from "./i18n";

/* ── Translations ── */
const NL = {
  ar: {
    title: "النشرة البريدية",
    subtitle: "أخبار بوابة موريتانيا مباشرة إلى بريدك",
    emailLabel: "البريد الإلكتروني",
    subscribedBadge: "✅ مشترك",
    subscribeCardTitle: "الاشتراك",
    subscribeCardDescYes: "أنت مشترك بالفعل. يمكنك تعديل اهتماماتك.",
    subscribeCardDescNo: "اشترك لتصلك أهم الأخبار الحكومية حسب اهتماماتك.",
    subscribeBtnEdit: "⚙️ تعديل الاهتمامات",
    subscribeBtnNew: "📩 اشترك الآن",
    unsubscribeCardTitle: "إلغاء الاشتراك",
    unsubscribeCardDescYes: "يمكنك إلغاء اشتراكك في أي وقت دون أي شروط.",
    unsubscribeCardDescNo: "أدخل بريدك الإلكتروني أعلاه ثم اضغط لإلغاء الاشتراك.",
    unsubscribeBtn: "🚫 إلغاء الاشتراك",
    subInfoTitle: "📊 تفاصيل اشتراكك",
    subInfoEmail: "البريد الإلكتروني",
    subInfoLastSent: "آخر نشرة",
    subInfoInterests: "الاهتمامات المختارة",
    features: ["أخبار موثوقة", "محتوى مخصص", "مجاني تماماً", "إلغاء في أي وقت"],
    chooseTitle: "اختر اهتماماتك",
    chooseSub: "سنرسل لك فقط ما يهمك",
    back: "← رجوع",
    noInterest: "لم تختر أي اهتمام بعد",
    chosenPrefix: "اخترت: ",
    loading: "جاري...",
    save: "💾 حفظ التغييرات",
    confirm: "✅ تأكيد الاشتراك",
    successTitle: "تم الاشتراك بنجاح!",
    successMsg: "ستصلك أخبار",
    successMsgSuffix: "على بريدك الإلكتروني",
    backHome: "العودة للوحة الاشتراك",
    confirmUnsubTitle: "تأكيد إلغاء الاشتراك",
    confirmUnsubMsg: "هل تريد إلغاء الاشتراك للبريد:",
    cancel: "إلغاء",
    confirmUnsubBtn: "نعم، إلغاء الاشتراك",
    errSelect: "اختر اهتماماً واحداً على الأقل",
    errEmail: "أدخل بريداً صحيحاً أولاً",
    errEmailFirst: "أدخل بريدك الإلكتروني أولاً",
    errGeneric: "حدث خطأ",
    errConnect: "تعذر الاتصال بالخادم",
    errUpdate: "فشل التحديث",
    successUnsub: "تم إلغاء اشتراكك بنجاح ✅",
    noNewsletter: "لم تصلك نشرة بعد",
    now: "الآن",
    minAgo: "منذ",
    minUnit: "دقيقة",
    hourUnit: "ساعة",
    yesterday: "أمس",
  },
  fr: {
    title: "Newsletter",
    subtitle: "Actualités mauritaniennes directement dans votre boîte mail",
    emailLabel: "Adresse e-mail",
    subscribedBadge: "✅ Abonné",
    subscribeCardTitle: "S'abonner",
    subscribeCardDescYes: "Vous êtes déjà abonné. Vous pouvez modifier vos centres d'intérêt.",
    subscribeCardDescNo: "Abonnez-vous pour recevoir les actualités gouvernementales selon vos centres d'intérêt.",
    subscribeBtnEdit: "⚙️ Modifier les intérêts",
    subscribeBtnNew: "📩 S'abonner",
    unsubscribeCardTitle: "Se désabonner",
    unsubscribeCardDescYes: "Vous pouvez vous désabonner à tout moment sans conditions.",
    unsubscribeCardDescNo: "Entrez votre e-mail ci-dessus puis cliquez pour vous désabonner.",
    unsubscribeBtn: "🚫 Se désabonner",
    subInfoTitle: "📊 Détails de votre abonnement",
    subInfoEmail: "Adresse e-mail",
    subInfoLastSent: "Dernière newsletter",
    subInfoInterests: "Centres d'intérêt choisis",
    features: ["Sources fiables", "Contenu personnalisé", "Entièrement gratuit", "Résiliation à tout moment"],
    chooseTitle: "Choisissez vos intérêts",
    chooseSub: "Nous vous enverrons uniquement ce qui vous intéresse",
    back: "← Retour",
    noInterest: "Aucun intérêt sélectionné",
    chosenPrefix: "Choisi : ",
    loading: "En cours...",
    save: "💾 Enregistrer",
    confirm: "✅ Confirmer l'abonnement",
    successTitle: "Abonnement réussi !",
    successMsg: "Vous recevrez les actualités",
    successMsgSuffix: "dans votre boîte mail",
    backHome: "Retour au tableau de bord",
    confirmUnsubTitle: "Confirmer le désabonnement",
    confirmUnsubMsg: "Voulez-vous vous désabonner de l'adresse :",
    cancel: "Annuler",
    confirmUnsubBtn: "Oui, se désabonner",
    errSelect: "Sélectionnez au moins un intérêt",
    errEmail: "Entrez d'abord une adresse valide",
    errEmailFirst: "Entrez d'abord votre adresse e-mail",
    errGeneric: "Une erreur s'est produite",
    errConnect: "Impossible de contacter le serveur",
    errUpdate: "Échec de la mise à jour",
    successUnsub: "Désabonnement réussi ✅",
    noNewsletter: "Aucune newsletter reçue",
    now: "À l'instant",
    minAgo: "Il y a",
    minUnit: "min",
    hourUnit: "h",
    yesterday: "Hier",
  },
};

const INTERESTS_AR = [
  { id: "all",           label: "كل الأخبار",          icon: "📰", color: "#0d6b3c" },
  { id: "government",    label: "الحكومة والسياسة",     icon: "🏛️", color: "#1d4ed8" },
  { id: "economy",       label: "الاقتصاد والمالية",    icon: "💰", color: "#d97706" },
  { id: "education",     label: "التعليم",              icon: "🎓", color: "#7c3aed" },
  { id: "health",        label: "الصحة",               icon: "🏥", color: "#dc2626" },
  { id: "security",      label: "الدفاع والأمن",        icon: "🛡️", color: "#374151" },
  { id: "transport",     label: "النقل والمواصلات",     icon: "🚗", color: "#0891b2" },
  { id: "energy",        label: "الطاقة والبترول",      icon: "⚡", color: "#ca8a04" },
  { id: "agriculture",   label: "الزراعة والصيد",       icon: "🌾", color: "#65a30d" },
  { id: "environment",   label: "البيئة والمناخ",       icon: "🌿", color: "#16a34a" },
  { id: "justice",       label: "العدل والقضاء",        icon: "⚖️", color: "#b45309" },
  { id: "foreign_affairs", label: "الشؤون الخارجية",   icon: "🌍", color: "#0f766e" },
];

const INTERESTS_FR = [
  { id: "all",           label: "Tout",                  icon: "📰", color: "#0d6b3c" },
  { id: "government",    label: "Gouvernement",          icon: "🏛️", color: "#1d4ed8" },
  { id: "economy",       label: "Économie",              icon: "💰", color: "#d97706" },
  { id: "education",     label: "Éducation",             icon: "🎓", color: "#7c3aed" },
  { id: "health",        label: "Santé",                 icon: "🏥", color: "#dc2626" },
  { id: "security",      label: "Défense & Sécurité",    icon: "🛡️", color: "#374151" },
  { id: "transport",     label: "Transport",             icon: "🚗", color: "#0891b2" },
  { id: "energy",        label: "Énergie & Pétrole",     icon: "⚡", color: "#ca8a04" },
  { id: "agriculture",   label: "Agriculture",           icon: "🌾", color: "#65a30d" },
  { id: "environment",   label: "Environnement",         icon: "🌿", color: "#16a34a" },
  { id: "justice",       label: "Justice",               icon: "⚖️", color: "#b45309" },
  { id: "foreign_affairs", label: "Affaires étrangères", icon: "🌍", color: "#0f766e" },
];

/* ── Types ── */
type Step = "home" | "interests" | "success";


function fmtDate(iso: string | null, lang: Lang): string {
  const tx = NL[lang];
  if (!iso) return tx.noNewsletter;
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 60000;
  if (diff < 1) return tx.now;
  if (diff < 60) return `${tx.minAgo} ${Math.floor(diff)} ${tx.minUnit}`;
  if (diff < 1440) return `${tx.minAgo} ${Math.floor(diff / 60)} ${tx.hourUnit}`;
  if (diff < 2880) return tx.yesterday;
  return d.toLocaleDateString(lang === "ar" ? "ar-MR" : "fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/* ── Main component ── */
export default function Newsletter({ lang = "ar" }: { lang?: Lang }) {
  const tx = NL[lang];
  const INTERESTS = lang === "ar" ? INTERESTS_AR : INTERESTS_FR;
  const isRtl = lang === "ar";
  const [email, setEmail]           = useState("");
  const [step, setStep]             = useState<Step>("home");
  const [interests, setInterests]   = useState<string[]>([]);
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subData, setSubData]       = useState<any>(null);
  const [editMode, setEditMode]     = useState(false);
  const [confirmUnsub, setConfirmUnsub] = useState(false);


  /* check subscription when email changes */
  const checkEmail = async (v: string) => {
    setEmail(v);
    setMsg("");
    if (!v.includes("@") || !v.includes(".")) {
      setSubscribed(false); setSubData(null); return;
    }
    try {
      const res = await fetch(`/api/newsletter/check/?email=${encodeURIComponent(v)}`);
      const d = await res.json();
      if (d.subscribed) { setSubscribed(true); setSubData(d); }
      else { setSubscribed(false); setSubData(null); }
    } catch { setSubscribed(false); setSubData(null); }
  };

  /* toggle interest */
  const toggle = (id: string) => {
    if (id === "all") { setInterests(["all"]); return; }
    setInterests(prev => {
      const clean = prev.filter(i => i !== "all");
      return clean.includes(id) ? clean.filter(i => i !== id) : [...clean, id];
    });
  };

  /* subscribe */
  const doSubscribe = async () => {
    if (!interests.length) { setMsg(tx.errSelect); return; }
    setLoading(true); setMsg("");
    try {
      const res = await fetch("/api/newsletter/subscribe/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), interests }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg(d.error || tx.errGeneric); return; }
      setSubscribed(true);
      setSubData({ interests, last_sent: null, article_count: 0 });
      setStep("success");
    } catch { setMsg(tx.errConnect); }
    finally { setLoading(false); }
  };

  /* update interests */
  const doUpdate = async () => {
    if (!interests.length) { setMsg(tx.errSelect); return; }
    setLoading(true); setMsg("");
    try {
      const res = await fetch("/api/newsletter/manage/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), interests }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg(d.error || tx.errUpdate); return; }
      setSubData((p: any) => ({ ...p, interests }));
      setEditMode(false);
    } catch { setMsg(tx.errConnect); }
    finally { setLoading(false); }
  };

  /* unsubscribe */
  const doUnsubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter/unsubscribe/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const d = await res.json();
      if (res.ok) {
        setEmail(""); setSubscribed(false); setSubData(null);
        setConfirmUnsub(false); setStep("home");
        setMsg(tx.successUnsub);
      } else {
        setMsg(d.error || tx.errGeneric);
        setConfirmUnsub(false);
      }
    } catch { setMsg(tx.errConnect); }
    finally { setLoading(false); }
  };

  /* label helpers */
  const intLabel = (ids: string[]) =>
    ids.map(id => INTERESTS.find(i => i.id === id)?.label || id).join("، ") || INTERESTS[0]?.label || "";

  /* ─────────── RENDER ─────────── */

  /* ── SUCCESS after subscribe ── */
  if (step === "success") return (
    <div style={styles.page} dir={isRtl ? "rtl" : "ltr"}>
      <div style={styles.dash}>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "#0d6b3c", margin: "0 0 8px" }}>
            {tx.successTitle}
          </h2>
          <p style={{ color: "#555", fontSize: 15, marginBottom: 28 }}>
            {tx.successMsg} <strong>{intLabel(interests)}</strong> {tx.successMsgSuffix}
          </p>
          <button onClick={() => setStep("home")} style={styles.btnPrimary}>
            {tx.backHome}
          </button>
        </div>
      </div>
    </div>
  );

  /* ── INTEREST SELECTION step ── */
  if (step === "interests" || editMode) return (
    <div style={styles.page} dir={isRtl ? "rtl" : "ltr"}>
      <div style={styles.dash}>
        {/* Header */}
        <div style={styles.dashHeader}>
          <button onClick={() => { setStep("home"); setEditMode(false); setMsg(""); }}
            style={styles.backBtn}>{tx.back}</button>
          <div>
            <div style={styles.dashTitle}>{tx.chooseTitle}</div>
            <div style={styles.dashSub}>{tx.chooseSub}</div>
          </div>
        </div>

        {/* Grid */}
        <div style={styles.intGrid}>
          {INTERESTS.map(item => {
            const active = interests.includes(item.id);
            return (
              <button key={item.id} onClick={() => toggle(item.id)}
                style={{
                  ...styles.intCard,
                  borderColor: active ? item.color : "#e5e7eb",
                  background: active ? item.color + "12" : "#fff",
                }}>
                <span style={{ fontSize: 24 }}>{item.icon}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: active ? item.color : "#374151", lineHeight: 1.3 }}>
                  {item.label}
                </span>
                {active && (
                  <div style={{ position: "absolute", top: 7, left: 7, width: 18, height: 18, borderRadius: "50%",
                    background: item.color, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, color: "#fff", fontWeight: 900 }}>✓</div>
                )}
              </button>
            );
          })}
        </div>

        {msg && <div style={styles.msgBox}>{msg}</div>}

        {/* Count & CTA */}
        <div style={{ padding: "0 28px 28px" }}>
          <div style={{ fontSize: 13, color: "#888", textAlign: "center", marginBottom: 14 }}>
            {interests.length === 0
              ? tx.noInterest
              : `${tx.chosenPrefix}${intLabel(interests)}`}
          </div>
          <button onClick={editMode ? doUpdate : doSubscribe} disabled={loading || !interests.length}
            style={{ ...styles.btnPrimary, width: "100%", fontSize: 16, padding: "15px",
              opacity: !interests.length ? 0.5 : 1 }}>
            {loading ? tx.loading : editMode ? tx.save : tx.confirm}
          </button>
        </div>
      </div>
    </div>
  );

  /* ── MAIN HOME ── */
  return (
    <div style={styles.page} dir={isRtl ? "rtl" : "ltr"}>
      <div style={styles.dash}>

        {/* ── TOP HEADER ── */}
        <div style={styles.dashHeader}>
          <div style={styles.iconWrap}>📬</div>
          <div>
            <div style={styles.dashTitle}>{tx.title}</div>
            <div style={styles.dashSub}>{tx.subtitle}</div>
          </div>
        </div>

        {/* ── EMAIL FIELD ── */}
        <div style={{ padding: "0 28px 20px" }}>
          <label style={styles.label}>{tx.emailLabel}</label>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              type="email"
              value={email}
              onChange={e => checkEmail(e.target.value)}
              placeholder="example@email.com"
              style={styles.emailInput}
            />
            {subscribed && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0fdf4",
                border: "1.5px solid #86efac", borderRadius: 12, padding: "0 14px",
                fontSize: 13, fontWeight: 800, color: "#15803d", flexShrink: 0 }}>
                {tx.subscribedBadge}
              </div>
            )}
          </div>
        </div>

        {/* ── STATUS CARDS ── */}
        <div style={styles.statusRow}>
          {/* SUBSCRIBE CARD */}
          <div style={{
            ...styles.actionCard,
            borderColor: !subscribed ? "#0d6b3c" : "#e5e7eb",
            background: !subscribed ? "#f0fdf4" : "#fafafa",
          }}>
            <div style={styles.actionCardIcon}>📩</div>
            <div style={styles.actionCardTitle}>{tx.subscribeCardTitle}</div>
            <div style={styles.actionCardDesc}>
              {subscribed ? tx.subscribeCardDescYes : tx.subscribeCardDescNo}
            </div>
            <button
              disabled={loading || !email.includes("@")}
              onClick={() => {
                if (!email.includes("@")) { setMsg(tx.errEmail); return; }
                if (subscribed) {
                  setInterests(subData?.interests || []);
                  setEditMode(true);
                } else {
                  setInterests([]);
                  setStep("interests");
                }
              }}
              style={{
                ...styles.btnPrimary,
                width: "100%",
                marginTop: "auto",
                opacity: !email.includes("@") ? 0.45 : 1,
              }}>
              {subscribed ? tx.subscribeBtnEdit : tx.subscribeBtnNew}
            </button>
          </div>

          {/* UNSUBSCRIBE CARD */}
          <div style={{
            ...styles.actionCard,
            borderColor: subscribed ? "#fca5a5" : "#e5e7eb",
            background: subscribed ? "#fff5f5" : "#fafafa",
          }}>
            <div style={styles.actionCardIcon}>🚫</div>
            <div style={styles.actionCardTitle}>{tx.unsubscribeCardTitle}</div>
            <div style={styles.actionCardDesc}>
              {subscribed ? tx.unsubscribeCardDescYes : tx.unsubscribeCardDescNo}
            </div>
            <button
              disabled={loading || !email.includes("@")}
              onClick={() => {
                if (!email.includes("@")) { setMsg(tx.errEmailFirst); return; }
                setConfirmUnsub(true);
              }}
              style={{
                ...styles.btnDanger,
                width: "100%",
                marginTop: "auto",
                opacity: !email.includes("@") ? 0.35 : 1,
              }}>
              {tx.unsubscribeBtn}
            </button>
          </div>
        </div>

        {/* ── SUBSCRIBED INFO ── */}
        {subscribed && subData && (
          <div style={styles.subInfo}>
            <div style={styles.subInfoTitle}>{tx.subInfoTitle}</div>
            <div style={styles.subInfoGrid}>
              <div style={styles.subInfoItem}>
                <div style={styles.subInfoLabel}>{tx.subInfoEmail}</div>
                <div style={styles.subInfoVal}>📧 {email}</div>
              </div>
              <div style={styles.subInfoItem}>
                <div style={styles.subInfoLabel}>{tx.subInfoLastSent}</div>
                <div style={styles.subInfoVal}>🕒 {fmtDate(subData.last_sent, lang)}</div>
              </div>
              <div style={{ ...styles.subInfoItem, gridColumn: "1 / -1" }}>
                <div style={styles.subInfoLabel}>{tx.subInfoInterests}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 8 }}>
                  {(subData.interests || []).map((id: string) => {
                    const it = INTERESTS.find(i => i.id === id);
                    return (
                      <span key={id} style={{
                        background: (it?.color || "#555") + "15",
                        color: it?.color || "#555",
                        border: `1.5px solid ${it?.color || "#555"}33`,
                        borderRadius: 20, padding: "5px 13px",
                        fontSize: 12.5, fontWeight: 700,
                        display: "flex", alignItems: "center", gap: 5,
                      }}>
                        {it?.icon} {it?.label || id}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {msg && <div style={styles.msgBox}>{msg}</div>}

        {/* ── FEATURES ROW ── */}
        {!subscribed && (
          <div style={styles.features}>
            {(["🛡️","⭐","🎁","❌"] as const).map((icon, i) => (
              <div key={i} style={styles.featureChip}>
                <span>{icon}</span> {tx.features[i]}
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ── CONFIRM UNSUBSCRIBE DIALOG ── */}
      {confirmUnsub && (
        <div style={styles.overlay} onClick={() => setConfirmUnsub(false)}>
          <div style={styles.dialog} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 900, color: "#111" }}>
              {tx.confirmUnsubTitle}
            </h3>
            <p style={{ color: "#555", fontSize: 14, margin: "0 0 6px" }}>
              {tx.confirmUnsubMsg}
            </p>
            <div style={{ background: "#f5f5f5", borderRadius: 10, padding: "8px 14px",
              fontSize: 14, fontWeight: 700, color: "#222", marginBottom: 22 }}>
              {email}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmUnsub(false)}
                style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1.5px solid #ddd",
                  background: "#fff", color: "#555", fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit", fontSize: 14 }}>
                {tx.cancel}
              </button>
              <button onClick={doUnsubscribe} disabled={loading}
                style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none",
                  background: "#dc2626", color: "#fff", fontWeight: 800, cursor: "pointer",
                  fontFamily: "inherit", fontSize: 14 }}>
                {loading ? tx.loading : tx.confirmUnsubBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Styles ── */
const styles: Record<string, React.CSSProperties> = {
  page: {
    width: "100%",
    padding: "32px 20px",
    background: "#f4f7fb",
    boxSizing: "border-box",
    fontFamily: "Cairo, sans-serif",
  },
  dash: {
    maxWidth: 860,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 24,
    boxShadow: "0 4px 40px rgba(0,0,0,.09)",
    overflow: "hidden",
    border: "1.5px solid #e8eaed",
  },
  dashHeader: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "22px 28px",
    borderBottom: "1.5px solid #f0f0f0",
    background: "linear-gradient(135deg,#071b1f,#063f3b)",
    color: "#fff",
  },
  dashTitle: { fontWeight: 900, fontSize: 18, color: "#fff" },
  dashSub: { fontSize: 12.5, color: "#a7d8d0", marginTop: 2 },
  iconWrap: {
    width: 46, height: 46, borderRadius: 14,
    background: "rgba(255,255,255,.15)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 22, flexShrink: 0,
  },
  badge: {
    marginRight: "auto",
    background: "rgba(255,201,40,.2)",
    color: "#ffc928",
    border: "1.5px solid rgba(255,201,40,.4)",
    borderRadius: 20,
    padding: "5px 14px",
    fontSize: 12.5,
    fontWeight: 800,
    flexShrink: 0,
  },
  backBtn: {
    background: "rgba(255,255,255,.15)",
    border: "none",
    color: "#fff",
    borderRadius: 10,
    padding: "7px 14px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  label: {
    display: "block",
    fontSize: 12.5,
    fontWeight: 700,
    color: "#555",
    marginBottom: 8,
  },
  emailInput: {
    flex: 1,
    height: 48,
    border: "2px solid #e5e7eb",
    borderRadius: 12,
    padding: "0 16px",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    color: "#111",
    direction: "ltr",
    textAlign: "left",
  },
  statusRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    padding: "0 28px 20px",
  },
  actionCard: {
    border: "2px solid #e5e7eb",
    borderRadius: 18,
    padding: "22px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    transition: "all .2s",
  },
  actionCardIcon: { fontSize: 32 },
  actionCardTitle: { fontWeight: 900, fontSize: 17, color: "#111" },
  actionCardDesc: { fontSize: 13, color: "#666", lineHeight: 1.6, flexGrow: 1 },
  btnPrimary: {
    padding: "12px 24px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg,#065f46,#0d6b3c)",
    color: "#fff",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "transform .15s",
  },
  btnDanger: {
    padding: "12px 24px",
    borderRadius: 12,
    border: "2px solid #fca5a5",
    background: "#fff",
    color: "#dc2626",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  intGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: 10,
    padding: "20px 28px",
  },
  intCard: {
    border: "2px solid #e5e7eb",
    borderRadius: 16,
    padding: "14px 10px",
    cursor: "pointer",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    textAlign: "center",
    fontFamily: "inherit",
    position: "relative",
    transition: "all .15s",
  },
  subInfo: {
    margin: "0 28px 20px",
    background: "#f8faf9",
    border: "1.5px solid #e0ebe7",
    borderRadius: 16,
    padding: "18px 20px",
  },
  subInfoTitle: { fontWeight: 800, fontSize: 14, color: "#0d6b3c", marginBottom: 14 },
  subInfoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  subInfoItem: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "12px 14px",
  },
  subInfoLabel: { fontSize: 11, color: "#aaa", fontWeight: 700, marginBottom: 6 },
  subInfoVal: { fontSize: 13.5, fontWeight: 700, color: "#222" },
  msgBox: {
    margin: "0 28px 16px",
    background: "#fef3c7",
    border: "1.5px solid #fde68a",
    color: "#92400e",
    borderRadius: 12,
    padding: "11px 16px",
    fontSize: 13.5,
    fontWeight: 700,
  },
  features: {
    display: "flex",
    justifyContent: "center",
    gap: 14,
    flexWrap: "wrap",
    padding: "16px 28px 28px",
    borderTop: "1px solid #f0f0f0",
  },
  featureChip: {
    background: "#f5f7fa",
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 700,
    color: "#374151",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.55)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  dialog: {
    background: "#fff",
    borderRadius: 22,
    padding: "32px 28px",
    width: "min(420px,90vw)",
    textAlign: "center",
    boxShadow: "0 20px 60px rgba(0,0,0,.2)",
  },
};
