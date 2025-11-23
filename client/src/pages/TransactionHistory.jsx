import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout/PageLayout';
import { getUser } from '../lib/userStorage';
import { API_BASE_URL } from '../config/api';
import './TransactionHistory.css';

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const user = getUser();

  const isArtist = user?.accountType?.toLowerCase() === 'artist';
  const userId = isArtist ? user?.artistId : user?.listenerId;

  useEffect(() => {
    if (!userId) {
      setError('User ID not found. Please log in again.');
      setLoading(false);
      return;
    }

    fetchTransactions();
  }, [userId, isArtist]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const endpoint = isArtist 
        ? `${API_BASE_URL}/transaction-history/artist/${userId}`
        : `${API_BASE_URL}/transaction-history/listener/${userId}`;

      console.log('Fetching transactions from:', endpoint);
      const res = await fetch(endpoint);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Response error:', res.status, errorText);
        throw new Error(`Failed to fetch transactions: ${res.status}`);
      }

      const data = await res.json();
      console.log('Transactions fetched:', data);
      setTransactions(data);
    } catch (err) {
      console.error('Error fetching transaction history:', err);
      setError(`Failed to load transaction history. Please try again later. (${err.message})`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `$${Number(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="transaction-history-container">
          <div className="loading-spinner">Loading transaction history...</div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="transaction-history-container">
          <div className="error-message">{error}</div>
          <button className="back-btn" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="transaction-history-container">
        <div className="transaction-header">
          <h1 className="transaction-title">Transaction History</h1>
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="no-transactions">
            <p>No transactions found.</p>
            {!isArtist && (
              <button 
                className="subscribe-btn"
                onClick={() => navigate('/subscription')}
              >
                View Subscription Plans
              </button>
            )}
          </div>
        ) : (
          <div className="transactions-list">
            <div className="transactions-table">
              <div className="table-header">
                <div className="table-cell">Date</div>
                <div className="table-cell">Type</div>
                <div className="table-cell">Description</div>
                <div className="table-cell">Amount</div>
                <div className="table-cell">Status</div>
              </div>

              {transactions.map((transaction, index) => (
                <div key={index} className="table-row">
                  <div className="table-cell">
                    {formatDate(transaction.DateStarted || transaction.PurchaseDate)}
                  </div>
                  
                  <div className="table-cell">
                    <span className={`transaction-type ${isArtist ? 'ad' : 'subscription'}`}>
                      {transaction.TransactionType}
                    </span>
                  </div>
                  
                  <div className="table-cell description">
                    {isArtist ? (
                      <>
                        <strong>{transaction.AdName}</strong>
                        <span className="ad-type"> ({transaction.AdType})</span>
                      </>
                    ) : (
                      <>
                        <strong>{transaction.PlanName}</strong>
                        {transaction.DurationMonths && (
                          <span className="duration"> - {transaction.DurationMonths} month{transaction.DurationMonths > 1 ? 's' : ''}</span>
                        )}
                      </>
                    )}
                  </div>
                  
                  <div className="table-cell amount">
                    {formatCurrency(transaction.Amount)}
                  </div>
                  
                  <div className="table-cell">
                    {isArtist ? (
                      <span className="status-badge completed">Completed</span>
                    ) : (
                      <span className={`status-badge ${transaction.IsActive ? 'active' : 'expired'}`}>
                        {transaction.IsActive ? 'Active' : 'Expired'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="transaction-summary">
              <div className="summary-card">
                <h3>Summary</h3>
                <div className="summary-item">
                  <span>Total Transactions:</span>
                  <strong>{transactions.length}</strong>
                </div>
                <div className="summary-item total">
                  <span>Total Spent:</span>
                  <strong>
                    {formatCurrency(
                      transactions.reduce((sum, t) => sum + Number(t.Amount || 0), 0)
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
