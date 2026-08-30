import { useState, useEffect } from "react";
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
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getHighRiskAlerts, type AlertItem } from "@/lib/api";

// Risk band visual config — color + icon, not color alone (accessibility)
const riskConfig: Record<string, { icon: typeof ShieldCheck; label: string }> = {
  low: { icon: ShieldCheck, label: "Low" },
  medium: { icon: AlertTriangle, label: "Medium" },
  high: { icon: AlertCircle, label: "High" },
  critical: { icon: Flame, label: "Critical" },
};

// Demo data for when backend is unavailable
const demoAlerts: AlertItem[] = [
  {
    alert_id: "al-001",
    farmer_id: "f-001",
    farmer_name: "Ramesh Kumar",
    phone_number: "+919876543210",
    village_name: "Barrackpore",
    risk_score: 78.4,
    risk_band: "high",
    alert_type: "distress",
    status: "pending",
    created_at: "2026-08-28T09:05:00Z",
  },
  {
    alert_id: "al-002",
    farmer_id: "f-002",
    farmer_name: "Sunita Devi",
    phone_number: "+919876543211",
    village_name: "Dumdum",
    risk_score: 92.1,
    risk_band: "critical",
    alert_type: "distress",
    status: "pending",
    created_at: "2026-08-28T08:30:00Z",
  },
  {
    alert_id: "al-003",
    farmer_id: "f-003",
    farmer_name: "Manoj Singh",
    phone_number: "+919876543212",
    village_name: "Kalyani",
    risk_score: 65.2,
    risk_band: "high",
    alert_type: "weather",
    status: "sent",
    created_at: "2026-08-27T14:20:00Z",
  },
  {
    alert_id: "al-004",
    farmer_id: "f-004",
    farmer_name: "Priya Sharma",
    phone_number: "+919876543213",
    village_name: "Barrackpore",
    risk_score: 88.7,
    risk_band: "critical",
    alert_type: "distress",
    status: "acknowledged",
    created_at: "2026-08-27T10:15:00Z",
  },
  {
    alert_id: "al-005",
    farmer_id: "f-005",
    farmer_name: "Vikram Yadav",
    phone_number: "+919876543214",
    village_name: "Habra",
    risk_score: 71.0,
    risk_band: "high",
    alert_type: "market",
    status: "pending",
    created_at: "2026-08-28T11:00:00Z",
  },
  {
    alert_id: "al-006",
    farmer_id: "f-006",
    farmer_name: "Lakshmi Bai",
    phone_number: "+919876543215",
    village_name: "Kalyani",
    risk_score: 55.3,
    risk_band: "medium",
    alert_type: "weather",
    status: "sent",
    created_at: "2026-08-26T16:45:00Z",
  },
];

export default function OfficerDashboard() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterRegion, setFilterRegion] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const limit = 20;

  // Desktop detection for table vs cards
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    localStorage.setItem("cropx-role", "officer");
  }, []);

  useEffect(() => {
    async function fetchAlerts() {
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
        // Demo data fallback
        let filtered = [...demoAlerts];
        if (filterRegion) {
          filtered = filtered.filter((a) => a.village_name === filterRegion);
        }
        if (filterStatus) {
          filtered = filtered.filter((a) => a.status === filterStatus);
        }
        setAlerts(filtered);
        setTotal(filtered.length);
      }
      setLoading(false);
    }

    fetchAlerts();
  }, [page, filterRegion, filterStatus]);

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="officer-container">
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
            <span className="avatar" style={{ background: "#1565C0" }} aria-hidden="true">
              O
            </span>
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
          <div
            style={{
              border: "var(--border)",
              background: "white",
              padding: "60px 20px",
              textAlign: "center",
            }}
          >
            <ShieldCheck size={48} strokeWidth={1.25} style={{ color: "var(--primary)", margin: "0 auto 16px" }} />
            <p style={{ fontWeight: 700, fontSize: "16px" }}>{t("officer.noAlerts")}</p>
          </div>
        ) : isDesktop ? (
          /* Desktop: Table view */
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
                    <td style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "18px" }}>
                      {alert.risk_score.toFixed(1)}
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{alert.alert_type}</td>
                    <td>{renderStatusBadge(alert.status)}</td>
                    <td style={{ fontSize: "13px", color: "#566047" }}>{formatDate(alert.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Mobile: Card view */
          <div className="alert-cards">
            {alerts.map((alert) => (
              <div className="alert-card-item" key={alert.alert_id}>
                <div className="alert-card-header">
                  <span className="alert-card-name">{alert.farmer_name}</span>
                  {renderRiskBadge(alert.risk_band)}
                </div>
                <div className="alert-card-detail">
                  {alert.village_name} • Score:{" "}
                  <strong>{alert.risk_score.toFixed(1)}</strong> • {alert.alert_type}
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
                    <Phone size={14} strokeWidth={2.5} style={{ marginRight: "4px" }} />
                    Call
                  </a>
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
            <button
              className="page-btn"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              type="button"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`page-btn ${p === page ? "active" : ""}`}
                onClick={() => setPage(p)}
                type="button"
              >
                {p}
              </button>
            ))}
            <button
              className="page-btn"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              type="button"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
