import React, { useState } from 'react';
import PageLayout from "../components/PageLayout/PageLayout";
import './AdminListenerManagement.css';

// Example admin table data
const LISTENER_DATA = [
  {
    id: 1,
    status: "Active",
    username: "@musicrock",
    fullName: "Jane Doe",
    accountType: "Premium",
    dateCreated: "2025-03-10",
    unresolvedReports: 0,
  },
  {
    id: 2,
    status: "Deactivated",
    username: "@loudfan",
    fullName: "Sam Smith",
    accountType: "Free",
    dateCreated: "2025-01-12",
    unresolvedReports: 3,
  },
  {
    id: 3,
    status: "Active",
    username: "@popqueen",
    fullName: "Ellie Ray",
    accountType: "Premium",
    dateCreated: "2025-10-02",
    unresolvedReports: 1,
  },
];

// Data report analytics; structure matches your schema
const ANALYTICS_DATA = [
  {
    listenerId: 1001,
    username: "@sconnor",
    firstName: "Sarah",
    lastName: "Connor",
    major: "Engineering",
    minor: "Math",
    dateCreated: "2025-03-01",
    subscriptionStatus: "Active",
    subscriptionDuration: "12 months",
    totalSongs: 2890,
    totalListenTime: "120h",
    likedSongs: 151,
    totalFollows: 45,
    pinnedSong: "Dancing Stars",
    topArtist: "Cool Girl",
    topGenre: "Pop",
    unresolvedReports: 0,
    lastActive: "2025-10-25"
  },
  {
    listenerId: 1002,
    username: "@jsmith",
    firstName: "John",
    lastName: "Smith",
    major: "Computer Science",
    minor: "Physics",
    dateCreated: "2025-03-02",
    subscriptionStatus: "Expired",
    subscriptionDuration: "6 months",
    totalSongs: 2150,
    totalListenTime: "76h",
    likedSongs: 52,
    totalFollows: 12,
    pinnedSong: "Night Runner",
    topArtist: "DJ Sonic",
    topGenre: "Rock",
    unresolvedReports: 1,
    lastActive: "2025-10-19"
  },
  {
    listenerId: 1003,
    username: "@mwallace",
    firstName: "Mia",
    lastName: "Wallace",
    major: "Architecture",
    minor: "",
    dateCreated: "2025-03-04",
    subscriptionStatus: "Active",
    subscriptionDuration: "12 months",
    totalSongs: 1980,
    totalListenTime: "65h",
    likedSongs: 18,
    totalFollows: 88,
    pinnedSong: "",
    topArtist: "Beat Guru",
    topGenre: "Hip-Hop",
    unresolvedReports: 0,
    lastActive: "2025-10-23"
  }
];

// All possible columns for the report
const ALL_COLUMNS = [
  { key: "listenerId", label: "Listener ID" },
  { key: "username", label: "Username" },
  { key: "name", label: "Name" },
  { key: "major", label: "Major" },
  { key: "minor", label: "Minor" },
  { key: "dateCreated", label: "Date Created" },
  { key: "subscriptionStatus", label: "Sub Status" },
  { key: "subscriptionDuration", label: "Duration" },
  { key: "totalSongs", label: "Total Songs" },
  { key: "totalListenTime", label: "Total Time" },
  { key: "likedSongs", label: "Liked Songs" },
  { key: "totalFollows", label: "Total Follows" },
  { key: "pinnedSong", label: "Pinned Song" },
  { key: "topArtist", label: "Top Artist" },
  { key: "topGenre", label: "Top Genre" },
  { key: "unresolvedReports", label: "Reports" },
  { key: "lastActive", label: "Last Active" }
];

const FILTER_OPTIONS = [
  { label: "All Listeners", value: "all" },
  { label: "Active", value: "active" },
  { label: "Deactivated", value: "deactivated" },
  { label: "Has Unresolved Reports", value: "reported" },
];

