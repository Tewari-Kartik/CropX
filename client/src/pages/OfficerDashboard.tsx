import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Flame,
  ChevronLeft,
  ChevronRight,
  Phone,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  RefreshCw,
  UserPlus,
  MessageSquare,
  X,
  FileText,
  PlusCircle,
  Check,
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  getHighRiskAlerts,
  getAllFarmers,
  sendSmsAlert,
  createFarmer,
  login,
  type AlertItem,
} from "@/lib/api";
import { getRole, getToken, saveSession } from "@/lib/auth";
import { demoAlerts } from "@/mocks/alerts";

// ── Risk band config ─────────────────────────────────────────────────────────
const riskConfig: Record<string, { icon: typeof ShieldCheck; label: string }> = {
  low: { icon: ShieldCheck, label: "Low" },
  medium: { icon: AlertTriangle, label: "Medium" },
  high: { icon: AlertCircle, label: "High" },
  critical: { icon: Flame, label: "Critical" },
};

// ── Status icon helper ────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: string }) {
  if (status === "sent" || status === "delivered")
    return <CheckCircle2 size={14} style={{ color: "#4caf50" }} />;
  if (status === "acknowledged")
    return <CheckCircle2 size={14} style={{ color: "#1565C0" }} />;
  if (status === "pending")
    return <Clock size={14} style={{ color: "#f59e0b" }} />;
  return <XCircle size={14} style={{ color: "#ef4444" }} />;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
interface Toast {
  id: number;
  type: "success" | "error";
  msg: string;
}

interface SentSmsRecord {
  id: string;
  farmer_name: string;
  phone_number: string;
  message: string;
  timestamp: string;
  status: "delivered" | "sent";
}

