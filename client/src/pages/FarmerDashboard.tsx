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
import { getFarmerById } from "@/lib/api";
import { getFarmerId, getFarmerName, getCropName, getCrops, saveCropName, saveCropId } from "@/lib/auth";

const defaultPrices = [
  { crop: "Rice", market: "Karnal Mandi", value: "₹3,880", trend: "up", change: "+1.8%" },
  { crop: "Rice (Basmati)", market: "Karnal Mandi", value: "₹3,880", trend: "up", change: "+1.8%" },
  { crop: "Wheat", market: "Azadpur Mandi", value: "₹2,340", trend: "up", change: "+4.2%" },
  { crop: "Tomato", market: "Kolar Mandi", value: "₹1,650", trend: "up", change: "+6.5%" },
  { crop: "Cotton", market: "Rajkot Mandi", value: "₹6,240", trend: "down", change: "-0.9%" },
  { crop: "Onion", market: "Nashik Mandi", value: "₹1,120", trend: "down", change: "-3.1%" },
];

const forecast = [
  { day: "Mon", temp: "31°", rain: "10%", icon: Sun },
  { day: "Tue", temp: "29°", rain: "60%", icon: CloudRain },
  { day: "Wed", temp: "28°", rain: "40%", icon: CloudSun },
  { day: "Thu", temp: "30°", rain: "20%", icon: Cloud },
  { day: "Fri", temp: "32°", rain: "5%", icon: Sun },
];

export default function FarmerDashboard() {
  const { t } = useTranslation();
  const [farmerName, setFarmerName] = useState<string>(getFarmerName() || "Farmer");
  const [cropsList, setCropsList] = useState(getCrops());
  const [selectedCrop, setSelectedCrop] = useState<string>(getCropName() || (cropsList[0]?.crop_name) || "Rice");

  useEffect(() => {
    const id = getFarmerId();
    if (!id) return;
    getFarmerById(id).then((res) => {
      if (res.success && res.data) {
        if (res.data.full_name) {
          setFarmerName(res.data.full_name.split(" ")[0]);
        }
        if (res.data.crops && res.data.crops.length > 0) {
          setCropsList(res.data.crops);
          if (!getCropName()) {
            setSelectedCrop(res.data.crops[0].crop_name);
            saveCropName(res.data.crops[0].crop_name);
            if (res.data.crops[0].crop_id) {
              saveCropId(res.data.crops[0].crop_id);
            }
          }
        }
      }
    });
  }, []);

  // Find best matched price for the selected crop
  const matchedPriceItem = defaultPrices.find(
    (p) => p.crop.toLowerCase().includes(selectedCrop.toLowerCase()) || selectedCrop.toLowerCase().includes(p.crop.toLowerCase())
  ) || { crop: selectedCrop, market: "Local Mandi", value: "₹3,150", trend: "up", change: "+2.4%" };

  const dynamicStats = [
    { nameKey: "dashboard.cropHealth", value: "94%", chip: "Good", icon: Leaf, bg: "var(--primary)" },
    { nameKey: "dashboard.bestPrice", value: matchedPriceItem.value, chip: selectedCrop, icon: IndianRupee, bg: "var(--secondary)" },
    { nameKey: "dashboard.rainChance", value: "60%", chip: "Tomorrow", icon: CloudRain, bg: "var(--dark)" },
    { nameKey: "dashboard.openAlerts", value: "2", chip: "Action", icon: Bell, bg: "var(--primary)" },
  ];

  const dynamicTasks = [
    {
      title: `Irrigate ${selectedCrop} Field`,
      detail: `Check soil moisture for ${selectedCrop}. Follow recommended schedule.`,
      time: "Today",
      color: "var(--primary)",
    },
    {
      title: `${selectedCrop} Health Inspection`,
      detail: `Inspect leaves for fungal spotting and pest infestation.`,
      time: "In 2 days",
      color: "var(--secondary)",
    },
    {
      title: `Market Alert: ${selectedCrop}`,
      detail: `Current Mandi price is ${matchedPriceItem.value}/qtl (${matchedPriceItem.change}).`,
      time: "This week",
      color: "var(--dark)",
    },
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
            {cropsList.length > 1 && (
              <select
                value={selectedCrop}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCrop(val);
                  saveCropName(val);
                  const found = cropsList.find((c) => c.crop_name === val);
                  if (found?.crop_id) saveCropId(found.crop_id);
                }}
                style={{
                  padding: "8px 12px",
                  fontWeight: 700,
                  fontSize: "13px",
                  border: "2px solid var(--dark)",
                  background: "white",
                  cursor: "pointer",
                  borderRadius: "0px",
                }}
              >
                {cropsList.map((c) => (
                  <option key={c.crop_name} value={c.crop_name}>
                    🌱 {c.crop_name}
                  </option>
                ))}
              </select>
            )}
            <Link
              to="/farmer/advisory"
              className="btn-cta"
              style={{ background: "var(--primary)", color: "white", fontSize: "12px" }}
            >
              <FileText size={16} strokeWidth={2.5} style={{ marginRight: "6px" }} />
              {t("dashboard.viewAdvisory")}
            </Link>
            <span className="season-badge">
              <Leaf size={16} strokeWidth={2.5} aria-hidden="true" /> {selectedCrop} • {t("dashboard.season")}
            </span>
          </div>
        </div>

        {/* Stat cards */}
        <section className="stat-cards" aria-label="Farm overview">
          {dynamicStats.map((s) => {
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
                {defaultPrices.map((p) => {
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
                  Field A
                </span>
              </div>
              <div className="weather-strip">
                {forecast.map((f) => {
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
                <span className="panel-tag">3 Tasks</span>
              </div>
              <div>
                {dynamicTasks.map((ta) => (
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
