import React, { useState, useEffect } from "react";
import PageLayout from "../components/PageLayout/PageLayout";
import { API_BASE_URL } from "../config/api";
import { showToast } from "../lib/toast";
import "./AdminUserManagement.css";

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filters
  const [filterType, setFilterType] = useState("All"); // All, Listener, Artist
  const [filterStatus, setFilterStatus] = useState("Active"); // Active, Inactive, All

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    accountId: null,
    username: "",
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users`);
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
      showToast("Error loading user list", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const requestRemoveUser = (accountId, username) => {
    setConfirmModal({ isOpen: true, accountId, username });
  };

  const executeRemoveUser = async () => {
    const { accountId, username } = confirmModal;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${accountId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) throw new Error("Failed to deactivate user");
      
      showToast(`User @${username} is now inactive.`, "success");
      
      // Update local state: Set IsDeleted to 1 instead of removing the row
      setUsers(prev => prev.map(u => 
        u.AccountID === accountId ? { ...u, IsDeleted: 1 } : u
      ));
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setConfirmModal({ isOpen: false, accountId: null, username: "" });
    }
  };

  const handleVerifyArtist = async (artistId, artistName) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/artists/${artistId}/verify`, {
        method: "PUT"
      });
      if (!res.ok) throw new Error("Failed to verify artist");
      
      showToast(`Artist "${artistName}" verified!`, "success");
      setUsers(prev => prev.map(u => 
        u.ArtistID === artistId ? { ...u, IsVerified: 1 } : u
      ));
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // === Filtering Logic ===
  const filteredUsers = users.filter(user => {
    // 1. Type Filter
    const matchesType = filterType === "All" || user.AccountType === filterType;
    
    // 2. Status Filter (Active vs Inactive)
    let matchesStatus = true;
    if (filterStatus === "Active") matchesStatus = user.IsDeleted === 0;
    if (filterStatus === "Inactive") matchesStatus = user.IsDeleted === 1;
    
    // 3. Search Filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (user.Username || "").toLowerCase().includes(searchLower) ||
      (user.ListenerName || "").toLowerCase().includes(searchLower) ||
      (user.ArtistName || "").toLowerCase().includes(searchLower) ||
      String(user.AccountID).includes(searchLower);

    return matchesType && matchesStatus && matchesSearch;
  });

  return (
    <PageLayout>
      <div className="admin-users-container">
        <div className="header-row">
          <h1>Manage Users</h1>
          <div className="controls">
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="search-input"
            />
            
            {/* Role Filter */}
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Roles</option>
              <option value="Listener">Listeners</option>
              <option value="Artist">Artists</option>
            </select>

            {/* Status Filter */}
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="Active">Active Users</option>
              <option value="Inactive">Inactive Users</option>
              <option value="All">All Status</option>
            </select>
          </div>
        </div>

        <div className="table-card">
          {loading ? (
            <div className="loading-state">Loading users...</div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Account</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Sub/Verify</th> {/* Updated Header */}
                  <th>Account Status</th> {/* New Header */}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? filteredUsers.map(user => {
                  const isInactive = user.IsDeleted === 1;
                  return (
                    <tr key={user.AccountID} className={isInactive ? "row-inactive" : ""}>
                      <td>#{user.AccountID}</td>
                      <td className="username-cell">@{user.Username}</td>
                      <td>
                        {user.AccountType === 'Artist' 
                          ? user.ArtistName 
                          : user.ListenerName || "N/A"}
                      </td>
                      <td>
                        <span className={`type-badge ${user.AccountType.toLowerCase()}`}>
                          {user.AccountType}
                        </span>
                      </td>
                      
                      {/* Subscription / Verification Status */}
                      <td>
                        {user.AccountType === 'Artist' ? (
                          user.IsVerified ? (
                            <span className="status-verified">Verified ✓</span>
                          ) : (
                            <span className="status-standard">Standard</span>
                          )
                        ) : (
                          // Listener Logic: Check HasActiveSub
                          user.HasActiveSub ? (
                            <span className="status-premium">Premium</span>
                          ) : (
                            <span className="status-standard">Standard</span>
                          )
                        )}
                      </td>

                      {/* Account Status (Active/Inactive) */}
                      <td>
                        {isInactive ? (
                          <span className="acct-status inactive">Inactive</span>
                        ) : (
                          <span className="acct-status active">Active</span>
                        )}
                      </td>

                      <td className="actions-cell">
                        {/* Only show actions if user is Active */}
                        {!isInactive && (
                          <>
                            {user.AccountType === 'Artist' && !user.IsVerified && (
                              <button 
                                className="verify-btn"
                                onClick={() => handleVerifyArtist(user.ArtistID, user.ArtistName)}
                                title="Verify Artist"
                              >
                                Verify
                              </button>
                            )}
                            <button 
                              className="remove-btn"
                              onClick={() => requestRemoveUser(user.AccountID, user.Username)}
                              title="Deactivate User"
                            >
                              Remove
                            </button>
                          </>
                        )}
                        {isInactive && <span className="text-muted">Archived</span>}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="7" className="no-results">No users found matching your criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Confirmation Popup */}
        {confirmModal.isOpen && (
          <div className="custom-confirm-overlay" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>
            <div className="custom-confirm-box" onClick={e => e.stopPropagation()}>
              <h3 className="confirm-title">Deactivate User?</h3>
              <p className="confirm-text">
                Are you sure you want to remove <strong>@{confirmModal.username}</strong>?
              </p>
              <p className="confirm-subtext">
                This will mark the account as <strong>Inactive</strong>. They will no longer be able to log in.
              </p>
              <div className="confirm-actions">
                <button 
                  className="confirm-btn cancel" 
                  onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                >
                  Cancel
                </button>
                <button 
                  className="confirm-btn delete" 
                  onClick={executeRemoveUser}
                >
                  Yes, Deactivate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}