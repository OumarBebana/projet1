import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ArrowLeft, ArrowRight, AlertOctagon, Volume2, VolumeX, Share2,
  MapPin, Navigation, Search, X, Phone, Map, Ruler, Clock,
  Car, PersonStanding, Star, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, Radio, Link2, MessageCircle,
  CheckCircle2, Square, Crosshair, PartyPopper, Loader2,
  ShieldCheck, Flame, Pill, Building2,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────── */
type EmType = "hospital" | "police" | "civil_protection" | "pharmacy";
type TMode  = "car" | "walk";
type Panel  = "list" | "detail" | "nav";

interface Place {
  id: string; name: string; type: EmType;
  lat: number; lon: number;
  phone?: string; address?: string; is_24h?: boolean;
}
interface RouteInfo {
  poly: [number,number][]; distKm: string;
  driveCar: number; driveWalk: number;
  steps: { text: string; dist: string }[];
}

/* ─── Type icons (SVG components) ───────────────────────────────── */
const TYPE_ICON: Record<EmType, React.ReactNode> = {
  hospital:         <Building2 size={17} />,
  police:           <ShieldCheck size={17} />,
  civil_protection: <Flame size={17} />,
  pharmacy:         <Pill size={17} />,
};

/* ─── Config ─────────────────────────────────────────────────────── */
const CFG: Record<EmType, { color:string; ar:string; fr:string; sos:string; osmKey:string; osmVal:string }> = {
  hospital:         { color:"#dc2626", ar:"مستشفى",       fr:"Hôpital",      sos:"101", osmKey:"amenity", osmVal:"hospital"     },
  police:           { color:"#1d4ed8", ar:"مفوضية شرطة",  fr:"Police",       sos:"17",  osmKey:"amenity", osmVal:"police"       },
  civil_protection: { color:"#ea580c", ar:"حماية مدنية",  fr:"Prot. Civile", sos:"18",  osmKey:"amenity", osmVal:"fire_station" },
  pharmacy:         { color:"#16a34a", ar:"صيدلية",       fr:"Pharmacie",    sos:"15",  osmKey:"amenity", osmVal:"pharmacy"     },
};

const TYPES: EmType[] = ["hospital","police","civil_protection","pharmacy"];
const RADIUS_OPTIONS = [1, 2, 5, 10, 15];
const FAV_KEY = "bawaba_map_favorites";

/* ─── Haversine ─────────────────────────────────────────────────── */
const hav = (a:[number,number], b:[number,number]) => {
  const R=6371, dL=(b[0]-a[0])*Math.PI/180, dl=(b[1]-a[1])*Math.PI/180;
  const s = Math.sin(dL/2)**2 + Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dl/2)**2;
  return R*2*Math.atan2(Math.sqrt(s),Math.sqrt(1-s));
};
const fmtD = (km:number) => km<1?`${Math.round(km*1000)} م`:`${km.toFixed(1)} كم`;
const gmaps = (from:[number,number]|null, to:[number,number]) =>
  from?`https://www.google.com/maps/dir/${from[0]},${from[1]}/${to[0]},${to[1]}`
      :`https://www.google.com/maps/search/?api=1&query=${to[0]},${to[1]}`;

/* ─── Overpass API ─────────────────────────────────────────────── */
const NAME_KEYS = ["name:ar","name","name:fr","int_name"];
const extractName = (tags:Record<string,string>) => {
  for (const k of NAME_KEYS) if (tags[k]) return tags[k];
  return "موقع غير مسمى";
};
async function fetchOSM(type:EmType, lat:number, lon:number, radiusKm=8): Promise<Place[]> {
  const { osmKey, osmVal } = CFG[type];
  const radius = radiusKm * 1000;
  const q = `[out:json][timeout:15];(node["${osmKey}"="${osmVal}"](around:${radius},${lat},${lon});way["${osmKey}"="${osmVal}"](around:${radius},${lat},${lon}););out center tags;`;
  try {
    const ctrl = new AbortController(); setTimeout(()=>ctrl.abort(),12000);
    const r = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`,{signal:ctrl.signal});
    const d = await r.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (d.elements as any[]).map((el,i)=>{
      const plat = el.lat ?? el.center?.lat;
      const plon = el.lon ?? el.center?.lon;
      if (!plat||!plon) return null;
      return {
        id:`osm-${el.type}-${el.id??i}`, name:extractName(el.tags??{}), type,
        lat:plat, lon:plon,
        phone:el.tags?.phone??el.tags?.["contact:phone"]??"",
        address:[el.tags?.["addr:street"],el.tags?.["addr:city"]].filter(Boolean).join(", ")||el.tags?.["addr:full"]||"",
        is_24h:el.tags?.opening_hours==="24/7",
      } as Place;
    }).filter(Boolean) as Place[];
  } catch { return []; }
}

/* ─── Nominatim geocoding ────────────────────────────────────────── */
async function geocodeNominatim(query:string): Promise<{lat:number;lon:number;display:string}|null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=mr&format=json&limit=1`;
    const r = await fetch(url, { headers: { "Accept-Language": "ar,fr" } });
    const d = await r.json();
    if (!d.length) return null;
    return { lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon), display: d[0].display_name };
  } catch { return null; }
}

