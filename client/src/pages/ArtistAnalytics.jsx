import React, { useState, useEffect, useCallback, Fragment } from "react";
import PageLayout from "../components/PageLayout/PageLayout";
import { getUser } from "../lib/userStorage";
import { API_BASE_URL } from "../config/api";
import "./ArtistAnalytics.css";

function todayOffset(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

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
  const details = parseStreamDetails(song.streamDetails);
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
  const raw = song.likedListeners;
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

const sortOptions = [
  { label: "Total Streams", value: "totalStreams" },
  { label: "Song Title", value: "songTitle" },
  { label: "Release Date", value: "releaseDate" },
  { label: "Total Likes", value: "totalLikes" },
  { label: "Playlist Adds", value: "playlistAdds" },
];

export default function ArtistAnalytics() {
  const artistId = getUser()?.artistId;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totals: [], albums: [], songs: [] });
  const [isInitLoading, setIsInitLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState(todayOffset(-6));
  const [endDate, setEndDate] = useState(todayOffset(0));
  const [filterAlbum, setFilterAlbum] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  
  // Sort State
  const [sortBy, setSortBy] = useState("totalStreams");
  const [sortOrder, setSortOrder] = useState("desc");
  
  // Expandable row state
  const [expandedSongId, setExpandedSongId] = useState(null);

  // Initial Setup
  useEffect(() => {
    if (!artistId) return;
    setIsInitLoading(true);
    fetch(`${API_BASE_URL}/analytics/artist/${artistId}/init`)
      .then(r => r.json())
      .then(data => {
        if (data.firstReleaseDate) {
          const firstDate = data.firstReleaseDate.slice(0, 10);
          setStartDate(firstDate);
        }
      })
      .catch(console.error)
      .finally(() => setIsInitLoading(false));
  }, [artistId]);

  // Main Fetch
  const fetchStats = useCallback(() => {
    if (!artistId) return;
    console.log('fetchStats called with:', { artistId, startDate, endDate, sortBy, sortOrder, filterAlbum, searchTitle });
    setLoading(true);
    
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    params.append('sort', sortBy);
    params.append('order', sortOrder);
    if (filterAlbum) params.append('album', filterAlbum);
    if (searchTitle) params.append('song', searchTitle);

    console.log('Fetching URL:', `${API_BASE_URL}/analytics/artist/${artistId}/summary?${params.toString()}`);

    fetch(`${API_BASE_URL}/analytics/artist/${artistId}/summary?${params.toString()}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
        return r.json();
      })
      .then(data => {
        console.log('Fetched artist analytics:', data);
        setStats(data);
      })
      .catch(err => {
        console.error('Error fetching artist analytics:', err);
        setStats({ totals: [], albums: [], songs: [] });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [artistId, startDate, endDate, sortBy, sortOrder, filterAlbum, searchTitle]);

  // Fetch when filters/sort change (but not on manual date changes - use Refresh button)
  useEffect(() => {
    if (!isInitLoading) fetchStats();
  }, [fetchStats, isInitLoading]);

  const toggleExpanded = (songId) => {
    setExpandedSongId((prev) => (prev === songId ? null : songId));
  };

  if (loading && isInitLoading) return (
    <PageLayout>
      <div className="artist-analytics-container">
        <div className="aa-loading">Loading Report...</div>
      </div>
    </PageLayout>
  );

  return (
    <PageLayout>
      <div className="artist-analytics-container">
        <h2>Artist Performance Report</h2>

        {/* 1. Summary Cards */}
        <div className="aa-summary-grid">
          {stats?.totals?.map(item => (
            <div className="aa-stat-card" key={item.label}>
              <div className="aa-stat-label">{item.label}</div>
              <div className="aa-stat-value">{item.value.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* 2. Filter Bar */}
        <div className="aa-filter-bar">
          <div className="date-group">
            <label className="aa-filter-label">From:</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
            />
          </div>
          <div className="date-group">
            <label className="aa-filter-label">To:</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
            />
          </div>
          
          <div className="search-group">
            <label className="aa-filter-label">Search Song:</label>
            <input 
              type="text" 
              placeholder="Title..." 
              value={searchTitle} 
              onChange={e => setSearchTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') fetchStats(); }}
            />
          </div>

          <div>
            <label className="aa-filter-label">Album:</label>
            <select value={filterAlbum} onChange={e => setFilterAlbum(e.target.value)}>
              <option value="">All Albums</option>
              {stats.albums?.map(alb => (
                <option key={alb.AlbumID} value={alb.AlbumID}>{alb.Title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="aa-filter-label">Sort By:</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div className="btn-container">
            <button className="aa-apply-btn" onClick={fetchStats}>Refresh</button>
          </div>
        </div>

        {/* 3. Detailed Data Table */}
        <section className="aa-table-card">
          <div className="table-scroll">
            <table className="aa-table">
              <thead>
                <tr>
                  <th>Song Title</th>
                  <th>Album</th>
                  <th>Release Date</th>
                  <th>Streams (Period)</th>
                  <th>Unique Listeners</th>
                  <th>Total Likes</th>
                  <th>Added to Playlists</th>
                  <th>First Played</th>
                  <th>Last Played</th>
                </tr>
              </thead>
              <tbody>
                {stats.songs?.length > 0 ? (
                  stats.songs.map((row, i) => {
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
                          className={isExpanded ? "aa-row aa-row-expanded" : "aa-row"}
                          onClick={() => toggleExpanded(row.SongID)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="col-title">{row.songTitle}</td>
                          <td className="col-album">{row.album}</td>
                          <td>
                            {new Date(row.releaseDate).toLocaleDateString("en-US", {
                              year: "numeric", month: "short", day: "numeric"
                            })}
                          </td>
                          <td className="col-highlight">{formatNumber(row.totalStreams)}</td>
                          <td>{formatNumber(row.uniqueListeners)}</td>
                          <td>{formatNumber(row.totalLikes)}</td>
                          <td>{formatNumber(row.playlistAdds)}</td>
                          <td>
                            {row.firstPlayedAt
                              ? new Date(row.firstPlayedAt).toLocaleDateString("en-US", {
                                  year: "numeric", month: "short", day: "numeric"
                                })
                              : "-"}
                          </td>
                          <td>
                            {row.lastPlayedAt
                              ? new Date(row.lastPlayedAt).toLocaleDateString("en-US", {
                                  year: "numeric", month: "short", day: "numeric"
                                })
                              : "-"}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="aa-listener-row">
                            <td colSpan="9">
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
                                          <tr key={`${row.SongID}-${ls.listenerId}`}>
                                            <td>{ls.listenerId}</td>
                                            <td>{ls.username || "-"}</td>
                                            <td>{formatNumber(ls.plays)}</td>
                                            <td>
                                              {ls.firstPlayed
                                                ? new Date(ls.firstPlayed).toLocaleDateString("en-US", {
                                                    year: "numeric", month: "short", day: "numeric"
                                                  })
                                                : "-"}
                                            </td>
                                            <td>
                                              {ls.lastPlayed
                                                ? new Date(ls.lastPlayed).toLocaleDateString("en-US", {
                                                    year: "numeric", month: "short", day: "numeric"
                                                  })
                                                : "-"}
                                            </td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td colSpan="5">
                                            No qualifying plays for this song in this period.
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
                                          <tr key={`${row.SongID}-fav-${fav.listenerId}`}>
                                            <td>{fav.listenerId}</td>
                                            <td>{fav.username || "-"}</td>
                                            <td>{fav.hasStreams ? "Yes" : "No"}</td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td colSpan="3">
                                            No listeners have favorited this song yet.
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
                    <td colSpan="9" className="aa-no-results">
                      No performance data found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}