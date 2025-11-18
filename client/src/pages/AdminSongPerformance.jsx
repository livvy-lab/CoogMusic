import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout/PageLayout";
import { API_BASE_URL } from "../config/api";
import "./AdminSongPerformance.css";

export default function AdminSongPerformance() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("total_plays");
  const [minPlays, setMinPlays] = useState("");
  const [minLikes, setMinLikes] = useState("");
  const [minListeners, setMinListeners] = useState("");
  const [activeSinceDays, setActiveSinceDays] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();
        if (minPlays) params.append("minPlays", minPlays);
        if (minLikes) params.append("minLikes", minLikes);
        if (minListeners) params.append("minListeners", minListeners);
        if (activeSinceDays) params.append("activeSinceDays", activeSinceDays);

        const url =
          params.toString().length > 0
            ? `${API_BASE_URL}/admin/song-report?${params.toString()}`
            : `${API_BASE_URL}/admin/song-report`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Network error (${res.status})`);

        const data = await res.json();
        if (!cancelled) {
          setRows(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Error loading song report:", err);
        if (!cancelled) {
          setError(
            `Could not load song performance report: ${err.message}. Please try again later.`
          );
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [minPlays, minLikes, minListeners, activeSinceDays]);

  const filtered = rows.filter((row) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const title = (row.Title || "").toLowerCase();
    const artist = (row.ArtistName || "").toLowerCase();
    return title.includes(q) || artist.includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "Title") {
      return (a.Title || "").localeCompare(b.Title || "");
    }
    if (sortBy === "ArtistName") {
      return (a.ArtistName || "").localeCompare(b.ArtistName || "");
    }
    const av = Number(a[sortBy] || 0);
    const bv = Number(b[sortBy] || 0);
    return bv - av;
  });

  return (
    <PageLayout>
      <div className="admin-report-container">
        <h2>Song Performance Report</h2>

        <div className="arr-filter-bar">
          <div>
            <label className="arr-filter-label" htmlFor="songSearch">
              Search Song / Artist
            </label>
            <input
              id="songSearch"
              type="text"
              className="arr-date-input"
              placeholder="Start typing a song or artist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label className="arr-filter-label" htmlFor="sortBy">
              Sort By
            </label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="total_plays">Total Plays</option>
              <option value="unique_listeners">Unique Listeners</option>
              <option value="likes">Likes</option>
              <option value="Title">Song Title (A–Z)</option>
              <option value="ArtistName">Artist Name (A–Z)</option>
            </select>
          </div>

          <div>
            <label className="arr-filter-label" htmlFor="minPlays">
              Min Plays
            </label>
            <input
              id="minPlays"
              type="number"
              className="arr-date-input"
              min="0"
              placeholder="e.g. 100"
              value={minPlays}
              onChange={(e) => setMinPlays(e.target.value)}
            />
          </div>

          <div>
            <label className="arr-filter-label" htmlFor="minLikes">
              Min Likes
            </label>
            <input
              id="minLikes"
              type="number"
              className="arr-date-input"
              min="0"
              placeholder="e.g. 10"
              value={minLikes}
              onChange={(e) => setMinLikes(e.target.value)}
            />
          </div>

          <div>
            <label className="arr-filter-label" htmlFor="minListeners">
              Min Unique Listeners
            </label>
            <input
              id="minListeners"
              type="number"
              className="arr-date-input"
              min="0"
              placeholder="e.g. 5"
              value={minListeners}
              onChange={(e) => setMinListeners(e.target.value)}
            />
          </div>

          <div>
            <label className="arr-filter-label" htmlFor="activeSinceDays">
              Active in last (days)
            </label>
            <input
              id="activeSinceDays"
              type="number"
              className="arr-date-input"
              min="0"
              placeholder="e.g. 30"
              value={activeSinceDays}
              onChange={(e) => setActiveSinceDays(e.target.value)}
            />
          </div>
        </div>

        <section className="arr-section table-container">
          <div className="table-scroll">
            {loading ? (
              <div className="arr-loading">Loading Song Report...</div>
            ) : error ? (
              <div className="arr-error">{error}</div>
            ) : sorted.length === 0 ? (
              <table className="arr-table">
                <tbody>
                  <tr>
                    <td className="arr-no-reports" colSpan={8}>
                      No data available.
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <table className="arr-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Song</th>
                    <th>Artist</th>
                    <th>Total Plays</th>
                    <th>Unique Listeners</th>
                    <th>Likes</th>
                    <th>First Played</th>
                    <th>Last Played</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, index) => (
                    <tr key={row.SongID}>
                      <td>{index + 1}</td>
                      <td>{row.Title || "Untitled"}</td>
                      <td>{row.ArtistName || "Unknown"}</td>
                      <td>{row.total_plays}</td>
                      <td>{row.unique_listeners}</td>
                      <td>{row.likes}</td>
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
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
