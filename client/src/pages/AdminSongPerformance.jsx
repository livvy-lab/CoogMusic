import { useEffect, useState, useCallback, Fragment } from "react";
import PageLayout from "../components/PageLayout/PageLayout";
import { API_BASE_URL } from "../config/api";
import "./AdminSongPerformance.css";

const formatNumber = (num) => {
  return Number(num || 0).toLocaleString();
};

const parseStreamDetails = (raw) => {
  if (!raw) return [];
  try {
    const arr = Array.isArray(raw) ? raw : JSON.parse(raw);
    return arr.filter(
      (x) =>
        x &&
        typeof x === "object" &&
        Object.prototype.hasOwnProperty.call(x, "listenerId")
    );
  } catch {
    return [];
  }
};

const buildListenerSummaryForSong = (song) => {
  const details = parseStreamDetails(song.stream_details);
  if (!details.length) return [];
  const byListener = new Map();
  details.forEach((d) => {
    const id = d.listenerId;
    if (id == null) return;
    let rec = byListener.get(id);
    if (!rec) {
      rec = { plays: 0, firstPlayed: null, lastPlayed: null, username: null };
      byListener.set(id, rec);
    }
    rec.plays += 1;
    if (!rec.username && d.username) rec.username = d.username;
    const t = new Date(d.playedAt);
    if (!rec.firstPlayed || t < rec.firstPlayed) rec.firstPlayed = t;
    if (!rec.lastPlayed || t > rec.lastPlayed) rec.lastPlayed = t;
  });
  const result = [];
  byListener.forEach((stats, listenerId) => {
    result.push({
      listenerId,
      username: stats.username,
      plays: stats.plays,
      firstPlayed: stats.firstPlayed,
      lastPlayed: stats.lastPlayed,
    });
  });
  return result;
};

