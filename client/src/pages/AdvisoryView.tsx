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
        } else {
          // Generate realistic dynamic advisory tailored to the active crop
          const crop = cropsList.find((c) => c.crop_id === chosenCropId)?.crop_name || "Rice";
          const isHindi = i18n.language === "hi";

          const dynamicAdvisoryMap: Record<string, { hi: string; en: string }> = {
            Rice: {
              hi: `धान (${crop}) की फसल के लिए: मिट्टी में 2-3 सेमी पानी का स्तर बनाए रखें। नाइट्रोजन (यूरिया 45 किग्रा/एकड़) की दूसरी खुराक दें। तना छेदक और पत्ती लपेटक कीटों की निगरानी करें। आवश्यकता होने पर नीम के तेल का छिड़काव करें।`,
              en: `Advisory for ${crop}: Maintain 2-3 cm standing water in the field. Apply the second split of nitrogen (Urea 45 kg/acre). Monitor regularly for stem borer and leaf folder. Spray Neem-based formulation (1500 ppm) at 2.5 ml/L if pest threshold is crossed.`,
            },
            Wheat: {
              hi: `गेहूं (${crop}) की फसल के लिए: कल्ले फूटने (Tillering) की अवस्था में हल्की सिंचाई करें। यूरिया 50 किग्रा/एकड़ डालें। पीला रतुआ (Yellow Rust) के लक्षणों की जांच करें और जलभराव से बचें।`,
              en: `Advisory for ${crop}: Provide light irrigation during crown root initiation/tillering stage. Top-dress with Urea at 50 kg/acre. Inspect field for yellow rust symptoms and ensure good field drainage.`,
            },
            Tomato: {
              hi: `टमाटर (${crop}) की फसल के लिए: टपक (Drip) सिंचाई से नमी नियंत्रित रखें। फल छेदक कीट से बचाव के लिए फेरोमोन ट्रैप लगाएं। अगेती झुलसा रोग की रोकथाम हेतु मैन्कोजेब 2 ग्राम/लीटर का छिड़काव करें।`,
              en: `Advisory for ${crop}: Maintain regular drip irrigation to prevent blossom end rot. Install pheromone traps (5/acre) for fruit borer control. Apply preventive spray of Mancozeb (2g/L) to manage early blight.`,
            },
            Cotton: {
              hi: `कपास (${crop}) की फसल के लिए: वानस्पतिक वृद्धि के समय पोटाश और यूरिया का संतुलित छिड़काव करें। गुलाबी सुंडी (Pink Bollworm) की निगरानी हेतु ट्रैप लगाएं। अतिरिक्त पानी की निकासी सुनिश्चित करें।`,
              en: `Advisory for ${crop}: Balanced foliar spray of 1% KNO3 during vegetative phase. Install pheromone traps to monitor Pink Bollworm activity. Ensure proper drainage to avoid root rot.`,
            },
            Onion: {
              hi: `प्याज (${crop}) की फसल के लिए: कंद बनने की अवस्था में नियमित लेकिन हल्की सिंचाई करें। थ्रिप्स (Thrips) कीट की रोकथाम हेतु 5% नीम अर्क का छिड़काव करें। कंद परिपक्व होने पर सिंचाई बंद करें।`,
              en: `Advisory for ${crop}: Moderate irrigation during bulb enlargement phase. Spray 5% NSKE or Imidacloprid (0.3 ml/L) for thrips infestation. Withhold irrigation 10-15 days before harvest.`,
            },
          };

          const matchedText = dynamicAdvisoryMap[crop] || {
            hi: `${crop} की फसल के लिए: मौसम के अनुसार नियमित सिंचाई करें। संतुलित उर्वरक (NPK) का प्रयोग करें और खरपतवार निकालें। किसी भी कीट या रोग के लक्षण दिखने पर तुरंत रोकथाम करें।`,
            en: `Advisory for ${crop}: Maintain regular scheduled irrigation as per soil conditions. Apply balanced NPK fertilizers and keep the field weed-free. Monitor for local pest/fungal symptoms.`,
          };

          const dynamicAdvisory: AdvisoryData = {
            advisory_id: `adv-${Date.now()}`,
            crop_name: crop,
            advisory_text: isHindi ? matchedText.hi : matchedText.en,
            language: i18n.language,
            audio_url: "",
            generated_at: new Date().toISOString(),
            sources: ["growth_stage", "weather_data", "crop_model"],
          };
          setAdvisory(dynamicAdvisory);
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
          <div>
            <h1 className="app-page-title">{t("advisory.title")}</h1>
            <p className="app-page-subtitle">{t("advisory.subtitle")}</p>
          </div>
          {cropsList.length > 1 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {cropsList.map((c) => {
                const isActive = c.crop_id === activeCropId;
                return (
                  <button
                    key={c.crop_id}
                    onClick={() => {
                      setActiveCropId(c.crop_id);
                      saveCropId(c.crop_id);
                      setSearchParams({ crop_id: c.crop_id });
                    }}
                    style={{
                      padding: "6px 12px",
                      fontWeight: 700,
                      fontSize: "12px",
                      border: "2px solid var(--dark)",
                      background: isActive ? "var(--primary)" : "white",
                      color: isActive ? "white" : "var(--dark)",
                      cursor: "pointer",
                    }}
                  >
                    🌱 {c.crop_name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

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
