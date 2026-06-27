import React, { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE } from "./config";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Map, MapPin, Search, Mic, Volume2, Navigation, Car, Bike,
  PersonStanding, Phone, Globe, Clock, Ruler, Timer, Settings,
  Crosshair, Loader2, PartyPopper, Bot, X, ChevronDown,
  ExternalLink, Crown, Landmark, Building2, Building,
  GraduationCap, Home, ShieldCheck, Scale,
  Plus, Satellite, Square, ChevronLeft, ChevronRight,
  CornerDownLeft, Check,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────── */
interface Location {
  id: number; name_ar: string; name_fr: string; slug: string;
  institution_type: string; services: string; opening_hours: string;
  address: string; address_fr: string; latitude: number; longitude: number; phone: string; website: string;
}
interface RouteStep { instruction: string; distance: string }
interface RouteInfo {
  distanceKm: string; drivingMin: number; walkingMin: number; bikeMin: number;
  steps: RouteStep[]; polyline: [number,number][];
}
interface Props { lang: string; onBack: () => void }
type TMode = "car" | "walk" | "bike";
type Panel = "search" | "detail" | "nav";

/* ─── Institution Type Config ────────────────────────────────────── */
// SVG strings used inside Leaflet DivIcon HTML (no React allowed there)
const TC_SVG: Record<string, string> = {
  presidency:         `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  pm:                 `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`,
  ministry:           `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  public_institution: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
  university:         `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  hospital:           `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  municipality:       `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
  police:             `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
  court:              `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="3" x2="12" y2="21"/><path d="M5 6l7-3 7 3"/><path d="M6 12l6-3 6 3"/><path d="M3 18h18"/></svg>`,
};
// React nodes used in JSX
const TC_ICON: Record<string, React.ReactNode> = {
  presidency:         <Crown size={19}/>,
  pm:                 <Landmark size={19}/>,
  ministry:           <Building2 size={19}/>,
  public_institution: <Building size={19}/>,
  university:         <GraduationCap size={19}/>,
  hospital:           <Plus size={19}/>,
  municipality:       <Home size={19}/>,
  police:             <ShieldCheck size={19}/>,
  court:              <Scale size={19}/>,
};
const TC: Record<string, { color: string; svgPath: string; reactIcon: React.ReactNode; ar: string; fr: string }> = {
  presidency:        { color: "#b8860b", svgPath: TC_SVG.presidency,         reactIcon: TC_ICON.presidency,         ar: "رئاسة الجمهورية",   fr: "Présidence"           },
  pm:                { color: "#0891b2", svgPath: TC_SVG.pm,                 reactIcon: TC_ICON.pm,                 ar: "الوزارة الأولى",    fr: "Primature"            },
  ministry:          { color: "#0d6b3c", svgPath: TC_SVG.ministry,           reactIcon: TC_ICON.ministry,           ar: "وزارة",             fr: "Ministère"            },
  public_institution:{ color: "#7c3aed", svgPath: TC_SVG.public_institution, reactIcon: TC_ICON.public_institution, ar: "مؤسسة عمومية",     fr: "Institution publique" },
  university:        { color: "#1d4ed8", svgPath: TC_SVG.university,         reactIcon: TC_ICON.university,         ar: "جامعة",             fr: "Université"           },
  hospital:          { color: "#dc2626", svgPath: TC_SVG.hospital,           reactIcon: TC_ICON.hospital,           ar: "مستشفى",            fr: "Hôpital"              },
  municipality:      { color: "#d97706", svgPath: TC_SVG.municipality,       reactIcon: TC_ICON.municipality,       ar: "بلدية",             fr: "Commune"              },
  police:            { color: "#374151", svgPath: TC_SVG.police,             reactIcon: TC_ICON.police,             ar: "شرطة",              fr: "Police"               },
  court:             { color: "#92400e", svgPath: TC_SVG.court,              reactIcon: TC_ICON.court,              ar: "محكمة",             fr: "Tribunal"             },
};
const tc = (t: string) => TC[t] || TC.ministry;

/* ─── Keyword Map ─────────────────────────────────────────────────── */
const KW: Record<string, string[]> = {
  "جواز":["interieur","affaires-etrangeres"],"passeport":["interieur","affaires-etrangeres"],
  "هوية":["interieur"],"carte":["interieur"],"visa":["affaires-etrangeres"],
  "مستشفى":["sante"],"hôpital":["sante"],"طب":["sante"],
  "مدرسة":["education"],"école":["education"],
  "جامعة":["enseignement-superieur"],"université":["enseignement-superieur"],
  "ضرائب":["economie-finances"],"impôts":["economie-finances"],
  "محكمة":["justice"],"tribunal":["justice"],
  "زراعة":["agriculture"],"agriculture":["agriculture"],
  "نقل":["transports"],"transport":["transports"],
  "طاقة":["energies-petrole"],"énergie":["energies-petrole"],
  "رئاسة":["presidence"],"présidence":["presidence"],
  "داخلية":["interieur"],"intérieur":["interieur"],
  "دفاع":["defense"],"défense":["defense"],
  "بيئة":["environnement"],"environnement":["environnement"],
  "ماء":["hydraulique"],"eau":["hydraulique"],
  "تجارة":["commerce-tourisme"],"commerce":["commerce-tourisme"],
  "سكن":["habitat"],"logement":["habitat"],
  "ثقافة":["culture"],"culture":["culture"],
};