/* ─── OSRM route ─────────────────────────────────────────────────── */
const MANEUVER_AR: Record<string,string> = {
  "turn-left":"انعطف يساراً","turn-right":"انعطف يميناً",
  "turn-slight-left":"انعطف قليلاً يساراً","turn-slight-right":"انعطف قليلاً يميناً",
  "turn-sharp-left":"انعطف حاداً يساراً","turn-sharp-right":"انعطف حاداً يميناً",
  "straight":"استمر في الطريق","continue":"استمر","merge":"اندمج في المسار",
  "ramp":"اسلك المنحدر","fork":"خذ الانعطاف","end of road":"نهاية الطريق",
  "use lane":"استخدم الحارة","roundabout":"دوّار","rotary":"دوّار كبير",
  "arrive":"وصلت إلى الوجهة","depart":"انطلق",
  "exit roundabout":"اخرج من الدوّار","exit rotary":"اخرج من الدوّار الكبير",
};
const MANEUVER_FR: Record<string,string> = {
  "turn-left":"Tournez à gauche","turn-right":"Tournez à droite",
  "turn-slight-left":"Légèrement à gauche","turn-slight-right":"Légèrement à droite",
  "turn-sharp-left":"Virage serré à gauche","turn-sharp-right":"Virage serré à droite",
  "straight":"Continuez tout droit","continue":"Continuez","merge":"Fusionnez",
  "ramp":"Prenez la rampe","fork":"Prenez l'embranchement","end of road":"Fin de route",
  "use lane":"Utilisez la voie","roundabout":"Rond-point","rotary":"Grand rond-point",
  "arrive":"Vous êtes arrivé","depart":"Démarrez",
  "exit roundabout":"Sortez du rond-point","exit rotary":"Sortez du grand rond-point",
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function translateStep(s:any, isAr:boolean): string {
  const type = s.maneuver?.type??"";
  const modifier = s.maneuver?.modifier??"";
  const key = modifier ? `${type}-${modifier}` : type;
  const map = isAr ? MANEUVER_AR : MANEUVER_FR;
  if (map[key]) return map[key];
  if (map[type]) return map[type];
  if (s.name) return isAr ? `استمر في ${s.name}` : `Continuez sur ${s.name}`;
  return isAr ? "استمر في الطريق" : "Continuez tout droit";
}
function fmtStepDist(m:number, isAr:boolean): string {
  if (m > 1000) return `${(m/1000).toFixed(1)} ${isAr?"كم":"km"}`;
  return `${Math.round(m)} ${isAr?"م":"m"}`;
}
async function calcRoute(from:[number,number], to:[number,number], mode:TMode, isAr=true): Promise<RouteInfo|null> {
  const prof = mode==="car"?"driving":"foot";
  const url = `https://router.project-osrm.org/route/v1/${prof}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`;
  try {
    const ctrl=new AbortController(); setTimeout(()=>ctrl.abort(),9000);
    const r=await fetch(url,{signal:ctrl.signal}); const d=await r.json();
    if (d.code!=="Ok"||!d.routes?.length) return null;
    const rt=d.routes[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const steps=((rt.legs?.[0]?.steps??[]) as any[]).slice(0,20).map((s)=>({
      text: translateStep(s, isAr),
      dist: fmtStepDist(s.distance, isAr),
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const poly:([number,number][])=(rt.geometry.coordinates as any[]).map((c:[number,number])=>[c[1],c[0]]);
    const drMin=Math.max(1,Math.round(rt.duration/60));
    return{poly,distKm:(rt.distance/1000).toFixed(2),driveCar:drMin,driveWalk:Math.round(drMin*5),steps};
  } catch { return null; }
}

/* ─── Map pin icons (SVG inline — no emojis) ─────────────────────── */
const PIN_SVG: Record<EmType, string> = {
  hospital: `<svg viewBox="0 0 40 40" width="{{S}}" height="{{S}}" style="transform:rotate(45deg)"><rect width="40" height="40" rx="8" fill="{{BG}}"/><rect x="17" y="8" width="6" height="24" rx="2" fill="{{FG}}"/><rect x="8" y="17" width="24" height="6" rx="2" fill="{{FG}}"/></svg>`,
  police:   `<svg viewBox="0 0 40 40" width="{{S}}" height="{{S}}" style="transform:rotate(45deg)"><path d="M20 4 L28 10 v12 c0 8-8 12-8 12s-8-4-8-12V10z" fill="{{BG}}"/><path d="M16 18h8M20 14v8" stroke="{{FG}}" stroke-width="3" stroke-linecap="round"/></svg>`,
  civil_protection: `<svg viewBox="0 0 40 40" width="{{S}}" height="{{S}}" style="transform:rotate(45deg)"><circle cx="20" cy="20" r="18" fill="{{BG}}"/><path d="M14 26c0-6 4-10 6-14 2 4 6 8 6 14" fill="{{FG}}" opacity=".9"/><path d="M11 30c3-4 6-6 9-5s6 1 9 5" fill="{{FG}}" opacity=".5"/></svg>`,
  pharmacy: `<svg viewBox="0 0 40 40" width="{{S}}" height="{{S}}" style="transform:rotate(45deg)"><rect width="40" height="40" rx="8" fill="{{BG}}"/><ellipse cx="20" cy="17" rx="8" ry="6" fill="{{FG}}"/><rect x="12" y="20" width="16" height="10" rx="2" fill="{{FG}}"/><rect x="18" y="22" width="4" height="6" rx="1" fill="{{BG}}"/></svg>`,
};

function pinIcon(type:EmType, active=false, fav=false): L.DivIcon {
  const { color } = CFG[type];
  const s = active ? 46 : 34;
  const svgSize = Math.round(s * 0.55);
  const bg = active ? "#fff" : color;
  const fg = active ? color : "#fff";
  const inner = PIN_SVG[type]
    .replace(/\{\{S\}\}/g, String(svgSize))
    .replace(/\{\{BG\}\}/g, bg)
    .replace(/\{\{FG\}\}/g, fg);
  const favBadge = fav ? `<div style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;border-radius:50%;
    background:#f59e0b;border:2px solid #fff;display:flex;align-items:center;justify-content:center;transform:rotate(45deg)">
    <svg width="8" height="8" viewBox="0 0 24 24" fill="#fff"><polygon points="12,2 15.1,8.3 22,9.3 17,14.1 18.2,21 12,17.8 5.8,21 7,14.1 2,9.3 8.9,8.3"/></svg>
    </div>` : "";
  return L.divIcon({
    className:"",
    html:`<div style="position:relative;width:${s}px;height:${s+8}px">
      <div style="width:${s}px;height:${s}px;background:${active?color:"#fff"};
        border:3px solid ${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        box-shadow:${active?`0 0 0 6px ${color}33,0 6px 22px ${color}77`:"0 3px 12px rgba(0,0,0,.2)"};
        display:flex;align-items:center;justify-content:center;">${inner}</div>
      ${favBadge}
      <div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);
        width:${active?8:5}px;height:${active?8:5}px;border-radius:50%;
        background:${active?color:"#ccc"};box-shadow:${active?`0 0 8px ${color}`:"none"}"></div>
    </div>`,
    iconSize:[s,s+8],iconAnchor:[s/2,s+8],popupAnchor:[0,-s-8],
  });
}

function meIcon(): L.DivIcon {
  return L.divIcon({
    className:"",
    html:`<div style="position:relative;width:24px;height:24px">
      <div style="position:absolute;inset:-10px;border-radius:50%;background:#2563eb18;animation:em-pulse 2s infinite"></div>
      <div style="position:absolute;inset:-4px;border-radius:50%;background:#2563eb22;animation:em-pulse 2s .6s infinite"></div>
      <div style="width:24px;height:24px;background:#2563eb;border:3px solid #fff;border-radius:50%;
        box-shadow:0 4px 14px #2563eb88;display:flex;align-items:center;justify-content:center;">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    </div>`,
    iconSize:[24,24],iconAnchor:[12,12],
  });
}

function FlyTo({pos,zoom}:{pos:[number,number];zoom:number}){
  const map=useMap();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{map.flyTo(pos,zoom,{duration:1.2,easeLinearity:.3});},[pos[0],pos[1],zoom]);
  return null;
}

function MapClickHandler({active,onPick}:{active:boolean;onPick:(pos:[number,number])=>void}){
  const map=useMapEvents({
    click(e){ if(active){ onPick([e.latlng.lat,e.latlng.lng]); } },
    mousemove(){ if(active) map.getContainer().style.cursor="crosshair"; else map.getContainer().style.cursor=""; },
  });
  useEffect(()=>{ map.getContainer().style.cursor=active?"crosshair":""; return()=>{ map.getContainer().style.cursor=""; }; },[active,map]);
  return null;
}

/* ═══════════════════════ COMPONENT ════════════════════════════════ */
interface Props { lang:string; onBack:()=>void }

export default function EmergencyMap({lang,onBack}:Props){
  const isAr=lang==="ar";

  const [pool,      setPool]    = useState<Partial<Record<EmType,Place[]>>>({});
  const [loading,   setLoading] = useState<Partial<Record<EmType,boolean>>>({});
  const [userPos,   setUserPos] = useState<[number,number]|null>(null);
  const [locating,  setLoc]     = useState(false);
  const [selected,  setSel]     = useState<Place|null>(null);
  const [route,     setRoute]   = useState<RouteInfo|null>(null);
  const [tmode,     setTmode]   = useState<TMode>("car");
  const [panel,     setPanel]   = useState<Panel>("list");
  const [navStep,   setNavStep] = useState(0);
  const [arrived,   setArrived] = useState(false);
  const [rl,        setRl]      = useState(false);
  const [flyTo,     setFlyTo]   = useState<{pos:[number,number];zoom:number}|null>(null);
  const [toast,     setToast]   = useState<{msg:string;ok:boolean}|null>(null);
  const [pinMode,   setPinMode] = useState(false);
  const [voiceOn,   setVoice]   = useState(false);
  const [shareOpen, setShare]   = useState(false);
  const [activeType,setAT]      = useState<EmType|null>(null);

  const [searchQuery,  setSearchQuery]  = useState("");
  const [searchRadius, setSearchRadius] = useState(8);
  const [searchingGeo, setSearchingGeo] = useState(false);
  const [geoResult,    setGeoResult]    = useState<{lat:number;lon:number;display:string}|null>(null);
  const [favorites,    setFavorites]    = useState<Place[]>(() => {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; }
  });
  const [showFavs, setShowFavs] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const watchRef  = useRef<number|null>(null);
  const lastStep  = useRef(-1);
  const [remainDist, setRemainDist] = useState("");

  useEffect(()=>{ localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); },[favorites]);

  const isFav = (id:string) => favorites.some(f=>f.id===id);
  const toggleFav = (place:Place, e?:React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev => prev.some(f=>f.id===place.id) ? prev.filter(f=>f.id!==place.id) : [...prev, place]);
  };

  useEffect(()=>{
    const s=document.createElement("style"); s.id="em2css";
    s.textContent=`
      @keyframes em-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.1;transform:scale(2.1)}}
      @keyframes em-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
      @keyframes em-pop{0%{transform:scale(.85);opacity:0}100%{transform:none;opacity:1}}
      @keyframes em-spin{to{transform:rotate(360deg)}}
      @keyframes em-fade{from{opacity:0}to{opacity:1}}
      .em-card:hover{transform:translateY(-1px);box-shadow:0 6px 22px rgba(0,0,0,.1)!important}
      .em-fav-btn:hover{transform:scale(1.18)!important}
      .em-search-input:focus{border-color:#3b82f6!important;box-shadow:0 0 0 3px #3b82f620!important}
    `;
    document.head.appendChild(s); return ()=>s.remove();
  },[]);

  const showToast=(msg:string,ok=true,ms=3500)=>{setToast({msg,ok});setTimeout(()=>setToast(null),ms);};
  const speak=useCallback((txt:string)=>{
    if(!voiceOn||!window.speechSynthesis)return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(txt); u.lang=isAr?"ar-SA":"fr-FR"; u.rate=.92;
    window.speechSynthesis.speak(u);
  },[voiceOn,isAr]);

  const [accuracy, setAccuracy] = useState(0);
  const getGPS=():Promise<[number,number]>=>new Promise((res,rej)=>
    navigator.geolocation.getCurrentPosition(
      p=>{ setUserPos([p.coords.latitude,p.coords.longitude]); setAccuracy(p.coords.accuracy); res([p.coords.latitude,p.coords.longitude]); },
      rej,
      {enableHighAccuracy:true,timeout:15000,maximumAge:0}
    )
  );

  const startWatch=useCallback(()=>{
    if(watchRef.current!==null)return;
    watchRef.current=navigator.geolocation.watchPosition(p=>{
      const pos:[number,number]=[p.coords.latitude,p.coords.longitude];
      setUserPos(pos);
      if(selected){const d=hav(pos,[selected.lat,selected.lon]);setRemainDist(fmtD(d));if(d<0.05)setArrived(true);}
    },()=>{},{enableHighAccuracy:true,timeout:15000,maximumAge:3000});
  },[selected]);
  const stopWatch=useCallback(()=>{
    if(watchRef.current!==null){navigator.geolocation.clearWatch(watchRef.current);watchRef.current=null;}
  },[]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{if(panel==="nav")startWatch();else stopWatch();return stopWatch;},[panel]);

  useEffect(()=>{
    if(panel!=="nav"||!route||navStep===lastStep.current)return;
    lastStep.current=navStep;
    const s=route.steps[navStep];
    if(s) speak(isAr?`بعد ${s.dist} — ${s.text||"استمر في الطريق"}`:s.text||"Continuez tout droit");
  },[navStep,panel,route,speak,isAr]);
  useEffect(()=>{
    if(arrived&&panel==="nav") speak(isAr?"وصلت إلى وجهتك!":"Vous êtes arrivé à destination!");
  },[arrived,speak,isAr,panel]);

  const ensurePlaces=async(type:EmType,pos:[number,number],radius?:number):Promise<Place[]>=>{
    const r=radius??searchRadius;
    const cached=pool[type];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if(cached?.length && (cached as any)._radius===r) return cached;
    setLoading(l=>({...l,[type]:true}));
    const places=await fetchOSM(type,pos[0],pos[1],r);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (places as any)._radius=r;
    setPool(p=>({...p,[type]:places}));
    setLoading(l=>({...l,[type]:false}));
    return places;
  };

  const handleRadiusChange = async (r:number) => {
    setSearchRadius(r);
    setPool({});
    if(activeType && userPos){
      setLoading(l=>({...l,[activeType]:true}));
      const places=await fetchOSM(activeType,userPos[0],userPos[1],r);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (places as any)._radius=r;
      setPool({[activeType]:places});
      setLoading(l=>({...l,[activeType]:false}));
    }
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    const allLoaded = Object.values(pool).flat() as Place[];
    const filtered = allLoaded.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
    if (filtered.length) {
      await selectPlace(filtered[0]);
      showToast(isAr?`${filtered.length} نتيجة`:`${filtered.length} résultat(s)`);
      return;
    }
    setSearchingGeo(true);
    showToast(isAr?"جاري البحث عن الموقع...":"Recherche de l'adresse...");
    const geo = await geocodeNominatim(q);
    setSearchingGeo(false);
    if (!geo) { showToast(isAr?"لم يُعثر على الموقع":"Adresse introuvable", false); return; }
    setGeoResult(geo);
    setFlyTo({pos:[geo.lat,geo.lon],zoom:15});
    showToast(geo.display.substring(0,60));
  };

  const doRoute=async(place:Place,pos:[number,number],mode:TMode=tmode)=>{
    setRl(true);setRoute(null);
    const r=await calcRoute(pos,[place.lat,place.lon],mode,isAr);
    setRoute(r);setRl(false);
    if(r){
      const min=mode==="car"?r.driveCar:r.driveWalk;
      showToast(isAr?`${place.name} — ${r.distKm} كم (${min} د)`:`${place.name} — ${r.distKm} km (${min} min)`);
      speak(isAr?`${CFG[place.type].ar}: ${place.name}. ${r.distKm} كيلومتر، ${min} دقيقة`
                :`${CFG[place.type].fr}: ${place.name}. ${r.distKm} km, ${min} min`);
    }else{
      showToast(isAr?"تعذّر حساب المسار — Google Maps متاح":"Trajet indisponible",false);
    }
  };

  const selectPlace=async(place:Place,pos?:[number,number])=>{
    const gps=pos??userPos;
    setSel(place);setPanel("detail");setRoute(null);setArrived(false);setNavStep(0);lastStep.current=-1;
    setFlyTo({pos:[place.lat,place.lon],zoom:16});
    if(gps)await doRoute(place,gps);
  };

  useEffect(()=>{
    if(!selected||!userPos)return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setRl(true);
    setRoute(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    doRoute(selected,userPos,tmode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tmode,isAr]);

  const handleType=async(type:EmType)=>{
    setAT(type); setShowFavs(false);
    let pos=userPos;
    if(!pos){
      setLoc(true);
      try{pos=await getGPS();setUserPos(pos);setFlyTo({pos,zoom:14});}
      catch{showToast(isAr?"فعّل خدمة الموقع في المتصفح":"Activez la géolocalisation",false);setLoc(false);return;}
      setLoc(false);
    }
    showToast(isAr?`يبحث في نطاق ${searchRadius} كم...`:`Recherche dans ${searchRadius} km...`);
    const places=await ensurePlaces(type,pos);
    if(!places.length){showToast(isAr?`لا توجد نتائج في نطاق ${searchRadius} كم`:`Aucun résultat dans ${searchRadius} km`,false);return;}
    const nearest=[...places].sort((a,b)=>hav(pos!,[a.lat,a.lon])-hav(pos!,[b.lat,b.lon]))[0];
    await selectPlace(nearest,pos);
  };

  const allPlaces = Object.values(pool).flat() as Place[];
  const filteredPlaces = searchQuery.trim()
    ? allPlaces.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allPlaces;

  const cfg = selected?CFG[selected.type]:CFG.hospital;
  const tMin = (r:RouteInfo) => tmode==="car"?r.driveCar:r.driveWalk;

  /* ══════════════════════ RENDER ══════════════════════════════════ */
  return(
    <div style={{position:"relative",width:"100%",height:"calc(100vh - 70px)",minHeight:560,
      fontFamily:"Cairo,Tajawal,sans-serif",direction:isAr?"rtl":"ltr",overflow:"hidden"}}>

      {/* ── TOP BAR ── */}
      <div style={{position:"absolute",top:0,insetInlineStart:0,insetInlineEnd:0,height:56,zIndex:700,
        background:"#fff",borderBottom:"1.5px solid #e8eaed",
        display:"flex",alignItems:"center",gap:8,padding:"0 12px",
        boxShadow:"0 2px 18px rgba(0,0,0,.07)"}}>

        <button onClick={onBack} style={{width:36,height:36,borderRadius:10,border:"none",
          background:"#f4f4f5",cursor:"pointer",flexShrink:0,color:"#555",
          display:"flex",alignItems:"center",justifyContent:"center"}}>
          {isAr?<ArrowRight size={18}/>:<ArrowLeft size={18}/>}
        </button>

        <div style={{width:38,height:38,borderRadius:12,flexShrink:0,
          background:"linear-gradient(135deg,#991b1b,#dc2626)",
          display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:"0 4px 12px #dc262644"}}>
          <AlertOctagon size={22} color="#fff" strokeWidth={2.5}/>
        </div>

        <div style={{flex:1}}>
          <div style={{fontWeight:900,fontSize:14.5,color:"#111"}}>
            {isAr?"خريطة الطوارئ الذكية":"Urgences intelligentes"}
          </div>
          <div style={{fontSize:11,color:"#999"}}>
            {isAr?"اضغط نوع الطوارئ للوصول الفوري":"Tapez un type pour naviguer immédiatement"}
          </div>
        </div>

        {/* Voice button */}
        <button onClick={()=>setVoice(v=>!v)}
          title={voiceOn?(isAr?"الصوت نشط":"Voix active"):(isAr?"تفعيل الصوت":"Activer la voix")}
          style={{height:36,borderRadius:10,cursor:"pointer",padding:"0 10px",flexShrink:0,
            border:`1.5px solid ${voiceOn?"#dc2626":"#e8e8e8"}`,
            background:voiceOn?"#fee2e2":"#fff",color:voiceOn?"#dc2626":"#bbb",
            display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
          {voiceOn?<Volume2 size={17}/>:<VolumeX size={17}/>}
          {voiceOn&&<span style={{fontSize:10,fontWeight:900,lineHeight:1}}>{isAr?"ع":"FR"}</span>}
        </button>

        {/* Share button */}
        <button onClick={()=>setShare(v=>!v)} style={{width:36,height:36,borderRadius:10,
          border:"1.5px solid #e8e8e8",background:"#fff",cursor:"pointer",color:"#555",flexShrink:0,
          display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Share2 size={17}/>
        </button>

        {/* Locate button */}
        <button onClick={async()=>{
          setLoc(true);
          showToast(isAr?"جاري تحديد موقعك...":"Localisation...","info" as never);
          try{const p=await getGPS();setUserPos(p);setFlyTo({pos:p,zoom:16});setPool({});
            setAccuracy(acc=>{
              const msg=acc<50?(isAr?`دقة ±${Math.round(acc)} م`:`Précision ±${Math.round(acc)} m`):acc<200?(isAr?`تقريبي ±${Math.round(acc)} م`:`Approx. ±${Math.round(acc)} m`):(isAr?`دقة ضعيفة ±${Math.round(acc)} م`:`Faible ±${Math.round(acc)} m`);
              setTimeout(()=>showToast(isAr?`تم تحديد موقعك — ${msg}`:`Localisé — ${msg}`,acc<200),0);
              return acc;
            });
          }catch{showToast(isAr?"فعّل إذن الموقع في المتصفح":"Autorisez la géolocalisation",false);}
          setLoc(false);
        }} style={{display:"flex",alignItems:"center",gap:6,padding:"0 14px",height:36,borderRadius:10,
          border:"none",color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:800,fontSize:12,flexShrink:0,
          background:userPos?"linear-gradient(135deg,#16a34a,#22c55e)":"linear-gradient(135deg,#1d4ed8,#3b82f6)",
          boxShadow:"0 3px 12px rgba(0,0,0,.18)"}}>
          {locating
            ? <Loader2 size={15} style={{animation:"em-spin .8s linear infinite"}}/>
            : <MapPin size={15}/>}
          {isAr?(userPos?"تحديث":"تحديد موقعي"):(userPos?"Actualiser":"Localiser")}
        </button>

        {/* Manual pin button */}
        <button onClick={()=>setPinMode(v=>!v)}
          title={isAr?"ضع موقعك يدوياً على الخريطة":"Placer manuellement sur la carte"}
          style={{width:36,height:36,borderRadius:10,border:`2px solid ${pinMode?"#1d4ed8":"#e8e8e8"}`,
            background:pinMode?"#eff6ff":"#fff",cursor:"pointer",color:pinMode?"#1d4ed8":"#555",flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>
          <Crosshair size={17}/>
        </button>
      </div>

      {/* ── MAP ── */}
      <div style={{position:"absolute",inset:0,zIndex:0}}>
        <MapContainer center={[18.0885,-15.976]} zoom={13}
          style={{width:"100%",height:"100%"}} zoomControl={false} attributionControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          {flyTo&&<FlyTo pos={flyTo.pos} zoom={flyTo.zoom}/>}
          <MapClickHandler active={pinMode} onPick={pos=>{
            setUserPos(pos); setAccuracy(0); setPinMode(false);
            setFlyTo({pos,zoom:16}); setPool({});
            showToast(isAr?"✅ تم تحديد موقعك يدوياً":"✅ Position définie manuellement");
          }}/>
          {userPos&&<>
            {accuracy>0&&<Circle center={userPos} radius={accuracy} pathOptions={{color:"#2563eb",fillColor:"#2563eb",fillOpacity:.06,weight:1.5,dashArray:"4,4"}}/>}
            <Marker position={userPos} icon={meIcon()}>
              <Popup>
                <b style={{fontFamily:"Cairo,sans-serif"}}>{isAr?"موقعك الحالي":"Votre position"}</b>
                {accuracy>0&&<div style={{fontFamily:"Cairo,sans-serif",fontSize:11,color:"#888",marginTop:3}}>{isAr?`دقة: ±${Math.round(accuracy)} م`:`Précision: ±${Math.round(accuracy)} m`}</div>}
              </Popup>
            </Marker>
          </>}
          {geoResult&&<Marker position={[geoResult.lat,geoResult.lon]} icon={meIcon()}>
            <Popup><div style={{fontFamily:"Cairo,sans-serif",fontSize:12}}>{geoResult.display.substring(0,80)}</div></Popup>
          </Marker>}
          {route?.poly&&<>
            <Polyline positions={route.poly} pathOptions={{color:"#fff",weight:10,opacity:.3}}/>
            <Polyline positions={route.poly} pathOptions={{color:cfg.color,weight:5.5,opacity:.95,lineCap:"round",lineJoin:"round"}}/>
          </>}
          {allPlaces.map(p=>(
            <Marker key={p.id} position={[p.lat,p.lon]} icon={pinIcon(p.type,selected?.id===p.id,isFav(p.id))}>
              <Popup>
                <div style={{fontFamily:"Cairo,sans-serif",direction:"rtl",minWidth:190,padding:"4px 0"}}>
                  <div style={{fontWeight:900,fontSize:13.5,color:CFG[p.type].color,marginBottom:5,
                    display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:CFG[p.type].color}}>{TYPE_ICON[p.type]}</span> {p.name}
                  </div>
                  {p.address&&<div style={{fontSize:11.5,color:"#666",marginBottom:6,display:"flex",gap:4,alignItems:"center"}}>
                    <MapPin size={11} color="#999"/>{p.address}
                  </div>}
                  {userPos&&<div style={{fontSize:12.5,fontWeight:800,color:"#16a34a",marginBottom:8,
                    display:"flex",gap:4,alignItems:"center"}}>
                    <Ruler size={12} color="#16a34a"/>{fmtD(hav(userPos,[p.lat,p.lon]))}
                  </div>}
                  {p.is_24h&&<span style={{background:"#f0fdf4",color:"#16a34a",fontSize:10,fontWeight:700,
                    padding:"2px 8px",borderRadius:20,border:"1px solid #bbf7d0",
                    marginBottom:8,display:"inline-flex",alignItems:"center",gap:3}}>
                    <CheckCircle2 size={10}/> 24/24
                  </span>}
                  <div style={{display:"flex",gap:6,marginTop:8}}>
                    {p.phone&&<a href={`tel:${p.phone}`} style={{flex:1,padding:"8px",background:"#16a34a",
                      color:"#fff",borderRadius:9,textAlign:"center",textDecoration:"none",fontWeight:800,fontSize:12,
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <Phone size={14}/>
                    </a>}
                    <button onClick={()=>toggleFav(p)} style={{width:36,padding:"8px",
                      background:isFav(p.id)?"#fef3c7":"#f9f9f9",border:"1.5px solid #f59e0b",
                      borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>
                      <Star size={14} fill={isFav(p.id)?"#f59e0b":"none"} color="#f59e0b"/>
                    </button>
                    <button onClick={()=>selectPlace(p)} style={{flex:2,padding:"8px",background:CFG[p.type].color,
                      color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:12,fontFamily:"inherit",
                      display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                      <Navigation size={13}/> {isAr?"ابدأ":"Naviguer"}
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* ══════ LEFT PANEL ══════ */}
      <div style={{position:"absolute",top:56,insetInlineStart:0,bottom:0,width:308,zIndex:400,
        background:"#fff",borderInlineEnd:"1.5px solid #eaeaea",
        display:"flex",flexDirection:"column",boxShadow:"4px 0 24px rgba(0,0,0,.06)"}}>

        {/* ── Search bar ── */}
        <div style={{padding:"10px 10px 0",flexShrink:0}}>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            <div style={{flex:1,position:"relative"}}>
              <input
                ref={searchRef}
                className="em-search-input"
                type="text"
                value={searchQuery}
                onChange={e=>setSearchQuery(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleSearch()}
                placeholder={isAr?"ابحث عن مكان أو عنوان...":"Rechercher un lieu..."}
                style={{width:"100%",height:38,border:"1.5px solid #e0e0e0",borderRadius:11,
                  padding:isAr?"0 38px 0 10px":"0 10px 0 38px",fontSize:12.5,
                  fontFamily:"Cairo,Tajawal,sans-serif",outline:"none",color:"#111",
                  background:"#fafafa",transition:"all .15s",boxSizing:"border-box"}}
              />
              <span style={{position:"absolute",top:"50%",transform:"translateY(-50%)",
                [isAr?"right":"left"]:11,color:"#bbb",pointerEvents:"none",display:"flex",alignItems:"center"}}>
                <Search size={15}/>
              </span>
              {searchQuery&&(
                <button onClick={()=>{setSearchQuery("");setGeoResult(null);searchRef.current?.focus();}}
                  style={{position:"absolute",top:"50%",transform:"translateY(-50%)",
                    [isAr?"left":"right"]:8,background:"none",border:"none",
                    cursor:"pointer",color:"#aaa",lineHeight:1,padding:2,
                    display:"flex",alignItems:"center"}}>
                  <X size={14}/>
                </button>
              )}
            </div>
            <button onClick={handleSearch} disabled={!searchQuery.trim()||searchingGeo}
              style={{width:38,height:38,borderRadius:11,border:"none",flexShrink:0,
                background:searchQuery.trim()?"#1d4ed8":"#e5e7eb",
                color:"#fff",cursor:searchQuery.trim()?"pointer":"not-allowed",
                display:"flex",alignItems:"center",justifyContent:"center",transition:"background .15s"}}>
              {searchingGeo
                ? <Loader2 size={15} style={{animation:"em-spin .8s linear infinite"}}/>
                : isAr?<ArrowLeft size={16}/>:<ArrowRight size={16}/>}
            </button>
          </div>

          {/* ── Radius filter ── */}
          <div style={{background:"#f8f9fb",borderRadius:12,padding:"9px 12px",marginBottom:8,
            border:"1.5px solid #eaeaea"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
              <span style={{fontSize:11.5,fontWeight:700,color:"#555",display:"flex",alignItems:"center",gap:5}}>
                <Radio size={13} color="#555"/> {isAr?"نطاق البحث":"Rayon de recherche"}
              </span>
              <span style={{fontSize:12,fontWeight:900,color:"#1d4ed8",background:"#eff6ff",
                padding:"2px 10px",borderRadius:20,border:"1px solid #bfdbfe"}}>
                {searchRadius} {isAr?"كم":"km"}
              </span>
            </div>
            <div style={{display:"flex",gap:5}}>
              {RADIUS_OPTIONS.map(r=>(
                <button key={r} onClick={()=>handleRadiusChange(r)}
                  style={{flex:1,padding:"5px 0",borderRadius:8,border:"none",
                    background:searchRadius===r?"#1d4ed8":"#e8edf5",
                    color:searchRadius===r?"#fff":"#555",
                    fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",
                    transition:"all .15s"}}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* ── Type buttons ── */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:8}}>
            {TYPES.map(t=>{
              const c=CFG[t]; const isA=activeType===t;
              const typed=pool[t]??[];
              const near=typed.length&&userPos
                ?[...typed].sort((a,b)=>hav(userPos,[a.lat,a.lon])-hav(userPos,[b.lat,b.lon]))[0]
                :null;
              return(
                <button key={t} onClick={()=>handleType(t)} className="em-card"
                  style={{display:"flex",alignItems:"center",gap:7,padding:"10px 9px",
                    border:`2.5px solid ${isA?c.color:"#eaeaea"}`,borderRadius:14,
                    background:isA?c.color:"#fafafa",cursor:"pointer",fontFamily:"inherit",
                    transition:"all .18s",boxShadow:isA?`0 4px 18px ${c.color}55`:"0 2px 8px rgba(0,0,0,.04)",
                    textAlign:"start"}}>
                  <span style={{flexShrink:0,width:28,height:28,borderRadius:8,
                    background:isA?"rgba(255,255,255,0.25)":c.color,
                    display:"inline-flex",alignItems:"center",justifyContent:"center",
                    color:isA?c.color:"#fff"}}>
                    {TYPE_ICON[t]}
                  </span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11.5,fontWeight:800,color:isA?"#fff":"#111",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{isAr?c.ar:c.fr}</div>
                    {loading[t]?(
                      <div style={{fontSize:9.5,color:isA?"rgba(255,255,255,.8)":"#aaa",marginTop:2,
                        display:"flex",alignItems:"center",gap:3}}>
                        <Loader2 size={9} style={{animation:"em-spin .8s linear infinite"}}/>
                        {isAr?" يبحث...":" Recherche..."}
                      </div>
                    ):near&&userPos?(
                      <div style={{fontSize:9,color:isA?"rgba(255,255,255,.75)":"#888",marginTop:2,lineHeight:1.4}}>
                        {fmtD(hav(userPos,[near.lat,near.lon]))} · {near.name.substring(0,12)}{near.name.length>12?"…":""}
                      </div>
                    ):(
                      <div style={{fontSize:9,color:isA?"rgba(255,255,255,.65)":"#bbb",marginTop:2}}>
                        {isAr?"اضغط للبحث":"Chercher"}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Favorites toggle ── */}
          {favorites.length>0&&(
            <button onClick={()=>setShowFavs(v=>!v)}
              style={{width:"100%",padding:"8px 12px",borderRadius:11,marginBottom:8,
                border:`1.5px solid ${showFavs?"#f59e0b":"#fde68a"}`,
                background:showFavs?"#fef3c7":"#fffbeb",
                color:"#92400e",fontWeight:700,fontSize:12,cursor:"pointer",
                fontFamily:"inherit",display:"flex",alignItems:"center",gap:8,
                transition:"all .15s"}}>
              <Star size={15} fill="#f59e0b" color="#f59e0b"/>
              <span>{isAr?`المفضلة (${favorites.length})`:`Favoris (${favorites.length})`}</span>
              <span style={{marginInlineStart:"auto",display:"flex",alignItems:"center"}}>
                {showFavs?<ChevronUp size={15}/>:<ChevronDown size={15}/>}
              </span>
            </button>
          )}
        </div>

        {/* ── Favorites list ── */}
        {showFavs&&favorites.length>0&&(
          <div style={{padding:"0 10px 8px",flexShrink:0,borderBottom:"1.5px solid #fde68a",
            background:"#fffbeb",animation:"em-fade .2s ease"}}>
            {favorites.map(p=>{
              const c=CFG[p.type];
              const d=userPos?hav(userPos,[p.lat,p.lon]):null;
              return(
                <div key={p.id} className="em-card"
                  style={{display:"flex",alignItems:"center",gap:8,padding:"9px 10px",
                    border:"1.5px solid #fde68a",borderRadius:12,marginBottom:6,
                    background:"#fff",cursor:"pointer",transition:"all .15s"}}
                  onClick={()=>selectPlace(p)}>
                  <span style={{color:c.color,flexShrink:0}}>{TYPE_ICON[p.type]}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:800,color:"#111",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                    <div style={{fontSize:10,color:"#aaa",marginTop:1}}>
                      {isAr?c.ar:c.fr}{d?` · ${fmtD(d)}`:""}
                    </div>
                  </div>
                  <button className="em-fav-btn" onClick={e=>toggleFav(p,e)}
                    style={{width:28,height:28,borderRadius:8,border:"none",background:"#fef3c7",
                      cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                      transition:"transform .15s",flexShrink:0}}>
                    <Star size={13} fill="#f59e0b" color="#f59e0b"/>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── CTA (no GPS yet) ── */}
        {!userPos&&!showFavs&&(
          <div style={{margin:"0 10px 10px",background:"linear-gradient(150deg,#7f1d1d,#dc2626)",
            borderRadius:16,padding:"18px 14px",textAlign:"center",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
              <AlertOctagon size={44} color="rgba(255,255,255,.9)" strokeWidth={1.5}/>
            </div>
            <div style={{color:"#fff",fontWeight:900,fontSize:13,lineHeight:1.5}}>
              {isAr?"اضغط على نوع الطوارئ":"Tapez un type d'urgence"}
            </div>
            <div style={{color:"rgba(255,255,255,.75)",fontSize:11,marginTop:6,lineHeight:1.6}}>
              {isAr?"سيحدد موقعك تلقائياً ويجد الأقرب بمسار فوري"
                   :"Localisation auto + lieu le plus proche + itinéraire"}
            </div>
          </div>
        )}

        {/* ── Nearest list ── */}
        {userPos&&!showFavs&&(
          <div style={{flex:1,overflowY:"auto",padding:"0 10px 10px"}}>
            {searchQuery.trim()&&filteredPlaces.length>0&&(
              <div style={{marginBottom:10,padding:"6px 10px",background:"#eff6ff",
                borderRadius:10,fontSize:11,color:"#1d4ed8",fontWeight:700,
                border:"1px solid #bfdbfe"}}>
                {isAr?`${filteredPlaces.length} نتيجة`:`${filteredPlaces.length} résultat(s)`}
              </div>
            )}
            {searchQuery.trim()
              ? filteredPlaces.slice(0,8).map(p=>{
                  const c=CFG[p.type]; const d=hav(userPos,[p.lat,p.lon]); const isSel=selected?.id===p.id;
                  return <PlaceCard key={p.id} p={p} c={c} d={d} isSel={isSel} isFav={isFav(p.id)}
                    isAr={isAr} tmode={tmode} onSelect={()=>selectPlace(p)} onFav={e=>toggleFav(p,e)}/>;
                })
              : TYPES.filter(t=>pool[t]?.length).map(t=>{
                  const c=CFG[t];
                  const sorted=[...(pool[t]!)].sort((a,b)=>hav(userPos,[a.lat,a.lon])-hav(userPos,[b.lat,b.lon]));
                  const p=sorted[0]; const d=hav(userPos,[p.lat,p.lon]); const isSel=selected?.id===p.id;
                  return <PlaceCard key={t} p={p} c={c} d={d} isSel={isSel} isFav={isFav(p.id)}
                    isAr={isAr} tmode={tmode} onSelect={()=>selectPlace(p)} onFav={e=>toggleFav(p,e)}/>;
                })
            }
            {!Object.values(pool).some(arr=>arr?.length>0)&&(
              <div style={{textAlign:"center",color:"#ccc",paddingTop:20,fontSize:12}}>
                {isAr?"اضغط نوع الطوارئ أعلاه للبدء":"Appuyez sur un type ci-dessus"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════ RIGHT DETAIL / NAV PANEL ══════ */}
      {(panel==="detail"||panel==="nav")&&selected&&(
        <div style={{position:"absolute",top:56,insetInlineEnd:0,bottom:0,width:330,zIndex:400,
          background:"#fff",boxShadow:"-4px 0 28px rgba(0,0,0,.1)",
          display:"flex",flexDirection:"column",animation:"em-in .22s ease"}}>

          {/* ─── DETAIL ─── */}
          {panel==="detail"&&(
            <>
              <div style={{background:`linear-gradient(150deg,${cfg.color}dd,${cfg.color})`,
                padding:"14px 14px 18px",color:"#fff",flexShrink:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
                  <button onClick={()=>{setSel(null);setPanel("list");setRoute(null);}}
                    style={{width:30,height:30,borderRadius:9,border:"none",
                      background:"rgba(255,255,255,.22)",color:"#fff",cursor:"pointer",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <X size={16}/>
                  </button>
                  <span style={{flex:1,fontSize:10.5,opacity:.8,fontWeight:700}}>
                    {isAr?`${cfg.ar} — تفاصيل`:`${cfg.fr} — Détails`}
                  </span>
                  <button onClick={()=>toggleFav(selected)}
                    style={{width:30,height:30,borderRadius:9,
                      background:isFav(selected.id)?"rgba(245,158,11,.3)":"rgba(255,255,255,.2)",
                      border:`1.5px solid ${isFav(selected.id)?"#f59e0b":"rgba(255,255,255,.3)"}`,
                      color:"#fff",cursor:"pointer",
                      display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                    <Star size={15} fill={isFav(selected.id)?"#f59e0b":"none"} color="#fff"/>
                  </button>
                  <a href={gmaps(userPos,[selected.lat,selected.lon])} target="_blank" rel="noopener noreferrer"
                    style={{width:30,height:30,borderRadius:9,background:"rgba(255,255,255,.2)",
                      color:"#fff",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Map size={15}/>
                  </a>
                </div>
                <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:14}}>
                  <div style={{width:54,height:54,borderRadius:16,background:"rgba(255,255,255,.22)",
                    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                    border:"2px solid rgba(255,255,255,.3)",color:"#fff"}}>
                    {selected.type==="hospital"?<Building2 size={28}/>
                    :selected.type==="police"?<ShieldCheck size={28}/>
                    :selected.type==="civil_protection"?<Flame size={28}/>
                    :<Pill size={28}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:900,fontSize:15.5,lineHeight:1.35}}>{selected.name}</div>
                    <div style={{fontSize:11.5,opacity:.8,marginTop:3}}>{isAr?cfg.ar:cfg.fr}</div>
                    {selected.is_24h&&<span style={{display:"inline-flex",marginTop:5,alignItems:"center",gap:4,
                      background:"rgba(74,222,128,.22)",color:"#86efac",
                      fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>
                      <CheckCircle2 size={10}/> 24/24
                    </span>}
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
                  {[
                    {icon:<Ruler size={16} color="#fff"/>,val:route?`${route.distKm} كم`:userPos?fmtD(hav(userPos,[selected.lat,selected.lon])):"—",label:isAr?"المسافة":"Distance"},
                    {icon:rl?<Loader2 size={16} color="#fff" style={{animation:"em-spin .8s linear infinite"}}/>:<Clock size={16} color="#fff"/>,val:rl?"...":route?`${tMin(route)} د`:"—",label:isAr?"الوقت":"Durée"},
                    {icon:tmode==="car"?<Car size={16} color="#fff"/>:<PersonStanding size={16} color="#fff"/>,val:tmode==="car"?(isAr?"سيارة":"Voiture"):(isAr?"مشياً":"À pied"),label:isAr?"الوسيلة":"Mode"},
                  ].map((s,i)=>(
                    <div key={i} style={{background:"rgba(255,255,255,.18)",borderRadius:12,padding:"9px 6px",textAlign:"center"}}>
                      <div style={{display:"flex",justifyContent:"center"}}>{s.icon}</div>
                      <div style={{fontWeight:900,fontSize:14,marginTop:2}}>{s.val}</div>
                      <div style={{fontSize:9.5,opacity:.8,marginTop:1}}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transport mode */}
              <div style={{display:"flex",gap:6,padding:"10px 12px",background:"#fafafa",borderBottom:"1px solid #eee",flexShrink:0}}>
                {(["car","walk"] as TMode[]).map(m=>(
                  <button key={m} onClick={()=>setTmode(m)}
                    style={{flex:1,padding:"8px 4px",borderRadius:12,
                      border:`2px solid ${tmode===m?cfg.color:"#e8e8e8"}`,
                      background:tmode===m?`${cfg.color}18`:"transparent",
                      color:tmode===m?cfg.color:"#aaa",fontWeight:800,fontSize:11.5,
                      cursor:"pointer",fontFamily:"inherit",textAlign:"center",transition:"all .2s"}}>
                    <div style={{display:"flex",justifyContent:"center",marginBottom:2}}>
                      {m==="car"?<Car size={20}/>:<PersonStanding size={20}/>}
                    </div>
                    <div style={{fontSize:11,fontWeight:900}}>
                      {route?(m==="car"?route.driveCar:route.driveWalk)+`${isAr?" د":" min"}`:"—"}
                    </div>
                    <div style={{fontSize:9.5,opacity:.7}}>{m==="car"?(isAr?"سيارة":"Voiture"):(isAr?"مشياً":"À pied")}</div>
                  </button>
                ))}
              </div>

              <div style={{flex:1,overflowY:"auto",padding:"12px"}}>
                {selected.address&&<IRow icon={<MapPin size={18}/>} bg="#f8f9fa" label={isAr?"العنوان":"Adresse"}>
                  <span style={{fontSize:12.5,color:"#222",lineHeight:1.5}}>{selected.address}</span>
                </IRow>}
                {selected.phone&&(
                  <a href={`tel:${selected.phone}`} style={{display:"block",textDecoration:"none"}}>
                    <IRow icon={<Phone size={18}/>} bg="#f0fdf4" label={isAr?"اتصال مباشر":"Appel direct"}>
                      <span style={{fontSize:15,color:"#16a34a",fontWeight:900}}>{selected.phone}</span>
                    </IRow>
                  </a>
                )}
                {route&&route.steps.length>0&&(
                  <div style={{background:"#f8f9fa",borderRadius:14,overflow:"hidden",border:"1.5px solid #eee"}}>
                    <div style={{padding:"11px 14px",fontWeight:800,fontSize:12.5,color:"#111",
                      display:"flex",alignItems:"center",gap:6}}>
                      <Map size={14}/> {isAr?`خطوات الطريق (${route.steps.length})`:`Étapes (${route.steps.length})`}
                    </div>
                    {route.steps.map((s,i)=>(
                      <div key={i} style={{display:"flex",gap:9,padding:"9px 14px",
                        borderTop:"1px solid #eee",alignItems:"flex-start"}}>
                        <div style={{width:22,height:22,borderRadius:"50%",background:cfg.color,
                          color:"#fff",fontWeight:900,fontSize:10,flexShrink:0,
                          display:"flex",alignItems:"center",justifyContent:"center"}}>{i+1}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11.5,fontWeight:700,color:"#222"}}>{s.text||"استمر"}</div>
                          <div style={{fontSize:10.5,color:"#999",marginTop:1}}>{s.dist}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{padding:"10px 12px",borderTop:"1.5px solid #eee",flexShrink:0}}>
                {rl?(
                  <div style={{width:"100%",padding:"14px",borderRadius:13,background:"#f3f4f6",
                    color:"#9ca3af",fontWeight:800,fontSize:13,textAlign:"center",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    <Loader2 size={16} style={{animation:"em-spin .8s linear infinite"}}/>
                    {isAr?"جاري حساب المسار...":"Calcul de l'itinéraire..."}
                  </div>
                ):(
                  <button onClick={()=>{
                    if(!route){showToast(isAr?"المسار غير متاح":"Itinéraire indisponible",false);return;}
                    setPanel("nav");setNavStep(0);lastStep.current=-1;
                    if(userPos)setFlyTo({pos:userPos,zoom:16});
                    speak(isAr?`تم تشغيل الملاحة نحو ${selected.name}. المسافة ${route.distKm} كيلومتر`
                              :`Navigation démarrée vers ${selected.name}. ${route.distKm} km.`);
                  }} style={{width:"100%",padding:"14px",borderRadius:13,border:"none",
                    background:route?`linear-gradient(135deg,${cfg.color}cc,${cfg.color})`:"#e5e7eb",
                    color:route?"#fff":"#9ca3af",fontWeight:900,fontSize:14,
                    cursor:route?"pointer":"not-allowed",fontFamily:"inherit",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:12,
                    boxShadow:route?`0 5px 22px ${cfg.color}44`:"none",transition:"all .2s"}}>
                    <Navigation size={22}/>
                    <div style={{textAlign:"start"}}>
                      <div>{isAr?"ابدأ التنقل خطوة بخطوة":"Démarrer la navigation"}</div>
                      {route&&<div style={{fontSize:11,opacity:.85,fontWeight:600,marginTop:1,display:"flex",alignItems:"center",gap:6}}>
                        {route.distKm} {isAr?"كم":"km"} · {tMin(route)} {isAr?"دقيقة":"min"} ·
                        {tmode==="car"?<Car size={11}/>:<PersonStanding size={11}/>}
                      </div>}
                    </div>
                  </button>
                )}
              </div>
            </>
          )}

          {/* ─── NAV ─── */}
          {panel==="nav"&&route&&(
            <div style={{display:"flex",flexDirection:"column",height:"100%",animation:"em-in .2s ease"}}>
              <div style={{background:arrived?"#16a34a":cfg.color,padding:"14px",color:"#fff",flexShrink:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:11.5,opacity:.85,fontWeight:700,display:"flex",alignItems:"center",gap:5}}>
                    {arrived
                      ? <><PartyPopper size={14}/> {isAr?"وصلت!":"Arrivé!"}</>
                      : <><Navigation size={13}/> {isAr?"الملاحة نشطة":"Navigation active"}</>
                    }
                  </span>
                  <div style={{flex:1}}/>
                  <button onClick={()=>{stopWatch();setPanel("detail");window.speechSynthesis?.cancel();}}
                    style={{padding:"4px 12px",borderRadius:8,border:"none",
                      background:"rgba(255,255,255,.22)",color:"#fff",cursor:"pointer",
                      fontSize:11,fontWeight:700,fontFamily:"inherit",
                      display:"flex",alignItems:"center",gap:5}}>
                    <Square size={11}/> {isAr?"إيقاف":"Arrêter"}
                  </button>
                  <button onClick={()=>userPos&&setFlyTo({pos:userPos,zoom:16})}
                    style={{width:28,height:28,borderRadius:8,border:"none",background:"rgba(255,255,255,.18)",
                      color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Crosshair size={14}/>
                  </button>
                </div>
                <div style={{fontWeight:900,fontSize:15,marginBottom:12}}>{selected.name}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{background:"rgba(255,255,255,.2)",borderRadius:12,padding:"10px 12px"}}>
                    <div style={{fontSize:9.5,opacity:.8,marginBottom:2}}>{isAr?"المتبقي":"Restant"}</div>
                    <div style={{fontWeight:900,fontSize:21}}>{remainDist||route.distKm+" كم"}</div>
                  </div>
                  <div style={{background:"rgba(255,255,255,.2)",borderRadius:12,padding:"10px 12px"}}>
                    <div style={{fontSize:9.5,opacity:.8,marginBottom:2}}>{isAr?"الوقت":"Durée"}</div>
                    <div style={{fontWeight:900,fontSize:21}}>{tMin(route)}<span style={{fontSize:13}}> {isAr?"د":"min"}</span></div>
                  </div>
                </div>
              </div>

              {!arrived?(
                <>
                  <div style={{padding:"13px 14px",background:"#fff",borderBottom:"1px solid #eee",flexShrink:0}}>
                    <div style={{fontSize:10,color:"#aaa",fontWeight:700,marginBottom:5}}>
                      {isAr?"الخطوة":"Étape"} {navStep+1}/{route.steps.length}
                    </div>
                    <div style={{fontWeight:900,fontSize:15,color:"#111",lineHeight:1.5,marginBottom:6}}>
                      {route.steps[navStep]?.text||(isAr?"استمر في الطريق":"Continuez")}
                    </div>
                    <div style={{fontSize:12.5,color:"#666"}}>
                      {isAr?"بعد":"Dans"} <span style={{color:cfg.color,fontWeight:900}}>{route.steps[navStep]?.dist}</span>
                    </div>
                    <div style={{marginTop:10,background:"#e5e7eb",borderRadius:20,height:5,overflow:"hidden"}}>
                      <div style={{height:5,borderRadius:20,background:cfg.color,transition:"width .4s",
                        width:`${((navStep+1)/route.steps.length)*100}%`}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:3,fontSize:9.5,color:"#ccc"}}>
                      <span>{isAr?"البداية":"Départ"}</span>
                      <span style={{color:cfg.color,fontWeight:700}}>{Math.round((navStep+1)/route.steps.length*100)}%</span>
                      <span>{isAr?"الوصول":"Arrivée"}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,padding:"10px 14px",background:"#f8f8f8",borderBottom:"1px solid #eee",flexShrink:0}}>
                    <button disabled={navStep===0} onClick={()=>setNavStep(s=>s-1)}
                      style={{flex:1,padding:"10px",border:"1.5px solid #e0e0e0",borderRadius:11,
                        background:navStep===0?"#f5f5f5":"#fff",color:navStep===0?"#ccc":"#333",
                        cursor:navStep===0?"not-allowed":"pointer",fontWeight:800,fontSize:13,fontFamily:"inherit",
                        display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      {isAr?<><ChevronRight size={14}/>{isAr?"السابق":"Préc."}</>:<><ChevronLeft size={14}/> Préc.</>}
                    </button>
                    <button disabled={navStep>=route.steps.length-1} onClick={()=>setNavStep(s=>s+1)}
                      style={{flex:1,padding:"10px",border:"none",borderRadius:11,
                        background:navStep>=route.steps.length-1?"#ddd":cfg.color,
                        color:"#fff",cursor:navStep>=route.steps.length-1?"not-allowed":"pointer",
                        fontWeight:800,fontSize:13,fontFamily:"inherit",
                        display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      {isAr?<>{isAr?"التالي":"Suiv."}<ChevronLeft size={14}/></>:<>Suiv. <ChevronRight size={14}/></>}
                    </button>
                  </div>
                  <div style={{flex:1,overflowY:"auto"}}>
                    {route.steps.map((s,i)=>(
                      <div key={i} onClick={()=>setNavStep(i)}
                        style={{display:"flex",gap:10,padding:"10px 14px",
                          borderBottom:"1px solid #f0f0f0",cursor:"pointer",
                          background:i===navStep?"#eff6ff":"transparent",transition:"background .15s"}}>
                        <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,
                          background:i===navStep?cfg.color:i<navStep?"#16a34a":"#e5e7eb",
                          color:"#fff",fontWeight:900,fontSize:10,
                          display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {i<navStep?<CheckCircle2 size={12}/>:i+1}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:700,color:i===navStep?cfg.color:"#333"}}>{s.text||"استمر"}</div>
                          <div style={{fontSize:10.5,color:"#aaa",marginTop:1}}>{s.dist}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selected.phone&&(
                    <a href={`tel:${selected.phone}`}
                      style={{display:"flex",alignItems:"center",justifyContent:"center",gap:9,
                        padding:"13px",background:cfg.color,color:"#fff",textDecoration:"none",
                        fontWeight:900,fontSize:13,flexShrink:0}}>
                      <Phone size={16}/> {isAr?`اتصل: ${selected.phone}`:`Appeler: ${selected.phone}`}
                    </a>
                  )}
                </>
              ):(
                <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                  justifyContent:"center",padding:28,textAlign:"center",animation:"em-pop .5s ease"}}>
                  <PartyPopper size={64} color={cfg.color} strokeWidth={1.5}/>
                  <div style={{fontWeight:900,fontSize:21,color:cfg.color,marginTop:10}}>
                    {isAr?"وصلت إلى وجهتك!":"Vous êtes arrivé!"}
                  </div>
                  <div style={{fontSize:13,color:"#666",marginTop:6,lineHeight:1.6}}>{selected.name}</div>
                  {selected.phone&&(
                    <a href={`tel:${selected.phone}`}
                      style={{marginTop:18,display:"flex",alignItems:"center",gap:9,padding:"13px 26px",
                        background:cfg.color,color:"#fff",borderRadius:14,textDecoration:"none",fontWeight:800,fontSize:13}}>
                      <Phone size={16}/> {isAr?"اتصل بهم الآن":"Les appeler maintenant"}
                    </a>
                  )}
                  <button onClick={()=>{stopWatch();setPanel("list");setSel(null);setRoute(null);setArrived(false);}}
                    style={{marginTop:10,padding:"9px 22px",borderRadius:12,border:"1.5px solid #e5e7eb",
                      background:"#fff",color:"#666",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:12}}>
                    {isAr?"العودة للقائمة":"Retour à la liste"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Share popup ── */}
      {shareOpen&&(
        <div style={{position:"absolute",top:64,insetInlineEnd:10,zIndex:900,background:"#fff",
          borderRadius:16,padding:"16px",boxShadow:"0 8px 32px rgba(0,0,0,.18)",
          minWidth:230,border:"1.5px solid #eaeaea",animation:"em-in .2s ease"}}>
          <div style={{fontWeight:800,fontSize:13,marginBottom:12,display:"flex",alignItems:"center",gap:7}}>
            <Share2 size={15}/> {isAr?"مشاركة موقعي":"Partager ma position"}
          </div>
          <button onClick={()=>{
            if(!userPos){showToast(isAr?"حدد موقعك أولاً":"Localisez-vous d'abord",false);return;}
            const msg=encodeURIComponent(isAr
              ?`موقعي للطوارئ:\nhttps://maps.google.com?q=${userPos[0]},${userPos[1]}`
              :`Ma position d'urgence:\nhttps://maps.google.com?q=${userPos[0]},${userPos[1]}`);
            window.open(`https://wa.me/?text=${msg}`,"_blank");
          }} style={{width:"100%",padding:"10px",background:"#25d366",color:"#fff",border:"none",
            borderRadius:10,fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",marginBottom:7,
            display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <MessageCircle size={15}/> WhatsApp
          </button>
          <button onClick={()=>{
            if(!userPos){showToast(isAr?"حدد موقعك أولاً":"Localisez-vous d'abord",false);return;}
            navigator.clipboard?.writeText(`https://maps.google.com?q=${userPos[0]},${userPos[1]}`);
            showToast(isAr?"تم النسخ":"Copié");setShare(false);
          }} style={{width:"100%",padding:"10px",background:"#f0f0f0",color:"#333",
            border:"none",borderRadius:10,fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",
            display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <Link2 size={15}/> {isAr?"نسخ الرابط":"Copier le lien"}
          </button>
          <button onClick={()=>setShare(false)} style={{marginTop:8,width:"100%",padding:"7px",
            background:"transparent",border:"1px solid #e8e8e8",borderRadius:8,color:"#888",
            cursor:"pointer",fontFamily:"inherit",fontSize:12,
            display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
            <X size={13}/> {isAr?"إغلاق":"Fermer"}
          </button>
        </div>
      )}

      {/* ── Pin-mode banner ── */}
      {pinMode&&(
        <div style={{position:"absolute",top:66,left:"50%",transform:"translateX(-50%)",zIndex:2100,
          background:"#1d4ed8",color:"#fff",padding:"12px 22px",borderRadius:18,
          boxShadow:"0 6px 28px #1d4ed855",display:"flex",alignItems:"center",gap:12,
          fontFamily:"Cairo,sans-serif",fontWeight:800,fontSize:13.5,whiteSpace:"nowrap"}}>
          <Crosshair size={18}/>
          {isAr?"اضغط على خريطتك للموقع الحقيقي":"Cliquez sur la carte pour votre position"}
          <button onClick={()=>setPinMode(false)} style={{marginRight:isAr?0:undefined,marginLeft:isAr?undefined:0,
            width:26,height:26,borderRadius:8,border:"none",background:"rgba(255,255,255,.2)",
            color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <X size={14}/>
          </button>
        </div>
      )}

      {/* ── Toast ── */}
      {toast&&(
        <div style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",zIndex:2000,
          background:toast.ok?"#16a34a":"#dc2626",color:"#fff",padding:"11px 20px",borderRadius:14,
          fontWeight:700,fontSize:13,boxShadow:"0 6px 24px rgba(0,0,0,.22)",
          whiteSpace:"nowrap",animation:"em-in .3s ease",maxWidth:"80vw",textAlign:"center",
          display:"flex",alignItems:"center",gap:8}}>
          {toast.ok?<CheckCircle2 size={15}/>:<AlertOctagon size={15}/>}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */
function PlaceCard({ p, c, d, isSel, isFav, isAr, tmode, onSelect, onFav }:{
  p:Place; c:typeof CFG[EmType]; d:number; isSel:boolean; isFav:boolean;
  isAr:boolean; tmode:TMode; onSelect:()=>void; onFav:(e:React.MouseEvent)=>void;
}) {
  return (
    <div className="em-card" onClick={onSelect}
      style={{border:`2px solid ${isSel?c.color:"#eaeaea"}`,borderRadius:14,padding:"10px 11px",
        cursor:"pointer",marginBottom:8,background:isSel?`${c.color}0e`:"#fff",
        transition:"all .2s",boxShadow:"0 2px 10px rgba(0,0,0,.05)"}}>
      <div style={{display:"flex",gap:9,alignItems:"flex-start",marginBottom:8}}>
        <div style={{width:40,height:40,borderRadius:12,background:c.color,
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
          color:"#fff",boxShadow:`0 4px 14px ${c.color}44`}}>
          {TYPE_ICON[p.type]}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:800,color:"#111",
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
          {p.address&&<div style={{fontSize:10,color:"#bbb",marginTop:2,
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
            display:"flex",alignItems:"center",gap:3}}>
            <MapPin size={9} color="#ccc"/>{p.address}
          </div>}
          {p.is_24h&&<span style={{fontSize:9,color:"#16a34a",fontWeight:800,
            background:"#f0fdf4",borderRadius:20,padding:"1px 6px",
            border:"1px solid #bbf7d0",marginTop:3,display:"inline-flex",alignItems:"center",gap:3}}>
            <CheckCircle2 size={8}/> 24/24
          </span>}
        </div>
        <div style={{textAlign:"center",flexShrink:0}}>
          <div style={{fontSize:13,fontWeight:900,color:c.color}}>{d<1?`${Math.round(d*1000)}م`:`${d.toFixed(1)}كم`}</div>
          <div style={{fontSize:9.5,color:"#bbb",marginTop:1}}>
            {tmode==="car"?Math.max(1,Math.round(d/0.5)):Math.max(1,Math.round(d/0.08))}{isAr?" د":" min"}
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:5}}>
        {p.phone&&(
          <a href={`tel:${p.phone}`} onClick={e=>e.stopPropagation()}
            style={{flex:1,padding:"6px",background:"#f0fdf4",border:"1px solid #bbf7d0",
              borderRadius:9,color:"#16a34a",fontWeight:800,fontSize:11,
              textAlign:"center",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
            <Phone size={12}/> {isAr?"اتصال":"Appel"}
          </a>
        )}
        <button className="em-fav-btn" onClick={onFav}
          style={{width:34,padding:"6px",background:isFav?"#fef3c7":"#f9f9f9",
            border:`1.5px solid ${isFav?"#f59e0b":"#e5e7eb"}`,
            borderRadius:9,cursor:"pointer",fontFamily:"inherit",
            transition:"all .15s",flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Star size={13} fill={isFav?"#f59e0b":"none"} color={isFav?"#f59e0b":"#ccc"}/>
        </button>
        <button onClick={e=>{e.stopPropagation();onSelect();}}
          style={{flex:2,padding:"6px",background:c.color,border:"none",
            borderRadius:9,color:"#fff",fontWeight:800,fontSize:11,
            cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
          <Navigation size={12}/> {isAr?"المسار":"Itinéraire"}
        </button>
      </div>
    </div>
  );
}

function IRow({icon,bg,label,children}:{icon:React.ReactNode;bg:string;label:string;children:React.ReactNode}){
  return(
    <div style={{display:"flex",gap:10,padding:"11px",background:bg,borderRadius:13,
      marginBottom:9,border:"1.5px solid #eee",alignItems:"center"}}>
      <span style={{flexShrink:0,color:"#666"}}>{icon}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:10,color:"#888",fontWeight:700,marginBottom:3}}>{label}</div>
        {children}
      </div>
    </div>
  );
}

