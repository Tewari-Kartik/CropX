import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { createFarmer, login, type CreateFarmerPayload } from "@/lib/api";
import { saveSession, saveCropId } from "@/lib/auth";

interface CropEntry {
  crop_name: string;
  sowing_date: string;
  irrigation_type: string;
}

export default function FarmerOnboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredLang, setPreferredLang] = useState("hi");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [landSize, setLandSize] = useState("");
  const [crops, setCrops] = useState<CropEntry[]>([
    { crop_name: "", sowing_date: "", irrigation_type: "rainfed" },
  ]);

  const [isExisting, setIsExisting] = useState(false);
  const [totalCropsCount, setTotalCropsCount] = useState(1);

  const steps = [t("onboarding.step1"), t("onboarding.step2"), t("onboarding.step3")];

  const addCrop = () => {
    setCrops([...crops, { crop_name: "", sowing_date: "", irrigation_type: "rainfed" }]);
  };

  const removeCrop = (index: number) => {
    if (crops.length > 1) {
      setCrops(crops.filter((_, i) => i !== index));
    }
  };

  const updateCrop = (index: number, field: keyof CropEntry, value: string) => {
    const updated = [...crops];
    updated[index] = { ...updated[index], [field]: value };
    setCrops(updated);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    const payload: CreateFarmerPayload = {
      full_name: fullName,
      phone_number: phone,
      preferred_language: preferredLang,
      region: {
        village_name: village,
        district,
        state,
      },
      land_size_acres: parseFloat(landSize) || 0,
      crops: crops.filter((c) => c.crop_name.trim()),
    };

    const res = await createFarmer(payload);

    if (res.success && res.data) {
      // Response shape: { already_registered, farmer, crops }
      const farmer = res.data.farmer;
      const allCrops = res.data.crops || [];
      setIsExisting(Boolean(res.data.already_registered));
      setTotalCropsCount(allCrops.length);

      // Save first crop_id so AdvisoryView can use it
      if (allCrops.length > 0 && allCrops[0].crop_id) {
        saveCropId(allCrops[0].crop_id);
      }

      // Auto-login the newly registered farmer
      const loginRes = await login({ phone_number: phone, role: "farmer" });
      if (loginRes.success && loginRes.data) {
        saveSession({
          token: loginRes.data.token,
          farmer_id: loginRes.data.farmer_id,
          role: "farmer",
          full_name: farmer.full_name,
        });
      } else {
        // Fallback: store farmer_id without a token
        localStorage.setItem("cropx-farmer-id", farmer.farmer_id);
      }
      setSuccess(true);
      setTimeout(() => navigate("/farmer/dashboard"), 2000);
    } else {
      setError(res.error || t("onboarding.error"));
    }
    setIsSubmitting(false);
  };

  const canNext = () => {
    if (step === 0) return fullName.trim() && phone.trim();
    if (step === 1) return village.trim() && district.trim() && state.trim();
    if (step === 2) return crops.some((c) => c.crop_name.trim());
    return false;
  };

  if (success) {
    return (
      <div className="app-container">
        <div className="app-topbar">
          <span className="logo">FARM*PILOT</span>
        </div>
        <div className="app-body" style={{ textAlign: "center", paddingTop: "80px" }}>
          <div
            style={{
              width: 80,
              height: 80,
              background: "var(--primary)",
              border: "var(--border)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              color: "white",
              fontSize: "36px",
            }}
          >
            ✓
          </div>
          <h2 className="app-page-title" style={{ color: "var(--primary)" }}>
            {isExisting ? `Welcome back! Added new crop (${totalCropsCount} total registered)` : t("onboarding.success")}
          </h2>
          <p className="app-page-subtitle">Redirecting to your farm dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="app-topbar">
        <button
          onClick={() => (step > 0 ? setStep(step - 1) : navigate("/"))}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontWeight: 700,
            fontSize: "13px",
            textTransform: "uppercase",
            color: "var(--dark)",
            fontFamily: "Space Grotesk, sans-serif",
          }}
          type="button"
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
          {step > 0 ? t("onboarding.back") : ""}
        </button>
        <LanguageSwitcher />
      </div>

      <div className="app-body">
        <h1 className="app-page-title">{t("onboarding.title")}</h1>
        <p className="app-page-subtitle">{t("onboarding.subtitle")}</p>

        {/* Step indicator */}
        <div className="step-indicator">
          {steps.map((label, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px", flex: i < steps.length - 1 ? 1 : "none" }}>
              <div
                className={`step-dot ${i === step ? "active" : i < step ? "completed" : ""}`}
                title={label}
              />
              {i < steps.length - 1 && (
                <div className={`step-line ${i < step ? "completed" : ""}`} />
              )}
            </div>
          ))}
        </div>

        <div style={{ fontSize: "13px", fontWeight: 800, textTransform: "uppercase", marginBottom: "24px", color: "var(--primary)" }}>
          {steps[step]}
        </div>

        {error && (
          <div
            style={{
              background: "#fbe9e7",
              border: "2px solid #d32f2f",
              padding: "12px 16px",
              marginBottom: "20px",
              fontWeight: 700,
              fontSize: "14px",
              color: "#d32f2f",
            }}
          >
            {error}
          </div>
        )}

        {/* Step 0: Personal Details */}
        {step === 0 && (
          <div>
            <div className="form-group">
              <label className="form-label">{t("onboarding.fullName")}</label>
              <input
                className="form-input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("onboarding.fullNamePlaceholder")}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("onboarding.phone")}</label>
              <input
                className="form-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("onboarding.phonePlaceholder")}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("onboarding.language")}</label>
              <select
                className="form-select"
                value={preferredLang}
                onChange={(e) => setPreferredLang(e.target.value)}
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 1: Farm / Region */}
        {step === 1 && (
          <div>
            <div className="form-group">
              <label className="form-label">{t("onboarding.village")}</label>
              <input
                className="form-input"
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder={t("onboarding.villagePlaceholder")}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("onboarding.district")}</label>
              <input
                className="form-input"
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder={t("onboarding.districtPlaceholder")}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("onboarding.state")}</label>
              <input
                className="form-input"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder={t("onboarding.statePlaceholder")}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("onboarding.landSize")}</label>
              <input
                className="form-input"
                type="number"
                step="0.1"
                value={landSize}
                onChange={(e) => setLandSize(e.target.value)}
                placeholder={t("onboarding.landSizePlaceholder")}
              />
            </div>
          </div>
        )}

        {/* Step 2: Crops */}
        {step === 2 && (
          <div>
            {crops.map((crop, i) => (
              <div
                key={i}
                style={{
                  border: "var(--border)",
                  background: "white",
                  padding: "20px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <span style={{ fontWeight: 800, textTransform: "uppercase", fontSize: "13px" }}>
                    {t("onboarding.cropName")} {i + 1}
                  </span>
                  {crops.length > 1 && (
                    <button
                      onClick={() => removeCrop(i)}
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#d32f2f",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontWeight: 700,
                        fontSize: "12px",
                        textTransform: "uppercase",
                      }}
                    >
                      <Trash2 size={14} /> {t("onboarding.removeCrop")}
                    </button>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">{t("onboarding.cropName")}</label>
                  <input
                    className="form-input"
                    type="text"
                    value={crop.crop_name}
                    onChange={(e) => updateCrop(i, "crop_name", e.target.value)}
                    placeholder={t("onboarding.cropNamePlaceholder")}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("onboarding.sowingDate")}</label>
                  <input
                    className="form-input"
                    type="date"
                    value={crop.sowing_date}
                    onChange={(e) => updateCrop(i, "sowing_date", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("onboarding.irrigationType")}</label>
                  <select
                    className="form-select"
                    value={crop.irrigation_type}
                    onChange={(e) => updateCrop(i, "irrigation_type", e.target.value)}
                  >
                    <option value="rainfed">Rainfed</option>
                    <option value="drip">Drip</option>
                    <option value="sprinkler">Sprinkler</option>
                    <option value="flood">Flood</option>
                    <option value="canal">Canal</option>
                  </select>
                </div>
              </div>
            ))}
            <button
              onClick={addCrop}
              type="button"
              className="btn-cta"
              style={{ background: "white", width: "100%", marginBottom: "16px" }}
            >
              <Plus size={18} strokeWidth={2.5} /> {t("onboarding.addCrop")}
            </button>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          {step < 2 ? (
            <button
              className="btn-cta"
              style={{
                background: "var(--primary)",
                color: "white",
                flex: 1,
                opacity: canNext() ? 1 : 0.5,
              }}
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              type="button"
            >
              {t("onboarding.next")}
            </button>
          ) : (
            <button
              className="btn-cta"
              style={{
                background: "var(--primary)",
                color: "white",
                flex: 1,
                opacity: canNext() && !isSubmitting ? 1 : 0.5,
              }}
              onClick={handleSubmit}
              disabled={!canNext() || isSubmitting}
              type="button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                  {t("onboarding.submitting")}
                </>
              ) : (
                t("onboarding.submit")
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
