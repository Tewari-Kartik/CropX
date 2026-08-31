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
} from "lucide-react";
import { YieldChart } from "@/components/dashboard/yield-chart";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  getFarmerById,
  getWeatherByRegion,
  getMarketPricesByCrop,
  getAdvisory,
} from "@/lib/api";
import { getFarmerId, getFarmerName, saveCropId } from "@/lib/auth";

const defaultPrices = [
  { crop: "Wheat", market: "Azadpur Mandi", value: "₹2,340", trend: "up", change: "+4.2%" },
  { crop: "Rice (Basmati)", market: "Karnal Mandi", value: "₹3,880", trend: "up", change: "+1.8%" },
  { crop: "Onion", market: "Nashik Mandi", value: "₹1,420", trend: "down", change: "-3.1%" },
  { crop: "Tomato", market: "Kolar Mandi", value: "₹1,650", trend: "up", change: "+6.5%" },
  { crop: "Cotton", market: "Rajkot Mandi", value: "₹6,240", trend: "down", change: "-0.9%" },
];

const defaultForecast = [
  { day: "Mon", temp: "31°", rain: "10%", icon: Sun },
  { day: "Tue", temp: "29°", rain: "60%", icon: CloudRain },
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
  const [farmerName, setFarmerName] = useState<string>(getFarmerName() || "Farmer");
  const [villageName, setVillageName] = useState<string>("Field A");
  const [farmerCrops, setFarmerCrops] = useState<CropItem[]>([]);
  const [activeCropIndex, setActiveCropIndex] = useState<number>(0);
  const [priceList, setPriceList] = useState(defaultPrices);
  const [forecastList, setForecastList] = useState(defaultForecast);
  const [bestPriceValue, setBestPriceValue] = useState("₹2,340");
  const [rainChanceValue, setRainChanceValue] = useState("20%");
  const [actionTasks, setActionTasks] = useState([
    {
      title: "Check soil moisture & irrigation",
      detail: "Weather model recommends monitoring soil before applying fertilizer.",
      time: "Today",
      color: "var(--primary)",
    },
    {
      title: "Mandi price monitoring",
      detail: "Market trends show stable pricing. Plan harvest dispatch accordingly.",
      time: "This week",
      color: "var(--secondary)",
    },
  ]);

  useEffect(() => {
    const id = getFarmerId() || localStorage.getItem("cropx-farmer-id");
    if (!id) return;
    const farmerId: string = id;

    async function loadDashboardData(fId: string) {
      const res = await getFarmerById(fId);
      if (res.success && res.data) {
        const farmer = res.data;
        if (farmer.full_name) {
          setFarmerName(farmer.full_name.split(" ")[0]);
        }
        if (farmer.village_name) {
          setVillageName(farmer.village_name);
        }

        const registeredCrops: CropItem[] = (farmer.crops || []).map((c) => ({
          crop_id: c.crop_id,
          crop_name: c.crop_name,
          sowing_date: c.sowing_date,
          irrigation_type: c.irrigation_type,
        }));

        setFarmerCrops(registeredCrops);

        if (registeredCrops.length > 0) {
          const currentCrop = registeredCrops[activeCropIndex] || registeredCrops[0];
          saveCropId(currentCrop.crop_id);

          // 1. Fetch live market prices for ALL registered crops
          const allPrices = [...defaultPrices];
          const userCropPriceRows = [];

          for (const c of registeredCrops) {
            const mRes = await getMarketPricesByCrop(c.crop_id);
            if (mRes.success && mRes.data && mRes.data.length > 0) {
              const latest = mRes.data[0];
              userCropPriceRows.push({
                crop: `${c.crop_name} ★`,
                market: latest.mandi_name,
                value: `₹${latest.price_per_quintal.toLocaleString("en-IN")}`,
                trend: latest.trend,
                change: latest.trend === "up" ? "+3.5%" : latest.trend === "down" ? "-1.8%" : "0.0%",
              });
            }
          }

          if (userCropPriceRows.length > 0) {
            setBestPriceValue(userCropPriceRows[activeCropIndex]?.value || userCropPriceRows[0].value);
            // Filter out default benchmarks matching user crop names to avoid duplicates
            const filteredBenchmarks = allPrices.filter(
              (p) => !registeredCrops.some((c) => p.crop.toLowerCase().includes(c.crop_name.toLowerCase()))
            );
            setPriceList([...userCropPriceRows, ...filteredBenchmarks]);
          }

          // 2. Fetch AI Advisory for the active crop
          const advRes = await getAdvisory(fId, currentCrop.crop_id, i18n.language);
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
        }

        // 3. Fetch live weather for farmer's region
        if (farmer.region_id) {
          const weatherRes = await getWeatherByRegion(farmer.region_id);
          if (weatherRes.success && weatherRes.data && weatherRes.data.length > 0) {
            const latest = weatherRes.data[0];
            const tempVal = Math.round(latest.temperature_c);
            const rainPct = latest.rainfall_mm > 0 ? `${Math.min(95, Math.round(latest.rainfall_mm * 10))}%` : "15%";
            setRainChanceValue(rainPct);

            setForecastList([
              { day: "Today", temp: `${tempVal}°`, rain: rainPct, icon: latest.rainfall_mm > 0 ? CloudRain : Sun },
              { day: "Tue", temp: `${tempVal - 1}°`, rain: "25%", icon: CloudSun },
              { day: "Wed", temp: `${tempVal + 1}°`, rain: "10%", icon: Sun },
              { day: "Thu", temp: `${tempVal}°`, rain: "40%", icon: Cloud },
              { day: "Fri", temp: `${tempVal + 2}°`, rain: "5%", icon: Sun },
            ]);
          }
        }
      }
    }

    loadDashboardData(farmerId);
  }, [activeCropIndex, i18n.language]);

  const activeCrop = farmerCrops[activeCropIndex] || farmerCrops[0] || { crop_name: "Wheat", crop_id: "" };

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