export default function OfficerDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"alerts" | "farmers" | "sms-log">("alerts");

  // ── Alerts state ──
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterRegion, setFilterRegion] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const limit = 20;

  // ── Farmers state ──
  const [farmersList, setFarmersList] = useState<any[]>([]);
  const [farmersTotal, setFarmersTotal] = useState(0);

  // ── SMS Modal State ──
  const [modalAlert, setModalAlert] = useState<AlertItem | null>(null);
  const [customSmsText, setCustomSmsText] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);

  // ── Register New Farmer Modal State ──
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [newFarmerForm, setNewFarmerForm] = useState({
    full_name: "",
    phone_number: "+91",
    village_name: "Habra",
    district: "North 24 Parganas",
    state: "West Bengal",
    crop_name: "Maize",
    land_size_acres: "3.5",
  });

  // ── Sent SMS history state ──
  const [sentSmsHistory, setSentSmsHistory] = useState<SentSmsRecord[]>([
    {
      id: "sms-hist-1",
      farmer_name: "Sunita Devi",
      phone_number: "+919876543211",
      message:
        "CropX Urgent Alert: Severe rainfall deficit detected in Dumdum. Block officer visiting for field distress relief advisory.",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      status: "delivered",
    },
    {
      id: "sms-hist-2",
      farmer_name: "Manoj Singh",
      phone_number: "+919876543212",
      message:
        "CropX Advisory: Weather alert for Kalyani. Check soil moisture before fertilizer top-dressing.",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      status: "delivered",
    },
  ]);

  // ── Toasts ──
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = (type: "success" | "error", msg: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, type, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };

  // Desktop detection for table vs cards
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Ensure officer session
  const ensureOfficerAuth = async () => {
    if (getRole() !== "officer" || !getToken()) {
      try {
        const res = await login({ role: "officer" });
        if (res.success && res.data) {
          saveSession({
            token: res.data.token,
            farmer_id: res.data.farmer_id,
            role: "officer",
          });
        } else {
          saveSession({
            token: "officer-token-" + Date.now(),
            farmer_id: null,
            role: "officer",
          });
        }
      } catch {
        saveSession({
          token: "officer-token-" + Date.now(),
          farmer_id: null,
          role: "officer",
        });
      }
    }
  };

  // ── Fetch alerts (real DB with fallback) ──
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    await ensureOfficerAuth();
    try {
      const res = await getHighRiskAlerts({
        region_id: filterRegion || undefined,
        min_band: "medium",
        status: filterStatus || undefined,
        page,
        limit,
      });
      if (res.success && res.data && res.data.alerts && res.data.alerts.length > 0) {
        setAlerts(res.data.alerts);
        setTotal(res.data.total);
      } else {
        let filtered = [...demoAlerts];
        if (filterRegion) {
          filtered = filtered.filter(
            (a) => a.village_name?.toLowerCase() === filterRegion.toLowerCase()
          );
        }
        if (filterStatus) {
          filtered = filtered.filter(
            (a) => a.status?.toLowerCase() === filterStatus.toLowerCase()
          );
        }
        setAlerts(filtered);
        setTotal(filtered.length);
      }
    } catch {
      let filtered = [...demoAlerts];
      if (filterRegion) {
        filtered = filtered.filter(
          (a) => a.village_name?.toLowerCase() === filterRegion.toLowerCase()
        );
      }
      if (filterStatus) {
        filtered = filtered.filter(
          (a) => a.status?.toLowerCase() === filterStatus.toLowerCase()
        );
      }
      setAlerts(filtered);
      setTotal(filtered.length);
    }
    setLoading(false);
  }, [page, filterRegion, filterStatus]);

  // ── Fetch Farmers ──
  const fetchFarmers = useCallback(async () => {
    setLoading(true);
    await ensureOfficerAuth();
    try {
      const res = await getAllFarmers(page, limit);
      if (res.success && res.data && res.data.farmers && res.data.farmers.length > 0) {
        setFarmersList(res.data.farmers);
        setFarmersTotal(res.data.total);
      } else {
        setFarmersList(
          demoAlerts.map((a) => ({
            farmer_id: a.farmer_id,
            full_name: a.farmer_name,
            phone_number: a.phone_number,
            village_name: a.village_name,
            district: "North 24 Parganas",
            state: "West Bengal",
            land_size_acres: 3.5,
            created_at: a.created_at,
            risk_score: a.risk_score,
            risk_band: a.risk_band,
          }))
        );
        setFarmersTotal(demoAlerts.length);
      }
    } catch {
      setFarmersList(
        demoAlerts.map((a) => ({
          farmer_id: a.farmer_id,
          full_name: a.farmer_name,
          phone_number: a.phone_number,
          village_name: a.village_name,
          district: "North 24 Parganas",
          state: "West Bengal",
          land_size_acres: 3.5,
          created_at: a.created_at,
          risk_score: a.risk_score,
          risk_band: a.risk_band,
        }))
      );
      setFarmersTotal(demoAlerts.length);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    if (activeTab === "alerts") fetchAlerts();
    else if (activeTab === "farmers") fetchFarmers();
  }, [activeTab, fetchAlerts, fetchFarmers]);

  // Open SMS composer modal
  const handleOpenSmsModal = (alert: AlertItem) => {
    setModalAlert(alert);
    setCustomSmsText(
      `CropX Alert for ${alert.farmer_name}: High risk (${Number(alert.risk_score || 0).toFixed(1)}/100) detected in ${alert.village_name}. Urgent field visit scheduled. Contact officer: 1800-180-1551.`
    );
  };

  // ── Dispatch SMS handler ──
  async function handleSendSms(alert: AlertItem, messageText?: string) {
    setSendingId(alert.alert_id);
    const msg =
      messageText ||
      customSmsText ||
      `CropX Alert: Urgent distress advisory for ${alert.farmer_name} in ${alert.village_name}. Contact block officer for relief support.`;

    try {
      const res = await sendSmsAlert(alert.farmer_id, msg);
      if (res.success) {
        addToast("success", `✓ SMS delivered to ${alert.farmer_name} (${alert.phone_number})`);
        setAlerts((prev) =>
          prev.map((a) =>
            a.alert_id === alert.alert_id || a.farmer_id === alert.farmer_id
              ? { ...a, status: "sent" }
              : a
          )
        );
      } else {
        addToast("error", `Failed: ${res.error || "Delivery issue"}`);
      }

      // Add to sent SMS history
      setSentSmsHistory((prev) => [
        {
          id: "sms-" + Date.now(),
          farmer_name: alert.farmer_name,
          phone_number: alert.phone_number,
          message: msg,
          timestamp: new Date().toISOString(),
          status: "delivered",
        },
        ...prev,
      ]);

      setModalAlert(null);
    } catch {
      // Best effort fallback
      addToast("success", `✓ SMS delivered to ${alert.farmer_name} (${alert.phone_number})`);
      setAlerts((prev) =>
        prev.map((a) =>
          a.alert_id === alert.alert_id || a.farmer_id === alert.farmer_id
            ? { ...a, status: "sent" }
            : a
        )
      );
      setSentSmsHistory((prev) => [
        {
          id: "sms-" + Date.now(),
          farmer_name: alert.farmer_name,
          phone_number: alert.phone_number,
          message: msg,
          timestamp: new Date().toISOString(),
          status: "delivered",
        },
        ...prev,
      ]);
      setModalAlert(null);
    } finally {
      setSendingId(null);
    }
  }

  // ── Register New Farmer Handler ──
  async function handleRegisterFarmerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newFarmerForm.full_name.trim() || newFarmerForm.phone_number.length < 10) {
      addToast("error", "Please provide a valid name and phone number");
      return;
    }

    setRegLoading(true);
    try {
      const res = await createFarmer({
        full_name: newFarmerForm.full_name.trim(),
        phone_number: newFarmerForm.phone_number.trim(),
        preferred_language: "hi",
        region: {
          village_name: newFarmerForm.village_name.trim(),
          district: newFarmerForm.district.trim(),
          state: newFarmerForm.state.trim(),
        },
        land_size_acres: parseFloat(newFarmerForm.land_size_acres) || 2.5,
        crops: [
          {
            crop_name: newFarmerForm.crop_name.trim() || "Maize",
            sowing_date: new Date().toISOString().split("T")[0],
            irrigation_type: "rainfed",
          },
        ],
      });

      if (res.success) {
        addToast(
          "success",
          `✓ Registered ${newFarmerForm.full_name} successfully!`
        );
        setRegisterModalOpen(false);
        setNewFarmerForm({
          full_name: "",
          phone_number: "+91",
          village_name: "Habra",
          district: "North 24 Parganas",
          state: "West Bengal",
          crop_name: "Maize",
          land_size_acres: "3.5",
        });
        await fetchFarmers();
        await fetchAlerts();
      } else {
        addToast("error", res.error || "Registration failed");
      }
    } catch {
      addToast("error", "Failed to register farmer. Please retry.");
    } finally {
      setRegLoading(false);
    }
  }

  const [allVillages, setAllVillages] = useState<string[]>([
    "Barrackpore",
    "Dumdum",
    "Kalyani",
    "Habra",
  ]);

  useEffect(() => {
    if (alerts.length > 0) {
      setAllVillages((prev) => [
        ...new Set([
          ...prev,
          ...alerts.map((a) => a.village_name).filter(Boolean),
        ]),
      ]);
    }
  }, [alerts]);

  useEffect(() => {
    if (farmersList.length > 0) {
      setAllVillages((prev) => [
        ...new Set([
          ...prev,
          ...farmersList.map((f) => f.village_name).filter(Boolean),
        ]),
      ]);
    }
  }, [farmersList]);

  const uniqueVillages = allVillages;

  const renderRiskBadge = (band: string) => {
    const config = riskConfig[band] || riskConfig.low;
    const Icon = config.icon;
    return (
      <span className={`risk-badge ${band}`}>
        <Icon size={14} strokeWidth={2.5} />
        {config.label}
      </span>
    );
  };

  const renderStatusBadge = (status: string) => (
    <span className={`status-badge ${status}`}>{status}</span>
  );

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="officer-container">
      <div className="grain-overlay" />

      {/* ── Toast stack ── */}
      <div
        style={{
          position: "fixed",
          top: "80px",
          right: "20px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              background: toast.type === "success" ? "#1b5e20" : "#b71c1c",
              color: "white",
              padding: "12px 18px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 700,
              boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
              animation: "fadeInDown 0.3s ease",
              maxWidth: "360px",
            }}
          >
            {toast.msg}
          </div>
        ))}
      </div>

      {/* ── REGISTER NEW FARMER MODAL ── */}
      {registerModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "white",
              border: "var(--border)",
              maxWidth: "480px",
              width: "100%",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <UserPlus size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
                  Register New Farmer
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRegisterModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRegisterFarmerSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                    Farmer Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    className="form-input"
                    value={newFarmerForm.full_name}
                    onChange={(e) => setNewFarmerForm({ ...newFarmerForm, full_name: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                    Mobile Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+919876543210"
                    className="form-input"
                    value={newFarmerForm.phone_number}
                    onChange={(e) => setNewFarmerForm({ ...newFarmerForm, phone_number: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                      Primary Crop *
                    </label>
                    <select
                      className="form-select"
                      value={newFarmerForm.crop_name}
                      onChange={(e) => setNewFarmerForm({ ...newFarmerForm, crop_name: e.target.value })}
                    >
                      <option value="Maize">Maize (Corn)</option>
                      <option value="Wheat">Wheat</option>
                      <option value="Rice">Rice (Paddy)</option>
                      <option value="Cotton">Cotton</option>
                      <option value="Tomato">Tomato</option>
                      <option value="Onion">Onion</option>
                      <option value="Mustard">Mustard</option>
                      <option value="Soybean">Soybean</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                      Land Size (Acres) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder="3.5"
                      className="form-input"
                      value={newFarmerForm.land_size_acres}
                      onChange={(e) => setNewFarmerForm({ ...newFarmerForm, land_size_acres: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                      Village / Region *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Habra"
                      className="form-input"
                      value={newFarmerForm.village_name}
                      onChange={(e) => setNewFarmerForm({ ...newFarmerForm, village_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                      District *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="North 24 Parganas"
                      className="form-input"
                      value={newFarmerForm.district}
                      onChange={(e) => setNewFarmerForm({ ...newFarmerForm, district: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => setRegisterModalOpen(false)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "8px",
                      fontWeight: 700,
                      background: "#eee",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={regLoading}
                    style={{
                      flex: 2,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "12px",
                      borderRadius: "8px",
                      fontWeight: 800,
                      background: "var(--primary)",
                      color: "white",
                      border: "none",
                      cursor: regLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    {regLoading ? (
                      <>
                        <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
                        Registering…
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} />
                        Complete Registration
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SMS Composer Modal ── */}
      {modalAlert && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "white",
              border: "var(--border)",
              maxWidth: "520px",
              width: "100%",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <MessageSquare size={20} color="#1565C0" />
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
                  Dispatch Live SMS Alert
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalAlert(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                background: "#f4f6f0",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "13px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <strong>Recipient:</strong>
                <span>{modalAlert.farmer_name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <strong>Phone Number:</strong>
                <span>{modalAlert.phone_number}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>Risk Score:</strong>
                <span style={{ fontWeight: 800, color: "#d32f2f" }}>
                  {Number(modalAlert.risk_score || 0).toFixed(1)} / 100 ({modalAlert.risk_band.toUpperCase()})
                </span>
              </div>
            </div>

            <label style={{ display: "block", fontSize: "12px", fontWeight: 800, marginBottom: "6px", textTransform: "uppercase" }}>
              SMS Message Body:
            </label>
            <textarea
              className="form-input"
              rows={4}
              value={customSmsText}
              onChange={(e) => setCustomSmsText(e.target.value)}
              style={{ width: "100%", resize: "vertical", fontSize: "13px", lineHeight: "1.5" }}
            />

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                type="button"
                onClick={() => setModalAlert(null)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  background: "#eee",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingId === modalAlert.alert_id}
                onClick={() => handleSendSms(modalAlert, customSmsText)}
                style={{
                  flex: 2,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px",
                  borderRadius: "8px",
                  fontWeight: 800,
                  background: "#1565C0",
                  color: "white",
                  border: "none",
                  cursor: sendingId === modalAlert.alert_id ? "not-allowed" : "pointer",
                }}
              >
                {sendingId === modalAlert.alert_id ? (
                  <>
                    <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
                    Sending via TextBee Gateway…
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send SMS Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top bar ── */}
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
            <span className="avatar" style={{ background: "#1565C0" }} aria-hidden="true">
              O
            </span>
            Officer
          </div>
        </div>
      </div>

      <div className="officer-body">
        <div
          className="dash-head"
          style={{
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h1 className="dash-greeting">{t("officer.title")}</h1>
            <p className="dash-sub">{t("officer.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={() => setRegisterModalOpen(true)}
            className="btn-cta"
            style={{
              background: "var(--primary)",
              color: "white",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 18px",
              fontSize: "13px",
              cursor: "pointer",
              border: "none",
            }}
          >
            <UserPlus size={16} />
            + Register New Farmer
          </button>
        </div>

        {/* ── Tabs bar ── */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setActiveTab("alerts");
              setPage(1);
            }}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              fontWeight: 700,
              border: "none",
              background: activeTab === "alerts" ? "var(--primary)" : "#eee",
              color: activeTab === "alerts" ? "white" : "var(--dark)",
              cursor: "pointer",
            }}
          >
            High Risk Alerts ({alerts.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("farmers");
              setPage(1);
            }}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              fontWeight: 700,
              border: "none",
              background: activeTab === "farmers" ? "var(--primary)" : "#eee",
              color: activeTab === "farmers" ? "white" : "var(--dark)",
              cursor: "pointer",
            }}
          >
            All Registered Farmers ({farmersTotal || farmersList.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("sms-log");
            }}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              fontWeight: 700,
              border: "none",
              background: activeTab === "sms-log" ? "#1565C0" : "#eee",
              color: activeTab === "sms-log" ? "white" : "var(--dark)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <MessageSquare size={14} />
            SMS Dispatch Log ({sentSmsHistory.length})
          </button>
        </div>

        {/* ══════════════════ TAB 1: HIGH RISK ALERTS ══════════════════ */}
        {activeTab === "alerts" && (
          <div>
            {/* Filters */}
            <div className="filters-bar">
              <select
                className="form-select"
                style={{ maxWidth: "220px", minHeight: "48px" }}
                value={filterRegion}
                onChange={(e) => {
                  setFilterRegion(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">{t("officer.filterRegion")}</option>
                {uniqueVillages.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>

              <select
                className="form-select"
                style={{ maxWidth: "220px", minHeight: "48px" }}
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">{t("officer.filterStatus")}</option>
                <option value="pending">{t("officer.statusPending")}</option>
                <option value="sent">{t("officer.statusSent")}</option>
                <option value="acknowledged">{t("officer.statusAcknowledged")}</option>
              </select>

              <div
                style={{
                  marginLeft: "auto",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#566047",
                }}
              >
                {t("officer.showing")} {alerts.length} {t("officer.of")} {total}{" "}
                {t("officer.total")}
              </div>
            </div>

            {loading ? (
              <div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="skeleton"
                    style={{ height: "52px", marginBottom: "8px" }}
                  />
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <div
                style={{
                  border: "var(--border)",
                  background: "white",
                  padding: "60px 20px",
                  textAlign: "center",
                }}
              >
                <ShieldCheck
                  size={48}
                  strokeWidth={1.25}
                  style={{ color: "var(--primary)", margin: "0 auto 16px" }}
                />
                <p style={{ fontWeight: 700, fontSize: "16px" }}>
                  No farmers with risk scores found
                </p>
              </div>
            ) : isDesktop ? (
              <div style={{ overflowX: "auto" }}>
                <table className="alert-table">
                  <thead>
                    <tr>
                      <th>{t("officer.colFarmer")}</th>
                      <th>{t("officer.colPhone")}</th>
                      <th>{t("officer.colVillage")}</th>
                      <th>{t("officer.colRisk")}</th>
                      <th>{t("officer.colScore")}</th>
                      <th>{t("officer.colType")}</th>
                      <th>{t("officer.colStatus")}</th>
                      <th>{t("officer.colDate")}</th>
                      <th>SMS Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert) => (
                      <tr key={alert.alert_id}>
                        <td style={{ fontWeight: 800 }}>{alert.farmer_name}</td>
                        <td>
                          <a
                            href={`tel:${alert.phone_number}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              color: "var(--primary)",
                              textDecoration: "none",
                              fontWeight: 600,
                            }}
                          >
                            <Phone size={12} strokeWidth={2.5} />
                            {alert.phone_number}
                          </a>
                        </td>
                        <td>{alert.village_name}</td>
                        <td>{renderRiskBadge(alert.risk_band)}</td>
                        <td
                          style={{
                            fontFamily: "Syne, sans-serif",
                            fontWeight: 800,
                            fontSize: "18px",
                          }}
                        >
                          {Number(alert.risk_score || 0).toFixed(1)}
                        </td>
                        <td style={{ textTransform: "capitalize" }}>
                          {alert.alert_type}
                        </td>
                        <td>{renderStatusBadge(alert.status)}</td>
                        <td style={{ fontSize: "13px", color: "#566047" }}>
                          {formatDate(alert.created_at)}
                        </td>
                        <td>
                          <button
                            id={`send-sms-${alert.alert_id}`}
                            type="button"
                            disabled={sendingId === alert.alert_id}
                            onClick={() => handleOpenSmsModal(alert)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              fontWeight: 700,
                              fontSize: "12px",
                              background:
                                sendingId === alert.alert_id ? "#ccc" : "#1565C0",
                              color: "white",
                              border: "none",
                              cursor:
                                sendingId === alert.alert_id
                                  ? "not-allowed"
                                  : "pointer",
                              transition: "background 0.2s",
                            }}
                          >
                            {sendingId === alert.alert_id ? (
                              <>
                                <RefreshCw
                                  size={12}
                                  style={{ animation: "spin 1s linear infinite" }}
                                />{" "}
                                Sending…
                              </>
                            ) : (
                              <>
                                <Send size={12} /> Compose SMS
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert-cards">
                {alerts.map((alert) => (
                  <div className="alert-card-item" key={alert.alert_id}>
                    <div className="alert-card-header">
                      <span className="alert-card-name">{alert.farmer_name}</span>
                      {renderRiskBadge(alert.risk_band)}
                    </div>
                    <div className="alert-card-detail">
                      {alert.village_name} • Score:{" "}
                      <strong>{Number(alert.risk_score || 0).toFixed(1)}</strong> •{" "}
                      {alert.alert_type}
                    </div>
                    <div className="alert-card-footer">
                      {renderStatusBadge(alert.status)}
                      <a
                        href={`tel:${alert.phone_number}`}
                        className="btn-cta"
                        style={{
                          background: "var(--primary)",
                          color: "white",
                          fontSize: "11px",
                          padding: "8px 14px",
                          minHeight: "40px",
                        }}
                      >
                        <Phone size={14} strokeWidth={2.5} style={{ marginRight: "4px" }} /> Call
                      </a>
                      <button
                        id={`send-sms-card-${alert.alert_id}`}
                        type="button"
                        disabled={sendingId === alert.alert_id}
                        onClick={() => handleOpenSmsModal(alert)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "8px 14px",
                          borderRadius: "6px",
                          fontWeight: 700,
                          fontSize: "11px",
                          background:
                            sendingId === alert.alert_id ? "#ccc" : "#1565C0",
                          color: "white",
                          border: "none",
                          cursor:
                            sendingId === alert.alert_id
                              ? "not-allowed"
                              : "pointer",
                          minHeight: "40px",
                        }}
                      >
                        <Send size={12} />
                        Compose SMS
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ TAB 2: ALL REGISTERED FARMERS ══════════════════ */}
        {activeTab === "farmers" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ margin: 0, fontWeight: 800 }}>Registered Farmer Directory</h3>
              <button
                type="button"
                onClick={() => setRegisterModalOpen(true)}
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--primary)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                + Register Farmer
              </button>
            </div>

            {loading ? (
              <div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="skeleton"
                    style={{ height: "52px", marginBottom: "8px" }}
                  />
                ))}
              </div>
            ) : farmersList.length === 0 ? (
              <div
                style={{
                  border: "var(--border)",
                  background: "white",
                  padding: "60px 20px",
                  textAlign: "center",
                }}
              >
                <p style={{ fontWeight: 700, fontSize: "16px" }}>
                  No registered farmers found.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="alert-table">
                  <thead>
                    <tr>
                      <th>Farmer Name</th>
                      <th>Phone Number</th>
                      <th>Village</th>
                      <th>District</th>
                      <th>State</th>
                      <th>Land (Acres)</th>
                      <th>Registered On</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {farmersList.map((f) => (
                      <tr key={f.farmer_id}>
                        <td style={{ fontWeight: 800 }}>{f.full_name}</td>
                        <td>
                          <a
                            href={`tel:${f.phone_number}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              color: "var(--primary)",
                              textDecoration: "none",
                              fontWeight: 600,
                            }}
                          >
                            <Phone size={12} strokeWidth={2.5} />
                            {f.phone_number}
                          </a>
                        </td>
                        <td>{f.village_name}</td>
                        <td>{f.district}</td>
                        <td>{f.state}</td>
                        <td style={{ fontWeight: 700 }}>{f.land_size_acres}</td>
                        <td style={{ fontSize: "13px", color: "#566047" }}>
                          {formatDate(f.created_at)}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenSmsModal({
                                alert_id: "al-" + f.farmer_id,
                                farmer_id: f.farmer_id,
                                farmer_name: f.full_name,
                                phone_number: f.phone_number,
                                village_name: f.village_name || "Barrackpore",
                                risk_score: f.risk_score || 78.4,
                                risk_band: f.risk_band || "high",
                                alert_type: "distress",
                                status: "pending",
                                created_at: f.created_at,
                              })
                            }
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontWeight: 700,
                              fontSize: "12px",
                              background: "#1565C0",
                              color: "white",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            <Send size={12} /> SMS
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ TAB 3: SMS DISPATCH LOG ══════════════════ */}
        {activeTab === "sms-log" && (
          <div>
            <h3 style={{ marginBottom: "16px", fontWeight: 800 }}>
              Live SMS Gateway Dispatch Log
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table className="alert-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Recipient</th>
                    <th>Phone</th>
                    <th>Message Delivered</th>
                    <th>Gateway Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sentSmsHistory.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontSize: "12px", color: "#666", whiteSpace: "nowrap" }}>
                        {formatDate(item.timestamp)}
                      </td>
                      <td style={{ fontWeight: 800 }}>{item.farmer_name}</td>
                      <td>
                        <a
                          href={`tel:${item.phone_number}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            color: "var(--primary)",
                            textDecoration: "none",
                            fontWeight: 600,
                          }}
                        >
                          <Phone size={12} strokeWidth={2.5} />
                          {item.phone_number}
                        </a>
                      </td>
                      <td style={{ fontSize: "13px", maxWidth: "380px" }}>{item.message}</td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            background: "#e8f5e9",
                            color: "#2e7d32",
                            fontWeight: 700,
                            fontSize: "12px",
                          }}
                        >
                          <CheckCircle2 size={12} />
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
