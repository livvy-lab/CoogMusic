import React, { useState, useEffect } from "react";
import PageLayout from "../components/PageLayout/PageLayout";
import { getUser } from "../lib/userStorage";
import "./ArtistAnalytics.css";
import { API_BASE_URL } from "../config/api";

function todayOffset(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const sortOptions = [
  { label: "Song Title", value: "songTitle" },
  { label: "Album", value: "album" },
  { label: "Release Date", value: "releaseDate" },
  { label: "Total Streams", value: "totalStreams" },
  { label: "Total Likes", value: "totalLikes" },
  { label: "Playlist Adds", value: "playlistAdds" },
];

export default function ArtistAnalytics() {
  const artistId = getUser()?.artistId;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totals: [], albums: [], songs: [] });
  const [isInitLoading, setIsInitLoading] = useState(true);

  const [pendingStartDate, setPendingStartDate] = useState(todayOffset(-6));
  const [pendingEndDate, setPendingEndDate] = useState(todayOffset(0));
  const [pendingSortBy, setPendingSortBy] = useState("totalStreams");
  const [pendingSortOrder, setPendingSortOrder] = useState("desc");
  const [pendingFilterAlbum, setPendingFilterAlbum] = useState("");
  const [pendingSearchTitle, setPendingSearchTitle] = useState("");

  const [appliedStartDate, setAppliedStartDate] = useState(todayOffset(-6));
  const [appliedEndDate, setAppliedEndDate] = useState(todayOffset(0));
  const [appliedSortBy, setAppliedSortBy] = useState("totalStreams");
  const [appliedSortOrder, setAppliedSortOrder] = useState("desc");
  const [appliedFilterAlbum, setAppliedFilterAlbum] = useState("");
  const [appliedSearchTitle, setAppliedSearchTitle] = useState("");

  const applyFilters = () => {
    setAppliedStartDate(pendingStartDate);
    setAppliedEndDate(pendingEndDate);
    setAppliedSortBy(pendingSortBy);
    setAppliedSortOrder(pendingSortOrder);
    setAppliedFilterAlbum(pendingFilterAlbum);
    setAppliedSearchTitle(pendingSearchTitle);
  };

  // runs once to get the default start date
  useEffect(() => {
    if (!artistId) return;
    
    setIsInitLoading(true); // start loading
    fetch(`${API_BASE_URL}/analytics/artist/${artistId}/init`)
      .then(r => r.json())
      .then(data => {
        if (data.firstReleaseDate) {
          const firstDate = data.firstReleaseDate.slice(0, 10);
          setPendingStartDate(firstDate);
          setAppliedStartDate(firstDate);
        }
      })
      .catch(err => {
        console.error("Failed to fetch first release date, using default.", err);
      })
      .finally(() => {
        setIsInitLoading(false);
      });
  }, [artistId]);

  useEffect(() => {
    if (!artistId || isInitLoading) return;

    setLoading(true);
    const params = new URLSearchParams({
      startDate: appliedStartDate,
      endDate: appliedEndDate,
      sort: appliedSortBy,
      order: appliedSortOrder,
      ...(appliedFilterAlbum ? { album: appliedFilterAlbum } : {}),
      ...(appliedSearchTitle ? { song: appliedSearchTitle } : {}),
    }).toString();
    fetch(`${API_BASE_URL}/analytics/artist/${artistId}/summary?${params}`)
      .then(r => r.json())
      .then(summary => {
        setStats(summary);
        setLoading(false);
      });
  }, [
    artistId,
    isInitLoading,
    appliedStartDate,
    appliedEndDate,
    appliedSortBy,
    appliedSortOrder,
    appliedFilterAlbum,
    appliedSearchTitle,
  ]);

  const filteredSongs = stats.songs ?? [];

  if (loading || isInitLoading) return (
    <PageLayout>
      <div className="artist-analytics-container">
        <div className="aa-loading">Loading...</div>
      </div>
    </PageLayout>
  );

  return (
    <PageLayout>
      <div className="artist-analytics-container">
        <h2>Artist Performance Report</h2>
        <div className="aa-filter-bar">
          <div>
            <label className="aa-filter-label">Start Date:</label>
            <input
              className="aa-date-input"
              type="date"
              value={pendingStartDate}
              onChange={e => setPendingStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="aa-filter-label">End Date:</label>
            <input
              className="aa-date-input"
              type="date"
              value={pendingEndDate}
              onChange={e => setPendingEndDate(e.target.value)}
            />
          </div>
          <div>
            <label className="aa-filter-label">Album:</label>
            <select value={pendingFilterAlbum} onChange={e => setPendingFilterAlbum(e.target.value)}>
              <option value="">All</option>
              {stats.albums?.map(alb =>
                <option key={alb.AlbumID} value={alb.AlbumID}>{alb.Title}</option>
              )}
            </select>
          </div>
          <div>
            <label className="aa-filter-label">Song Title:</label>
            <input
              type="text"
              className="aa-date-input"
              placeholder="Search title..."
              value={pendingSearchTitle}
              onChange={e => setPendingSearchTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') applyFilters(); }}
            />
          </div>
          <div>
            <label className="aa-filter-label">Sort By:</label>
            <select value={pendingSortBy} onChange={e => setPendingSortBy(e.target.value)}>
              {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <select value={pendingSortOrder} onChange={e => setPendingSortOrder(e.target.value)}>
              <option value="desc">↓</option>
              <option value="asc">↑</option>
            </select>
          </div>
          <div>
            <button
              type="button"
              className="aa-filter-apply-btn"
              onClick={applyFilters}
            >
            Apply Filters
            </button>
          </div>
        </div>
        <div className="aa-stats-row">
          {stats?.totals?.map(item =>
            <div className="aa-stat-card" key={item.label}>
              <div className="aa-stat-label">{item.label}</div>
              <div className="aa-stat-value">{item.value}</div>
            </div>
          )}
        </div>
        <section className="aa-section">
          <table className="aa-table">
            <thead>
              <tr>
                <th>Song Title</th>
                <th>Album</th>
                <th>Release Date</th>
                <th>Total Streams</th>
                <th>Total Likes</th>
                <th>Playlist Adds</th>
              </tr>
            </thead>
            <tbody>
              {filteredSongs.map((row, i) =>
                <tr key={i}>
                  <td>{row.songTitle}</td>
                  <td>{row.album}</td>
                  <td>{String(row.releaseDate).slice(0, 10)}</td>
                  <td>{row.totalStreams}</td>
                  <td>{row.totalLikes}</td>
                  <td>{row.playlistAdds}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </PageLayout>
  );
}
