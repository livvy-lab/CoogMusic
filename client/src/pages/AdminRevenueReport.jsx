import React, { useState, useEffect, useCallback, Fragment } from "react";
import PageLayout from "../components/PageLayout/PageLayout";
import { API_BASE_URL } from '../config/api';
import "./AdminRevenueReport.css";

const formatMoney = (amount) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
};

export default function AdminRevenueReport() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, subscriptionRevenue: 0, adRevenue: 0 });
  const [error, setError] = useState("");
  
  // Expandable Row State
  const [expandedRowKey, setExpandedRowKey] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6); 
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sourceFilter, setSourceFilter] = useState("all");

  const fetchRevenueData = useCallback(() => {
    setLoading(true);
    setExpandedRowKey(null); // Collapse all on refresh
    
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
  }, [startDate, endDate, sourceFilter]);

  useEffect(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);

  const toggleExpanded = (month) => {
    setExpandedRowKey(prev => prev === month ? null : month);
  };

  return (
    <PageLayout>
      <div className="admin-report-container">
        <h2>Revenue Performance Report</h2>
        
        {/* 1. Summary Cards */}
        <div className="rev-summary-grid">
          <div className="rev-card total">
            <div className="rev-label">Total Revenue</div>
            <div className="rev-amount">{formatMoney(summary.totalRevenue)}</div>
          </div>
          
          <div className={`rev-card sub ${sourceFilter === 'ad' ? 'dimmed' : ''}`}>
            <div className="rev-label">Subscriptions</div>
            <div className="rev-amount">{formatMoney(summary.subscriptionRevenue)}</div>
            <div className="rev-pct">
              {summary.totalRevenue > 0 
                ? ((summary.subscriptionRevenue / summary.totalRevenue) * 100).toFixed(1) 
                : 0}%
            </div>
          </div>

          <div className={`rev-card ad ${sourceFilter === 'subscription' ? 'dimmed' : ''}`}>
            <div className="rev-label">Artist Ads</div>
            <div className="rev-amount">{formatMoney(summary.adRevenue)}</div>
            <div className="rev-pct">
              {summary.totalRevenue > 0 
                ? ((summary.adRevenue / summary.totalRevenue) * 100).toFixed(1) 
                : 0}%
            </div>
          </div>
        </div>

        {/* 2. Filter Bar */}
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
            <label className="arr-filter-label">Source:</label>
            <select 
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="all">All Sources</option>
              <option value="subscription">Subscriptions</option>
              <option value="ad">Advertisements</option>
            </select>
          </div>
          <div>
            <button className="arr-filter-apply-btn" onClick={fetchRevenueData}>
              Refresh
            </button>
          </div>
        </div>

        {/* 3. Detailed Data Table */}
        <section className="arr-section table-container">
          <div className="table-scroll">
            {loading ? (
              <div className="arr-loading">Processing financial records...</div>
            ) : error ? (
              <div className="arr-error">{error}</div>
            ) : (
              <table className="arr-table revenue-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Transactions</th>
                    <th>Sub Revenue</th>
                    <th>Ad Revenue</th>
                    <th>Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length > 0 ? (
                    reportData.map((row) => {
                      const isExpanded = expandedRowKey === row.FormattedMonth;
                      
                      // Sort details by date descending (Newest first) inside the frontend to be safe
                      const details = typeof row.TransactionDetails === 'string' 
                        ? JSON.parse(row.TransactionDetails) 
                        : row.TransactionDetails || [];
                        
                      details.sort((a, b) => new Date(b.date) - new Date(a.date));

                      return (
                        <Fragment key={row.FormattedMonth}>
                          <tr 
                            className={isExpanded ? "arr-row arr-row-expanded" : "arr-row"}
                            onClick={() => toggleExpanded(row.FormattedMonth)}
                            style={{cursor: 'pointer'}}
                          >
                            <td className="col-month">{row.FormattedMonth}</td>
                            <td className="col-count">{row.TransactionCount}</td>
                            <td>{formatMoney(row.MonthlySubRevenue)}</td>
                            <td>{formatMoney(row.MonthlyAdRevenue)}</td>
                            <td className="col-highlight">{formatMoney(row.TotalRevenue)}</td>
                          </tr>

                          {isExpanded && (
                            <tr className="arr-listener-row">
                              <td colSpan="5">
                                <div className="listener-details">
                                  <div className="listener-section">
                                    <div className="listener-section-title">
                                      User Transactions: {row.FormattedMonth}
                                    </div>
                                    <table className="listener-table">
                                      <thead>
                                        <tr>
                                          <th>Date</th>
                                          <th>Type</th>
                                          <th>User</th>
                                          <th>Plan</th>
                                          <th>Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {details.map((tx, idx) => (
                                          <tr key={idx}>
                                            <td>{new Date(tx.date).toLocaleDateString()}</td>
                                            <td>
                                              <span className={`badge-type ${tx.type.toLowerCase()}`}>
                                                {tx.type}
                                              </span>
                                            </td>
                                            <td style={{fontWeight: '600'}}>{tx.entity}</td>
                                            <td>{tx.detail}</td>
                                            <td>{formatMoney(tx.amount)}</td>
                                          </tr>
                                        ))}
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
                      <td colSpan="5" className="arr-no-reports">
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