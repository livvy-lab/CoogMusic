import React, { useState, useEffect } from "react";
import PageLayout from "../components/PageLayout/PageLayout";
import "./AdminReportReview.css";

function todayOffset(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const statusOptions = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Resolved", value: "resolved" },
];

const reportTypeOptions = [
  { label: "All", value: "" },
  { label: "Copyright Infringement", value: "Copyright Infringement" },
  { label: "Inappropriate Content", value: "Inappropriate Content" },
  { label: "Impersonation", value: "Impersonation" },
  { label: "Other", value: "Other" }
];

// Filter by the type of item that was reported
const entityTypeOptions = [
  { label: "All", value: "" },
  { label: "Song", value: "Song" },
  { label: "Artist", value: "Artist" },
  { label: "Playlist", value: "Playlist" },
  { label: "User", value: "Listener" }
];

export default function AdminReportReview() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");

  // State for filter inputs before they are applied
  const [pendingStartDate, setPendingStartDate] = useState(todayOffset(-30));
  const [pendingEndDate, setPendingEndDate] = useState(todayOffset(0));
  const [pendingStatus, setPendingStatus] = useState("pending");
  const [pendingReportType, setPendingReportType] = useState("");
  const [pendingEntityType, setPendingEntityType] = useState("");

  // State for filters that are actively used to fetch data
  const [appliedStartDate, setAppliedStartDate] = useState(todayOffset(-30));
  const [appliedEndDate, setAppliedEndDate] = useState(todayOffset(0));
  const [appliedStatus, setAppliedStatus] = useState("pending");
  const [appliedReportType, setAppliedReportType] = useState("");
  const [appliedEntityType, setAppliedEntityType] = useState("");

  const applyFilters = () => {
    setAppliedStartDate(pendingStartDate);
    setAppliedEndDate(pendingEndDate);
    setAppliedStatus(pendingStatus);
    setAppliedReportType(pendingReportType);
    setAppliedEntityType(pendingEntityType);
  };

  useEffect(() => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    params.append('startDate', appliedStartDate);
    params.append('endDate', appliedEndDate);
    if (appliedStatus) params.append('status', appliedStatus);
    if (appliedReportType) params.append('reportType', appliedReportType);
    if (appliedEntityType) params.append('type', appliedEntityType);

    fetch(`http://localhost:3001/analytics/admin/reports?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => setReports(data.reports || []))
      .catch((err) => {
        setError("Could not load reports. Please try again later.");
        setReports([]);
      })
      .finally(() => setLoading(false));
  }, [appliedStartDate, appliedEndDate, appliedStatus, appliedReportType, appliedEntityType]);

  return (
    <PageLayout>
      <div className="admin-report-container">
        <h2>User Report Management</h2>

        <div className="arr-filter-bar">
          <div>
            <label className="arr-filter-label">Start Date:</label>
            <input className="arr-date-input" type="date" value={pendingStartDate} onChange={e => setPendingStartDate(e.target.value)} />
          </div>
          <div>
            <label className="arr-filter-label">End Date:</label>
            <input className="arr-date-input" type="date" value={pendingEndDate} onChange={e => setPendingEndDate(e.target.value)} />
          </div>
          <div>
            <label className="arr-filter-label">Status:</label>
            <select value={pendingStatus} onChange={e => setPendingStatus(e.target.value)}>
              {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label className="arr-filter-label">Entity Type:</label>
            <select value={pendingEntityType} onChange={e => setPendingEntityType(e.target.value)}>
              {entityTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label className="arr-filter-label">Report Reason:</label>
            <select value={pendingReportType} onChange={e => setPendingReportType(e.target.value)}>
              {reportTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <button type="button" className="arr-filter-apply-btn" onClick={applyFilters}>Apply Filters</button>
          </div>
        </div>

        <section className="arr-section">
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
                  <th>Resolved By</th>
                </tr>
              </thead>
              <tbody>
                {reports.length > 0 ? (
                  reports.map((row) => (
                    <tr key={row.ReportID}>
                      <td>{String(row.DateCreated).slice(0, 10)}</td>
                      <td>{row.ReporterName}</td>
                      <td>{`${row.EntityType}: "${row.EntityName}"`}</td>
                      <td>{row.ReportType}</td>
                      <td>
                        <span className={row.Resolved ? 'status-resolved' : 'status-pending'}>
                          {row.Resolved ? "Resolved" : "Pending"}
                        </span>
                      </td>
                      <td>{row.ResolverName || "N/A"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="arr-no-reports">
                      No reports found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </PageLayout>
  );
}