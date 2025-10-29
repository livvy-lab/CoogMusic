import React, { useState, useEffect } from "react";
import PageLayout from "../components/PageLayout/PageLayout";
import { getUser } from "../lib/userStorage";
import "./ListenerAnalytics.css";
import { API_BASE_URL } from "../config/api";

function todayOffset(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const sortOptions = [
  { label: "Date Listened", value: "ListenedDate" },
  { label: "Song Title", value: "songTitle" },
  { label: "Artist", value: "artist" },
  { label: "Album", value: "album" },
  { label: "Genre", value: "genre" },
  { label: "Liked", value: "liked" }
];

export default function ListenerAnalytics() {
  const listenerId = getUser()?.listenerId;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totals: [], listens: [], albums: [], artists: [], genres: [] });

  const [pendingStartDate, setPendingStartDate] = useState(todayOffset(-6));
  const [pendingEndDate, setPendingEndDate] = useState(todayOffset(0));
  const [pendingSortBy, setPendingSortBy] = useState("ListenedDate");
  const [pendingSortOrder, setPendingSortOrder] = useState("desc");
  const [pendingSongSearch, setPendingSongSearch] = useState("");
  const [pendingFilterAlbum, setPendingFilterAlbum] = useState("");
  const [pendingFilterArtist, setPendingFilterArtist] = useState("");
  const [pendingFilterGenre, setPendingFilterGenre] = useState("");

  const [appliedStartDate, setAppliedStartDate] = useState(todayOffset(-6));
  const [appliedEndDate, setAppliedEndDate] = useState(todayOffset(0));
  const [appliedSortBy, setAppliedSortBy] = useState("ListenedDate");
  const [appliedSortOrder, setAppliedSortOrder] = useState("desc");
  const [appliedSongSearch, setAppliedSongSearch] = useState("");
  const [appliedFilterAlbum, setAppliedFilterAlbum] = useState("");
  const [appliedFilterArtist, setAppliedFilterArtist] = useState("");
  const [appliedFilterGenre, setAppliedFilterGenre] = useState("");

  const applyFilters = () => {
    setAppliedStartDate(pendingStartDate);
    setAppliedEndDate(pendingEndDate);
    setAppliedSortBy(pendingSortBy);
    setAppliedSortOrder(pendingSortOrder);
    setAppliedSongSearch(pendingSongSearch);
    setAppliedFilterAlbum(pendingFilterAlbum);
    setAppliedFilterArtist(pendingFilterArtist);
    setAppliedFilterGenre(pendingFilterGenre);
  };

  useEffect(() => {
    if (!listenerId) return;
    setLoading(true);
    const params = new URLSearchParams({
      startDate: appliedStartDate,
      endDate: appliedEndDate,
      sort: appliedSortBy,
      order: appliedSortOrder,
      ...(appliedSongSearch ? { song: appliedSongSearch } : {}),
      ...(appliedFilterAlbum ? { album: appliedFilterAlbum } : {}),
      ...(appliedFilterArtist ? { artist: appliedFilterArtist } : {}),
      ...(appliedFilterGenre ? { genre: appliedFilterGenre } : {}),
    }).toString();
    fetch(`${API_BASE_URL}/analytics/listener/${listenerId}/summary?${params}`)
      .then((r) => r.json())
      .then((summary) => {
        setStats(summary);
        setLoading(false);
      });
  }, [
    listenerId,
    appliedStartDate, appliedEndDate,
    appliedSortBy, appliedSortOrder,
    appliedSongSearch, appliedFilterAlbum, appliedFilterArtist, appliedFilterGenre
  ]);

  const filteredListens = stats.listens ?? [];

  if (loading) return (
    <PageLayout>
      <div className="listener-analytics-container">
        <div className="laa-loading">Loading...</div>
      </div>
    </PageLayout>
  );

  return (
    <PageLayout>
      <div className="listener-analytics-container">
        <h2>Listener Performance Report</h2>
        <div className="laa-filter-bar">
          <div>
            <label className="laa-filter-label">Start Date:</label>
            <input className="laa-date-input" type="date" value={pendingStartDate} onChange={e => setPendingStartDate(e.target.value)} />
          </div>
          <div>
            <label className="laa-filter-label">End Date:</label>
            <input className="laa-date-input" type="date" value={pendingEndDate} onChange={e => setPendingEndDate(e.target.value)} />
          </div>
          <div>
            <label className="laa-filter-label">Album:</label>
            <select value={pendingFilterAlbum} onChange={e => setPendingFilterAlbum(e.target.value)}>
              <option value="">All</option>
              {stats.albums && stats.albums.map(alb =>
                <option key={alb.AlbumID} value={alb.AlbumID}>{alb.Title}</option>
              )}
            </select>
          </div>
          <div>
            <label className="laa-filter-label">Artist:</label>
            <select value={pendingFilterArtist} onChange={e => setPendingFilterArtist(e.target.value)}>
              <option value="">All</option>
              {stats.artists && stats.artists.map(ar =>
                <option key={ar.ArtistID} value={ar.ArtistID}>{ar.ArtistName}</option>
              )}
            </select>
          </div>
          <div>
            <label className="laa-filter-label">Genre:</label>
            <select value={pendingFilterGenre} onChange={e => setPendingFilterGenre(e.target.value)}>
              <option value="">All</option>
              {stats.genres && stats.genres.map(g =>
                <option key={g.GenreID} value={g.GenreID}>{g.Name}</option>
              )}
            </select>
          </div>
          <div>
            <label className="laa-filter-label">Song Title:</label>
            <input type="text" className="laa-date-input" placeholder="Search title..." value={pendingSongSearch} onChange={e => setPendingSongSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') applyFilters(); }} />
          </div>
          <div>
            <label className="laa-filter-label">Sort By:</label>
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
              className="laa-filter-apply-btn"
              onClick={applyFilters}
            >Apply Filters</button>
          </div>
        </div>
        <div className="laa-stats-row">
          {stats?.totals?.map((item) => (
            <div className="laa-stat-card" key={item.label}>
              <div className="laa-stat-label">{item.label}</div>
              <div className="laa-stat-value">{item.value}</div>
            </div>
          ))}
        </div>
        <section className="laa-section">
          <table className="laa-table">
            <thead>
              <tr>
                <th>Date Listened</th>
                <th>Song Title</th>
                <th>Artist</th>
                <th>Album</th>
                <th>Genre</th>
                <th>Liked</th>
              </tr>
            </thead>
            <tbody>
              {filteredListens.map((row, i) =>
                <tr key={i}>
                  <td>{String(row.ListenedDate).slice(0, 10)}</td>
                  <td>{row.songTitle}</td>
                  <td>{row.artist}</td>
                  <td>{row.album}</td>
                  <td>{row.genre}</td>
                  <td>{row.liked ? "✓" : ""}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </PageLayout>
  );
}
