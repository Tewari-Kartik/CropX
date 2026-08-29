import { Sprout, ScanLine, TrendingUp, CloudRain, Users, Languages, Leaf, Headphones } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <>
      <div className="grain-overlay" />

      <header className="header">
        <div className="logo">FARM*PILOT</div>
        <nav>
          <a href="#features">Features</a>
          <a href="#how">How It Works</a>
          <a href="#story">Our Story</a>
          <a href="#numbers">Numbers</a>
          <Link href="/dashboard">Dashboard</Link>
        </nav>
        <Link href="/dashboard" className="btn-cta">
          Open Dashboard
        </Link>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <h1 className="hero-title">
              GROW SMART,
              <br />
              HARVEST <span>MORE</span>
            </h1>
            <p className="text-base md:text-lg lg:text-xl mb-8 md:mb-10 leading-relaxed text-[#4a5a3f]">
              Your friendly AI farming buddy. Snap a photo of your crop, check today&apos;s mandi prices, and get simple
              advice in your language. No jargon, just better harvests.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
              <Link
                href="/dashboard"
                className="btn-cta"
                style={{ background: "var(--primary)", color: "white", textAlign: "center" }}
              >
                Open Dashboard
              </Link>
              <a href="#how" className="btn-cta" style={{ background: "white", textAlign: "center" }}>
                See How It Works
              </a>
            </div>
          </div>
          <div className="hero-img">
            <Sprout className="hero-visual" size={180} strokeWidth={1.25} aria-hidden="true" />
            <div className="sticker">
              AI
              <br />
              POWERED
            </div>
            <div className="floating-tag hidden md:block" style={{ top: "18%", left: "10%" }}>
              #SMARTFARMING
            </div>
            <div className="floating-tag hidden md:block" style={{ bottom: "24%", right: "16%" }}>
              LIVE PRICES
            </div>
          </div>
        </section>

        <div className="marquee">
          <div className="marquee-content">
            &nbsp; ★ INSTANT CROP DIAGNOSIS ★ LIVE MANDI PRICES ★ WEATHER ALERTS ★ ADVICE IN YOUR LANGUAGE ★ NO JARGON ★
            INSTANT CROP DIAGNOSIS ★ LIVE MANDI PRICES ★ WEATHER ALERTS ★ ADVICE IN YOUR LANGUAGE ★ NO JARGON
          </div>
        </div>

        <section className="section-padding" id="features">
          <div className="section-header">
            <h2 className="section-title">WHAT IT DOES</h2>
            <a
              href="#how"
              className="text-sm md:text-base"
              style={{ color: "var(--dark)", fontWeight: 800, textTransform: "uppercase" }}
            >
              How It Works →
            </a>
          </div>

          <div className="menu-grid">
            {/* Feature 1 */}
            <div className="menu-card">
              <span className="menu-tag">AI Powered</span>
              <div className="card-visual" style={{ background: "var(--primary)" }}>
                <ScanLine size={90} strokeWidth={1.25} aria-hidden="true" />
              </div>
              <div className="menu-card-body">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <h3>Snap &amp; Diagnose</h3>
                  <span className="price">AI</span>
                </div>
                <p style={{ fontSize: "14px", color: "#666" }}>
                  Take a photo of a sick leaf and get an instant diagnosis plus a simple treatment plan in seconds.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="menu-card">
              <span className="menu-tag" style={{ background: "var(--secondary)" }}>
                Real-Time
              </span>
              <div className="card-visual" style={{ background: "var(--secondary)" }}>
                <TrendingUp size={90} strokeWidth={1.25} aria-hidden="true" />
              </div>
              <div className="menu-card-body">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <h3>Live Mandi Prices</h3>
                  <span className="price">LIVE</span>
                </div>
                <p style={{ fontSize: "14px", color: "#666" }}>
                  See today&apos;s prices from nearby markets so you always know the best time and place to sell.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="menu-card">
              <span className="menu-tag" style={{ background: "var(--accent)", color: "var(--dark)" }}>
                Real-Time
              </span>
              <div className="card-visual" style={{ background: "var(--dark)" }}>
                <CloudRain size={90} strokeWidth={1.25} aria-hidden="true" />
              </div>
              <div className="menu-card-body">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <h3>Weather &amp; Watering</h3>
                  <span className="price">24/7</span>
                </div>
                <p style={{ fontSize: "14px", color: "#666" }}>
                  Get rain and heat alerts plus daily reminders on when to water and spray, tuned to your field.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="retro-vibe" id="story">
          <div>
            <h2 className="vibe-title">FARMING, MADE SIMPLE.</h2>
            <p className="vibe-text">
              We built FARM*PILOT for real farmers, not tech experts. No complicated dashboards, no confusing settings.
              Just open the app, ask a question, and get a clear answer you can act on today. Over 50,000 farmers already
              trust us with their fields.
            </p>
            <button className="btn-cta" style={{ background: "var(--dark)", color: "white", borderColor: "white" }}>
              Read Our Story
            </button>
          </div>
          <div className="vibe-img">
            <Leaf size={160} strokeWidth={1.25} aria-hidden="true" />
          </div>
        </section>

        <section className="section-padding" id="how">
          <h2 className="section-title" style={{ marginBottom: "40px", textAlign: "center" }}>
            THREE EASY STEPS
          </h2>
          <div className="menu-grid">
            <div className="menu-card">
              <div className="menu-card-body">
                <span className="price">01</span>
                <h3 style={{ margin: "10px 0" }}>Ask or Snap</h3>
                <p style={{ fontSize: "14px", color: "#666" }}>
                  Type a question in your language or take a photo of your crop. No sign-up hassle to get started.
                </p>
              </div>
            </div>
            <div className="menu-card">
              <div className="menu-card-body">
                <span className="price">02</span>
                <h3 style={{ margin: "10px 0" }}>Get Clear Advice</h3>
                <p style={{ fontSize: "14px", color: "#666" }}>
                  Our AI reads your field, weather, and live prices to give you a simple, step-by-step answer.
                </p>
              </div>
            </div>
            <div className="menu-card">
              <div className="menu-card-body">
                <span className="price">03</span>
                <h3 style={{ margin: "10px 0" }}>Grow More</h3>
                <p style={{ fontSize: "14px", color: "#666" }}>
                  Act on the advice, sell at the right time, and watch your harvest and income grow season after season.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section-padding" id="numbers" style={{ paddingTop: 0 }}>
          <h2 className="section-title" style={{ marginBottom: "40px", textAlign: "center" }}>
            BY THE NUMBERS
          </h2>
          <div className="social-grid">
            <div className="social-item">
              <Users className="stat-icon" size={40} strokeWidth={1.75} aria-hidden="true" />
              <div>
                <div className="stat-number">50K+</div>
                <div className="stat-label">Farmers Helped</div>
              </div>
            </div>
            <div className="social-item">
              <Languages className="stat-icon" size={40} strokeWidth={1.75} aria-hidden="true" />
              <div>
                <div className="stat-number">12</div>
                <div className="stat-label">Languages</div>
              </div>
            </div>
            <div className="social-item">
              <Leaf className="stat-icon" size={40} strokeWidth={1.75} aria-hidden="true" />
              <div>
                <div className="stat-number">30%</div>
                <div className="stat-label">Avg Yield Boost</div>
              </div>
            </div>
            <div className="social-item">
              <Headphones className="stat-icon" size={40} strokeWidth={1.75} aria-hidden="true" />
              <div>
                <div className="stat-number">24/7</div>
                <div className="stat-label">Support</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div>
          <div className="footer-logo">FARM*PILOT</div>
          <p style={{ color: "#666", lineHeight: 1.6 }}>
            The friendly AI farming assistant helping everyday farmers grow smarter and earn more. Rooted in the field,
            powered by technology.
          </p>
        </div>
        <div className="footer-links">
          <h4>Product</h4>
          <ul>
            <li>
              <a href="#features" style={{ color: "inherit", textDecoration: "none" }}>
                Features
              </a>
            </li>
            <li>
              <a href="#how" style={{ color: "inherit", textDecoration: "none" }}>
                How It Works
              </a>
            </li>
            <li>
              <a href="#story" style={{ color: "inherit", textDecoration: "none" }}>
                Our Story
              </a>
            </li>
            <li>
              <a href="#" style={{ color: "inherit", textDecoration: "none" }}>
                Pricing
              </a>
            </li>
          </ul>
        </div>
        <div className="footer-links">
          <h4>Support</h4>
          <ul>
            <li>Help Center</li>
            <li>Available in 12 languages</li>
            <li>Call: 1800-FARM-PILOT</li>
            <li>Mon-Sat: 6am - 9pm</li>
          </ul>
        </div>
        <div className="footer-bottom">
          <span>© 2025 FARM PILOT TECHNOLOGIES</span>
          <span>GROWN WITH v0</span>
          <span>IG / YT / WA</span>
        </div>
      </footer>
    </>
  )
}