const buildFavoriteSummaryForSong = (song, listenerSummaries) => {
  const raw = song.liked_listeners;
  if (!raw) return [];
  let arr;
  try {
    arr = Array.isArray(raw) ? raw : JSON.parse(raw);
  } catch {
    return [];
  }
  const listenedSet = new Set((listenerSummaries || []).map((l) => l.listenerId));
  const byListener = new Map();
  arr.forEach((d) => {
    if (!d || typeof d !== "object") return;
    const id = d.listenerId;
    if (id == null) return;
    if (!byListener.has(id)) {
      byListener.set(id, {
        listenerId: id,
        username: d.username,
        hasStreams: listenedSet.has(id),
      });
    }
  });
  return Array.from(byListener.values());
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

  const [minPlays, setMinPlays] = useState("");
  const [minLikes, setMinLikes] = useState("");
  const [minListeners, setMinListeners] = useState("");

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(todayOffset(0));

  const [sortBy] = useState("total_plays");
  const [expandedSongId, setExpandedSongId] = useState(null);

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

  const summary = rows.reduce(
    (acc, row) => {
      acc.totalPlays += Number(row.total_plays) || 0;
      acc.totalLikes += Number(row.likes) || 0;
      return acc;
    },
    { totalPlays: 0, totalLikes: 0 }
  );

  const filtered = rows.filter((row) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const title = (row.Title || "").toLowerCase();
    const artist = (row.ArtistName || "").toLowerCase();
    return title.includes(q) || artist.includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "Title") return (a.Title || "").localeCompare(b.Title || "");
    if (sortBy === "ArtistName")
      return (a.ArtistName || "").localeCompare(b.ArtistName || "");
    return Number(b[sortBy] || 0) - Number(a[sortBy] || 0);
  });

  const toggleExpanded = (songId) => {
    setExpandedSongId((prev) => (prev === songId ? null : songId));
  };

  return (
    <PageLayout>
      <div className="admin-report-container">
        <h2>Song Performance Report</h2>

        <div className="rev-summary-grid two-column">
          <div className="rev-card total">
            <div className="rev-label">Total Plays (All Time)</div>
            <div className="rev-amount">{formatNumber(summary.totalPlays)}</div>
          </div>
          <div className="rev-card sub">
            <div className="rev-label">Total Likes (Lifetime)</div>
            <div className="rev-amount">{formatNumber(summary.totalLikes)}</div>
          </div>
        </div>

        <div className="arr-filter-bar">
          <div>
            <label className="arr-filter-label">Release From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="arr-filter-label">Release To:</label>
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
                    <th>First Listener</th>
                    <th>Last Played</th>
                    <th>Last Listener</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length > 0 ? (
                    sorted.map((row, index) => {
                      const isExpanded = expandedSongId === row.SongID;
                      const listenerSummaries = isExpanded
                        ? buildListenerSummaryForSong(row)
                        : [];
                      const favoriteSummaries = isExpanded
                        ? buildFavoriteSummaryForSong(row, listenerSummaries)
                        : [];
                      return (
                        <Fragment key={row.SongID}>
                          <tr
                            className={
                              isExpanded ? "arr-row arr-row-expanded" : "arr-row"
                            }
                            onClick={() => toggleExpanded(row.SongID)}
                          >
                            <td>{index + 1}</td>
                            <td className="col-title">{row.Title}</td>
                            <td>{row.ArtistName}</td>
                            <td className="col-highlight">
                              {formatNumber(row.total_plays)}
                            </td>
                            <td>{formatNumber(row.unique_listeners)}</td>
                            <td>{formatNumber(row.likes)}</td>
                            <td>
                              {row.first_played_at
                                ? new Date(
                                    row.first_played_at
                                  ).toLocaleDateString()
                                : "-"}
                            </td>
                            <td>
                              {row.first_played_by
                                ? `${row.first_played_by} (${row.first_played_by_username || "-"})`
                                : "-"}
                            </td>
                            <td>
                              {row.last_played_at
                                ? new Date(
                                    row.last_played_at
                                  ).toLocaleDateString()
                                : "-"}
                            </td>
                            <td>
                              {row.last_played_by
                                ? `${row.last_played_by} (${row.last_played_by_username || "-"})`
                                : "-"}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="arr-listener-row">
                              <td colSpan="10">
                                <div className="listener-details">
                                  <div className="listener-section">
                                    <div className="listener-section-title">
                                      Listeners with qualifying streams (≥ 30s)
                                    </div>
                                    <table className="listener-table">
                                      <thead>
                                        <tr>
                                          <th>Listener ID</th>
                                          <th>Username</th>
                                          <th>Plays (Listener)</th>
                                          <th>First Played</th>
                                          <th>Last Played</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {listenerSummaries.length > 0 ? (
                                          listenerSummaries.map((ls) => (
                                            <tr
                                              key={`${row.SongID}-${ls.listenerId}`}
                                            >
                                              <td>{ls.listenerId}</td>
                                              <td>{ls.username || "-"}</td>
                                              <td>{formatNumber(ls.plays)}</td>
                                              <td>
                                                {ls.firstPlayed
                                                  ? new Date(
                                                      ls.firstPlayed
                                                    ).toLocaleDateString()
                                                  : "-"}
                                              </td>
                                              <td>
                                                {ls.lastPlayed
                                                  ? new Date(
                                                      ls.lastPlayed
                                                    ).toLocaleDateString()
                                                  : "-"}
                                              </td>
                                            </tr>
                                          ))
                                        ) : (
                                          <tr>
                                            <td colSpan="5">
                                              No qualifying plays for this song
                                              in this period.
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>

                                  <div className="listener-section listener-section--favorites">
                                    <div className="listener-section-title">
                                      Listeners who favorited this song
                                    </div>
                                    <table className="listener-table">
                                      <thead>
                                        <tr>
                                          <th>Listener ID</th>
                                          <th>Username</th>
                                          <th>Has Streamed?</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {favoriteSummaries.length > 0 ? (
                                          favoriteSummaries.map((fav) => (
                                            <tr
                                              key={`${row.SongID}-fav-${fav.listenerId}`}
                                            >
                                              <td>{fav.listenerId}</td>
                                              <td>{fav.username || "-"}</td>
                                              <td>
                                                {fav.hasStreams ? "Yes" : "No"}
                                              </td>
                                            </tr>
                                          ))
                                        ) : (
                                          <tr>
                                            <td colSpan="3">
                                              No listeners have favorited this
                                              song yet.
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="10" className="arr-no-reports">
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
