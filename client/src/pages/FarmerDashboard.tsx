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

const stats = [
  { nameKey: "dashboard.cropHealth", value: "92%", chip: "Good", icon: Leaf, bg: "var(--primary)" },
  { nameKey: "dashboard.bestPrice", value: "₹2,340", chip: "Wheat", icon: IndianRupee, bg: "var(--secondary)" },
  { nameKey: "dashboard.rainChance", value: "60%", chip: "Tomorrow", icon: CloudRain, bg: "var(--dark)" },
  { nameKey: "dashboard.openAlerts", value: "3", chip: "Action", icon: Bell, bg: "var(--primary)" },
];

const prices = [
  { crop: "Wheat", market: "Azadpur Mandi", value: "₹2,340", trend: "up", change: "+4.2%" },
  { crop: "Rice (Basmati)", market: "Karnal Mandi", value: "₹3,880", trend: "up", change: "+1.8%" },
  { crop: "Onion", market: "Nashik Mandi", value: "₹1,120", trend: "down", change: "-3.1%" },
  { crop: "Tomato", market: "Kolar Mandi", value: "₹1,650", trend: "up", change: "+6.5%" },
  { crop: "Cotton", market: "Rajkot Mandi", value: "₹6,240", trend: "down", change: "-0.9%" },
];

const forecast = [
  { day: "Mon", temp: "31°", rain: "10%", icon: Sun },
  { day: "Tue", temp: "29°", rain: "60%", icon: CloudRain },
  { day: "Wed", temp: "28°", rain: "40%", icon: CloudSun },
  { day: "Thu", temp: "30°", rain: "20%", icon: Cloud },
  { day: "Fri", temp: "32°", rain: "5%", icon: Sun },
];

const tasks = [
  {
    title: "Irrigate Field B",
    detail: "Soil moisture is low. Water the wheat block before noon.",
    time: "Today",
    color: "var(--primary)",
  },
  {
    title: "Spray for leaf rust",
    detail: "Early signs detected on your last crop scan. Use recommended fungicide.",
    time: "In 2 days",
    color: "var(--secondary)",
  },
  {
    title: "Sell onions",
    detail: "Prices dipped 3% but expected to recover by weekend. Hold if you can.",
    time: "This week",
    color: "var(--dark)",
  },
];

export default function FarmerDashboard() {
  const { t } = useTranslation();
  const farmerName = "Rajesh"; // TODO: get from stored farmer profile

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
              R
            </span>
            Rajesh K.
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
              to="/farmer/advisory"
              className="btn-cta"
              style={{ background: "var(--primary)", color: "white", fontSize: "12px" }}
            >
              <FileText size={16} strokeWidth={2.5} style={{ marginRight: "6px" }} />
              {t("dashboard.viewAdvisory")}
            </Link>
            <span className="season-badge">
              <Leaf size={16} strokeWidth={2.5} aria-hidden="true" /> {t("dashboard.season")}
            </span>
          </div>
        </div>

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
                {prices.map((p) => {
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
                {tasks.map((ta) => (
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
