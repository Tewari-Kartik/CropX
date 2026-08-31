import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Sprout,
  ScanLine,
  TrendingUp,
  CloudRain,
  Users,
  Languages,
  Leaf,
  Headphones,
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="landing-container">
      <div className="grain-overlay" />

      <header>
        <div className="logo">FARM*PILOT</div>
        <nav>
          <a href="#features">{t("nav.features")}</a>
          <a href="#how">{t("nav.howItWorks")}</a>
          <a href="#story">{t("nav.ourStory")}</a>
          <a href="#numbers">{t("nav.numbers")}</a>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <LanguageSwitcher />
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="hero">
          <div className="hero-content">
            <h1 className="hero-title">
              {t("hero.line1")}
              <br />
              {t("hero.line2")} <span>{t("hero.line2Highlight")}</span>
            </h1>
            <p
              style={{
                fontSize: "16px",
                marginBottom: "32px",
                lineHeight: 1.65,
                color: "#4a5a3f",
              }}
            >
              {t("hero.subtitle")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
              <Link to="/farmer/onboard" className="btn-cta" style={{ background: "var(--primary)", color: "white" }}>
                {t("nav.imAFarmer")}
              </Link>
              <Link to="/officer/dashboard" className="btn-cta" style={{ background: "white" }}>
                {t("nav.officerLogin")}
              </Link>
            </div>
          </div>
          <div className="hero-img">
            <Sprout className="hero-visual" size={180} strokeWidth={1.25} aria-hidden="true" />
            <div className="sticker">
              AI
              <br />
              POWERED
            </div>
            <div className="floating-tag" style={{ top: "18%", left: "10%", display: "none" }}>
              #SMARTFARMING
            </div>
            <div className="floating-tag" style={{ bottom: "24%", right: "16%", display: "none" }}>
              LIVE PRICES
            </div>
          </div>
        </section>

        {/* Marquee */}
        <div className="marquee">
          <div className="marquee-content">
            &nbsp; ★ INSTANT CROP DIAGNOSIS ★ LIVE MANDI PRICES ★ WEATHER ALERTS ★ ADVICE IN YOUR LANGUAGE
            ★ NO JARGON ★ INSTANT CROP DIAGNOSIS ★ LIVE MANDI PRICES ★ WEATHER ALERTS ★ ADVICE IN YOUR
            LANGUAGE ★ NO JARGON
          </div>
        </div>

        {/* Features */}
        <section className="section-padding" id="features">
          <div className="section-header">
            <h2 className="section-title">{t("features.sectionTitle")}</h2>
            <a
              href="#how"
              style={{ color: "var(--dark)", fontWeight: 800, textTransform: "uppercase", fontSize: "14px" }}
            >
              {t("nav.howItWorks")} →
            </a>
          </div>
          <div className="menu-grid">
            {/* Feature 1 */}
            <Link to="/diagnose" className="menu-card" style={{ textDecoration: "none", color: "inherit", cursor: "pointer", display: "block" }}>
              <span className="menu-tag">AI Powered</span>
              <div className="card-visual" style={{ background: "var(--primary)", transition: "transform 0.2s ease" }}>
                <ScanLine size={90} strokeWidth={1.25} aria-hidden="true" />
              </div>
              <div className="menu-card-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <h3 style={{ color: "var(--dark)" }}>{t("features.snapTitle")}</h3>
                  <span className="price">AI TRY →</span>
                </div>
                <p style={{ fontSize: "14px", color: "#666" }}>{t("features.snapDesc")}</p>
              </div>
            </Link>

            {/* Feature 2 */}
            <div className="menu-card">
              <span className="menu-tag" style={{ background: "var(--secondary)" }}>Real-Time</span>
              <div className="card-visual" style={{ background: "var(--secondary)" }}>
                <TrendingUp size={90} strokeWidth={1.25} aria-hidden="true" />
              </div>
              <div className="menu-card-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <h3>{t("features.pricesTitle")}</h3>
                  <span className="price">LIVE</span>
                </div>
                <p style={{ fontSize: "14px", color: "#666" }}>{t("features.pricesDesc")}</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="menu-card">
              <span className="menu-tag" style={{ background: "var(--accent)", color: "var(--dark)" }}>Real-Time</span>
              <div className="card-visual" style={{ background: "var(--dark)" }}>
                <CloudRain size={90} strokeWidth={1.25} aria-hidden="true" />
              </div>
              <div className="menu-card-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <h3>{t("features.weatherTitle")}</h3>
                  <span className="price">24/7</span>
                </div>
                <p style={{ fontSize: "14px", color: "#666" }}>{t("features.weatherDesc")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="retro-vibe" id="story">
          <div>
            <h2 className="vibe-title">{t("story.title")}</h2>
            <p className="vibe-text">{t("story.text")}</p>
            <button className="btn-cta" style={{ background: "var(--dark)", color: "white", borderColor: "white" }}>
              {t("story.cta")}
            </button>
          </div>
          <div className="vibe-img">
            <Leaf size={160} strokeWidth={1.25} aria-hidden="true" />
          </div>
        </section>

        {/* Steps */}
        <section className="section-padding" id="how">
          <h2 className="section-title" style={{ marginBottom: "40px", textAlign: "center" }}>
            {t("steps.title")}
          </h2>
          <div className="menu-grid">
            <div className="menu-card">
              <div className="menu-card-body">
                <span className="price">01</span>
                <h3 style={{ margin: "10px 0" }}>{t("steps.step1Title")}</h3>
                <p style={{ fontSize: "14px", color: "#666" }}>{t("steps.step1Desc")}</p>
              </div>
            </div>
            <div className="menu-card">
              <div className="menu-card-body">
                <span className="price">02</span>
                <h3 style={{ margin: "10px 0" }}>{t("steps.step2Title")}</h3>
                <p style={{ fontSize: "14px", color: "#666" }}>{t("steps.step2Desc")}</p>
              </div>
            </div>
            <div className="menu-card">
              <div className="menu-card-body">
                <span className="price">03</span>
                <h3 style={{ margin: "10px 0" }}>{t("steps.step3Title")}</h3>
                <p style={{ fontSize: "14px", color: "#666" }}>{t("steps.step3Desc")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="section-padding" id="numbers" style={{ paddingTop: 0 }}>
          <h2 className="section-title" style={{ marginBottom: "40px", textAlign: "center" }}>
            {t("stats.title")}
          </h2>
          <div className="social-grid">
            <div className="social-item">
              <Users className="stat-icon" size={40} strokeWidth={1.75} aria-hidden="true" />
              <div>
                <div className="stat-number">50K+</div>
                <div className="stat-label">{t("stats.farmers")}</div>
              </div>
            </div>
            <div className="social-item">
              <Languages className="stat-icon" size={40} strokeWidth={1.75} aria-hidden="true" />
              <div>
                <div className="stat-number">12</div>
                <div className="stat-label">{t("stats.languages")}</div>
              </div>
            </div>
            <div className="social-item">
              <Leaf className="stat-icon" size={40} strokeWidth={1.75} aria-hidden="true" />
              <div>
                <div className="stat-number">30%</div>
                <div className="stat-label">{t("stats.yieldBoost")}</div>
              </div>
            </div>
            <div className="social-item">
              <Headphones className="stat-icon" size={40} strokeWidth={1.75} aria-hidden="true" />
              <div>
                <div className="stat-number">24/7</div>
                <div className="stat-label">{t("stats.support")}</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div>
          <div className="footer-logo">FARM*PILOT</div>
          <p style={{ color: "#666", lineHeight: 1.6 }}>{t("footer.description")}</p>
        </div>
        <div className="footer-links">
          <h4>{t("footer.product")}</h4>
          <ul>
            <li><a href="#features" style={{ color: "inherit", textDecoration: "none" }}>{t("nav.features")}</a></li>
            <li><a href="#how" style={{ color: "inherit", textDecoration: "none" }}>{t("nav.howItWorks")}</a></li>
            <li><a href="#story" style={{ color: "inherit", textDecoration: "none" }}>{t("nav.ourStory")}</a></li>
            <li><a href="#" style={{ color: "inherit", textDecoration: "none" }}>{t("footer.pricing")}</a></li>
          </ul>
        </div>
        <div className="footer-links">
          <h4>{t("footer.supportTitle")}</h4>
          <ul>
            <li>{t("footer.helpCenter")}</li>
            <li>{t("footer.availableIn")}</li>
            <li>{t("footer.callUs")}</li>
            <li>{t("footer.hours")}</li>
          </ul>
        </div>
        <div className="footer-bottom">
          <span>{t("footer.copyright")}</span>
          <span>BUILT WITH ❤️</span>
          <span>IG / YT / WA</span>
        </div>
      </footer>
    </div>
  );
}
