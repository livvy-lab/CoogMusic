import React, { useState } from 'react';
import PageLayout from "../components/PageLayout/PageLayout";
import './AdminArtistManagement.css';

// EXAMPLE artist management table data for the top table
const ARTIST_DATA = [
  {
    artistId: 1,
    status: "Active",
    username: "@thesynths",
    artistName: "The Synths",
    verified: true,
    dateCreated: "2024-04-01",
    unresolvedReports: 0
  },
  {
    artistId: 2,
    status: "Deactivated",
    username: "@jazzology",
    artistName: "Jazzology",
    verified: false,
    dateCreated: "2023-11-20",
    unresolvedReports: 1
  }
];

// Data report demo; adjust keys to match artist analytics
const ARTIST_ANALYTICS = [
  {
    artistId: 1,
    artistName: "The Synths",
    username: "@thesynths",
    verified: true,
    dateCreated: "2024-04-01",
    bio: "Upbeat synthwave from Houston.",
    followers: 14520,
    numSongs: 28,
    numAlbums: 2,
    genres: "Synthwave, Pop",
    totalPlays: 320000,
    unresolvedReports: 0,
    lastActive: "2025-10-20"
  },
  {
    artistId: 2,
    artistName: "Jazzology",
    username: "@jazzology",
    verified: false,
    dateCreated: "2023-11-20",
    bio: "Experimental jazz collective.",
    followers: 902,
    numSongs: 12,
    numAlbums: 1,
    genres: "Jazz",
    totalPlays: 15600,
    unresolvedReports: 1,
    lastActive: "2025-09-12"
  }
];

const ALL_COLUMNS = [
  { key: "artistId", label: "Artist ID" },
  { key: "artistName", label: "Artist Name" },
  { key: "username", label: "Username" },
  { key: "verified", label: "Verified" },
  { key: "dateCreated", label: "Date Created" },
  { key: "bio", label: "Bio" },
  { key: "followers", label: "Followers" },
  { key: "numSongs", label: "Songs" },
  { key: "numAlbums", label: "Albums" },
  { key: "genres", label: "Genres" },
  { key: "totalPlays", label: "Total Plays" },
  { key: "unresolvedReports", label: "Reports" },
  { key: "lastActive", label: "Last Active" }
];

const FILTER_OPTIONS = [
  { label: "All Artists", value: "all" },
  { label: "Active", value: "active" },
  { label: "Deactivated", value: "deactivated" },
  { label: "Verified", value: "verified" },
  { label: "Unverified", value: "unverified" },
  { label: "Has Unresolved Reports", value: "reported" }
];

