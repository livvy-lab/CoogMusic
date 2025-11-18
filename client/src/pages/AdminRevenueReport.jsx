import React, { useState, useEffect } from "react";
import PageLayout from "../components/PageLayout/PageLayout";
import { API_BASE_URL } from '../config/api';
import "./AdminRevenueReport.css";

// Helper to format currency
const formatMoney = (amount) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const sourceOptions = [
  { label: "All Sources", value: "all" },
  { label: "Listener Subscriptions", value: "subscription" },
  { label: "Artist Advertisements", value: "ad" },
];

export default function AdminRevenueReport() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, subscriptionRevenue: 0, adRevenue: 0 });
  const [error, setError] = useState("");

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6); // Default to last 6 months
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sourceFilter, setSourceFilter] = useState("all"); // NEW FILTER

  const fetchRevenueData = () => {
    setLoading(true);
    // Pass source filter to API
    const params = new URLSearchParams({ startDate, endDate, source: sourceFilter });

    fetch(`${API_BASE_URL}/api/analytics/admin/revenue?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setReportData(data.reportData || []);
        setSummary(data.summary || { totalRevenue: 0, subscriptionRevenue: 0, adRevenue: 0 });
        setError("");
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load revenue data.");
      })
      .finally(() => setLoading(false));
  };

  // Initial load and when filters change
  useEffect(() => {
    fetchRevenueData();
  }, [startDate, endDate, sourceFilter]);

  return (
    <PageLayout>
      <div className="admin-report-container">
        <h2>Monthly Revenue Breakdown</h2>
        
        {/* 1. Filter Bar */}
        <div className="arr-filter-bar">
          <div>
            <label className="arr-filter-label" htmlFor="startDate">From:</label>
            <input 
              id="startDate" 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
          </div>
          <div>
            <label className="arr-filter-label" htmlFor="endDate">To:</label>
            <input 
              id="endDate" 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>
          {/* NEW FILTER: Revenue Source */}
          <div>
            <label className="arr-filter-label" htmlFor="sourceFilter">Source:</label>
            <select 
              id="sourceFilter"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              {sourceOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <button className="arr-filter-apply-btn" onClick={fetchRevenueData}>Refresh Report</button>
          </div>
        </div>

        {/* 2. Summary Cards */}
        <div className="rev-summary-grid">
          <div className="rev-card total">
            <div className="rev-label">Total Revenue</div>
            <div className="rev-amount">{formatMoney(summary.totalRevenue)}</div>
          </div>
          {/* Conditionally show cards based on filter, or keep them to show context */}
          <div className={`rev-card sub ${sourceFilter === 'ad' ? 'dimmed' : ''}`}>
            <div className="rev-label">Listener Subscriptions</div>
            <div className="rev-amount">{formatMoney(summary.subscriptionRevenue)}</div>
            <div className="rev-pct">
              {summary.totalRevenue > 0 
                ? ((summary.subscriptionRevenue / summary.totalRevenue) * 100).toFixed(1) 
                : 0}% of total
            </div>
          </div>
          <div className={`rev-card ad ${sourceFilter === 'subscription' ? 'dimmed' : ''}`}>
            <div className="rev-label">Artist Ads</div>
            <div className="rev-amount">{formatMoney(summary.adRevenue)}</div>
            <div className="rev-pct">
              {summary.totalRevenue > 0 
                ? ((summary.adRevenue / summary.totalRevenue) * 100).toFixed(1) 
                : 0}% of total
            </div>
          </div>
        </div>

        {/* 3. Detailed Data Table */}
        <section className="arr-section table-container">
          <div className="table-scroll">
            {loading ? (
              <div className="arr-loading">Analyzing financial data...</div>
            ) : error ? (
              <div className="arr-error">{error}</div>
            ) : (
              <table className="arr-table revenue-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Revenue Source</th>
                    <th>Transactions</th>
                    <th>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length > 0 ? (
                    reportData.map((row) => (
                      <tr key={`${row.FormattedMonth}-${row.RevenueSource}`}>
                        <td className="col-month">{row.FormattedMonth}</td>
                        {/* SIMPLIFIED: Just text, no tags */}
                        <td className="col-source">{row.RevenueSource}</td>
                        <td className="col-count">{row.TransactionCount}</td>
                        <td className="col-money">{formatMoney(row.TotalRevenue)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="arr-no-reports">
                        No revenue records found for this period.
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