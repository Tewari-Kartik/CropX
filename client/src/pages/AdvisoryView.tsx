import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Wifi, WifiOff, Clock, Leaf } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AudioPlayButton from "@/components/AudioPlayButton";
import { getAdvisory, type AdvisoryData } from "@/lib/api";
import { getCropId } from "@/lib/auth";
import { cacheAdvisory, getCachedAdvisory } from "@/lib/db";

export default function AdvisoryView() {
  const { t, i18n } = useTranslation();
  const [advisory, setAdvisory] = useState<AdvisoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const farmerId = localStorage.getItem("cropx-farmer-id") || "demo-farmer";
  const cropId = getCropId(); // saved during registration/onboarding

  useEffect(() => {
    async function fetchAdvisory() {
      setLoading(true);
      setError(null);

      // Only call real API if we have a crop_id
      const res = cropId
        ? await getAdvisory(farmerId, cropId, i18n.language)
        : { success: false, data: null, error: "No crop selected" };

      if (res.success && res.data) {
        setAdvisory(res.data);
        setIsCached(false);
        // Cache for offline use
        await cacheAdvisory(farmerId, res.data);
      } else {
        // Try offline cache
        const cached = await getCachedAdvisory(farmerId);
        if (cached) {
          setAdvisory(cached.data);
          setIsCached(true);
          setError(t("advisory.error"));
        } else {
          // Show demo advisory for hackathon demo
          const demoAdvisory: AdvisoryData = {
            advisory_id: "demo-001",
            crop_name: "Rice",
            advisory_text:
              i18n.language === "hi"
                ? "गुरुवार को अपेक्षित बारिश के कारण सिंचाई 2 दिन के लिए टालें। मिट्टी की नमी पर्याप्त है। बारिश के बाद नाइट्रोजन उर्वरक (यूरिया) 50 किग्रा/एकड़ की दर से डालें। पत्ती के धब्बों के लिए मैनकोज़ेब 2.5 ग्राम/लीटर का छिड़काव करें।"
                : "Delay irrigation by 2 days due to expected rainfall on Thursday. Soil moisture is currently adequate. After the rain, apply nitrogen fertilizer (urea) at 50 kg/acre. For leaf spot prevention, spray Mancozeb at 2.5 g/litre. Monitor field drainage to prevent waterlogging.",
            language: i18n.language,
            audio_url: "",
            generated_at: new Date().toISOString(),
            sources: ["weather_data", "growth_stage", "soil_moisture"],
          };
          setAdvisory(demoAdvisory);
          setIsCached(false);
        }
      }
      setLoading(false);
    }

    fetchAdvisory();
  }, [farmerId, i18n.language, t]);

  return (
    <div className="app-container">
      <div className="app-topbar">
        <Link
          to="/farmer/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontWeight: 700,
            fontSize: "13px",
            textTransform: "uppercase",
            color: "var(--dark)",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
        </Link>
        <span className="logo" style={{ fontSize: "18px" }}>
          FARM*PILOT
        </span>
        <LanguageSwitcher />
      </div>

      <div className="app-body">
        <h1 className="app-page-title">{t("advisory.title")}</h1>
        <p className="app-page-subtitle">{t("advisory.subtitle")}</p>

        {loading ? (
          <div>
            <div className="skeleton" style={{ height: "24px", width: "60%", marginBottom: "16px" }} />
            <div className="skeleton" style={{ height: "200px", marginBottom: "16px" }} />
            <div className="skeleton" style={{ height: "56px", width: "160px" }} />
          </div>
        ) : advisory ? (
          <>
            {/* Offline indicator */}
            {isCached && (
              <div className="cached-badge" style={{ marginBottom: "16px" }}>
                <WifiOff size={14} strokeWidth={2.5} />
                {t("advisory.cached")}
              </div>
            )}

            {error && !isCached && (
              <div
                style={{
                  background: "#fbe9e7",
                  border: "2px solid #d32f2f",
                  padding: "12px 16px",
                  marginBottom: "16px",
                  fontWeight: 700,
                  fontSize: "14px",
                  color: "#d32f2f",
                }}
              >
                {error}
              </div>
            )}

            {/* Advisory card */}
            <div className="advisory-card">
              <div className="advisory-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      background: "var(--primary)",
                      border: "2px solid var(--dark)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                    }}
                  >
                    <Leaf size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, textTransform: "uppercase", fontSize: "15px" }}>
                      {advisory.crop_name}
                    </div>
                    <div style={{ fontSize: "12px", color: "#566047", fontWeight: 600 }}>
                      {t("advisory.title")}
                    </div>
                  </div>
                </div>
                {!isCached && (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--primary)" }}>
                    <Wifi size={14} strokeWidth={2.5} />
                    <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase" }}>Live</span>
                  </div>
                )}
              </div>

              <div className="advisory-card-body">
                <p className="advisory-text">{advisory.advisory_text}</p>
              </div>

              <div className="advisory-meta">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Clock size={14} strokeWidth={2.5} />
                  {t("advisory.generatedAt")}:{" "}
                  {new Date(advisory.generated_at).toLocaleDateString(i18n.language === "hi" ? "hi-IN" : "en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                {advisory.sources && advisory.sources.length > 0 && (
                  <div>
                    {t("advisory.sources")}: {advisory.sources.join(", ")}
                  </div>
                )}
              </div>
            </div>

            {/* Audio playback */}
            <div style={{ marginTop: "24px" }}>
              <AudioPlayButton
                text={advisory.advisory_text}
                lang={advisory.language || i18n.language}
                audioUrl={advisory.audio_url || undefined}
              />
            </div>
          </>
        ) : (
          <div
            style={{
              border: "var(--border)",
              background: "white",
              padding: "40px 20px",
              textAlign: "center",
            }}
          >
            <Leaf size={48} strokeWidth={1.25} style={{ color: "#ccc", margin: "0 auto 16px" }} />
            <p style={{ fontWeight: 700, fontSize: "16px" }}>{t("advisory.noAdvisory")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
