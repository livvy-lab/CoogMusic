import React, { useState, useEffect, useCallback } from "react";
import PageLayout from "../components/PageLayout/PageLayout";
import { getUser } from "../lib/userStorage";
import "./ListenerAnalytics.css";
import { API_BASE_URL } from "../config/api";
import { RefreshCw } from "lucide-react";

// Helper to get date string (YYYY-MM-DD)
function todayOffset(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function ListenerAnalytics() {
  const listenerId = getUser()?.listenerId;
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  const fetchHistory = useCallback(async () => {
    if (!listenerId) return;
    setLoading(true);
    
    // Hardcode range to last 30 days
    const startDate = todayOffset(-30);
    const endDate = todayOffset(0);

    // Add timestamp to prevent caching so refresh works immediately
    const params = new URLSearchParams({
      startDate,
      endDate,
      sort: 'ListenedDate',
      order: 'desc',
      _: Date.now()
    }).toString();

    try {
      const res = await fetch(`${API_BASE_URL}/analytics/listener/${listenerId}/summary?${params}`);
      const data = await res.json();
      setHistory(data.listens || []);
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setLoading(false);
    }
  }, [listenerId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <PageLayout>
      <div className="listener-analytics-container">
        <div className="header-row">
          <h1>Listening History (Past 30 Days)</h1>
          
          <div className="controls">
            <button 
              className="refresh-btn" 
              onClick={fetchHistory} 
              title="Refresh History"
            >
              <RefreshCw size={18} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="table-card">
          {loading ? (
            <div className="laa-loading">Loading history...</div>
          ) : (
            <table className="laa-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Song</th>
                  <th>Artist</th>
                  <th>Album</th>
                  <th>Liked</th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? (
                  history.map((row, i) => (
                    <tr key={i} className="laa-row">
                      <td className="date-col">
                        {new Date(row.ListenedDate).toLocaleDateString('en-US', {
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </td>
                      <td className="title-col">{row.songTitle}</td>
                      <td>{row.artist}</td>
                      <td className="album-col">{row.album}</td>
                      <td>{row.liked ? <span className="liked-check">❤</span> : ""}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="no-results">
                      No listening history found in the last 30 days.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageLayout>
  );
}