/* ─── Helpers ─────────────────────────────────────────────────────── */
function haversine(a:[number,number], b:[number,number]) {
  const R=6371, dL=(b[0]-a[0])*Math.PI/180, dl=(b[1]-a[1])*Math.PI/180;
  const s=Math.sin(dL/2)**2+Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dl/2)**2;
  return R*2*Math.atan2(Math.sqrt(s),Math.sqrt(1-s));
}
function fmtDist(km: number) { return km<1?`${Math.round(km*1000)} م`:`${km.toFixed(1)} كم`; }
function gmapsUrl(from:[number,number]|null, to:[number,number]) {
  return from
    ? `https://www.google.com/maps/dir/${from[0]},${from[1]}/${to[0]},${to[1]}`
    : `https://www.google.com/maps/search/?api=1&query=${to[0]},${to[1]}`;
}
function checkStatus(hours:string|undefined, isAr:boolean) {
  if (!hours) return null;
  const now=new Date(), day=now.getDay(), min=now.getHours()*60+now.getMinutes();
  // day 6=Saturday, day 0=Sunday — government offices closed both days in Mauritania
  if (day===6) return { open:false, text:isAr?"مغلق — السبت":"Fermé — Samedi" };
  if (day===0) return { open:false, text:isAr?"مغلق — الأحد":"Fermé — Dimanche" };
  // Match HH:MM[–-]HH:MM (supports en-dash – and regular hyphen -)
  const m=hours.match(/(\d{1,2}):(\d{2})\s*[–\-]\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const open=parseInt(m[1])*60+parseInt(m[2]), close=parseInt(m[3])*60+parseInt(m[4]);
  // Friday closes at 13:00 for government offices
  const closeNow=day===5?Math.min(close,13*60):close;
  return min>=open&&min<=closeNow
    ? { open:true,  text:isAr?`مفتوح — يغلق ${m[3]}:${m[4]}`:`Ouvert — ferme à ${m[3]}h${m[4]}` }
    : { open:false, text:isAr?`مغلق — يفتح ${m[1]}:${m[2]}`:`Fermé — ouvre à ${m[1]}h${m[2]}` };
}

/* ─── Map Icons ─────────────────────────────────────────────────── */
function pinIcon(color:string, active=false, svgStr:string=TC_SVG.ministry): L.DivIcon {
  const s = active ? 48 : 36;
  const fg = active ? "#fff" : color;
  const svgColored = svgStr.replace(/stroke="currentColor"/g, `stroke="${fg}"`);
  return L.divIcon({
    className:"",
    html:`
      <div style="position:relative;width:${s}px;height:${s+8}px">
        <div style="
          width:${s}px;height:${s}px;
          background:${active?color:"#fff"};
          border:3px solid ${color};
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:${active?`0 0 0 4px ${color}33,0 6px 20px ${color}55`:`0 3px 12px #0003`};
          display:flex;align-items:center;justify-content:center;
          transition:all .25s;
        ">
          <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;width:${Math.round(s*.6)}px;height:${Math.round(s*.6)}px">${svgColored}</div>
        </div>
        ${active?`<div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:8px;height:8px;background:${color};border-radius:50%;box-shadow:0 2px 6px ${color}88"></div>`:""}
      </div>`,
    iconSize:[s,s+8], iconAnchor:[s/2,s+8], popupAnchor:[0,-s-8],
  });
}
const myIcon = (acc:number): L.DivIcon => L.divIcon({
  className:"",
  html:`<div style="position:relative;width:24px;height:24px">
    <div style="position:absolute;inset:-${Math.min(acc/3000*40,36)}px;border-radius:50%;background:#2563eb0d;border:1.5px solid #2563eb22"></div>
    <div style="position:absolute;inset:-8px;border-radius:50%;background:#2563eb18;animation:gm-pulse 2s infinite"></div>
    <div style="width:24px;height:24px;background:#2563eb;border:3px solid #fff;border-radius:50%;box-shadow:0 3px 12px #2563eb88;display:flex;align-items:center;justify-content:center">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
    </div>
  </div>`,
  iconSize:[24,24], iconAnchor:[12,12],
});

/* ─── FlyTo ──────────────────────────────────────────────────────── */
function FlyTo({ pos, zoom }: { pos:[number,number]; zoom:number }) {
  const map = useMap();
  useEffect(() => { map.flyTo(pos, zoom, { duration:1.2, easeLinearity:.25 }); }, [pos[0],pos[1]]);
  return null;
}

/* ─── MapClickHandler ────────────────────────────────────────────── */
function MapClickHandler({ active, onPick }: { active:boolean; onPick:(pos:[number,number])=>void }) {
  const map = useMapEvents({
    click(e) { if (active) onPick([e.latlng.lat, e.latlng.lng]); },
  });
  useEffect(() => {
    map.getContainer().style.cursor = active ? "crosshair" : "";
    return () => { map.getContainer().style.cursor = ""; };
  }, [active, map]);
  return null;
}

/* ════════════════════════════════════════════════════════════════ */
export default function GovernmentMap({ lang, onBack }: Props) {
  const isAr = lang==="ar", dir = isAr?"rtl":"ltr";

  const [locs, setLocs]             = useState<Location[]>([]);
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<Location|null>(null);
  const [userPos, setUserPos]       = useState<[number,number]|null>(null);
  const [accuracy, setAccuracy]     = useState(100);
  const [locating, setLocating]     = useState(false);
  const [pinMode,  setPinMode]      = useState(false);
  const [filterType, setFilterType] = useState("");
  const [route, setRoute]           = useState<RouteInfo|null>(null);
  const [tmode, setTmode]           = useState<TMode>("car");
  const [navigating, setNavigating] = useState(false);
  const [step, setStep]             = useState(0);
  const [remainDist, setRemainDist] = useState("");
  const [arrived, setArrived]       = useState(false);
  const [news, setNews]             = useState<{id:number;title:string;url:string}[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [listening, setListening]   = useState(false);
  const [mapStyle, setMapStyle]     = useState<"street"|"satellite">("street");
  const [flyTarget, setFlyTarget]   = useState<{pos:[number,number];zoom:number}|null>(null);
  const [panel, setPanel]           = useState<Panel>("search");
  const [aiQuery, setAiQuery]       = useState("");
  const [aiAnswer, setAiAnswer]     = useState("");
  const [aiLoading, setAiLoading]   = useState(false);
  const [voiceNav, setVoiceNav]     = useState(false);
  const [toast, setToast]           = useState<{msg:string;type:"error"|"info"|"success"}|null>(null);
  const [showSteps, setShowSteps]   = useState(false);
  const [nearbyAlert, setNearbyAlert] = useState<Location|null>(null);
  const watchRef = useRef<number|null>(null);
  const lastSpoken = useRef(-1);
  const notifiedIds = useRef<Set<number>>(new Set());

  const routeColor = tmode==="car"?"#1a56db":tmode==="walk"?"#16a34a":"#ea580c";

  /* ── Inject CSS animations ── */
  useEffect(()=>{
    const s=document.createElement("style");
    s.id="gm-styles";
    s.textContent=`
      @keyframes gm-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.25;transform:scale(1.8)}}
      @keyframes gm-slidein{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}
      @keyframes gm-arrive{0%{transform:scale(.5) rotate(-15deg);opacity:0}100%{transform:none;opacity:1}}
      @keyframes gm-route{to{stroke-dashoffset:0}}
      @keyframes gm-panel{from{transform:translateX(${isAr?"-":""}100%);opacity:0}to{transform:none;opacity:1}}
      @keyframes gm-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
      .gm-list-item:hover{background:var(--green-light)!important}
    `;
    document.head.appendChild(s);
    return ()=>s.remove();
  },[]);

  /* ── Load locations ── */
  useEffect(()=>{
    fetch(`${API_BASE}/maps/government-locations/`)
      .then(r=>r.json())
      .then(d=>{ if(Array.isArray(d)) setLocs(d); else if(Array.isArray(d?.results)) setLocs(d.results); })
      .catch(()=>{});
  },[]);

  /* ── Filtered list ── */
  const displayList = (() => {
    const q=search.trim().toLowerCase();
    const slugHits=new Set<string>();
    if (q) for (const [kw,slugs] of Object.entries(KW))
      if (q.includes(kw)||kw.includes(q)) slugs.forEach(s=>slugHits.add(s));
    const base=locs.filter(l=>!filterType||l.institution_type===filterType);
    const scored=base.map(l=>{
      let sc=q?0:1;
      if (q) {
        if (slugHits.has(l.slug)) sc+=12;
        if (l.name_ar.includes(search)) sc+=8;
        if (l.name_fr?.toLowerCase().includes(q)) sc+=8;
        if (l.services?.toLowerCase().includes(q)) sc+=4;
        if (!sc) sc=(l.name_ar.includes(q)||l.name_fr?.toLowerCase().includes(q))?1:0;
      }
      return {l,sc};
    }).filter(x=>x.sc>0).sort((a,b)=>b.sc-a.sc).map(x=>x.l);
    return userPos
      ? [...scored].sort((a,b)=>haversine(userPos,[a.latitude,a.longitude])-haversine(userPos,[b.latitude,b.longitude]))
      : scored;
  })();

  /* ── GPS ── */
  const getPos = useCallback((): Promise<[number,number]> =>
    new Promise((res, rej) => {
      if (!navigator.geolocation) { rej(new Error("NO_GEOLOCATION")); return; }
      navigator.geolocation.getCurrentPosition(
        p => { const pos:[number,number]=[p.coords.latitude,p.coords.longitude]; setUserPos(pos); setAccuracy(p.coords.accuracy); res(pos); },
        rej,
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }),
  []);

  const locateMe = async () => {
    setLocating(true);
    showToast(isAr?"جاري تحديد موقعك بدقة...":"Localisation en cours...","info",12000);
    try {
      const pos = await getPos();
      setFlyTarget({ pos, zoom:16 });
      // Read current accuracy from state is async; use ref approach via callback
      setAccuracy(acc => {
        const msg = acc < 50
          ? (isAr?`✅ تم تحديد موقعك بدقة ±${Math.round(acc)} م`:`✅ Localisé — précision ±${Math.round(acc)} m`)
          : acc < 500
          ? (isAr?`⚠️ موقعك تقريبي — دقة ±${Math.round(acc)} م`:`⚠️ Position approx. — ±${Math.round(acc)} m`)
          : (isAr?`❌ دقة ضعيفة جداً ±${Math.round(acc/1000)} كم — استخدم هاتفك مع GPS`:`❌ Très faible précision ±${Math.round(acc/1000)} km — utilisez un téléphone GPS`);
        const type = acc < 200 ? "success" : "error";
        setTimeout(() => showToast(msg, type, 5000), 0);
        return acc;
      });
      // Auto-calculate route if a location is already selected
      if (selected) {
        setRemainDist(fmtDist(haversine(pos,[selected.latitude,selected.longitude])));
        showToast(isAr?"جاري حساب المسار...":"Calcul du trajet...","info",3000);
        const r = await fetchRoute(pos,[selected.latitude,selected.longitude]);
        if (r) { setRoute(r); showToast(isAr?"المسار جاهز":"Trajet prêt","success",2000); }
        else    showToast(isAr?"تعذّر حساب المسار، جرّب Google Maps":"Trajet non disponible","error",4000);
      }
    } catch (err: unknown) {
      const code = (err as GeolocationPositionError)?.code;
      const msg = code === 1
        ? (isAr
            ? "🔒 تم رفض إذن الموقع — اضغط على 🔒 بجوار عنوان الموقع ثم اختر «السماح» وأعد المحاولة. يمكنك البحث يدوياً عن المؤسسات من القائمة"
            : "🔒 Permission refusée — cliquez sur 🔒 dans la barre d'adresse, choisissez «Autoriser» puis réessayez. Vous pouvez aussi chercher manuellement")
        : code === 2
        ? (isAr ? "❌ GPS غير متاح — تأكد من تفعيل الموقع في إعدادات هاتفك" : "❌ GPS indisponible — activez la localisation dans les paramètres")
        : code === 3
        ? (isAr ? "⏱️ انتهت المهلة — اذهب إلى مكان مكشوف وأعد المحاولة" : "⏱️ Délai dépassé — allez à l'extérieur et réessayez")
        : (isAr ? "❌ المتصفح لا يدعم GPS — جرب Chrome أو Safari" : "❌ GPS non supporté — essayez Chrome ou Safari");
      showToast(msg, "error", 8000);
    }
    setLocating(false);
  };

  /* ── Live tracking ── */
  const startTrack = useCallback(()=>{
    if (watchRef.current!==null) return;
    watchRef.current=navigator.geolocation.watchPosition(
      p=>{
        const pos:[number,number]=[p.coords.latitude,p.coords.longitude];
        setUserPos(pos); setAccuracy(p.coords.accuracy);
        if (selected) {
          const d=haversine(pos,[selected.latitude,selected.longitude]);
          setRemainDist(fmtDist(d));
          if (d<0.05&&!arrived) setArrived(true);
        }
        // Proximity alert: notify when within 300m of any institution
        setLocs(current=>{
          for (const loc of current) {
            if (notifiedIds.current.has(loc.id)) continue;
            if (haversine(pos,[loc.latitude,loc.longitude]) < 0.3) {
              notifiedIds.current.add(loc.id);
              setNearbyAlert(loc);
              setTimeout(()=>setNearbyAlert(null), 8000);
            }
          }
          return current;
        });
      },
      ()=>{},
      {enableHighAccuracy:true, timeout:15000, maximumAge:5000}
    );
  },[selected,arrived]);

  const stopTrack=useCallback(()=>{
    if (watchRef.current!==null){ navigator.geolocation.clearWatch(watchRef.current); watchRef.current=null; }
  },[]);

  useEffect(()=>{ if(navigating||userPos) startTrack(); if(!navigating&&!userPos) stopTrack(); return stopTrack; },[navigating,userPos]);

  /* ── OSRM route — tries driving profile first, falls back to foot ── */
  const fetchRoute = async (from:[number,number], to:[number,number], mode:TMode=tmode): Promise<RouteInfo|null> => {
    const profile = mode==="walk"?"foot":mode==="bike"?"bike":"driving";
    const osrmUrl = (p:string) =>
      `https://router.project-osrm.org/route/v1/${p}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`;
    const tryFetch = async (url:string): Promise<any|null> => {
      try {
        const ctrl=new AbortController();
        const t=setTimeout(()=>ctrl.abort(),10000);
        const r=await fetch(url,{signal:ctrl.signal});
        clearTimeout(t);
        const d=await r.json();
        return d.code==="Ok"&&d.routes?.length?d:null;
      } catch { return null; }
    };
    let d=await tryFetch(osrmUrl(profile));
    // fallback: if walking/bike profile fails, try driving
    if (!d&&profile!=="driving") d=await tryFetch(osrmUrl("driving"));
    if (!d) return null;
    const rt=d.routes[0];
    const steps:RouteStep[]=(rt.legs?.[0]?.steps||[]).slice(0,15).map((s:any)=>{
      const type=s.maneuver?.type??""; const mod=s.maneuver?.modifier??"";
      const key=mod?`${type}-${mod}`:type;
      const AR:Record<string,string>={"turn-left":"انعطف يساراً","turn-right":"انعطف يميناً","turn-slight-left":"انعطف قليلاً يساراً","turn-slight-right":"انعطف قليلاً يميناً","turn-sharp-left":"انعطف حاداً يساراً","turn-sharp-right":"انعطف حاداً يميناً","straight":"استمر في الطريق","continue":"استمر","merge":"اندمج في المسار","ramp":"اسلك المنحدر","fork":"خذ الانعطاف","roundabout":"دوّار","rotary":"دوّار كبير","arrive":"وصلت إلى الوجهة","depart":"انطلق","exit roundabout":"اخرج من الدوّار"};
      const FR:Record<string,string>={"turn-left":"Tournez à gauche","turn-right":"Tournez à droite","turn-slight-left":"Légèrement à gauche","turn-slight-right":"Légèrement à droite","turn-sharp-left":"Virage serré à gauche","turn-sharp-right":"Virage serré à droite","straight":"Continuez tout droit","continue":"Continuez","merge":"Fusionnez","ramp":"Prenez la rampe","fork":"Prenez l'embranchement","roundabout":"Rond-point","rotary":"Grand rond-point","arrive":"Vous êtes arrivé","depart":"Démarrez","exit roundabout":"Sortez du rond-point"};
      const map=isAr?AR:FR;
      const instruction=map[key]||map[type]||(s.name?(isAr?`استمر في ${s.name}`:`Continuez sur ${s.name}`):(isAr?"استمر في الطريق":"Continuez tout droit"));
      const distance=s.distance>1000?`${(s.distance/1000).toFixed(1)} ${isAr?"كم":"km"}`:`${Math.round(s.distance)} ${isAr?"م":"m"}`;
      return {instruction,distance};
    });
    const polyline=rt.geometry?.coordinates?.map((c:number[])=>[c[1],c[0]] as [number,number])||[];
    const drivingMin=Math.round(rt.duration/60);
    return { distanceKm:(rt.distance/1000).toFixed(1), drivingMin, walkingMin:Math.round(drivingMin*5.2), bikeMin:Math.round(drivingMin*2.5), steps, polyline };
  };

  /* ── Select institution ── */
  const selectLoc = async (loc:Location) => {
    setSelected(loc); setPanel("detail");
    setRoute(null); setNavigating(false); setArrived(false); setStep(0); setShowSteps(false);
    setFlyTarget({ pos:[loc.latitude,loc.longitude], zoom:16 });
    let pos=userPos;
    // Try to get GPS if not already known
    if (!pos) {
      showToast(isAr?"جاري تحديد موقعك...":"Localisation en cours...","info",3000);
      try { pos=await getPos(); }
      catch {
        showToast(isAr?"لم يتم تحديد موقعك — فعّل GPS":"Position inconnue — activez le GPS","error",5000);
      }
    }
    if (pos) {
      setRemainDist(fmtDist(haversine(pos,[loc.latitude,loc.longitude])));
      showToast(isAr?"جاري حساب أفضل مسار...":"Calcul du meilleur trajet...","info",4000);
      const r=await fetchRoute(pos,[loc.latitude,loc.longitude]);
      if (r) {
        setRoute(r);
        showToast(isAr?`المسار جاهز — ${r.distanceKm} كم (${r.drivingMin} دقيقة)`:`Trajet prêt — ${r.distanceKm} km (${r.drivingMin} min)`,"success",3000);
      } else {
        showToast(isAr?"تعذّر حساب المسار، استخدم Google Maps":"Trajet non calculable, utilisez Google Maps","error",5000);
      }
    }
    setNewsLoading(true);
    fetch(`${API_BASE}/articles/?source=${loc.slug}&per_source=4`)
      .then(r=>r.json())
      .then(d=>setNews((d.results||d||[]).slice(0,4)))
      .catch(()=>setNews([]))
      .finally(()=>setNewsLoading(false));
  };

  /* ── Re-fetch route when transport mode changes ── */
  useEffect(()=>{
    if (!selected||!userPos||navigating) return;
    setRoute(null);
    fetchRoute(userPos,[selected.latitude,selected.longitude],tmode).then(r=>{ if(r) setRoute(r); });
  },[tmode]);

  /* ── Voice input ── */
  const startVoice = () => {
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r=new SR(); r.lang=isAr?"ar-SA":"fr-FR"; r.interimResults=false;
    setListening(true);
    r.onresult=(e:any)=>{ setSearch(e.results[0][0].transcript); setListening(false); };
    r.onerror=()=>setListening(false);
    r.start();
  };

  /* ── TTS ── */
  const speak = (text:string) => {
    if (!voiceNav||!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.lang=isAr?"ar-SA":"fr-FR"; u.rate=0.92;
    window.speechSynthesis.speak(u);
  };

  useEffect(()=>{
    if (!navigating||!route||step===lastSpoken.current) return;
    lastSpoken.current=step;
    const s=route.steps[step];
    if (s) speak(isAr?`بعد ${s.distance} — ${s.instruction||"استمر"}`:`Dans ${s.distance} — ${s.instruction||"Continuez"}`);
  },[step,navigating]);

  useEffect(()=>{
    if (arrived&&navigating) speak(isAr?"وصلت إلى وجهتك!":"Vous êtes arrivé à destination!");
  },[arrived]);

  /* ── Start navigation ── */
  const startNav = () => {
    if (!userPos||!route) return;
    setNavigating(true); setStep(0); lastSpoken.current=-1;
    setPanel("nav");
    setFlyTarget({ pos:userPos, zoom:16 });
    if (voiceNav) speak(isAr?`تم تشغيل الملاحة. وجهتك: ${selected?.name_ar}. المسافة: ${route.distanceKm} كيلومتر`:`Navigation démarrée. Destination: ${selected?.name_fr||selected?.name_ar}. Distance: ${route.distanceKm} km`);
  };

  /* ── AI assistant ── */
  const askAI = async (q:string) => {
    const query=q.trim().toLowerCase();
    if (!query) return;
    setAiLoading(true);
    await new Promise(r=>setTimeout(r,350));
    const serviceMap:[string[],string[]][]=[
      [["مستشفى","صحة","hôpital","santé","طب","طوارئ"],["sante","health"]],
      [["تعليم","مدرسة","جامعة","education","école"],["education","enseignement"]],
      [["مالية","ضرائب","finances","impôts","اقتصاد"],["economie-finances"]],
      [["جواز","هوية","passeport","carte","وثائق"],["interieur"]],
      [["محكمة","عدل","tribunal","justice"],["justice"]],
      [["دفاع","أمن","defense","sécurité"],["defense"]],
      [["بيئة","زراعة","environment","agriculture"],["environnement","agriculture"]],
      [["نقل","طريق","transport","route"],["transports"]],
      [["طاقة","كهرباء","énergie","نفط"],["energies-petrole"]],
    ];
    const nameMatch=locs.find(l=>l.name_ar.includes(q)||(l.name_fr||"").toLowerCase().includes(query));
    if (nameMatch) {
      await selectLoc(nameMatch);
      setAiAnswer(isAr?`وجدت: ${nameMatch.name_ar}`:`Trouvé: ${nameMatch.name_fr||nameMatch.name_ar}`);
      showToast(isAr?`وجدت: ${nameMatch.name_ar}`:`Trouvé: ${nameMatch.name_fr||nameMatch.name_ar}`,"success");
      setAiLoading(false); return;
    }
    for (const [kws,slugs] of serviceMap) {
      if (kws.some(k=>query.includes(k))) {
        const matches=locs.filter(l=>slugs.some(s=>l.slug.includes(s)||(l.services||"").toLowerCase().includes(s)));
        if (matches.length) {
          const sorted=userPos?[...matches].sort((a,b)=>haversine(userPos,[a.latitude,a.longitude])-haversine(userPos,[b.latitude,b.longitude])):matches;
          const best=sorted[0];
          await selectLoc(best);
          const label=kws[0];
          const txt=isAr?`أقرب ${label}: ${best.name_ar}`:`${label} proche: ${best.name_fr||best.name_ar}`;
          setAiAnswer(txt);
          showToast(txt,"success");
          setAiLoading(false); return;
        }
      }
    }
    setSearch(q); setPanel("search");
    setAiAnswer(isAr?`🔍 عرضت نتائج: "${q}"`:`🔍 Résultats pour: "${q}"`);
    setAiLoading(false);
  };

  const travelTime=(r:RouteInfo)=>tmode==="car"?r.drivingMin:tmode==="walk"?r.walkingMin:r.bikeMin;
  const showToast=(msg:string,type:"error"|"info"|"success"="info",ms=3000)=>{ setToast({msg,type}); setTimeout(()=>setToast(null),ms); };

  const cfg = selected ? tc(selected.institution_type) : tc("ministry");
  const status = selected ? checkStatus(selected.opening_hours, isAr) : null;
  const dist = selected && userPos ? haversine(userPos,[selected.latitude,selected.longitude]) : null;

  /* ════════════════════ RENDER ════════════════════════════════════ */
  return (
    <div style={{ position:"relative", width:"100%", height:"calc(100vh - 70px)", minHeight:560, fontFamily:"Cairo,Tajawal,sans-serif", direction:dir, overflow:"hidden" }}>
      <style>{`
        .gm-step-active { background:var(--green,#0d6b3c)!important; color:#fff!important; }
        .gm-list-item:hover { background:#f0fdf4!important; }
        .gm-btn-hover:hover { opacity:.85; }
        @keyframes gm-slidein{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes gm-panel-r{from{opacity:0;transform:translateX(${isAr?"-":""}30px)}to{opacity:1;transform:none}}
        @keyframes gm-arrive{0%{transform:scale(.5) rotate(-15deg);opacity:0}100%{transform:none;opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* ═══ FULL-SCREEN MAP ═══ */}
      <div style={{ position:"absolute", inset:0, zIndex:0 }}>
        <MapContainer center={[18.0865,-15.9730]} zoom={14}
          style={{ width:"100%", height:"100%" }} zoomControl={false}
          attributionControl={false}>
          <TileLayer
            url={mapStyle==="satellite"
              ?"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              :"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
            attribution="© OpenStreetMap"
          />
          {flyTarget && <FlyTo pos={flyTarget.pos} zoom={flyTarget.zoom} />}
          <MapClickHandler active={pinMode} onPick={pos=>{
            setUserPos(pos); setAccuracy(0); setPinMode(false);
            setFlyTarget({pos,zoom:16});
            showToast(isAr?"✅ تم تحديد موقعك يدوياً":"✅ Position définie manuellement","success",3000);
            if (selected) fetchRoute(pos,[selected.latitude,selected.longitude]).then(r=>{ if(r) setRoute(r); });
          }}/>

          {/* User position */}
          {userPos && (
            <>
              <Marker position={userPos} icon={myIcon(accuracy)}>
                <Popup>
                  <b style={{fontFamily:"Cairo,sans-serif"}}>{isAr?"موقعك الحالي":"Votre position"}</b>
                  {accuracy>0&&<div style={{fontFamily:"Cairo,sans-serif",fontSize:11,color:"#888",marginTop:3}}>{isAr?`دقة: ±${Math.round(accuracy)} م`:`Précision: ±${Math.round(accuracy)} m`}</div>}
                </Popup>
              </Marker>
              <Circle center={userPos} radius={accuracy} pathOptions={{ color:"#2563eb", fillColor:"#2563eb", fillOpacity:.06, weight:1 }} />
            </>
          )}

          {/* Route polyline — dual-layer for bold look */}
          {route?.polyline && route.polyline.length>0 && (
            <>
              <Polyline positions={route.polyline} pathOptions={{ color:"#fff", weight:10, opacity:.5 }} />
              <Polyline positions={route.polyline}
                pathOptions={{ color:routeColor, weight:6, opacity:.95, lineCap:"round", lineJoin:"round", dashArray:navigating?undefined:"12,6" }} />
            </>
          )}

          {/* Destination marker (selected) */}
          {selected && (
            <Marker position={[selected.latitude,selected.longitude]} icon={pinIcon(cfg.color,true,cfg.svgPath)}>
              <Popup>
                <div style={{ fontFamily:"Cairo,sans-serif", direction:dir, minWidth:180, padding:"4px 0" }}>
                  <div style={{ fontWeight:900, fontSize:14, color:cfg.color, marginBottom:4 }}>{cfg.reactIcon} {isAr?selected.name_ar:(selected.name_fr||selected.name_ar)}</div>
                  {(selected.address||selected.address_fr) && <div style={{ fontSize:11.5, color:"#555", marginBottom:6, display:"flex", alignItems:"center", gap:4 }}><MapPin size={11}/> {isAr?(selected.address||selected.address_fr):(selected.address_fr||selected.address)}</div>}
                  {dist!==null && <div style={{ fontSize:12, fontWeight:700, color:"#0d6b3c", marginBottom:8, display:"flex", alignItems:"center", gap:4 }}><Ruler size={11}/> {fmtDist(dist)}</div>}
                  <button onClick={()=>selectLoc(selected)} style={{ width:"100%", padding:"8px", border:"none", background:cfg.color, color:"#fff", borderRadius:9, cursor:"pointer", fontWeight:800, fontSize:12.5, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                    <Navigation size={13}/> {isAr?"ابدأ التنقل":"Démarrer la navigation"}
                  </button>
                </div>
              </Popup>
            </Marker>
          )}

          {/* All other markers */}
          {locs.filter(l=>l.id!==selected?.id).map(loc=>{
            const c=tc(loc.institution_type);
            return (
              <Marker key={loc.id} position={[loc.latitude,loc.longitude]} icon={pinIcon(c.color,false,c.svgPath)}>
                <Popup>
                  <div style={{ fontFamily:"Cairo,sans-serif", direction:dir, minWidth:160 }}>
                    <div style={{ fontWeight:800, fontSize:13, marginBottom:4 }}>{c.reactIcon} {isAr?loc.name_ar:(loc.name_fr||loc.name_ar)}</div>
                    {(loc.address||loc.address_fr) && <div style={{ fontSize:11, color:"#666", marginBottom:6, display:"flex", alignItems:"center", gap:4 }}><MapPin size={10}/> {isAr?(loc.address||loc.address_fr):(loc.address_fr||loc.address)}</div>}
                    {userPos && <div style={{ fontSize:11.5, fontWeight:700, color:"#0d6b3c", marginBottom:7, display:"flex", alignItems:"center", gap:4 }}><Ruler size={10}/> {fmtDist(haversine(userPos,[loc.latitude,loc.longitude]))}</div>}
                    <button onClick={()=>selectLoc(loc)} style={{ width:"100%", padding:"8px", border:"none", background:c.color, color:"#fff", borderRadius:9, cursor:"pointer", fontWeight:800, fontSize:12, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                      {isAr?"عرض التفاصيل":"Voir les détails"} {isAr?<ChevronLeft size={12}/>:<ChevronRight size={12}/>}
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* ═══ TOP BAR ═══ */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:56, zIndex:600,
        background:"#fff", borderBottom:"1.5px solid #e8eaed",
        display:"flex", alignItems:"center", gap:8, padding:"0 14px",
        boxShadow:"0 2px 14px rgba(0,0,0,.08)",
      }}>
        <button onClick={onBack} title={isAr?"رجوع":"Retour"} style={{
          width:36, height:36, borderRadius:10, border:"none",
          background:"#f5f5f5", cursor:"pointer", fontSize:16,
          display:"flex", alignItems:"center", justifyContent:"center",
          flexShrink:0, color:"#333", transition:"background .15s",
        }} onMouseEnter={e=>(e.currentTarget.style.background="#e8e8e8")}
           onMouseLeave={e=>(e.currentTarget.style.background="#f5f5f5")}>
          {isAr?"→":"←"}
        </button>

        <div style={{ display:"flex", alignItems:"center", gap:10, flex:1 }}>
          <div style={{ width:38, height:38, borderRadius:11, background:"linear-gradient(135deg,#065f46,#0d6b3c)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Map size={20} color="#fff"/>
          </div>
          <div>
            <div style={{ fontWeight:900, fontSize:14.5, color:"#1a1a2e", lineHeight:1 }}>
              {isAr?"الخريطة الحكومية":"Carte Gouvernementale"}
            </div>
            <div style={{ fontSize:11, color:"#888", marginTop:2, display:"flex", alignItems:"center", gap:6 }}>
              <span>{isAr?`${locs.length} مؤسسة`:`${locs.length} institutions`}</span>
              {userPos && <span style={{ color:"#16a34a", fontWeight:700, display:"flex", alignItems:"center", gap:3 }}><MapPin size={10}/> {isAr?"موقعك نشط":"Position active"}</span>}
            </div>
          </div>
        </div>

        {/* Map style toggle */}
        <button onClick={()=>setMapStyle(s=>s==="street"?"satellite":"street")} title={isAr?"تغيير نمط الخريطة":"Changer le style"} style={{
          width:36, height:36, borderRadius:10, border:"1.5px solid #e8e8e8",
          background:mapStyle==="satellite"?"#1a1a2e":"#fff",
          color:mapStyle==="satellite"?"#fff":"#555",
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          flexShrink:0, transition:"all .2s",
        }}>{mapStyle==="street"?<Satellite size={17}/>:<Map size={17}/>}</button>

        {/* Voice nav toggle */}
        <button onClick={()=>setVoiceNav(v=>!v)} title={isAr?"إرشادات صوتية":"Guidage vocal"} style={{
          width:36, height:36, borderRadius:10, border:`1.5px solid ${voiceNav?"#0d6b3c":"#e8e8e8"}`,
          background:voiceNav?"#f0fdf4":"#fff", color:voiceNav?"#0d6b3c":"#aaa",
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          flexShrink:0, transition:"all .2s",
        }}><Volume2 size={17}/></button>

        {/* Locate me */}
        <button onClick={locateMe} title={isAr?"تحديد موقعي":"Me localiser"} style={{
          display:"flex", alignItems:"center", gap:6, padding:"0 14px", height:36,
          borderRadius:10, border:"none",
          background:userPos?"linear-gradient(135deg,#065f46,#0d6b3c)":"linear-gradient(135deg,#1d4ed8,#2563eb)",
          color:"#fff", cursor:"pointer", fontFamily:"inherit",
          fontWeight:800, fontSize:12.5, flexShrink:0,
          boxShadow:userPos?"0 3px 10px #0d6b3c44":"0 3px 10px #1d4ed844",
          transition:"all .2s",
        }}>
          {locating?<Loader2 size={14} style={{ animation:"spin 1s linear infinite" }}/>:<MapPin size={14}/>} {isAr?(userPos?"موقعي":"تحديد الموقع"):(userPos?"Position":"Localiser")}
        </button>

        {/* Manual pin button */}
        <button onClick={()=>setPinMode(v=>!v)}
          title={isAr?"ضع موقعك يدوياً على الخريطة":"Placer manuellement sur la carte"}
          style={{ width:36, height:36, borderRadius:10,
            border:`2px solid ${pinMode?"#1d4ed8":"#e8eaed"}`,
            background:pinMode?"#eff6ff":"#fff",
            color:pinMode?"#1d4ed8":"#777", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"all .2s", flexShrink:0 }}>
          <Crosshair size={16}/>
        </button>
      </div>

      {/* ═══ LEFT SIDEBAR — Search + List ═══ */}
      <div style={{
        position:"absolute", top:56, left:0, bottom:0, width:306, zIndex:400,
        background:"#fff", borderRight:"1.5px solid #e8eaed",
        display:"flex", flexDirection:"column",
        boxShadow:"4px 0 20px rgba(0,0,0,.06)",
      }}>

        {/* Search */}
        <div style={{ padding:"12px", borderBottom:"1px solid #eee", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"#f5f7fa", borderRadius:13, padding:"9px 12px", border:"1.5px solid #e8eaed", transition:"border-color .2s" }}
            onFocusCapture={e=>(e.currentTarget.style.borderColor="#0d6b3c")}
            onBlurCapture={e=>(e.currentTarget.style.borderColor="#e8eaed")}>
            <Search size={16} color="#aaa" style={{ flexShrink:0 }}/>
            <input value={search} onChange={e=>{ setSearch(e.target.value); if(panel!=="search") setPanel("search"); }}
              placeholder={isAr?"ابحث: مستشفى، وزارة، محكمة...":"Hôpital, ministère, tribunal..."}
              style={{ flex:1, border:"none", outline:"none", fontFamily:"inherit", fontSize:13, color:"#222", background:"transparent" }} />
            {search
              ? <button onClick={()=>setSearch("")} style={{ width:20, height:20, borderRadius:"50%", border:"none", background:"#ddd", color:"#888", cursor:"pointer", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>✕</button>
              : <button onClick={startVoice} style={{ width:28, height:28, borderRadius:8, border:"none", background:listening?"#fee2e2":"transparent", color:listening?"#dc2626":"#888", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Mic size={15}/></button>}
          </div>

          {/* Filter chips */}
          <div style={{ display:"flex", gap:6, marginTop:10, overflowX:"auto", scrollbarWidth:"none", paddingBottom:2 }}>
            {([
              {v:"",                   ar:"الكل",      fr:"Tous",         ri:<Map size={12}/>},
              {v:"ministry",           ar:"وزارات",    fr:"Ministères",   ri:<Building2 size={12}/>},
              {v:"public_institution", ar:"مؤسسات",    fr:"Institutions", ri:<Building size={12}/>},
              {v:"hospital",           ar:"مستشفيات",  fr:"Hôpitaux",     ri:<Plus size={12}/>},
              {v:"university",         ar:"جامعات",    fr:"Universités",  ri:<GraduationCap size={12}/>},
              {v:"municipality",       ar:"بلديات",    fr:"Communes",     ri:<Home size={12}/>},
              {v:"court",              ar:"محاكم",     fr:"Tribunaux",    ri:<Scale size={12}/>},
              {v:"police",             ar:"شرطة",      fr:"Police",       ri:<ShieldCheck size={12}/>},
              {v:"presidency",         ar:"رئاسة",     fr:"Présidence",   ri:<Crown size={12}/>},
              {v:"pm",                 ar:"الأولى",    fr:"Primature",    ri:<Landmark size={12}/>},
            ]).map(c=>(
              <button key={c.v} onClick={()=>setFilterType(c.v)} style={{
                padding:"6px 11px", borderRadius:20, border:"none",
                background:filterType===c.v?"#0d6b3c":"#f0f0f0",
                color:filterType===c.v?"#fff":"#555",
                fontSize:11.5, fontWeight:700, cursor:"pointer",
                fontFamily:"inherit", whiteSpace:"nowrap",
                flexShrink:0, transition:"all .18s",
                display:"flex", alignItems:"center", gap:5,
              }}>{c.ri} {isAr?c.ar:c.fr}</button>
            ))}
          </div>
        </div>

        {/* Count bar */}
        <div style={{
          padding:"7px 14px", flexShrink:0, borderBottom:"1px solid #f0f0f0",
          background:userPos?"#f0fdf4":"#fafafa",
          fontSize:11, fontWeight:700,
          color:userPos?"#0d6b3c":"#888",
          display:"flex", alignItems:"center", gap:6,
        }}>
          {userPos
            ? <><MapPin size={13}/> {displayList.length} {isAr?"مؤسسة — مرتّبة بالقرب":"institutions — par proximité"}</>
            : <><Building2 size={13}/> {displayList.length} {isAr?"مؤسسة حكومية":"institutions"}</>}
        </div>

        {/* Institutions list */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {displayList.length===0 ? (
            <div style={{ textAlign:"center", padding:"40px 20px", color:"#bbb", display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
              <Search size={36} color="#ccc"/>
              <div style={{ fontSize:13 }}>{isAr?"لا توجد نتائج":"Aucun résultat"}</div>
            </div>
          ) : displayList.map((loc,i)=>{
            const c   = tc(loc.institution_type);
            const d   = userPos ? haversine(userPos,[loc.latitude,loc.longitude]) : null;
            const st  = checkStatus(loc.opening_hours, isAr);
            const sel = selected?.id===loc.id;
            return (
              <div key={loc.id} className="gm-list-item" onClick={()=>selectLoc(loc)} style={{
                padding:"12px 14px", cursor:"pointer",
                borderBottom:"1px solid #f0f0f0",
                background:sel?"#f0fdf4":"transparent",
                borderLeft:sel?`3px solid ${c.color}`:"3px solid transparent",
                transition:"all .15s",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{
                    width:42, height:42, borderRadius:13, background:c.color,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    color:"#fff", flexShrink:0, boxShadow:`0 3px 10px ${c.color}33`,
                  }}>{c.reactIcon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:800, color:"#1a1a2e", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {isAr?loc.name_ar:(loc.name_fr||loc.name_ar)}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:3 }}>
                      <span style={{ fontSize:10, color:c.color, fontWeight:700 }}>{isAr?c.ar:c.fr}</span>
                      {st && (
                        <span style={{ fontSize:10, fontWeight:800, color:st.open?"#16a34a":"#dc2626", display:"flex", alignItems:"center", gap:2 }}>
                          <span style={{ width:5, height:5, borderRadius:"50%", background:st.open?"#16a34a":"#dc2626", display:"inline-block" }} />
                          {st.open?(isAr?"مفتوح":"Ouvert"):(isAr?"مغلق":"Fermé")}
                        </span>
                      )}
                    </div>
                    {loc.address && <div style={{ fontSize:10.5, color:"#aaa", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{loc.address}</div>}
                  </div>
                  <div style={{ flexShrink:0, textAlign:"center", minWidth:38 }}>
                    {d!==null ? (
                      <>
                        <div style={{ fontSize:11.5, fontWeight:900, color:"#0d6b3c" }}>{fmtDist(d)}</div>
                        <div style={{ fontSize:9, color:"#bbb" }}>{isAr?"منك":"de vous"}</div>
                      </>
                    ) : <span style={{ fontSize:10, color:"#ccc", background:"#f5f5f5", padding:"2px 6px", borderRadius:20 }}>#{i+1}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Assistant — bottom of left sidebar */}
        <div style={{ borderTop:"2px solid #ede9fe", padding:"10px 12px", background:"linear-gradient(135deg,#f5f3ff,#faf5ff)", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
            <div style={{ width:26, height:26, borderRadius:8, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {aiLoading ? <Loader2 size={14} color="#fff" style={{ animation:"spin 1s linear infinite" }}/> : <Bot size={14} color="#fff"/>}
            </div>
            <span style={{ fontWeight:800, fontSize:12, color:"#3730a3" }}>{isAr?"المساعد الذكي":"Assistant IA"}</span>
          </div>
          {aiAnswer && (
            <div style={{ fontSize:11.5, color:"#4c1d95", fontWeight:700, background:"rgba(255,255,255,.75)", borderRadius:9, padding:"6px 10px", marginBottom:7, lineHeight:1.5 }}>{aiAnswer}</div>
          )}
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:7 }}>
            {(isAr
              ? [{q:"مستشفى",i:<Plus size={10}/>},{q:"جواز",i:<MapPin size={10}/>},{q:"محكمة",i:<Scale size={10}/>},{q:"مالية",i:<Building2 size={10}/>},{q:"نقل",i:<Car size={10}/>},{q:"بيئة",i:<Globe size={10}/>}]
              : [{q:"Hôpital",i:<Plus size={10}/>},{q:"Passeport",i:<MapPin size={10}/>},{q:"Tribunal",i:<Scale size={10}/>},{q:"Finances",i:<Building2 size={10}/>},{q:"Transport",i:<Car size={10}/>},{q:"Env.",i:<Globe size={10}/>}]
            ).map(({q,i})=>(
              <button key={q} onClick={()=>askAI(q)} style={{
                padding:"3px 9px", borderRadius:20, border:"1.5px solid #6366f133",
                background:"rgba(255,255,255,.85)", color:"#4c1d95",
                fontSize:10.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
                display:"flex", alignItems:"center", gap:4,
              }}>{i}{q}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:5 }}>
            <input value={aiQuery} onChange={e=>setAiQuery(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&aiQuery.trim()){ askAI(aiQuery); setAiQuery(""); } }}
              placeholder={isAr?"اسأل عن أي مؤسسة...":"Demandez n'importe quoi..."}
              style={{ flex:1, padding:"8px 11px", border:"2px solid #6366f133", borderRadius:11, fontFamily:"inherit", fontSize:12, outline:"none", background:"rgba(255,255,255,.9)", color:"#222" }} />
            <button onClick={()=>{ if(aiQuery.trim()){ askAI(aiQuery); setAiQuery(""); } }} disabled={aiLoading}
              style={{ width:34, height:34, borderRadius:10, border:"none", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><CornerDownLeft size={14}/></button>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL — Detail / Nav (slides in over map) ═══ */}
      {(panel==="detail"||panel==="nav") && selected && (
        <div style={{
          position:"absolute", top:56, right:0, bottom:0, width:340, zIndex:400,
          background:"#fff", boxShadow:"-4px 0 24px rgba(0,0,0,.1)",
          display:"flex", flexDirection:"column",
          animation:"gm-panel-r .22s ease",
        }}>

          {/* ── DETAIL PANEL ── */}
          {panel==="detail" && (
            <>
              {/* Header gradient */}
              <div style={{ background:`linear-gradient(150deg,${cfg.color}ee,${cfg.color})`, padding:"14px 14px 16px", color:"#fff", flexShrink:0, position:"relative" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                  <button onClick={()=>{ setSelected(null); setPanel("search"); setRoute(null); }} style={{ width:32, height:32, borderRadius:9, border:"none", background:"rgba(255,255,255,.2)", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><X size={14}/></button>
                  <div style={{ flex:1, fontSize:10.5, opacity:.8, fontWeight:700 }}>{isAr?"تفاصيل المؤسسة":"Détails de l'institution"}</div>
                  <button onClick={()=>window.open(gmapsUrl(userPos,[selected.latitude,selected.longitude]),"_blank")} title="Google Maps" style={{ width:32, height:32, borderRadius:9, border:"none", background:"rgba(255,255,255,.15)", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><ExternalLink size={14}/></button>
                </div>

                <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:14 }}>
                  <div style={{ width:52, height:52, borderRadius:15, background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", flexShrink:0, border:"2px solid rgba(255,255,255,.35)", backdropFilter:"blur(8px)" }}>
                    {cfg.reactIcon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:900, fontSize:14.5, lineHeight:1.35 }}>{isAr?selected.name_ar:(selected.name_fr||selected.name_ar)}</div>
                    <div style={{ fontSize:11.5, opacity:.8, marginTop:2 }}>{isAr?cfg.ar:cfg.fr}</div>
                    {status && (
                      <div style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:5, background:status.open?"rgba(74,222,128,.22)":"rgba(248,113,113,.22)", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background:status.open?"#4ade80":"#f87171", display:"inline-block" }} />
                        {status.text}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:7 }}>
                  {[
                    { val:dist!==null?fmtDist(dist):"—",         label:isAr?"المسافة":"Distance",   icon:<Ruler size={14}/> },
                    { val:route?`${travelTime(route)} د`:"—",     label:isAr?"المدة":"Durée",         icon:<Timer size={14}/> },
                    { val:route?`${route.distanceKm} كم`:"—",    label:isAr?"الطريق":"Trajet",       icon:<Navigation size={14}/> },
                  ].map((s,i)=>(
                    <div key={i} style={{ background:"rgba(255,255,255,.16)", borderRadius:11, padding:"9px 6px", textAlign:"center", backdropFilter:"blur(6px)" }}>
                      <div style={{ display:"flex", justifyContent:"center" }}>{s.icon}</div>
                      <div style={{ fontWeight:900, fontSize:14, marginTop:2 }}>{s.val}</div>
                      <div style={{ fontSize:9, opacity:.8, marginTop:1 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transport mode selector */}
              {(route||!userPos) && (
                <div style={{ display:"flex", gap:6, padding:"10px 12px", background:"#fafafa", borderBottom:"1px solid #eee", flexShrink:0 }}>
                  {([
                    {k:"car"  as TMode, icon:<Car size={17}/>,            ar:"سيارة",fr:"Voiture"},
                    {k:"walk" as TMode, icon:<PersonStanding size={17}/>,   ar:"مشياً", fr:"À pied"},
                    {k:"bike" as TMode, icon:<Bike size={17}/>,             ar:"دراجة", fr:"Vélo"},
                  ]).map(m=>(
                    <button key={m.k} onClick={()=>setTmode(m.k)} style={{
                      flex:1, padding:"8px 4px", borderRadius:12,
                      border:`2px solid ${tmode===m.k?routeColor:"#e8e8e8"}`,
                      background:tmode===m.k?routeColor+"15":"transparent",
                      color:tmode===m.k?routeColor:"#aaa",
                      fontWeight:800, fontSize:11, cursor:"pointer",
                      fontFamily:"inherit", textAlign:"center", transition:"all .2s",
                    }}>
                      <div style={{ display:"flex", justifyContent:"center" }}>{m.icon}</div>
                      <div style={{ fontSize:10, marginTop:1 }}>{route?`${travelTime(route)} ${isAr?"د":"min"}`:"—"}</div>
                      <div style={{ fontSize:9.5, opacity:.7 }}>{isAr?m.ar:m.fr}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Scrollable content */}
              <div style={{ flex:1, overflowY:"auto", padding:"12px" }}>
                {(selected.address||selected.address_fr) && (
                  <InfoCard icon={<MapPin size={18}/>} bg="#f8f9fa" border="#eee" label={isAr?"العنوان":"Adresse"}>
                    <div style={{ fontSize:12.5, fontWeight:600, color:"#222", lineHeight:1.5 }}>
                      {isAr ? (selected.address||selected.address_fr) : (selected.address_fr||selected.address)}
                    </div>
                  </InfoCard>
                )}
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} style={{ textDecoration:"none", display:"block" }}>
                    <InfoCard icon={<Phone size={18}/>} bg="#f0fdf4" border="#bbf7d0" label={isAr?"اتصل مباشرة":"Appeler"} action={isAr?"اتصل":"Appeler"} actionColor="#16a34a">
                      <div style={{ fontSize:14, color:"#16a34a", fontWeight:900 }}>{selected.phone}</div>
                    </InfoCard>
                  </a>
                )}
                {selected.website && (
                  <a href={selected.website} target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none", display:"block" }}>
                    <InfoCard icon={<Globe size={18}/>} bg="#eff6ff" border="#bfdbfe" label={isAr?"الموقع الرسمي":"Site officiel"}>
                      <div style={{ fontSize:12, color:"#1d4ed8", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {selected.website.replace(/https?:\/\//,"")}
                      </div>
                    </InfoCard>
                  </a>
                )}
                {selected.opening_hours && (
                  <InfoCard icon={<Clock size={18}/>} bg="#fffbeb" border="#fde68a" label={isAr?"أوقات العمل":"Horaires"}>
                    <div style={{ fontSize:12.5, color:"#92400e", fontWeight:600 }}>{selected.opening_hours}</div>
                  </InfoCard>
                )}
                {selected.services && (
                  <InfoCard icon={<Settings size={18}/>} bg="#f0f9ff" border="#bae6fd" label={isAr?"الخدمات":"Services"}>
                    <div style={{ fontSize:12, color:"#0369a1", fontWeight:600, lineHeight:1.6 }}>{selected.services}</div>
                  </InfoCard>
                )}

                {/* Route steps */}
                {route && route.steps.length>0 && (
                  <div style={{ background:"#f8f9fa", borderRadius:14, marginBottom:10, border:"1.5px solid #eee", overflow:"hidden" }}>
                    <button onClick={()=>setShowSteps(v=>!v)}
                      style={{ width:"100%", padding:"11px 14px", border:"none", background:"transparent", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", fontFamily:"inherit" }}>
                      <span style={{ fontWeight:800, fontSize:12.5, color:"#1a1a2e", display:"flex", alignItems:"center", gap:6 }}><Map size={14}/> {isAr?`خطوات الطريق (${route.steps.length})`:`Étapes (${route.steps.length})`}</span>
                      <ChevronDown size={14} color="#888" style={{ transform:showSteps?"rotate(180deg)":"none", transition:"transform .2s" }}/>
                    </button>
                    {showSteps && (
                      <div style={{ borderTop:"1px solid #eee" }}>
                        {route.steps.map((s,i)=>(
                          <div key={i} className={i===step&&navigating?"gm-step-active":""} style={{ display:"flex", gap:9, padding:"9px 14px", borderBottom:i<route.steps.length-1?"1px solid #f0f0f0":"none" }}>
                            <div style={{ width:22, height:22, borderRadius:"50%", background:"#0d6b3c", color:"#fff", fontWeight:900, fontSize:10, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{i+1}</div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:12, fontWeight:700, color:"#222" }}>{s.instruction||"استمر في الطريق"}</div>
                              <div style={{ fontSize:10.5, color:"#888", marginTop:1 }}>{s.distance}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* News */}
                {(news.length>0||newsLoading) && (
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontWeight:800, fontSize:12, color:"#555", marginBottom:7, display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ width:3, height:14, background:"#0d6b3c", borderRadius:2, display:"inline-block" }} />
                      {isAr?"آخر الأخبار":"Actualités récentes"}
                    </div>
                    {newsLoading
                      ? <div style={{ color:"#bbb", fontSize:12, display:"flex", alignItems:"center", gap:5 }}><Loader2 size={13} style={{ animation:"spin 1s linear infinite" }}/> {isAr?"جاري التحميل...":"Chargement..."}</div>
                      : news.map(n=>(
                        <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer"
                          style={{ display:"flex", gap:8, padding:"8px 0", borderBottom:"1px solid #f0f0f0", textDecoration:"none", alignItems:"flex-start" }}
                          onMouseEnter={e=>(e.currentTarget.style.opacity=".75")}
                          onMouseLeave={e=>(e.currentTarget.style.opacity="1")}>
                          <span style={{ width:5, height:5, borderRadius:"50%", background:"#0d6b3c", marginTop:6, flexShrink:0 }} />
                          <span style={{ fontSize:12, color:"#333", lineHeight:1.6 }}>{n.title}</span>
                        </a>
                      ))}
                  </div>
                )}
              </div>

              {/* Action bar */}
              <div style={{ padding:"10px 12px", background:"#fff", borderTop:"1.5px solid #eee", display:"flex", flexDirection:"column", gap:8, flexShrink:0 }}>
                {/* Voice nav toggle */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"2px 0" }}>
                  <span style={{ fontSize:11.5, fontWeight:700, color:"#555", display:"flex", alignItems:"center", gap:5 }}><Volume2 size={14}/> {isAr?"إرشادات صوتية":"Guidage vocal"}</span>
                  <button onClick={()=>setVoiceNav(v=>!v)} style={{ width:42, height:22, borderRadius:11, border:"none", cursor:"pointer", background:voiceNav?"#0d6b3c":"#ddd", position:"relative", transition:"background .2s" }}>
                    <div style={{ position:"absolute", top:3, left:voiceNav?"21px":"3px", width:16, height:16, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 4px #0003" }} />
                  </button>
                </div>

                {!userPos ? (
                  <button onClick={locateMe} style={{ width:"100%", padding:"13px", borderRadius:13, border:"none", background:"#1d4ed8", color:"#fff", fontWeight:900, fontSize:13.5, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:9 }}>
                    <MapPin size={16}/> {isAr?"حدد موقعي أولاً":"Me localiser d'abord"}
                  </button>
                ) : !route ? (
                  <div style={{ width:"100%", padding:"13px", borderRadius:13, background:"#f0f0f0", color:"#aaa", fontWeight:800, fontSize:13, textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    <Loader2 size={16} style={{ animation:"spin 1s linear infinite" }}/> {isAr?"جاري حساب المسار...":"Calcul en cours..."}
                  </div>
                ) : (
                  <button onClick={startNav}
                    style={{ width:"100%", padding:"14px", borderRadius:13, border:"none", background:"linear-gradient(135deg,#065f3c,#0d6b3c,#16a34a)", color:"#fff", fontWeight:900, fontSize:14, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:12, boxShadow:"0 5px 20px #0d6b3c44", transition:"transform .15s" }}
                    onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.015)")}
                    onMouseLeave={e=>(e.currentTarget.style.transform="")}>
                    <Navigation size={20}/>
                    <div style={{ textAlign:"start" }}>
                      <div>{isAr?"ابدأ التنقل الآن":"Démarrer la navigation"}</div>
                      <div style={{ fontSize:11, opacity:.85, fontWeight:600, marginTop:1, display:"flex", alignItems:"center", gap:4 }}>{route.distanceKm} {isAr?"كم":"km"} • {travelTime(route)} {isAr?"دقيقة":"min"} • {tmode==="car"?<Car size={11}/>:tmode==="walk"?<PersonStanding size={11}/>:<Bike size={11}/>}</div>
                    </div>
                  </button>
                )}
              </div>
            </>
          )}

          {/* ── NAV PANEL ── */}
          {panel==="nav" && route && (
            <div style={{ display:"flex", flexDirection:"column", height:"100%", animation:"gm-slidein .2s ease" }}>
              {/* Nav header */}
              <div style={{ background:arrived?"#0d6b3c":"#1d4ed8", padding:"14px 14px 16px", color:"#fff", flexShrink:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:11, opacity:.8, fontWeight:700, display:"flex", alignItems:"center", gap:4 }}><Navigation size={12}/> {isAr?"التنقل نشط":"Navigation active"}</span>
                  <div style={{ flex:1 }} />
                  <button onClick={()=>{ setNavigating(false); setPanel("detail"); window.speechSynthesis?.cancel(); }}
                    style={{ padding:"4px 10px", borderRadius:8, border:"none", background:"rgba(255,255,255,.2)", color:"#fff", cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit", display:"flex", alignItems:"center", gap:4 }}>
                    <Square size={11}/> {isAr?"إيقاف":"Arrêter"}
                  </button>
                  <button onClick={()=>setFlyTarget({ pos:userPos||[selected.latitude,selected.longitude], zoom:16 })}
                    style={{ width:30, height:30, borderRadius:8, border:"none", background:"rgba(255,255,255,.15)", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Crosshair size={14}/></button>
                </div>
                <div style={{ fontWeight:900, fontSize:14, lineHeight:1.35, marginBottom:12 }}>
                  {isAr?selected.name_ar:(selected.name_fr||selected.name_ar)}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <div style={{ background:"rgba(255,255,255,.18)", borderRadius:12, padding:"10px 12px", backdropFilter:"blur(6px)" }}>
                    <div style={{ fontSize:9.5, opacity:.8, marginBottom:3 }}>{isAr?"المتبقي":"Restant"}</div>
                    <div style={{ fontWeight:900, fontSize:22 }}>{remainDist||route.distanceKm+" كم"}</div>
                  </div>
                  <div style={{ background:"rgba(255,255,255,.18)", borderRadius:12, padding:"10px 12px", backdropFilter:"blur(6px)" }}>
                    <div style={{ fontSize:9.5, opacity:.8, marginBottom:3 }}>{isAr?"الوقت":"Durée"}</div>
                    <div style={{ fontWeight:900, fontSize:22 }}>{travelTime(route)} <span style={{ fontSize:13 }}>{isAr?"د":"min"}</span></div>
                  </div>
                </div>
              </div>

              {!arrived ? (
                <>
                  {/* Current step */}
                  <div style={{ padding:"13px 14px", background:"#fff", borderBottom:"1px solid #eee", flexShrink:0 }}>
                    <div style={{ fontSize:10, color:"#aaa", fontWeight:700, marginBottom:5 }}>{isAr?"الخطوة":"Étape"} {step+1}/{route.steps.length}</div>
                    <div style={{ fontWeight:900, fontSize:14, color:"#1a1a2e", lineHeight:1.5, marginBottom:7 }}>
                      {route.steps[step]?.instruction||(isAr?"استمر في الطريق":"Continuez tout droit")}
                    </div>
                    <div style={{ fontSize:12.5, color:"#555" }}>{isAr?"بعد":"Dans"} <span style={{ color:"#1d4ed8", fontWeight:900 }}>{route.steps[step]?.distance}</span></div>
                    <div style={{ marginTop:10, background:"#e5e7eb", borderRadius:20, height:5, overflow:"hidden" }}>
                      <div style={{ height:5, borderRadius:20, background:"linear-gradient(90deg,#1d4ed8,#60a5fa)", width:`${((step+1)/route.steps.length)*100}%`, transition:"width .4s" }} />
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, fontSize:10, color:"#bbb" }}>
                      <span>{isAr?"البداية":"Départ"}</span>
                      <span>{Math.round((step+1)/route.steps.length*100)}%</span>
                      <span>{isAr?"الوصول":"Arrivée"}</span>
                    </div>
                  </div>

                  {/* Step controls */}
                  <div style={{ display:"flex", gap:8, padding:"10px 14px", background:"#f8f8f8", borderBottom:"1px solid #eee", flexShrink:0 }}>
                    <button disabled={step===0} onClick={()=>setStep(s=>s-1)}
                      style={{ flex:1, padding:"10px", border:"1.5px solid #e0e0e0", borderRadius:11, background:step===0?"#f5f5f5":"#fff", color:step===0?"#ccc":"#333", cursor:step===0?"not-allowed":"pointer", fontWeight:800, fontSize:13, fontFamily:"inherit" }}>
                      {isAr?"▶ السابق":"◀ Préc."}
                    </button>
                    <button disabled={step>=route.steps.length-1} onClick={()=>setStep(s=>s+1)}
                      style={{ flex:1, padding:"10px", border:"none", borderRadius:11, background:step>=route.steps.length-1?"#ddd":"#1d4ed8", color:"#fff", cursor:step>=route.steps.length-1?"not-allowed":"pointer", fontWeight:800, fontSize:13, fontFamily:"inherit" }}>
                      {isAr?"◀ التالي":"Suiv. ▶"}
                    </button>
                  </div>

                  {/* Steps list */}
                  <div style={{ flex:1, overflowY:"auto" }}>
                    {route.steps.map((s,i)=>(
                      <div key={i} onClick={()=>setStep(i)}
                        style={{ display:"flex", gap:10, padding:"10px 14px", borderBottom:"1px solid #f0f0f0", cursor:"pointer", background:i===step?"#eff6ff":"transparent", transition:"background .15s" }}>
                        <div style={{ width:24, height:24, borderRadius:"50%", background:i===step?"#1d4ed8":i<step?"#0d6b3c":"#e5e7eb", color:"#fff", fontWeight:900, fontSize:10, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          {i<step?<Check size={10} strokeWidth={3}/>:i+1}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:i===step?"#1d4ed8":"#333" }}>{s.instruction||"استمر"}</div>
                          <div style={{ fontSize:10.5, color:"#aaa", marginTop:2 }}>{s.distance}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, textAlign:"center", animation:"gm-arrive .5s ease" }}>
                  <PartyPopper size={60} color="#0d6b3c" strokeWidth={1.5}/>
                  <div style={{ fontWeight:900, fontSize:20, color:"#0d6b3c", marginTop:10 }}>{isAr?"وصلت إلى وجهتك!":"Vous êtes arrivé!"}</div>
                  <div style={{ fontSize:13, color:"#555", marginTop:6, lineHeight:1.6 }}>{isAr?selected.name_ar:(selected.name_fr||selected.name_ar)}</div>
                  {selected.phone && (
                    <a href={`tel:${selected.phone}`} style={{ marginTop:18, display:"flex", alignItems:"center", gap:8, padding:"11px 22px", background:"#0d6b3c", color:"#fff", borderRadius:13, textDecoration:"none", fontWeight:800, fontSize:13 }}>
                      <Phone size={14}/> {isAr?"اتصل بهم الآن":"Les appeler"}
                    </a>
                  )}
                  <button onClick={()=>{ setNavigating(false); setPanel("detail"); setArrived(false); }}
                    style={{ marginTop:10, padding:"9px 20px", borderRadius:12, border:"1.5px solid #ddd", background:"#fff", color:"#555", cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:12 }}>
                    {isAr?"العودة للتفاصيل":"Retour aux détails"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ FLOATING NAV CHIP (top-center of map) ═══ */}
      {navigating && !arrived && panel!=="nav" && (
        <div style={{
          position:"absolute", top:66, left:"50%", transform:"translateX(-50%)", zIndex:800,
          background:"#1d4ed8", color:"#fff", padding:"11px 18px", borderRadius:18,
          boxShadow:"0 8px 28px #1d4ed855", display:"flex", flexDirection:"column", gap:7,
          minWidth:240, maxWidth:320, animation:"gm-slidein .3s ease",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Navigation size={20}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, opacity:.8 }}>{isAr?"التنقل نشط":"Navigation active"}</div>
              <div style={{ fontWeight:900, fontSize:19, color:"#bfdbfe" }}>{remainDist||"..."}</div>
            </div>
            <button onClick={()=>setPanel("nav")} style={{ background:"rgba(255,255,255,.2)", border:"none", color:"#fff", borderRadius:8, padding:"4px 10px", cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit" }}>
              {isAr?"تفاصيل":"Détails"}
            </button>
            <button onClick={()=>{ setNavigating(false); window.speechSynthesis?.cancel(); }} style={{ width:26, height:26, borderRadius:"50%", border:"none", background:"rgba(255,255,255,.2)", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={12}/></button>
          </div>
          {route?.steps[step] && (
            <div style={{ background:"rgba(255,255,255,.14)", borderRadius:11, padding:"7px 11px" }}>
              <div style={{ fontWeight:800, fontSize:12 }}>{route.steps[step].instruction||"استمر"}</div>
              <div style={{ fontSize:10.5, opacity:.8, marginTop:2 }}>{isAr?"بعد":"Dans"} {route.steps[step].distance}</div>
              <div style={{ background:"rgba(255,255,255,.18)", borderRadius:20, height:3.5, marginTop:5 }}>
                <div style={{ height:3.5, borderRadius:20, background:"#93c5fd", width:`${((step+1)/route.steps.length)*100}%`, transition:"width .4s" }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Arrived toast */}
      {arrived && (
        <div style={{ position:"absolute", top:66, left:"50%", transform:"translateX(-50%)", zIndex:800,
          background:"#0d6b3c", color:"#fff", padding:"11px 26px", borderRadius:22,
          fontWeight:900, fontSize:15, animation:"gm-arrive .4s ease", whiteSpace:"nowrap",
          boxShadow:"0 8px 28px #0d6b3c55", display:"flex", alignItems:"center", gap:10 }}>
          <PartyPopper size={18}/> {isAr?"وصلت إلى وجهتك!":"Vous êtes arrivé!"}
        </div>
      )}

      {/* Nearest institution hint (bottom center) */}
      {!navigating && userPos && !selected && displayList[0] && (
        <div style={{ position:"absolute", bottom:20, left:"50%", transform:"translateX(-50%)", zIndex:500 }}>
          <button onClick={()=>selectLoc(displayList[0])} style={{
            padding:"11px 20px", borderRadius:22, border:"none",
            background:"#0d6b3c", color:"#fff", fontWeight:900, fontSize:12.5,
            cursor:"pointer", fontFamily:"inherit",
            boxShadow:"0 5px 18px #0d6b3c55",
            display:"flex", alignItems:"center", gap:8,
          }}>
            <Crosshair size={15}/> {isAr?`أقرب: ${displayList[0].name_ar.slice(0,22)}`:displayList[0].name_fr||displayList[0].name_ar}
          </button>
        </div>
      )}

      {/* ── Proximity Alert ── */}
      {nearbyAlert && (
        <div style={{
          position:"absolute", bottom:nearbyAlert?70:20, left:"50%", transform:"translateX(-50%)", zIndex:1900,
          background:"#fff", borderRadius:18, boxShadow:"0 8px 32px rgba(0,0,0,.18)",
          border:`2px solid ${tc(nearbyAlert.institution_type).color}`,
          padding:"12px 16px", minWidth:260, maxWidth:320, animation:"gm-slidein .3s ease",
          direction:isAr?"rtl":"ltr",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:tc(nearbyAlert.institution_type).color, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", flexShrink:0 }}>
              {tc(nearbyAlert.institution_type).reactIcon}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:10, fontWeight:700, color:tc(nearbyAlert.institution_type).color, marginBottom:2, display:"flex", alignItems:"center", gap:3 }}>
                <MapPin size={10}/> {isAr?"أنت قريب من:":"Vous êtes proche de :"}
              </div>
              <div style={{ fontWeight:900, fontSize:13, color:"#1a1a2e", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {isAr?nearbyAlert.name_ar:(nearbyAlert.name_fr||nearbyAlert.name_ar)}
              </div>
            </div>
            <button onClick={()=>setNearbyAlert(null)} style={{ width:24, height:24, borderRadius:"50%", border:"none", background:"#f0f0f0", color:"#888", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><X size={11}/></button>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {nearbyAlert.phone && (
              <a href={`tel:${nearbyAlert.phone}`} style={{ flex:1, padding:"8px", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:10, color:"#16a34a", fontWeight:800, fontSize:11.5, textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                <Phone size={13}/> {isAr?"اتصل":"Appeler"}
              </a>
            )}
            <button onClick={()=>{ selectLoc(nearbyAlert); setNearbyAlert(null); }} style={{ flex:1, padding:"8px", background:tc(nearbyAlert.institution_type).color, border:"none", borderRadius:10, color:"#fff", fontWeight:800, fontSize:11.5, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
              <Map size={13}/> {isAr?"عرض التفاصيل":"Voir détails"}
            </button>
          </div>
        </div>
      )}

      {/* ── Pin-mode banner ── */}
      {pinMode && (
        <div style={{ position:"absolute", top:66, left:"50%", transform:"translateX(-50%)", zIndex:2100,
          background:"#1d4ed8", color:"#fff", padding:"12px 22px", borderRadius:18,
          boxShadow:"0 6px 28px #1d4ed855", display:"flex", alignItems:"center", gap:12,
          fontFamily:"Cairo,sans-serif", fontWeight:800, fontSize:13.5, whiteSpace:"nowrap" }}>
          <Crosshair size={18}/>
          {isAr?"اضغط على الخريطة لتحديد موقعك الحقيقي":"Cliquez sur la carte pour définir votre position"}
          <button onClick={()=>setPinMode(false)} style={{ width:26, height:26, borderRadius:8, border:"none",
            background:"rgba(255,255,255,.2)", color:"#fff", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={14}/>
          </button>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position:"absolute", bottom:20, left:"50%", transform:"translateX(-50%)", zIndex:2000,
          background:toast.type==="error"?"#dc2626":toast.type==="success"?"#0d6b3c":"#1d4ed8",
          color:"#fff", padding:"11px 18px", borderRadius:16, fontWeight:700, fontSize:12.5,
          boxShadow:"0 8px 28px rgba(0,0,0,.25)", display:"flex", alignItems:"center", gap:10,
          maxWidth:300, animation:"gm-slidein .3s ease", lineHeight:1.5, direction:isAr?"rtl":"ltr",
          whiteSpace:"nowrap",
        }}>
          <span style={{ flex:1 }}>{toast.msg}</span>
          <button onClick={()=>setToast(null)} style={{ background:"rgba(255,255,255,.25)", border:"none", color:"#fff", borderRadius:"50%", width:20, height:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={11}/></button>
        </div>
      )}
    </div>
  );
}

/* ── Helper: InfoCard ── */
function InfoCard({ icon, bg, border, label, action, actionColor, children }: {
  icon:React.ReactNode; bg:string; border:string; label:string; action?:string; actionColor?:string; children:React.ReactNode;
}) {
  return (
    <div style={{ display:"flex", gap:10, padding:"11px", background:bg, borderRadius:13, marginBottom:9, border:`1.5px solid ${border}`, alignItems:"center" }}>
      <span style={{ flexShrink:0, display:"flex", alignItems:"center" }}>{icon}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:10, color:"#888", fontWeight:700, marginBottom:3 }}>{label}</div>
        {children}
      </div>
      {action && (
        <div style={{ background:actionColor, color:"#fff", borderRadius:18, padding:"4px 11px", fontSize:11, fontWeight:700, flexShrink:0 }}>{action}</div>
      )}
    </div>
  );
}