const AdminListenerManagement = () => {
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [majorFilter, setMajorFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [minorFilter, setMinorFilter] = useState("");
  const [createdAfter, setCreatedAfter] = useState("");
  const [createdBefore, setCreatedBefore] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  const [durationFilter, setDurationFilter] = useState("");
  const [engagementFilter, setEngagementFilter] = useState("");
  const [minLiked, setMinLiked] = useState("");
  const [topGenre, setTopGenre] = useState("");
  const [topArtist, setTopArtist] = useState("");
  const [shownColumns, setShownColumns] = useState(ALL_COLUMNS.map(col => col.key));
  const [reportDataRows, setReportDataRows] = useState([...ANALYTICS_DATA]);

  // Top table filtering logic
  const filteredListeners = LISTENER_DATA.filter(listener => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "active") return listener.status === "Active";
    if (selectedFilter === "deactivated") return listener.status === "Deactivated";
    if (selectedFilter === "reported") return listener.unresolvedReports > 0;
    return true;
  });

  // Column toggling handler for data report
  const handleColumnToggle = (colKey) => {
    setShownColumns(
      shownColumns.includes(colKey)
        ? shownColumns.filter(k => k !== colKey)
        : [...shownColumns, colKey]
    );
  };

  // Apply filters handler for data report
  const applyFilters = () => {
    let filtered = [...ANALYTICS_DATA];
    if (majorFilter) filtered = filtered.filter(row => (row.major ?? "").toLowerCase().includes(majorFilter.toLowerCase()));
    if (nameFilter) filtered = filtered.filter(row => 
      (row.firstName + " " + row.lastName).toLowerCase().includes(nameFilter.toLowerCase()) ||
      (row.username ?? "").toLowerCase().includes(nameFilter.toLowerCase())
    );
    if (minorFilter) filtered = filtered.filter(row => (row.minor ?? "").toLowerCase().includes(minorFilter.toLowerCase()));
    if (createdAfter) filtered = filtered.filter(row => row.dateCreated >= createdAfter);
    if (createdBefore) filtered = filtered.filter(row => row.dateCreated <= createdBefore);
    if (subscriptionStatus) filtered = filtered.filter(row => (row.subscriptionStatus ?? "").toLowerCase() === subscriptionStatus);
    if (durationFilter) filtered = filtered.filter(row => row.subscriptionDuration === durationFilter);
    if (engagementFilter === "high") filtered = filtered.filter(row => Number(row.totalSongs) > 1000);
    if (engagementFilter === "medium") filtered = filtered.filter(row => Number(row.totalSongs) >= 100 && Number(row.totalSongs) <= 1000);
    if (engagementFilter === "low") filtered = filtered.filter(row => Number(row.totalSongs) < 100);
    if (minLiked) filtered = filtered.filter(row => Number(row.likedSongs) >= Number(minLiked));
    if (topGenre) filtered = filtered.filter(row => (row.topGenre ?? "").toLowerCase().includes(topGenre.toLowerCase()));
    if (topArtist) filtered = filtered.filter(row => (row.topArtist ?? "").toLowerCase().includes(topArtist.toLowerCase()));
    setReportDataRows(filtered);
  };

  return (
    <PageLayout>
      <div className="admin-listener-container">
        <h1 className="admin-title">Listener Management</h1>
        <div className="admin-filters">
          <input type="text" placeholder="Search username..." className="admin-search"/>
          <div className="filter-dropdown-container">
            <button
              className="admin-filter-btn"
              onClick={() => setFilterDropdownOpen(open => !open)}
            >
              Filter by:
            </button>
            {filterDropdownOpen && (
              <div className="filter-dropdown-menu">
                {FILTER_OPTIONS.map(option => (
                  <div
                    key={option.value}
                    className={`filter-dropdown-item${selectedFilter === option.value ? " selected" : ""}`}
                    onClick={() => {
                      setSelectedFilter(option.value);
                      setFilterDropdownOpen(false);
                    }}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Top table (always displays) */}
        <div className="admin-table-container">
          <table className="admin-listener-table">
            <thead>
              <tr>
                <th>ID#</th>
                <th>Status</th>
                <th>Username</th>
                <th>Full Name</th>
                <th>Account Type</th>
                <th>Date Created</th>
                <th>Unresolved Reports</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredListeners.map(listener => (
                <tr key={listener.id}>
                  <td>{listener.id}</td>
                  <td>
                    <span className={`status-tag ${listener.status === "Active" ? "active" : "deactivated"}`}>
                      {listener.status}
                    </span>
                  </td>
                  <td className="table-username">{listener.username}</td>
                  <td>{listener.fullName}</td>
                  <td>{listener.accountType}</td>
                  <td>{listener.dateCreated}</td>
                  <td>
                    {listener.unresolvedReports > 0 ? (
                      <span className="report-badge">{listener.unresolvedReports}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <button className="ban-btn">{listener.status === "Active" ? "Deactivate" : "Reactivate"}</button>
                    <button className="remove-btn">Remove</button>
                    <button className="report-btn">View Reports</button>
                    <button className="view-profile-btn">View Profile</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Data Report */}
        <div className="listener-data-report">
          <h2>Listener Data Report</h2>
          <div className="columns-bar-flex">
            <fieldset className="columns-bar">
              <legend>Show Columns</legend>
              <div className="columns-checkboxes-horizontal">
                {ALL_COLUMNS.map(col => (
                  <label key={col.key} className="columns-checkbox-label">
                    <input
                      type="checkbox"
                      checked={shownColumns.includes(col.key)}
                      onChange={() => handleColumnToggle(col.key)}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              type="button"
              className="apply-filters-btn pastel"
              style={{ alignSelf: "center", marginLeft: 24, minWidth: 130, marginTop: 0 }}
              onClick={applyFilters}
            >
              Apply Filters
            </button>
          </div>
          <div className="report-params">
            <fieldset className="filter-section">
              <legend>Listener</legend>
              <label>Major:
                <input type="text" value={majorFilter} onChange={e => setMajorFilter(e.target.value)} placeholder="Enter major" />
              </label>
              <label>Name or Username:
                <input type="text" value={nameFilter} onChange={e => setNameFilter(e.target.value)} placeholder="Name/Username" />
              </label>
              <label>Minor:
                <input type="text" value={minorFilter} onChange={e => setMinorFilter(e.target.value)} placeholder="Minor" />
              </label>
              <label>Account Created After:
                <input type="date" value={createdAfter} onChange={e => setCreatedAfter(e.target.value)} />
              </label>
              <label>Account Created Before:
                <input type="date" value={createdBefore} onChange={e => setCreatedBefore(e.target.value)} />
              </label>
            </fieldset>
            <fieldset className="filter-section">
              <legend>Subscription</legend>
              <label>Status:
                <select value={subscriptionStatus} onChange={e => setSubscriptionStatus(e.target.value)}>
                  <option value="">Any</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                </select>
              </label>
              <label>Duration:
                <select value={durationFilter} onChange={e => setDurationFilter(e.target.value)}>
                  <option value="">Any</option>
                  <option value="6 months">6 Months</option>
                  <option value="12 months">12 Months</option>
                </select>
              </label>
            </fieldset>
            <fieldset className="filter-section">
              <legend>Listen History</legend>
              <label>Activity Level:
                <select value={engagementFilter} onChange={e => setEngagementFilter(e.target.value)}>
                  <option value="">Any</option>
                  <option value="high">High (&gt;1000 Songs)</option>
                  <option value="medium">Moderate (100-1000)</option>
                  <option value="low">Low ({"<100"})</option>
                </select>
              </label>
              <label>Min Liked Songs:
                <input type="number" value={minLiked} min="0" onChange={e => setMinLiked(e.target.value)} placeholder="e.g. 50" />
              </label>
              <label>Top Genre:
                <input type="text" value={topGenre} onChange={e => setTopGenre(e.target.value)} placeholder="e.g. Pop" />
              </label>
              <label>Top Artist:
                <input type="text" value={topArtist} onChange={e => setTopArtist(e.target.value)} placeholder="e.g. Cool Girl" />
              </label>
            </fieldset>
          </div>
          <div className="report-table-scroll">
            <table className="data-report-table">
              <thead>
                <tr>
                  {ALL_COLUMNS.filter(col => shownColumns.includes(col.key)).map(col => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportDataRows.length === 0 ? (
                  <tr>
                    <td colSpan={shownColumns.length} style={{ textAlign: "center", color: "#ad7d9b" }}>
                      No listeners match your filters.
                    </td>
                  </tr>
                ) : (
                  reportDataRows.map((row, idx) => (
                    <tr key={idx}>
                      {ALL_COLUMNS.filter(col => shownColumns.includes(col.key)).map(col => (
                        <td key={col.key}>
                          {col.key === "name"
                            ? `${row.firstName} ${row.lastName}`.trim()
                            : col.key === "unresolvedReports"
                              ? (row[col.key] > 0 ? <span className="report-badge">{row[col.key]}</span> : "—")
                              : row[col.key] || ""}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default AdminListenerManagement;
