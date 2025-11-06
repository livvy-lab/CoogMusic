import React, { useState, useEffect } from "react";
import PageLayout from "../components/PageLayout/PageLayout";
import { API_BASE_URL } from '../config/api';
import { getUser } from '../lib/userStorage';
import { Link } from "react-router-dom";
import "./AdminReportReview.css";

// helper to format today's date offset by days
function todayOffset(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatAdminAction(action) {
  if (action === 'NoAction') return 'No Action';
  if (action === 'Removed') return 'Removed';
  return action || "N/A";
}

const statusOptions = [
  { label: "Pending", value: "false" },
  { label: "Resolved", value: "true" },
  { label: "All", value: "" },
];

const reportTypeOptions = [
  { label: "All", value: "" },
  { label: "Copyright Infringement", value: "Copyright Infringement" },
  { label: "Inappropriate Content", value: "Inappropriate Content" },
  { label: "Impersonation", value: "Impersonation" },
  { label: "Other", value: "Other" }
];

const entityTypeOptions = [
  { label: "All", value: "" },
  { label: "Song", value: "Song" },
  { label: "Artist", value: "Artist" },
  { label: "Playlist", value: "Playlist" },
  { label: "User", value: "Listener" }
];

const actionOptions = [
  { label: "All", value: "" },
  { label: "Removed", value: "Removed" },
  { label: "No Action", value: "NoAction" },
];

export default function AdminReportReview() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);

  const [pendingStartDate, setPendingStartDate] = useState(todayOffset(-30));
  const [pendingEndDate, setPendingEndDate] = useState(todayOffset(0));
  const [pendingStatus, setPendingStatus] = useState("");
  const [pendingReportType, setPendingReportType] = useState("");
  const [pendingEntityType, setPendingEntityType] = useState("");
  const [pendingActionType, setPendingActionType] = useState("");

  const [appliedStartDate, setAppliedStartDate] = useState(todayOffset(-30));
  const [appliedEndDate, setAppliedEndDate] = useState(todayOffset(0));
  const [appliedStatus, setAppliedStatus] = useState("");
  const [appliedReportType, setAppliedReportType] = useState("");
  const [appliedEntityType, setAppliedEntityType] = useState("");
  const [appliedActionType, setAppliedActionType] = useState("");

  const applyFilters = () => {
    setAppliedStartDate(pendingStartDate);
    setAppliedEndDate(pendingEndDate);
    setAppliedStatus(pendingStatus);
    setAppliedReportType(pendingReportType);
    setAppliedEntityType(pendingEntityType);
    setAppliedActionType(pendingActionType);
    setError("");
  };

  const fetchReports = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append('startDate', appliedStartDate);
    params.append('endDate', appliedEndDate);
    if (appliedStatus) params.append('resolved', appliedStatus);
    if (appliedReportType) params.append('reportType', appliedReportType);
    if (appliedEntityType) params.append('type', appliedEntityType);
    if (appliedActionType) params.append('adminAction', appliedActionType);

    fetch(`${API_BASE_URL}/user_reports?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Network response was not ok (${res.status})`);
        return res.json();
      })
      .then((data) => setReports(data || []))
      .catch((err) => {
        setError(`Could not load reports: ${err.message}. Please try again later.`);
        setReports([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, [appliedStartDate, appliedEndDate, appliedStatus, appliedReportType, appliedEntityType, appliedActionType]);

  return (
    <PageLayout>
      <div className="admin-report-container">
        <h2>User Report Management</h2>
        <div className="arr-filter-bar">
          <div>
            <label className="arr-filter-label" htmlFor="startDate">Start Date:</label>
            <input id="startDate" className="arr-date-input" type="date" value={pendingStartDate} onChange={e => setPendingStartDate(e.target.value)} />
          </div>
          <div>
            <label className="arr-filter-label" htmlFor="endDate">End Date:</label>
            <input id="endDate" className="arr-date-input" type="date" value={pendingEndDate} onChange={e => setPendingEndDate(e.target.value)} />
          </div>
          <div>
            <label className="arr-filter-label" htmlFor="status">Status:</label>
            <select id="status" value={pendingStatus} onChange={e => setPendingStatus(e.target.value)}>
              {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label className="arr-filter-label" htmlFor="entityType">Entity Type:</label>
            <select id="entityType" value={pendingEntityType} onChange={e => setPendingEntityType(e.target.value)}>
              {entityTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label className="arr-filter-label" htmlFor="reportReason">Report Reason:</label>
            <select id="reportReason" value={pendingReportType} onChange={e => setPendingReportType(e.target.value)}>
              {reportTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label className="arr-filter-label" htmlFor="actionType">Action Type:</label>
            <select id="actionType" value={pendingActionType} onChange={e => setPendingActionType(e.target.value)}>
              {actionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <button type="button" className="arr-filter-apply-btn" onClick={applyFilters}>Apply Filters</button>
          </div>
        </div>
        <section className="arr-section table-container">
          <div className="table-scroll">
            {loading ? (
              <div className="arr-loading">Loading Reports...</div>
            ) : error ? (
              <div className="arr-error">{error}</div>
            ) : (
              <table className="arr-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reported By</th>
                    <th>Reported Item</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Action Taken</th>
                    <th>Resolved By</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length > 0 ? (
                    reports.map((row) => (
                      <tr key={row.ReportID} onClick={() => setSelectedReport(row)} title="Click to view details">
                        <td>{String(row.DateCreated).slice(0, 10)}</td>
                        <td>{row.ReporterUsername || `Listener ID: ${row.ListenerID}`}</td>
                        <td>{`${row.EntityType}: ${row.EntityName || `ID: ${row.EntityID}`}`}</td>
                        <td>{row.ReportType}</td>
                        <td>
                          <span className={row.Resolved ? 'status-resolved' : 'status-pending'}>
                            {row.Resolved ? "Resolved" : "Pending"}
                          </span>
                        </td>
                        <td>{formatAdminAction(row.AdminActionTaken)}</td>
                        <td>{row.ResolverName || "N/A"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="arr-no-reports">
                        No reports found for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
      {selectedReport && (
        <ReportDetailView
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onActionSuccess={() => {
            fetchReports();
            setSelectedReport(null);
          }}
        />
      )}
    </PageLayout>
  );
}

// modal detail view remains the same
function ReportDetailView({ report, onClose, onActionSuccess }) {
  const [adminJustification, setAdminJustification] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAction || !adminJustification) {
      setErrorMessage("Please select an action and provide a justification.");
      return;
    }
    setIsProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");
    const user = getUser();
    const token = user ? user.adminId : null;
    if (!token) {
      setErrorMessage("Authentication error. Please log out and log back in.");
      setIsProcessing(false);
      return;
    }
    const authHeader = { "Authorization": `Bearer ${token}` };
    try {
      if (selectedAction === "Removed") {
        const deleteRes = await fetch(`${API_BASE_URL}/api/soft_delete/${report.EntityType}/${report.EntityID}`, {
          method: "DELETE",
          headers: { ...authHeader }
        });
        if (!deleteRes.ok) {
          const errData = await deleteRes.json();
          throw new Error(`Failed to remove content: ${errData.message || 'Unknown error'}`);
        }
      }
      const resolveRes = await fetch(`${API_BASE_URL}/user_reports/${report.ReportID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeader
        },
        body: JSON.stringify({
          AdminActionTaken: selectedAction,
          AdminJustification: adminJustification,
        }),
      });
      if (!resolveRes.ok) {
        const errData = await resolveRes.json();
        throw new Error(`Failed to resolve report: ${errData.error || 'Unknown error'}`);
      }
      setSuccessMessage("Report resolved successfully!");
      setTimeout(() => {
        onActionSuccess();
      }, 1500);
    } catch (err) {
      setErrorMessage(err.message);
      setIsProcessing(false);
    }
  };

  const getActionBtnClass = (action) => {
    let base = "action-button";
    if (action === 'Removed') base += ' remove';
    if (action === 'NoAction') base += ' no-action';
    if (selectedAction === action) base += ' active';
    return base;
  };

  const getProfileLink = () => {
    if (report.EntityType === 'Artist') return `/artist/${report.EntityID}`;
    if (report.EntityType === 'Listener' || report.EntityType === 'User') return `/listener/${report.EntityID}`;
    return null;
  };

  const profileLink = getProfileLink();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="detail-view-container">
          <div className="detail-view-left">
            <h2>Report Details</h2>
            <div className="info-items">
              <div className="info-item">
                <label className="info-item-label">Reported By:</label>
                <p>{report.ReporterUsername || `Listener ID: ${report.ListenerID}`}</p>
              </div>
              <div className="info-item">
                <label className="info-item-label">Reported Item:</label>
                <p>{`${report.EntityType}: ${report.EntityName || `ID: ${report.EntityID}`}`}</p>
                {profileLink && (
                  <Link to={profileLink} className="arr-profile-link" target="_blank" rel="noopener noreferrer">
                    View Profile
                  </Link>
                )}
              </div>
              <div className="info-item listener-reason">
                <label className="info-item-label">Listener's Reason:</label>
                <p>{report.Reason || "No reason provided."}</p>
              </div>
            </div>
          </div>
          <div className="detail-view-right">
            {report.Resolved ? (
              <ResolvedView report={report} />
            ) : (
              <form className="admin-form" onSubmit={handleResolveSubmit}>
                <h2>Take Action</h2>
                <div className="form-group">
                  <label>Action Taken *</label>
                  <div className="action-button-group">
                    <button
                      type="button"
                      className={getActionBtnClass('Removed')}
                      onClick={() => setSelectedAction('Removed')}>
                      Remove Content
                    </button>
                    <button
                      type="button"
                      className={getActionBtnClass('NoAction')}
                      onClick={() => setSelectedAction('NoAction')}>
                      No Action
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="justification">Admin Justification *</label>
                  <textarea
                    id="justification"
                    value={adminJustification}
                    onChange={(e) => setAdminJustification(e.target.value)}
                    placeholder="Explain the reason for your action. This will be visible to the artist/user."
                  />
                </div>
                {errorMessage && <p className="form-message error">{errorMessage}</p>}
                {successMessage && <p className="form-message success">{successMessage}</p>}
                <button
                  type="submit"
                  className="form-button submit"
                  disabled={isProcessing || !adminJustification || !selectedAction}
                >
                  {isProcessing ? "Processing..." : "Resolve Report"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResolvedView({ report }) {
  return (
    <div className="resolved-view">
      <h2>Report Resolved</h2>
      <div className="info-item">
        <label className="info-item-label">Resolved By:</label>
        <p>{report.ResolverName || `Admin ID: ${report.AdminID}`}</p>
      </div>
      <div className="info-item">
        <label className="info-item-label">Action Taken:</label>
        <p>{formatAdminAction(report.AdminActionTaken)}</p>
      </div>
      <div className="info-item">
        <label className="info-item-label">Admin's Justification:</label>
        <p>{report.AdminJustification}</p>
      </div>
    </div>
  );
}
