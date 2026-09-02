import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Leaf,
  IndianRupee,
  CloudRain,
  Bell,
  Sun,
  CloudSun,
  Cloud,
  Droplets,
  FileText,
  Camera,
} from "lucide-react";
import { YieldChart } from "@/components/dashboard/yield-chart";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  getFarmerById,
  getWeatherByRegion,
  getMarketPricesByCrop,
  getAdvisory,
} from "@/lib/api";
import {
  getFarmerId,
  getFarmerName,
  saveCropId,
  saveCropName,
  getCrops,
  getCropName,
  getCropId,
} from "@/lib/auth";

const cropPriceMap: Record<string, { price: string; market: string; trend: "up" | "down" | "stable"; change: string }> = {
  maize: { price: "₹2,150", market: "Davanagere Mandi", trend: "up", change: "+3.2%" },
  corn: { price: "₹2,150", market: "Davanagere Mandi", trend: "up", change: "+3.2%" },
  wheat: { price: "₹2,340", market: "Azadpur Mandi", trend: "up", change: "+4.2%" },
  rice: { price: "₹3,880", market: "Karnal Mandi", trend: "up", change: "+1.8%" },
  paddy: { price: "₹2,180", market: "Burdwan Mandi", trend: "up", change: "+2.1%" },
  onion: { price: "₹1,420", market: "Nashik Mandi", trend: "down", change: "-3.1%" },
  tomato: { price: "₹1,650", market: "Kolar Mandi", trend: "up", change: "+6.5%" },
  cotton: { price: "₹6,240", market: "Rajkot Mandi", trend: "down", change: "-0.9%" },
  soybean: { price: "₹4,600", market: "Indore Mandi", trend: "up", change: "+2.4%" },
  mustard: { price: "₹5,450", market: "Jaipur Mandi", trend: "down", change: "-1.1%" },
  sugarcane: { price: "₹350", market: "Muzaffarnagar Mandi", trend: "up", change: "+1.0%" },
  potato: { price: "₹1,200", market: "Agra Mandi", trend: "down", change: "-2.5%" },
  bajra: { price: "₹2,350", market: "Alwar Mandi", trend: "up", change: "+1.9%" },
  jowar: { price: "₹3,180", market: "Solapur Mandi", trend: "stable", change: "0.0%" },
  gram: { price: "₹5,800", market: "Bhopal Mandi", trend: "up", change: "+3.0%" },
  chana: { price: "₹5,800", market: "Bhopal Mandi", trend: "up", change: "+3.0%" },
};

function getPriceForCrop(cropName: string) {
  const lower = (cropName || "").toLowerCase().trim();
  for (const [k, v] of Object.entries(cropPriceMap)) {
    if (lower.includes(k)) return v;
  }
  return { price: "₹2,150", market: "Regional Mandi", trend: "up" as const, change: "+2.5%" };
}

