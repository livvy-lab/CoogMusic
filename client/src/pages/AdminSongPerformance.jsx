import { useEffect, useState, useCallback } from "react";
import PageLayout from "../components/PageLayout/PageLayout";
import { API_BASE_URL } from "../config/api";
import "./AdminSongPerformance.css";

// Helper to format large numbers
const formatNumber = (num) => {
  return Number(num).toLocaleString();
};

function todayOffset(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function AdminSongPerformance() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  
  // Filters
  const [minPlays, setMinPlays] = useState("");
  const [minLikes, setMinLikes] = useState("");
  const [minListeners, setMinListeners] = useState("");
  
  // Date Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(todayOffset(0));
  
  const [sortBy, setSortBy] = useState("total_plays");
  
  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      
      if (minPlays) params.append("minPlays", minPlays);
      if (minLikes) params.append("minLikes", minLikes);
      if (minListeners) params.append("minListeners", minListeners);
      
      const url = `${API_BASE_URL}/admin/song-report?${params.toString()}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Network error (${res.status})`);

      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
      
    } catch (err) {
      console.error("Error loading song report:", err);
      setError(`Could not load song performance report: ${err.message}.`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [minPlays, minLikes, minListeners, startDate, endDate]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Calculate summary: Total Plays is for the period, Total Likes is sum of lifetime likes for filtered songs.
  const summary = rows.reduce((acc, row) => {
    acc.totalPlays += Number(row.total_plays) || 0;
    acc.totalLikes += Number(row.likes) || 0; // 'likes' is the lifetime count from the backend
    return acc;
  }, { totalPlays: 0, totalLikes: 0 });
  
  const filtered = rows.filter((row) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const title = (row.Title || "").toLowerCase();
    const artist = (row.ArtistName || "").toLowerCase();
    return title.includes(q) || artist.includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "Title") return (a.Title || "").localeCompare(b.Title || "");
    if (sortBy === "ArtistName") return (a.ArtistName || "").localeCompare(b.ArtistName || "");
    return Number(b[sortBy] || 0) - Number(a[sortBy] || 0);
  });

  return (
    <PageLayout>
      <div className="admin-report-container">
        <h2>Song Performance Report</h2>

        {/* Summary Cards */}
        <div className="rev-summary-grid two-column">
          <div className="rev-card total">
            <div className="rev-label">Total Plays (Period)</div>
            <div className="rev-amount">{formatNumber(summary.totalPlays)}</div>
          </div>
          <div className="rev-card sub">
            <div className="rev-label">Total Likes (Lifetime)</div>
            <div className="rev-amount">{formatNumber(summary.totalLikes)}</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="arr-filter-bar">
          <div>
            <label className="arr-filter-label">From:</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
          </div>
          <div>
            <label className="arr-filter-label">To:</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>
          <div>
            <label className="arr-filter-label">Search:</label>
            <input 
              type="text" 
              placeholder="Song or Artist..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
          <div>
            <label className="arr-filter-label">Min Plays:</label>
            <input 
              type="number" 
              placeholder="0" 
              value={minPlays} 
              onChange={(e) => setMinPlays(e.target.value)} 
            />
          </div>
          <div>
            <label className="arr-filter-label">Min Likes:</label>
            <input 
              type="number" 
              placeholder="0" 
              value={minLikes} 
              onChange={(e) => setMinLikes(e.target.value)} 
            />
          </div>
          <div>
            <label className="arr-filter-label">Min Listeners:</label>
            <input 
              type="number" 
              placeholder="0" 
              value={minListeners} 
              onChange={(e) => setMinListeners(e.target.value)} 
            />
          </div>
          <div>
            <button className="arr-filter-apply-btn" onClick={fetchReportData}>
              Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <section className="arr-section table-container">
          <div className="table-scroll">
            {loading ? (
              <div className="arr-loading">Loading...</div>
            ) : error ? (
              <div className="arr-error">{error}</div>
            ) : (
              <table className="arr-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Song</th>
                    <th>Artist</th>
                    <th>Plays</th>
                    <th>Listeners</th>
                    <th>Likes</th>
                    <th>First Played</th>
                    <th>Last Played</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length > 0 ? (
                    sorted.map((row, index) => (
                      <tr key={row.SongID}>
                        <td>{index + 1}</td>
                        <td className="col-title">{row.Title}</td>
                        <td>{row.ArtistName}</td>
                        <td className="col-highlight">{formatNumber(row.total_plays)}</td>
                        <td>{formatNumber(row.unique_listeners)}</td>
                        <td>{formatNumber(row.likes)}</td>
                        <td>
                          {row.first_played_at 
                            ? new Date(row.first_played_at).toLocaleDateString() 
                            : "-"}
                        </td>
                        <td>
                          {row.last_played_at 
                            ? new Date(row.last_played_at).toLocaleDateString() 
                            : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="arr-no-reports">
                        No songs match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}