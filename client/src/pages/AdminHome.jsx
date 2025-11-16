import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout/PageLayout";
import { API_BASE_URL } from "../config/api";
import usersIcon from "../assets/icons/users-icon.svg";
import "./AdminHome.css";

// helper function to format date
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch (e) {
    return "Invalid Date";
  }
}

// recent user card component
function RecentUserCard({ user }) {
  const isArtist = user.AccountType === "Artist";
  const profileUrl = isArtist
    ? `/artist/${user.SpecificID}`
    : `/listener/${user.SpecificID}`;

  const idLabel = isArtist ? "Artist ID:" : "Listener ID:";
  const name = user.DisplayName || "N/A";
  const username = user.Username || "N/A";
  const date = formatDate(user.DateCreated);
  const finalPfpUrl = user.PFP_URL;
  const hasPFP = !!finalPfpUrl;

  return (
    <div className="recent-user-card">
      <div className="user-card-left">
        <span className="user-card-id">
          {idLabel} {user.SpecificID}
        </span>
        <span className="user-card-date">Date: {date}</span>
      </div>
      <div className="user-card-center">
        {hasPFP ? (
          <img src={finalPfpUrl} alt="Profile" className="user-card-pfp" />
        ) : (
          <div className="user-card-pfp-fallback">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="user-card-name-group">
          <span className="user-card-name">{name}</span>
          <span className="user-card-username">@{username}</span>
        </div>
      </div>
      <Link to={profileUrl} className="user-card-button">
        View Profile
      </Link>
    </div>
  );
}

export default function AdminHome() {
  const navigate = useNavigate();
  const [unresolvedReports, setUnresolvedReports] = useState("-");
  const [unverifiedArtists, setUnverifiedArtists] = useState("-");
  const [subscribedListeners, setSubscribedListeners] = useState("-");
  const [recentUsers, setRecentUsers] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/user_reports?resolved=false`)
      .then((res) => res.json())
      .then((data) =>
        setUnresolvedReports(Array.isArray(data) ? data.length : "0")
      )
      .catch(() => setUnresolvedReports("E"));

    fetch(`${API_BASE_URL}/artists?isVerified=false`)
      .then((res) => res.json())
      .then((data) =>
        setUnverifiedArtists(Array.isArray(data) ? data.length : "0")
      )
      .catch(() => setUnverifiedArtists("E"));

    fetch(`${API_BASE_URL}/listeners?subscribed=true`)
      .then((res) => res.json())
      .then((data) =>
        setSubscribedListeners(Array.isArray(data) ? data.length : "0")
      )
      .catch(() => setSubscribedListeners("E"));

    fetch(`${API_BASE_URL}/users/recent`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRecentUsers(data);
        } else {
          setRecentUsers([]);
        }
      })
      .catch(() => setRecentUsers([]))
      .finally(() => setLoadingRecent(false));
  }, []);

  return (
    <PageLayout>
      <div className="admin-home-container">
        <h1 className="admin-home-title">Welcome back, Admin</h1>

        <div className="dashboard-cards-grid">
          <div className="dashboard-card card-reports">
            <div className="card-title">Unresolved Reports</div>
            <div className="card-number">{unresolvedReports}</div>
            <div
              className="card-exclaim"
              role="button"
              title="View unresolved reports"
              aria-label="Go to report review"
              tabIndex={0}
              onClick={() => navigate("/report-review")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") navigate("/report-review");
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="exclaim-icon"
              >
                <path
                  fillRule="evenodd"
                  d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <div className="dashboard-card card-artists">
            <div className="card-title">Unverified Artists</div>
            <div className="card-number">{unverifiedArtists}</div>
          </div>
          <div className="dashboard-card card-listeners">
            <div className="card-title">Subscribed Listeners</div>
            <div className="card-number">{subscribedListeners}</div>
          </div>
        </div>

        <div className="dashboard-actions">
          <h2 className="section-title">Management</h2>
          <div className="action-buttons-container">
            <Link className="action-btn" to="/admin/reports">
              Manage Reports
            </Link>
            <Link className="action-btn" to="/admin/listeners">
              Manage Users
            </Link>
            <Link className="action-btn" to="/admin/artists">
              Manage Subscriptions
            </Link>
          </div>
        </div>

        <div className="dashboard-recent">
          <div className="recent-header">
            Recently Registered Users
            <img src={usersIcon} alt="" className="users-icon" />
          </div>
          <div className="recent-info">
            {loadingRecent ? (
              <span>Loading...</span>
            ) : recentUsers.length > 0 ? (
              recentUsers.map((user) => (
                <RecentUserCard key={user.AccountID} user={user} />
              ))
            ) : (
              <span>No recent users found.</span>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