function getDefaultTasksForCrop(cropName: string, lang = "en") {
  const lower = (cropName || "").toLowerCase().trim();
  const isHi = lang === "hi";

  if (lower.includes("maize") || lower.includes("corn")) {
    return [
      {
        title: isHi ? "मक्का कीट व नमी प्रबंधन" : "Maize Pest & Moisture Management",
        detail: isHi ? "फॉल आर्मीवर्म (Fall Armyworm) की नियमित निगरानी करें। पुष्पन अवस्था में उचित नमी बनाए रखें।" : "Inspect for Fall Armyworm whorl damage. Maintain adequate moisture during tasseling/silking.",
        time: isHi ? "आज" : "Today",
        color: "var(--primary)",
      },
      {
        title: isHi ? "मक्का मंडी भाव" : "Maize Market Trend",
        detail: isHi ? "दावणगेरे मंडी में मक्का का भाव ₹2,150/क्विंटल पर मजबूत है।" : "Maize prices trending steady at ₹2,150/qtl. Plan storage or transport.",
        time: isHi ? "इस सप्ताह" : "This week",
        color: "var(--secondary)",
      },
    ];
  }

  if (lower.includes("rice") || lower.includes("paddy")) {
    return [
      {
        title: isHi ? "धान जल स्तर व खाद" : "Rice Water Level & Fertilizer",
        detail: isHi ? "खेत में 2-3 सेमी पानी का स्तर बनाए रखें। यूरिया की दूसरी खुराक दें।" : "Maintain 2-3 cm standing water. Apply second split of nitrogen top-dressing.",
        time: isHi ? "आज" : "Today",
        color: "var(--primary)",
      },
      {
        title: isHi ? "धान रोग निगरानी" : "Rice Health Check",
        detail: isHi ? "तना छेदक एवं झुलसा रोग की जांच करें।" : "Inspect for stem borer and blast symptoms.",
        time: isHi ? "इस सप्ताह" : "This week",
        color: "var(--secondary)",
      },
    ];
  }

  return [
    {
      title: isHi ? `${cropName} सिंचाई व स्वास्थ्य` : `${cropName} Irrigation & Soil Health`,
      detail: isHi ? "मौसम पूर्वानुमान के अनुसार मृदा नमी की जांच करें।" : `Monitor soil moisture and growth stage calibrated for ${cropName}.`,
      time: isHi ? "आज" : "Today",
      color: "var(--primary)",
    },
    {
      title: isHi ? `${cropName} मंडी निगरानी` : `${cropName} Market Tracking`,
      detail: isHi ? "मंडी भावों पर नजर रखें और उचित मूल्य पर उपज बेचें।" : `Mandi prices show stable trend for ${cropName}. Plan harvest accordingly.`,
      time: isHi ? "इस सप्ताह" : "This week",
      color: "var(--secondary)",
    },
  ];
}

const defaultForecast = [
  { day: "Today", temp: "31°", rain: "15%", icon: Sun },
  { day: "Tue", temp: "29°", rain: "25%", icon: CloudRain },
  { day: "Wed", temp: "28°", rain: "40%", icon: CloudSun },
  { day: "Thu", temp: "30°", rain: "20%", icon: Cloud },
  { day: "Fri", temp: "32°", rain: "5%", icon: Sun },
];

interface CropItem {
  crop_id: string;
  crop_name: string;
  sowing_date?: string;
  irrigation_type?: string;
}

