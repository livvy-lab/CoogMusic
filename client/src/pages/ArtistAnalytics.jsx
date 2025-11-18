import React, { useState, useEffect } from "react";
import PageLayout from "../components/PageLayout/PageLayout";
import { getUser } from "../lib/userStorage";
import { API_BASE_URL } from "../config/api";
import "./ArtistAnalytics.css";

function todayOffset(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

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
  const fetchStats = () => {
    if (!artistId) return;
    setLoading(true);
    
    const params = new URLSearchParams({
      startDate,
      endDate,
      sort: sortBy,
      order: sortOrder,
      ...(filterAlbum ? { album: filterAlbum } : {}),
      ...(searchTitle ? { song: searchTitle } : {}),
    }).toString();

    fetch(`${API_BASE_URL}/analytics/artist/${artistId}/summary?${params}`)
      .then(r => r.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      });
  };

  // Fetch when filters/sort change
  useEffect(() => {
    if (!isInitLoading) fetchStats();
  }, [artistId, isInitLoading, startDate, endDate, sortBy, sortOrder, filterAlbum]);

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
                  <th>Total Likes</th>
                  <th>Added to Playlists</th>
                </tr>
              </thead>
              <tbody>
                {stats.songs?.length > 0 ? (
                  stats.songs.map((row, i) => (
                    <tr key={i}>
                      <td className="col-title">{row.songTitle}</td>
                      <td className="col-album">{row.album}</td>
                      <td>
                        {new Date(row.releaseDate).toLocaleDateString("en-US", {
                          year: "numeric", month: "short", day: "numeric"
                        })}
                      </td>
                      <td className="col-highlight">{row.totalStreams.toLocaleString()}</td>
                      <td>{row.totalLikes.toLocaleString()}</td>
                      <td>{row.playlistAdds.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="aa-no-results">
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