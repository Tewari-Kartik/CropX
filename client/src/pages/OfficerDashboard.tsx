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
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  getHighRiskAlerts,
  sendSmsAlert,
  type AlertItem,
} from "@/lib/api";
import { getRole } from "@/lib/auth";
import { demoAlerts } from "@/mocks/alerts";

// ── Risk band config ─────────────────────────────────────────────────────────
const riskConfig: Record<string, { icon: typeof ShieldCheck; label: string }> = {
  low:      { icon: ShieldCheck,   label: "Low"      },
  medium:   { icon: AlertTriangle, label: "Medium"   },
  high:     { icon: AlertCircle,   label: "High"     },
  critical: { icon: Flame,         label: "Critical" },
};

// ── Status icon helper ────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: string }) {
  if (status === "sent")         return <CheckCircle2 size={14} style={{ color: "#4caf50" }} />;
  if (status === "acknowledged") return <CheckCircle2 size={14} style={{ color: "#1565C0" }} />;
  if (status === "pending")      return <Clock        size={14} style={{ color: "#f59e0b" }} />;
  return                                <XCircle      size={14} style={{ color: "#ef4444" }} />;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
interface Toast { id: number; type: "success" | "error"; msg: string }

export default function OfficerDashboard() {
  const { t } = useTranslation();
  // ── Alerts state ──
  const [alerts, setAlerts]       = useState<AlertItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [filterRegion, setFilterRegion] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const limit = 20;

  // ── Send SMS state ──
  const [sendingId, setSendingId] = useState<string | null>(null);

  // ── Toasts ──
  const [toasts, setToasts]       = useState<Toast[]>([]);
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

  // Verify officer role
  useEffect(() => {
    if (getRole() !== "officer") {
      console.warn("[OfficerDashboard] No officer session found.");
    }
  }, []);

  // ── Fetch alerts ──
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const res = await getHighRiskAlerts({
      region_id: filterRegion || undefined,
      min_band: "high",
      status: filterStatus || undefined,
      page,
      limit,
    });
    if (res.success && res.data) {
      setAlerts(res.data.alerts);
      setTotal(res.data.total);
    } else {
      let filtered = [...demoAlerts];
      if (filterRegion) filtered = filtered.filter((a) => a.village_name === filterRegion);
      if (filterStatus) filtered = filtered.filter((a) => a.status === filterStatus);
      setAlerts(filtered);
      setTotal(filtered.length);
    }
    setLoading(false);
  }, [page, filterRegion, filterStatus]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // ── Send SMS handler ──
  async function handleSendSms(alert: AlertItem) {
    setSendingId(alert.alert_id);
    try {
      const res = await sendSmsAlert(alert.farmer_id);
      if (res.success) {
        addToast("success", `✓ SMS sent to ${alert.farmer_name} (${alert.phone_number})`);
        // Refresh alerts to reflect status changes if any
        await fetchAlerts();
      } else {
        addToast("error", `Failed: ${res.error || "Unknown error"}`);
      }
    } catch {
      addToast("error", "Network error — SMS not sent");
    } finally {
      setSendingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const uniqueVillages = [...new Set(demoAlerts.map((a) => a.village_name))];

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
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="officer-container">
      <div className="grain-overlay" />

      {/* ── Toast stack ── */}
      <div style={{ position: "fixed", top: "80px", right: "20px", zIndex: 9999, display: "flex", flexDirection: "column", gap: "10px" }}>
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
              maxWidth: "340px",
            }}
          >
            {toast.msg}
          </div>
        ))}
      </div>

      {/* ── Top bar ── */}
      <div className="dash-topbar">
        <Link to="/" className="logo">FARM*PILOT</Link>
        <div className="dash-topbar-right">
          <LanguageSwitcher />
          <Link to="/" className="back-link">
            <ArrowLeft size={16} strokeWidth={2.5} aria-hidden="true" /> {t("nav.backToSite")}
          </Link>
          <div className="user-badge">
            <span className="avatar" style={{ background: "#1565C0" }} aria-hidden="true">O</span>
            Officer
          </div>
        </div>
      </div>

      <div className="officer-body">
        <div className="dash-head">
          <div>
            <h1 className="dash-greeting">{t("officer.title")}</h1>
            <p className="dash-sub">{t("officer.subtitle")}</p>
          </div>
        </div>

        {/* ══════════════════ ALERTS ══════════════════ */}
        <div>
          {/* Filters */}
            <div className="filters-bar">
              <select
                className="form-select"
                style={{ maxWidth: "220px", minHeight: "48px" }}
                value={filterRegion}
                onChange={(e) => { setFilterRegion(e.target.value); setPage(1); }}
              >
                <option value="">{t("officer.filterRegion")}</option>
                {uniqueVillages.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>

              <select
                className="form-select"
                style={{ maxWidth: "220px", minHeight: "48px" }}
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              >
                <option value="">{t("officer.filterStatus")}</option>
                <option value="pending">{t("officer.statusPending")}</option>
                <option value="sent">{t("officer.statusSent")}</option>
                <option value="acknowledged">{t("officer.statusAcknowledged")}</option>
              </select>

              <div style={{ marginLeft: "auto", fontSize: "13px", fontWeight: 700, color: "#566047" }}>
                {t("officer.showing")} {alerts.length} {t("officer.of")} {total} {t("officer.total")}
              </div>
            </div>

            {loading ? (
              <div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton" style={{ height: "52px", marginBottom: "8px" }} />
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <div style={{ border: "var(--border)", background: "white", padding: "60px 20px", textAlign: "center" }}>
                <ShieldCheck size={48} strokeWidth={1.25} style={{ color: "var(--primary)", margin: "0 auto 16px" }} />
                <p style={{ fontWeight: 700, fontSize: "16px" }}>{t("officer.noAlerts")}</p>
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
                      <th>Send SMS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert) => (
                      <tr key={alert.alert_id}>
                        <td style={{ fontWeight: 800 }}>{alert.farmer_name}</td>
                        <td>
                          <a
                            href={`tel:${alert.phone_number}`}
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}
                          >
                            <Phone size={12} strokeWidth={2.5} />
                            {alert.phone_number}
                          </a>
                        </td>
                        <td>{alert.village_name}</td>
                        <td>{renderRiskBadge(alert.risk_band)}</td>
                        <td style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "18px" }}>
                          {alert.risk_score.toFixed(1)}
                        </td>
                        <td style={{ textTransform: "capitalize" }}>{alert.alert_type}</td>
                        <td>{renderStatusBadge(alert.status)}</td>
                        <td style={{ fontSize: "13px", color: "#566047" }}>{formatDate(alert.created_at)}</td>
                        <td>
                          <button
                            id={`send-sms-${alert.alert_id}`}
                            type="button"
                            disabled={sendingId === alert.alert_id}
                            onClick={() => handleSendSms(alert)}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: "5px",
                              padding: "6px 12px", borderRadius: "6px", fontWeight: 700, fontSize: "12px",
                              background: sendingId === alert.alert_id ? "#ccc" : "#1565C0",
                              color: "white", border: "none", cursor: sendingId === alert.alert_id ? "not-allowed" : "pointer",
                              transition: "background 0.2s",
                            }}
                          >
                            {sendingId === alert.alert_id
                              ? <><RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> Sending…</>
                              : <><Send size={12} /> SMS</>
                            }
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
                      {alert.village_name} • Score: <strong>{alert.risk_score.toFixed(1)}</strong> • {alert.alert_type}
                    </div>
                    <div className="alert-card-footer">
                      {renderStatusBadge(alert.status)}
                      <a
                        href={`tel:${alert.phone_number}`}
                        className="btn-cta"
                        style={{ background: "var(--primary)", color: "white", fontSize: "11px", padding: "8px 14px", minHeight: "40px" }}
                      >
                        <Phone size={14} strokeWidth={2.5} style={{ marginRight: "4px" }} /> Call
                      </a>
                      <button
                        id={`send-sms-card-${alert.alert_id}`}
                        type="button"
                        disabled={sendingId === alert.alert_id}
                        onClick={() => handleSendSms(alert)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "5px",
                          padding: "8px 14px", borderRadius: "6px", fontWeight: 700, fontSize: "11px",
                          background: sendingId === alert.alert_id ? "#ccc" : "#1565C0",
                          color: "white", border: "none", cursor: sendingId === alert.alert_id ? "not-allowed" : "pointer",
                          minHeight: "40px",
                        }}
                      >
                        {sendingId === alert.alert_id
                          ? <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} />
                          : <Send size={12} />
                        }
                        SMS
                      </button>
                      <span style={{ marginLeft: "auto", fontSize: "11px", color: "#566047", fontWeight: 700 }}>
                        {formatDate(alert.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button className="page-btn" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} type="button">
                  <ChevronLeft size={18} strokeWidth={2.5} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} className={`page-btn ${p === page ? "active" : ""}`} onClick={() => setPage(p)} type="button">{p}</button>
                ))}
                <button className="page-btn" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} type="button">
                  <ChevronRight size={18} strokeWidth={2.5} />
                </button>
              </div>
            )}
        </div>
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
