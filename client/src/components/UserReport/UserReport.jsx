import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getUser } from "../../lib/userStorage";
import { API_BASE_URL } from "../../config/api";
import "./UserReport.css";

const REPORT_TYPES = [
  "Copyright Infringement",
  "Inappropriate Content",
  "Impersonation",
  "Other",
];

export default function UserReport() {
  const location = useLocation();
  const reportedId = location.state?.reportedId || "";
  const reportedType = location.state?.reportedType || "Listener";
  const currentUser = getUser();

  const [entityName, setEntityName] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [reportType, setReportType] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchName() {
      if (!reportedId) return;
      try {
        let url = "";
        if (reportedType === "Artist") {
          url = `${API_BASE_URL}/artists/${reportedId}`;
        } else {
          url = `${API_BASE_URL}/listeners/${reportedId}`;
        }
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (reportedType === "Artist") {
            setEntityName(data.ArtistName || `artist #${reportedId}`);
          } else {
            setEntityName([data.FirstName, data.LastName].filter(Boolean).join(" ") || `listener #${reportedId}`);
          }
        }
      } catch {
        setEntityName(`profile #${reportedId}`);
      }
    }
    fetchName();
  }, [reportedId, reportedType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!currentUser || !currentUser.listenerId) {
      setError("You must be logged in to submit a report.");
      return;
    }
    if (!reportType) {
      setError("Please select a reason for the report.");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide additional details in the text box.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/user_reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ListenerID: currentUser.listenerId,
          EntityType: reportedType,
          EntityID: reportedId,
          Reason: reason.substring(0, 500),
          ReportType: reportType,
        }),
      });

      if (!res.ok) {
        let errMsg = "Failed to submit report due to a server error.";
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      setSuccess(true);
      setReason("");
      setReportType("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="user-report-container">
      <h1 className="user-report-title">Submit a Report</h1>
      <div className="user-report-label">
        You are reporting{" "}
        <span className="user-report-label-bold">
          {entityName || (reportedId ? `profile #${reportedId}` : "selected item")}
        </span>{" "}
        for:
      </div>
      <div className="user-report-dropdown">
        <button
          type="button"
          className="user-report-reason-btn"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          {reportType || "Select a reason"}
        </button>
        {dropdownOpen && (
          <div className="user-report-dropdown-list">
            {REPORT_TYPES.map((t) => (
              <div
                key={t}
                className="user-report-dropdown-item"
                onClick={() => {
                  setReportType(t);
                  setDropdownOpen(false);
                }}
              >
                {t}
              </div>
            ))}
          </div>
        )}
      </div>
      <label className="user-report-details-label">Additional Details:</label>
      <form className="user-report-form" onSubmit={handleSubmit}>
        <textarea
          className="user-report-textarea"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={5}
          maxLength={500}
          placeholder="Provide more information here..."
        />
        <button
          type="submit"
          disabled={submitting || !reportType || !reason.trim()}
          className="user-report-submit-btn"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </form>
      {error && <div className="user-report-error">{error}</div>}
      {success && <div className="user-report-success">Report submitted successfully. Thank you!</div>}
    </div>
  );
}