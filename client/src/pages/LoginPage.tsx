import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Loader2, Phone, ShieldCheck } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { login } from "@/lib/api";
import { saveSession } from "@/lib/auth";

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFarmerLogin = async () => {
    if (!phoneNumber.trim()) {
      setError(t("login.phoneRequired"));
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const res = await login({ phone_number: phoneNumber, role: "farmer" });

    if (res.success && res.data) {
      saveSession({
        token: res.data.token,
        farmer_id: res.data.farmer_id,
        role: "farmer",
        full_name: res.data.full_name,
      });
      navigate("/farmer/dashboard");
    } else {
      setError(res.error || t("login.failed"));
    }
    setIsSubmitting(false);
  };

  const handleOfficerLogin = async () => {
    setIsSubmitting(true);
    setError(null);

    const res = await login({ role: "officer" });

    if (res.success && res.data) {
      saveSession({
        token: res.data.token,
        farmer_id: res.data.farmer_id,
        role: "officer",
      });
      navigate("/officer/dashboard");
    } else {
      setError(res.error || t("login.failed"));
    }
    setIsSubmitting(false);
  };

  return (
    <div className="app-container">
      <div className="app-topbar">
        <span className="logo">FARM*PILOT</span>
        <LanguageSwitcher />
      </div>

      <div className="app-body" style={{ maxWidth: "420px", margin: "0 auto" }}>
        <h1 className="app-page-title">{t("login.title")}</h1>
        <p className="app-page-subtitle">{t("login.subtitle")}</p>

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

        {/* Farmer login */}
        <div
          style={{
            border: "var(--border)",
            background: "white",
            padding: "24px",
            marginBottom: "16px",
          }}
        >
          <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 800, textTransform: "uppercase" }}>
            <Phone size={18} strokeWidth={2.5} style={{ marginRight: "8px", verticalAlign: "middle" }} />
            {t("login.farmerSection")}
          </h3>

          <div className="form-group">
            <label className="form-label">{t("login.phone")}</label>
            <input
              className="form-input"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={t("login.phonePlaceholder")}
              onKeyDown={(e) => e.key === "Enter" && handleFarmerLogin()}
            />
          </div>

          <button
            className="btn-cta"
            style={{
              background: "var(--primary)",
              color: "white",
              width: "100%",
              opacity: isSubmitting ? 0.6 : 1,
            }}
            onClick={handleFarmerLogin}
            disabled={isSubmitting}
            type="button"
          >
            {isSubmitting ? (
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              t("login.farmerLogin")
            )}
          </button>
        </div>

        {/* Officer login */}
        <div
          style={{
            border: "var(--border)",
            background: "white",
            padding: "24px",
          }}
        >
          <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 800, textTransform: "uppercase" }}>
            <ShieldCheck size={18} strokeWidth={2.5} style={{ marginRight: "8px", verticalAlign: "middle" }} />
            {t("login.officerSection")}
          </h3>

          <p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
            {t("login.officerDesc")}
          </p>

          <button
            className="btn-cta"
            style={{
              background: "var(--dark)",
              color: "white",
              width: "100%",
              opacity: isSubmitting ? 0.6 : 1,
            }}
            onClick={handleOfficerLogin}
            disabled={isSubmitting}
            type="button"
          >
            {isSubmitting ? (
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              t("login.officerLogin")
            )}
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: "13px", marginTop: "24px", color: "#666" }}>
          {t("login.noAccount")}{" "}
          <a href="/farmer/onboard" style={{ color: "var(--primary)", fontWeight: 700 }}>
            {t("login.register")}
          </a>
        </p>
      </div>
    </div>
  );
}
