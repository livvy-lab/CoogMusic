import React, { useState, useEffect } from "react";
import PageLayout from "../components/PageLayout/PageLayout";
import { API_BASE_URL } from '../config/api';
import { getUser } from '../lib/userStorage';
import { showToast } from "../lib/toast";
import "./AdminReportReview.css";

// Helper to format dates
function formatDate(dateString) {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch (e) { return "Invalid Date"; }
}

function todayOffset(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatAdminAction(action) {
  if (action === 'NoAction') return 'No Action';
  if (action === 'Removed') return 'Removed';
  return action || "-";
}

// === MAIN PAGE COMPONENT ===
export default function AdminReportReview() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState(todayOffset(-30));
  const [endDate, setEndDate] = useState(todayOffset(0));
  const [statusFilter, setStatusFilter] = useState("false"); 
  const [typeFilter, setTypeFilter] = useState(""); 

  const fetchReports = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);
    if (statusFilter) params.append('resolved', statusFilter);
    if (typeFilter) params.append('type', typeFilter);

    fetch(`${API_BASE_URL}/user_reports?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Error: ${res.status}`);
        return res.json();
      })
      .then((data) => setReports(data || []))
      .catch((err) => {
        showToast("Failed to load reports", "error");
        setReports([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate, statusFilter, typeFilter]);

  return (
    <PageLayout>
      <div className="admin-reports-container">
        <div className="header-row">
          <h1>Report Review</h1>
          <div className="controls">
            <div className="date-group">
              <input type="date" className="filter-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span className="date-sep">to</span>
              <input type="date" className="filter-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="false">Pending</option>
              <option value="true">Resolved</option>
              <option value="">All Status</option>
            </select>
            <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All Content</option>
              <option value="Song">Songs</option>
              <option value="Artist">Artists</option>
              <option value="Playlist">Playlists</option>
              <option value="Listener">Users</option>
            </select>
          </div>
        </div>

        <div className="table-card">
          {loading ? (
            <div className="loading-state">Loading reports...</div>
          ) : (
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reporter</th>
                  <th>Content</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Resolution</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.length > 0 ? (
                  reports.map((row) => (
                    <tr key={row.ReportID} onClick={() => setSelectedReport(row)}>
                      <td>{formatDate(row.DateCreated)}</td>
                      <td className="reporter-cell">{row.ReporterUsername || `ID: ${row.ListenerID}`}</td>
                      <td>
                        <strong>{row.EntityType}</strong>
                        <br/>
                        <span className="sub-text">{row.EntityName || `#${row.EntityID}`}</span>
                      </td>
                      <td><span className="reason-badge">{row.ReportType}</span></td>
                      <td>
                        {row.Resolved ? (
                          <span className="status-badge resolved">Resolved</span>
                        ) : (
                          <span className="status-badge pending">Pending</span>
                        )}
                      </td>
                      <td>{formatAdminAction(row.AdminActionTaken)}</td>
                      <td>
                        <button className="review-btn">{row.Resolved ? "View" : "Review"}</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="7" className="no-results">No reports found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal for Reviewing Report */}
      {selectedReport && (
        <ReportDetailModal
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

// === REPORT DETAIL MODAL ===
function ReportDetailModal({ report, onClose, onActionSuccess }) {
  const [justification, setJustification] = useState("");
  const [action, setAction] = useState("");
  const [processing, setProcessing] = useState(false);
  
  // State for the Nested Profile Modal
  const [previewUser, setPreviewUser] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!action || !justification) return;
    setProcessing(true);
    const user = getUser();
    
    try {
      if (action === "Removed") {
        const delRes = await fetch(`${API_BASE_URL}/api/soft_delete/${report.EntityType}/${report.EntityID}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${user?.adminId}` }
        });
        if (!delRes.ok) throw new Error("Failed to remove content");
      }

      const res = await fetch(`${API_BASE_URL}/user_reports/${report.ReportID}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user?.adminId}` 
        },
        body: JSON.stringify({
          AdminActionTaken: action,
          AdminJustification: justification,
        }),
      });

      if (!res.ok) throw new Error("Failed to update report");

      showToast("Report resolved successfully", "success");
      setTimeout(onActionSuccess, 500);
    } catch (err) {
      showToast(err.message, "error");
      setProcessing(false);
    }
  };

  // Helper to open the profile modal
  const handleViewProfile = () => {
    if (report.EntityType === 'Artist' || report.EntityType === 'Listener' || report.EntityType === 'User') {
      setPreviewUser({
        SpecificID: report.EntityID,
        AccountType: report.EntityType === 'User' ? 'Listener' : report.EntityType,
        DisplayName: report.EntityName, // Fallback name
        Username: "User", // Fallback
        DateCreated: null // Fallback
      });
    }
  };

  const canViewProfile = ['Artist', 'Listener', 'User'].includes(report.EntityType);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Review Complaint #{report.ReportID}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="report-info">
            <div className="info-row">
              <label>Reported Item:</label>
              <div>
                <strong>{report.EntityType}: {report.EntityName || report.EntityID}</strong>
                
                {/* BUTTON TO OPEN PROFILE MODAL */}
                {canViewProfile && (
                  <button 
                    type="button" 
                    className="view-link-btn" 
                    onClick={handleViewProfile}
                  >
                    View Profile Details
                  </button>
                )}
              </div>
            </div>
            <div className="info-row">
              <label>Reason:</label>
              <span>{report.ReportType}</span>
            </div>
            <div className="info-row">
              <label>Details:</label>
              <p className="reason-text">{report.Reason || "No details provided."}</p>
            </div>
          </div>

          <hr className="divider" />

          {report.Resolved ? (
            <div className="resolved-info">
              <h3>Resolution Details</h3>
              <p><strong>Action:</strong> {formatAdminAction(report.AdminActionTaken)}</p>
              <p><strong>By:</strong> {report.ResolverName || "Admin"}</p>
              <p><strong>Notes:</strong> {report.AdminJustification}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h3>Take Action</h3>
              <div className="action-buttons">
                <button 
                  type="button" 
                  className={`act-btn remove ${action === 'Removed' ? 'active' : ''}`}
                  onClick={() => setAction('Removed')}
                >
                  Remove Content
                </button>
                <button 
                  type="button" 
                  className={`act-btn ignore ${action === 'NoAction' ? 'active' : ''}`}
                  onClick={() => setAction('NoAction')}
                >
                  Dismiss / No Action
                </button>
              </div>
              <textarea 
                className="admin-notes" 
                placeholder="Justification (Required to resolve)..."
                value={justification}
                onChange={e => setJustification(e.target.value)}
              />
              <button 
                type="submit" 
                className="submit-resolve" 
                disabled={!action || !justification || processing}
              >
                {processing ? "Processing..." : "Resolve Report"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* NESTED MODAL FOR VIEWING PROFILE */}
      {previewUser && (
        <UserProfileModal 
          user={previewUser} 
          onClose={() => setPreviewUser(null)} 
        />
      )}
    </div>
  );
}

// === USER PROFILE MODAL (Embedded here for simplicity) ===
function UserProfileModal({ user, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolvedPfp, setResolvedPfp] = useState(null);
  
  const isArtist = user.AccountType === "Artist";

  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      try {
        let url = isArtist
          ? `${API_BASE_URL}/artists/${user.SpecificID}`
          : `${API_BASE_URL}/listeners/${user.SpecificID}/profile`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;

          // Normalize Data Structure
          let profileData = isArtist ? data : data.listener;
          setDetails(profileData);

          // --- MEDIA RESOLUTION LOGIC ---
          // Check for Media ID (Artists use 'image_media_id', Listeners use 'image_media_id')
          const mediaId = profileData.image_media_id;
          
          if (mediaId) {
            // Fetch signed URL
            const mediaRes = await fetch(`${API_BASE_URL}/media/${mediaId}`);
            if (mediaRes.ok) {
              const mediaData = await mediaRes.json();
              setResolvedPfp(mediaData.url);
            }
          } else {
            // Fallback to direct PFP url or PFP string if valid
            setResolvedPfp(profileData.pfpUrl || profileData.PFP || null);
          }
        }
      } catch (err) {
        console.error("Failed to load user details", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDetails();
    return () => { isMounted = false; };
  }, [user, isArtist]);

  // Use fetched details if available, else fallback to passed user prop
  const displayName = details?.ArtistName || details?.FirstName ? (isArtist ? details.ArtistName : `${details.FirstName} ${details.LastName}`) : user.DisplayName;
  const displayUsername = details?.Username || user.Username;
  const bio = details?.Bio || "No bio provided.";

  return (
    <div className="modal-overlay profile-z-index" onClick={onClose}>
      <div className="modal-box profile-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Profile Preview</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">Loading profile...</div>
          ) : (
            <>
              <div className="profile-preview-header">
                {resolvedPfp ? (
                  <img 
                    src={resolvedPfp} 
                    alt={displayName} 
                    className="profile-preview-avatar"
                    onError={(e) => {
                      // If resolved URL fails, hide image and show fallback
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                
                {/* Fallback Circle (shown if no PFP or if PFP errors out) */}
                <div className="profile-preview-fallback" style={{ display: resolvedPfp ? 'none' : 'flex' }}>
                  {displayName ? displayName.charAt(0).toUpperCase() : "?"}
                </div>

                <div className="profile-preview-text">
                  <h3>{displayName}</h3>
                  <span className="profile-preview-tag">@{displayUsername}</span>
                  <span className={`type-badge ${isArtist ? 'artist' : 'listener'}`}>{user.AccountType}</span>
                </div>
              </div>
              <div className="profile-preview-bio">
                <label>Bio:</label>
                <p>{bio}</p>
              </div>
              <div className="profile-preview-stats">
                <div className="stat-chip">ID: {user.SpecificID}</div>
                {isArtist && <div className="stat-chip">{details?.IsVerified ? "Verified ✓" : "Standard Artist"}</div>}
                {!isArtist && <div className="stat-chip">{details?.Major ? `Major: ${details.Major}` : "Major: N/A"}</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}