const AdminArtistManagement = () => {
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [artistNameFilter, setArtistNameFilter] = useState("");
  const [usernameFilter, setUsernameFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [createdAfter, setCreatedAfter] = useState("");
  const [createdBefore, setCreatedBefore] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [shownColumns, setShownColumns] = useState(ALL_COLUMNS.map(col => col.key));
  const [reportDataRows, setReportDataRows] = useState([...ARTIST_ANALYTICS]);

  // Top table filtering
  const filteredArtists = ARTIST_DATA.filter(a => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "active") return a.status === "Active";
    if (selectedFilter === "deactivated") return a.status === "Deactivated";
    if (selectedFilter === "verified") return a.verified;
    if (selectedFilter === "unverified") return !a.verified;
    if (selectedFilter === "reported") return a.unresolvedReports > 0;
    return true;
  });

  // Data report filters
  const handleColumnToggle = (colKey) => {
    setShownColumns(
      shownColumns.includes(colKey)
        ? shownColumns.filter(k => k !== colKey)
        : [...shownColumns, colKey]
    );
  };

  const applyFilters = () => {
    let filtered = [...ARTIST_ANALYTICS];
    if (artistNameFilter) filtered = filtered.filter(row => (row.artistName ?? "").toLowerCase().includes(artistNameFilter.toLowerCase()));
    if (usernameFilter) filtered = filtered.filter(row => (row.username ?? "").toLowerCase().includes(usernameFilter.toLowerCase()));
    if (verifiedFilter)
      filtered = filtered.filter(row =>
        verifiedFilter === "verified" ? row.verified : !row.verified
      );
    if (createdAfter) filtered = filtered.filter(row => row.dateCreated >= createdAfter);
    if (createdBefore) filtered = filtered.filter(row => row.dateCreated <= createdBefore);
    if (genreFilter) filtered = filtered.filter(row => (row.genres ?? "").toLowerCase().includes(genreFilter.toLowerCase()));
    setReportDataRows(filtered);
  };

  return (
    <PageLayout>
      <div className="admin-listener-container">
        <h1 className="admin-title">Artist Management</h1>
        <div className="admin-filters">
          <input type="text" placeholder="Search artist/username..." className="admin-search"/>
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
        {/* Top artist table */}
        <div className="admin-table-container">
          <table className="admin-listener-table">
            <thead>
              <tr>
                <th>ID#</th>
                <th>Status</th>
                <th>Username</th>
                <th>Artist Name</th>
                <th>Verified</th>
                <th>Date Created</th>
                <th>Unresolved Reports</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredArtists.map(artist => (
                <tr key={artist.artistId}>
                  <td>{artist.artistId}</td>
                  <td>
                    <span className={`status-tag ${artist.status === "Active" ? "active" : "deactivated"}`}>
                      {artist.status}
                    </span>
                  </td>
                  <td className="table-username">{artist.username}</td>
                  <td>{artist.artistName}</td>
                  <td>
                    {artist.verified ? (
                      <span className="verified-badge">Verified</span>
                    ) : (
                      <span className="unverified-badge">Unverified</span>
                    )}
                  </td>
                  <td>{artist.dateCreated}</td>
                  <td>
                    {artist.unresolvedReports > 0 ? (
                      <span className="report-badge">{artist.unresolvedReports}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <button className="ban-btn">{artist.status === "Active" ? "Deactivate" : "Reactivate"}</button>
                    <button className="remove-btn">Remove</button>
                    <button className="report-btn">View Reports</button>
                    <button className="view-profile-btn">View Profile</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Data Report: Show Columns, filterboxes, analytics table */}
        <div className="listener-data-report">
          <h2>Artist Data Report</h2>
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
              <legend>Artist</legend>
              <label>Artist Name:
                <input type="text" value={artistNameFilter} onChange={e => setArtistNameFilter(e.target.value)} placeholder="Enter artist name" />
              </label>
              <label>Username:
                <input type="text" value={usernameFilter} onChange={e => setUsernameFilter(e.target.value)} placeholder="Enter username" />
              </label>
              <label>Verified:
                <select value={verifiedFilter} onChange={e => setVerifiedFilter(e.target.value)}>
                  <option value="">Any</option>
                  <option value="verified">Verified</option>
                  <option value="unverified">Unverified</option>
                </select>
              </label>
              <label>Account Created After:
                <input type="date" value={createdAfter} onChange={e => setCreatedAfter(e.target.value)} />
              </label>
              <label>Account Created Before:
                <input type="date" value={createdBefore} onChange={e => setCreatedBefore(e.target.value)} />
              </label>
              <label>Genres:
                <input type="text" value={genreFilter} onChange={e => setGenreFilter(e.target.value)} placeholder="e.g. Pop, Jazz" />
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
                      No artists match your filters.
                    </td>
                  </tr>
                ) : (
                  reportDataRows.map((row, idx) => (
                    <tr key={idx}>
                      {ALL_COLUMNS.filter(col => shownColumns.includes(col.key)).map(col => (
                        <td key={col.key}>
                          {col.key === "verified"
                            ? row.verified
                              ? <span className="verified-badge">Verified</span>
                              : <span className="unverified-badge">Unverified</span>
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

export default AdminArtistManagement;