export default function FarmerDashboard() {
  const { t, i18n } = useTranslation();

  // Instant zero-latency initialization from stored session
  const storedCrops = getCrops();
  const storedCropName = getCropName() || "Maize";
  const initialCrops: CropItem[] =
    storedCrops.length > 0
      ? storedCrops.map((c, i) => ({
          crop_id: c.crop_id || `crop-local-${i}`,
          crop_name: c.crop_name,
          sowing_date: c.sowing_date,
          irrigation_type: c.irrigation_type,
        }))
      : [{ crop_id: getCropId() || "crop-local-0", crop_name: storedCropName }];

  const [farmerName, setFarmerName] = useState<string>(
    getFarmerName() || localStorage.getItem("cropx-farmer-name") || "Farmer"
  );
  const [villageName, setVillageName] = useState<string>(
    localStorage.getItem("cropx-farmer-village") || "North 24 Parganas"
  );
  const [farmerCrops, setFarmerCrops] = useState<CropItem[]>(initialCrops);
  const [activeCropIndex, setActiveCropIndex] = useState<number>(0);

  const activeCrop = farmerCrops[activeCropIndex] || farmerCrops[0] || initialCrops[0];

  const activeCropPriceInfo = getPriceForCrop(activeCrop.crop_name);
  const [bestPriceValue, setBestPriceValue] = useState<string>(activeCropPriceInfo.price);
  const [rainChanceValue, setRainChanceValue] = useState("20%");
  const [forecastList, setForecastList] = useState(defaultForecast);

  const [actionTasks, setActionTasks] = useState(
    getDefaultTasksForCrop(activeCrop.crop_name, i18n.language)
  );

  // Build instantaneous price list with active crop on top
  const initialPriceList = [
    {
      crop: `${activeCrop.crop_name} ★`,
      market: activeCropPriceInfo.market,
      value: activeCropPriceInfo.price,
      trend: activeCropPriceInfo.trend,
      change: activeCropPriceInfo.change,
    },
    { crop: "Maize", market: "Davanagere Mandi", value: "₹2,150", trend: "up", change: "+3.2%" },
    { crop: "Rice (Basmati)", market: "Karnal Mandi", value: "₹3,880", trend: "up", change: "+1.8%" },
    { crop: "Wheat", market: "Azadpur Mandi", value: "₹2,340", trend: "up", change: "+4.2%" },
    { crop: "Tomato", market: "Kolar Mandi", value: "₹1,650", trend: "up", change: "+6.5%" },
    { crop: "Onion", market: "Nashik Mandi", value: "₹1,420", trend: "down", change: "-3.1%" },
  ].filter(
    (item, index, self) =>
      index === self.findIndex((t) => t.crop.replace(" ★", "").toLowerCase() === item.crop.replace(" ★", "").toLowerCase() && (t.crop.includes("★") ? item.crop.includes("★") : true))
  );

  const [priceList, setPriceList] = useState(initialPriceList);

  // When active crop switches, immediately update stats synchronously
  useEffect(() => {
    const currentCrop = farmerCrops[activeCropIndex] || farmerCrops[0] || initialCrops[0];
    const priceInfo = getPriceForCrop(currentCrop.crop_name);
    setBestPriceValue(priceInfo.price);
    setActionTasks(getDefaultTasksForCrop(currentCrop.crop_name, i18n.language));
    saveCropName(currentCrop.crop_name);
    if (currentCrop.crop_id) saveCropId(currentCrop.crop_id);

    setPriceList((prev) => [
      {
        crop: `${currentCrop.crop_name} ★`,
        market: priceInfo.market,
        value: priceInfo.price,
        trend: priceInfo.trend,
        change: priceInfo.change,
      },
      ...prev.filter((p) => !p.crop.toLowerCase().includes(currentCrop.crop_name.toLowerCase())),
    ]);
  }, [activeCropIndex, farmerCrops, i18n.language]);

  // Non-blocking background sync for real database & live ML advisory
  useEffect(() => {
    const id = getFarmerId() || localStorage.getItem("cropx-farmer-id");
    if (!id || id.startsWith("demo-")) return;

    // Fetch DB farmer profile asynchronously in background
    getFarmerById(id)
      .then((res) => {
        if (res.success && res.data) {
          const farmer = res.data;
          if (farmer.full_name) {
            setFarmerName(farmer.full_name.split(" ")[0]);
          }
          if (farmer.village_name) {
            setVillageName(farmer.village_name);
          }
          if (farmer.crops && farmer.crops.length > 0) {
            const dbCrops: CropItem[] = farmer.crops.map((c) => ({
              crop_id: c.crop_id,
              crop_name: c.crop_name,
              sowing_date: c.sowing_date,
              irrigation_type: c.irrigation_type,
            }));
            setFarmerCrops(dbCrops);
          }

          if (farmer.region_id) {
            getWeatherByRegion(farmer.region_id).then((wRes) => {
              if (wRes.success && wRes.data && wRes.data.length > 0) {
                const latest = wRes.data[0];
                const tempVal = Math.round(latest.temperature_c);
                const rainPct =
                  latest.rainfall_mm > 0
                    ? `${Math.min(95, Math.round(latest.rainfall_mm * 10))}%`
                    : "15%";
                setRainChanceValue(rainPct);
                setForecastList([
                  { day: "Today", temp: `${tempVal}°`, rain: rainPct, icon: latest.rainfall_mm > 0 ? CloudRain : Sun },
                  { day: "Tue", temp: `${tempVal - 1}°`, rain: "25%", icon: CloudSun },
                  { day: "Wed", temp: `${tempVal + 1}°`, rain: "10%", icon: Sun },
                  { day: "Thu", temp: `${tempVal}°`, rain: "40%", icon: Cloud },
                  { day: "Fri", temp: `${tempVal + 2}°`, rain: "5%", icon: Sun },
                ]);
              }
            }).catch(() => {});
          }
        }
      })
      .catch(() => {});

    // Non-blocking advisory fetch in background
    const currentCrop = farmerCrops[activeCropIndex] || farmerCrops[0];
    if (currentCrop && currentCrop.crop_id && !currentCrop.crop_id.startsWith("crop-local")) {
      getAdvisory(id, currentCrop.crop_id, i18n.language)
        .then((advRes) => {
          if (advRes.success && advRes.data?.advisory_text) {
            setActionTasks([
              {
                title: `${currentCrop.crop_name} Advisory Action`,
                detail: advRes.data.advisory_text,
                time: "Today",
                color: "var(--primary)",
              },
              {
                title: `${currentCrop.crop_name} Crop Health`,
                detail: `Growth stage calibrated for ${currentCrop.crop_name} (${currentCrop.irrigation_type || "rainfed"}).`,
                time: "This week",
                color: "var(--secondary)",
              },
            ]);
          }
        })
        .catch(() => {});
    }
  }, [activeCropIndex, i18n.language]);

  const stats = [
    { nameKey: "dashboard.cropHealth", value: "94%", chip: "Optimal", icon: Leaf, bg: "var(--primary)" },
    { nameKey: "dashboard.bestPrice", value: bestPriceValue, chip: activeCrop.crop_name, icon: IndianRupee, bg: "var(--secondary)" },
    { nameKey: "dashboard.rainChance", value: rainChanceValue, chip: villageName, icon: CloudRain, bg: "var(--dark)" },
    { nameKey: "dashboard.openAlerts", value: String(farmerCrops.length || 1), chip: "Active Crops", icon: Bell, bg: "var(--primary)" },
  ];

  return (
    <>
      <div className="grain-overlay" />

      <div className="dash-topbar">
        <Link to="/" className="logo">
          FARM*PILOT
        </Link>
        <div className="dash-topbar-right">
          <LanguageSwitcher />
          <Link to="/" className="back-link">
            <ArrowLeft size={16} strokeWidth={2.5} aria-hidden="true" /> {t("nav.backToSite")}
          </Link>
          <div className="user-badge">
            <span className="avatar" aria-hidden="true">
              {farmerName.charAt(0).toUpperCase()}
            </span>
            {farmerName}
          </div>
        </div>
      </div>

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h1 className="dash-greeting">
              {t("dashboard.greeting")}, {farmerName}
            </h1>
            <p className="dash-sub">{t("dashboard.subtitle")}</p>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <Link
              to="/farmer/diagnose"
              className="btn-cta"
              style={{ background: "var(--secondary)", color: "var(--dark)", fontSize: "12px" }}
            >
              <Camera size={16} strokeWidth={2.5} style={{ marginRight: "6px" }} />
              Snap & Diagnose
            </Link>
            <Link
              to={activeCrop.crop_id ? `/farmer/advisory?crop_id=${activeCrop.crop_id}` : "/farmer/advisory"}
              className="btn-cta"
              style={{ background: "var(--primary)", color: "white", fontSize: "12px" }}
            >
              <FileText size={16} strokeWidth={2.5} style={{ marginRight: "6px" }} />
              {t("dashboard.viewAdvisory")} ({activeCrop.crop_name})
            </Link>
            <span className="season-badge">
              <Leaf size={16} strokeWidth={2.5} aria-hidden="true" /> {t("dashboard.season")}
            </span>
          </div>
        </div>

        {/* ── Multi-Crop Selector Pill Bar ── */}
        {farmerCrops.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "20px",
              padding: "12px 16px",
              background: "white",
              border: "var(--border)",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", color: "#566047", marginRight: "6px" }}>
              🌾 Registered Crops ({farmerCrops.length}):
            </span>
            {farmerCrops.map((c, idx) => (
              <button
                key={c.crop_id || idx}
                type="button"
                onClick={() => {
                  setActiveCropIndex(idx);
                  saveCropId(c.crop_id);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  fontWeight: 700,
                  fontSize: "12px",
                  border: "2px solid",
                  borderColor: idx === activeCropIndex ? "var(--primary)" : "#ddd",
                  background: idx === activeCropIndex ? "var(--primary)" : "rgba(0,0,0,0.02)",
                  color: idx === activeCropIndex ? "white" : "var(--dark)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <Leaf size={14} />
                {c.crop_name}
                {idx === activeCropIndex && <span style={{ fontSize: "10px", opacity: 0.9 }}>✓</span>}
              </button>
            ))}

            <Link
              to="/farmer/onboard"
              style={{
                marginLeft: "auto",
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--primary)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              + Add another crop
            </Link>
          </div>
        )}

        {/* Stat cards */}
        <section className="stat-cards" aria-label="Farm overview">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div className="stat-card" key={s.nameKey}>
                <div className="stat-top">
                  <span className="stat-icon-box" style={{ background: s.bg }}>
                    <Icon size={22} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span className="stat-chip">{s.chip}</span>
                </div>
                <div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-name">{t(s.nameKey)}</div>
                </div>
              </div>
            );
          })}
        </section>

        <div className="dash-columns">
          {/* Left column */}
          <div className="dash-col">
            <section className="panel" aria-label="Yield trend">
              <div className="panel-head">
                <h3>{t("dashboard.yieldTrend")}</h3>
                <span className="panel-tag">{t("dashboard.qtlPerAcre")}</span>
              </div>
              <div className="panel-body">
                <YieldChart />
                <div style={{ display: "flex", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13 }}>
                    <span
                      style={{ width: 14, height: 14, background: "var(--primary)", border: "2px solid var(--dark)" }}
                      aria-hidden="true"
                    />
                    {t("dashboard.actualYield")}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13 }}>
                    <span
                      style={{ width: 14, height: 14, background: "var(--accent)", border: "2px solid var(--dark)" }}
                      aria-hidden="true"
                    />
                    {t("dashboard.target")}
                  </span>
                </div>
              </div>
            </section>

            <section className="panel" aria-label="Live mandi prices">
              <div className="panel-head">
                <h3>{t("dashboard.livePrices")}</h3>
                <span className="panel-tag">{t("dashboard.perQuintal")}</span>
              </div>
              <div>
                {priceList.map((p) => {
                  const up = p.trend === "up";
                  return (
                    <div className="price-row" key={p.crop}>
                      <div>
                        <div className="price-crop">{p.crop}</div>
                        <div className="price-market">{p.market}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="price-value">{p.value}</div>
                        <div className={`price-trend ${up ? "trend-up" : "trend-down"}`}>
                          {up ? (
                            <ArrowUpRight size={14} strokeWidth={2.5} aria-hidden="true" />
                          ) : (
                            <ArrowDownRight size={14} strokeWidth={2.5} aria-hidden="true" />
                          )}
                          {p.change}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right column */}
          <div className="dash-col">
            <section className="panel" aria-label="Weather forecast">
              <div className="panel-head">
                <h3>{t("dashboard.fiveDayWeather")}</h3>
                <span className="panel-tag">
                  <Droplets
                    size={12}
                    strokeWidth={2.5}
                    style={{ display: "inline", marginRight: 4 }}
                    aria-hidden="true"
                  />
                  {villageName}
                </span>
              </div>
              <div className="weather-strip">
                {forecastList.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div className="weather-day" key={f.day}>
                      <span className="wd-name">{f.day}</span>
                      <Icon size={26} strokeWidth={1.75} aria-hidden="true" />
                      <span className="wd-temp">{f.temp}</span>
                      <span className="wd-rain">{f.rain}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="panel" aria-label="Recommended actions">
              <div className="panel-head">
                <h3>{t("dashboard.todaysActions")}</h3>
                <span className="panel-tag">{actionTasks.length} Tasks</span>
              </div>
              <div>
                {actionTasks.map((ta) => (
                  <div className="task-item" key={ta.title}>
                    <span className="task-dot" style={{ background: ta.color }} aria-hidden="true" />
                    <div className="task-body">
                      <h4>{ta.title}</h4>
                      <p>{ta.detail}</p>
                    </div>
                    <span className="task-time">{ta.time}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
