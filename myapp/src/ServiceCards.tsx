import { useState } from "react";
import type { Lang } from "./i18n";

interface Props {
  lang: Lang;
  onMapClick: () => void;
  onNewsletterClick: () => void;
}

interface Card {
  id: string;
  icon: string;
  bgIcon: string;
  titleAr: string;
  titleFr: string;
  descAr: string;
  descFr: string;
  color: string;
  bgColor: string;
  borderColor: string;
  blobColor: string;
  badge?: { ar: string; fr: string; color: string };
  onClick?: () => void;
  soon?: boolean;
}

export default function ServiceCards({ lang, onMapClick, onNewsletterClick }: Props) {
  const isAr = lang === "ar";
  const [hovered, setHovered] = useState<string | null>(null);

  const cards: Card[] = [
    {
      id: "map",
      icon: "🗺️",
      bgIcon: "📍",
      titleAr: "الخرائط الحكومية الذكية",
      titleFr: "Cartes gouvernementales",
      descAr: "استكشف مواقع الوزارات واحصل على أفضل مسار للوصول إليها مع التوجيه الذكي.",
      descFr: "Explorez les ministères et obtenez le meilleur itinéraire avec guidage intelligent.",
      color: "#1565c0",
      bgColor: "#e3f2fd",
      borderColor: "#90caf9",
      blobColor: "#bbdefb",
      onClick: onMapClick,
    },
    {
      id: "newsletter",
      icon: "📧",
      bgIcon: "✉️",
      titleAr: "النشرة البريدية الذكية",
      titleFr: "Newsletter intelligente",
      descAr: "اشترك لتصلك آخر الأخبار والقرارات الحكومية حسب اهتماماتك عبر البريد.",
      descFr: "Abonnez-vous pour recevoir les actualités gouvernementales selon vos intérêts.",
      color: "#0F9D8A",
      bgColor: "#e0f2f1",
      borderColor: "#80cbc4",
      blobColor: "#b2dfdb",
      badge: { ar: "جديد", fr: "Nouveau", color: "#0F9D8A" },
      onClick: onNewsletterClick,
    },
    {
      id: "assistant",
      icon: "🤖",
      bgIcon: "💬",
      titleAr: "المساعد الحكومي الذكي",
      titleFr: "Assistant IA gouvernemental",
      descAr: "اسأل عن الخدمات الحكومية، الوثائق المطلوبة، والمواقع الجغرافية للمؤسسات.",
      descFr: "Posez des questions sur les services, documents requis et institutions.",
      color: "#6200ea",
      bgColor: "#ede7f6",
      borderColor: "#ce93d8",
      blobColor: "#d1c4e9",
      soon: true,
    },
    {
      id: "alerts",
      icon: "🔔",
      bgIcon: "📢",
      titleAr: "التنبيهات الفورية",
      titleFr: "Alertes immédiates",
      descAr: "استقبل إشعارات فورية عند صدور أخبار أو قرارات حكومية جديدة.",
      descFr: "Recevez des notifications immédiates lors de nouvelles décisions gouvernementales.",
      color: "#e65100",
      bgColor: "#fff3e0",
      borderColor: "#ffcc80",
      blobColor: "#ffe0b2",
      badge: { ar: "🚨 عاجل", fr: "🚨 URGENT", color: "#dc2626" },
      soon: true,
    },
    {
      id: "projects",
      icon: "🏗️",
      bgIcon: "📊",
      titleAr: "خريطة المشاريع الوطنية",
      titleFr: "Carte des projets nationaux",
      descAr: "تابع المشاريع الحكومية حسب الولاية ونسبة الإنجاز والحالة الراهنة.",
      descFr: "Suivez les projets gouvernementaux par wilaya avec leur taux d'avancement.",
      color: "#f57f17",
      bgColor: "#fffde7",
      borderColor: "#fff176",
      blobColor: "#fff9c4",
      soon: true,
    },
    {
      id: "documents",
      icon: "📄",
      bgIcon: "📋",
      titleAr: "الخدمات الإلكترونية",
      titleFr: "Services en ligne",
      descAr: "دليل شامل للوثائق والإجراءات الإدارية اللازمة في المؤسسات الحكومية.",
      descFr: "Guide complet des documents et procédures administratives gouvernementales.",
      color: "#0277bd",
      bgColor: "#e1f5fe",
      borderColor: "#81d4fa",
      blobColor: "#b3e5fc",
      soon: true,
    },
  ];

  return (
    <section style={{ padding: "0 0 32px" }}>
      {/* Section header */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "var(--text-h)" }}>
            {isAr ? "⚡ الخدمات الرقمية" : "⚡ Services numériques"}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
            {isAr ? "وصول سريع لجميع خدمات بوابة موريتانيا" : "Accès rapide à tous les services du portail"}
          </p>
        </div>
        <span style={{ background: "var(--green-light)", color: "var(--green)", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 800, border: "1.5px solid #0d6b3c22" }}>
          {isAr ? `${cards.length} خدمة` : `${cards.length} services`}
        </span>
      </div>

      {/* Cards grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 16,
      }}>
        {cards.map(card => {
          const isHov = hovered === card.id;
          return (
            <div
              key={card.id}
              onClick={card.onClick && !card.soon ? card.onClick : undefined}
              onMouseEnter={() => setHovered(card.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                position: "relative",
                borderRadius: 20,
                padding: "22px 20px 20px",
                background: card.bgColor,
                border: `2px solid ${isHov && !card.soon ? card.color : card.borderColor}`,
                cursor: card.soon ? "default" : "pointer",
                overflow: "hidden",
                transition: "transform .2s, box-shadow .2s, border-color .2s",
                transform: isHov && !card.soon ? "translateY(-4px)" : "none",
                boxShadow: isHov && !card.soon ? `0 12px 32px ${card.color}33` : "0 2px 10px rgba(0,0,0,.06)",
                minHeight: 160,
                opacity: card.soon ? 0.85 : 1,
              }}
            >
              {/* Decorative blob background */}
              <div style={{
                position: "absolute", top: -20, right: isAr ? "auto" : -20, left: isAr ? -20 : "auto",
                width: 120, height: 120, borderRadius: "50%",
                background: card.blobColor, opacity: 0.7,
              }} />
              <div style={{
                position: "absolute", bottom: -30, left: isAr ? "auto" : -20, right: isAr ? -20 : "auto",
                width: 90, height: 90, borderRadius: "50%",
                background: card.blobColor, opacity: 0.4,
              }} />

              {/* Top: main icon badge */}
              <div style={{ position: "absolute", top: 16, right: isAr ? "auto" : 16, left: isAr ? 16 : "auto" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: card.color, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 22,
                  boxShadow: `0 4px 14px ${card.color}55`,
                }}>
                  {card.icon}
                </div>
              </div>

              {/* Large ghost icon */}
              <div style={{
                position: "absolute", top: 8, left: isAr ? "auto" : 8, right: isAr ? 8 : "auto",
                fontSize: 64, opacity: 0.08, lineHeight: 1, pointerEvents: "none",
                filter: "grayscale(30%)",
              }}>
                {card.bgIcon}
              </div>

              {/* Content */}
              <div style={{ position: "relative", zIndex: 1, marginTop: 52 }}>
                <div style={{ fontWeight: 900, fontSize: 14.5, color: card.color, marginBottom: 7, lineHeight: 1.4 }}>
                  {isAr ? card.titleAr : card.titleFr}
                </div>
                <div style={{ fontSize: 12, color: "#555", lineHeight: 1.7, marginBottom: 12 }}>
                  {isAr ? card.descAr : card.descFr}
                </div>

                {/* Footer row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {card.soon ? (
                    <span style={{ fontSize: 11, fontWeight: 800, color: card.color, background: `${card.color}18`, padding: "3px 10px", borderRadius: 20 }}>
                      🔜 {isAr ? "قريباً" : "Bientôt"}
                    </span>
                  ) : (
                    <span style={{
                      fontSize: 12, fontWeight: 800, color: card.color,
                      display: "flex", alignItems: "center", gap: 4,
                      transition: "gap .2s",
                    }}>
                      {isAr ? "اضغط للدخول" : "Accéder"}
                      <span style={{ display: "inline-block", transition: "transform .2s", transform: isHov ? (isAr ? "translateX(-4px)" : "translateX(4px)") : "none" }}>
                        {isAr ? "←" : "→"}
                      </span>
                    </span>
                  )}
                  {card.badge && (
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: "#fff", background: card.badge.color, padding: "2px 8px", borderRadius: 20 }}>
                      {isAr ? card.badge.ar : card.badge.fr}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
