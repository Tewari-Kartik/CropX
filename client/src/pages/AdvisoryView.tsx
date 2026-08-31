import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Wifi, WifiOff, Clock, Leaf } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AudioPlayButton from "@/components/AudioPlayButton";
import { getAdvisory, getFarmerById, type AdvisoryData } from "@/lib/api";
import { getCropId, saveCropId } from "@/lib/auth";
import { cacheAdvisory, getCachedAdvisory } from "@/lib/db";

interface CropOption {
  crop_id: string;
  crop_name: string;
}

export default function AdvisoryView() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [advisory, setAdvisory] = useState<AdvisoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropsList, setCropsList] = useState<CropOption[]>([]);
  const [activeCropId, setActiveCropId] = useState<string>("");

  const farmerId = localStorage.getItem("cropx-farmer-id") || "demo-farmer";

  useEffect(() => {
    async function loadCropsAndAdvisory() {
      setLoading(true);
      setError(null);

      let chosenCropId = searchParams.get("crop_id") || activeCropId || getCropId() || "";

      // Fetch farmer profile to get all registered crops
      if (farmerId && farmerId !== "demo-farmer") {
        const profile = await getFarmerById(farmerId);
        if (profile.success && profile.data?.crops && profile.data.crops.length > 0) {
          const list: CropOption[] = profile.data.crops.map((c) => ({
            crop_id: c.crop_id,
            crop_name: c.crop_name,
          }));
          setCropsList(list);

          // If no specific crop chosen yet, default to first registered crop
          if (!chosenCropId || !list.some((c) => c.crop_id === chosenCropId)) {
            chosenCropId = list[0].crop_id;
          }
        }
      }

      setActiveCropId(chosenCropId);
      if (chosenCropId) {
        saveCropId(chosenCropId);
      }

      // Fetch AI advisory for chosen crop
      const res = chosenCropId
        ? await getAdvisory(farmerId, chosenCropId, i18n.language)
        : { success: false, data: null, error: "No crop selected" };

      if (res.success && res.data) {
        setAdvisory(res.data);
        setIsCached(false);
        await cacheAdvisory(`${farmerId}-${chosenCropId}`, res.data);
      } else {
        // Try offline cache
        const cached = await getCachedAdvisory(`${farmerId}-${chosenCropId}`);
        if (cached) {
          setAdvisory(cached.data);
          setIsCached(true);
          setError(t("advisory.error"));
        } else {
          // Demo fallback
          const currentCropName = cropsList.find((c) => c.crop_id === chosenCropId)?.crop_name || "Crop";
          const demoAdvisory: AdvisoryData = {
            advisory_id: "demo-001",
            crop_name: currentCropName,
            advisory_text:
              i18n.language === "hi"
                ? `वर्तमान मौसम और मंडी भाव के आधार पर ${currentCropName} की देखभाल करें। जलभराव से बचें और शाम को अनुशंसित पोषक तत्व डालें।`
                : `Monitor soil moisture and current weather for ${currentCropName}. Ensure adequate drainage and apply balanced fertilizers after rainfall.`,
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

    loadCropsAndAdvisory();
  }, [farmerId, activeCropId, searchParams, i18n.language, t]);

  const handleSelectCrop = (cropId: string) => {
    setActiveCropId(cropId);
    setSearchParams({ crop_id: cropId });
    saveCropId(cropId);
  };

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

        {/* ── Multi-Crop Switcher in Advisory View ── */}
        {cropsList.length > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", color: "#566047" }}>
              Select Crop:
            </span>
            {cropsList.map((c) => {
              const isSelected = c.crop_id === activeCropId;
              return (
                <button
                  key={c.crop_id}
                  type="button"
                  onClick={() => handleSelectCrop(c.crop_id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontWeight: 700,
                    fontSize: "12px",
                    border: "2px solid",
                    borderColor: isSelected ? "var(--primary)" : "#ddd",
                    background: isSelected ? "var(--primary)" : "white",
                    color: isSelected ? "white" : "var(--dark)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <Leaf size={14} />
                  {c.crop_name}
                  {isSelected && <span style={{ fontSize: "10px" }}>✓</span>}
                </button>
              );
            })}
          </div>
        )}

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
