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
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("Active");

  // Modals
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    accountId: null,
    username: "",
  });
  
  const [viewingUser, setViewingUser] = useState(null);

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

  const handleViewProfile = (user) => {
    setViewingUser({
      ...user,
      SpecificID: user.AccountType === 'Artist' ? user.ArtistID : user.ListenerID,
      DisplayName: user.AccountType === 'Artist' ? user.ArtistName : user.ListenerName
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesType = filterType === "All" || user.AccountType === filterType;
    let matchesStatus = true;
    if (filterStatus === "Active") matchesStatus = user.IsDeleted === 0;
    if (filterStatus === "Inactive") matchesStatus = user.IsDeleted === 1;
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
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Roles</option>
              <option value="Listener">Listeners</option>
              <option value="Artist">Artists</option>
            </select>
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
                  <th>Sub/Verify</th>
                  <th>Account Status</th>
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
                      <td>
                        {user.AccountType === 'Artist' ? (
                          user.IsVerified ? <span className="status-verified">Verified ✓</span> : <span className="status-standard">Standard</span>
                        ) : (
                          user.HasActiveSub ? <span className="status-premium">Premium</span> : <span className="status-standard">Standard</span>
                        )}
                      </td>
                      <td>
                        {isInactive ? <span className="acct-status inactive">Inactive</span> : <span className="acct-status active">Active</span>}
                      </td>
                      <td className="actions-cell">
                        <button 
                          className="view-btn"
                          onClick={() => handleViewProfile(user)}
                          title="View Profile Details"
                        >
                          View
                        </button>
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
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="7" className="no-results">No users found matching your criteria.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {confirmModal.isOpen && (
          <div className="custom-confirm-overlay" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>
            <div className="custom-confirm-box" onClick={e => e.stopPropagation()}>
              <h3 className="confirm-title">Deactivate User?</h3>
              <p className="confirm-text">Are you sure you want to remove <strong>@{confirmModal.username}</strong>?</p>
              <p className="confirm-subtext">This will mark the account as <strong>Inactive</strong>.</p>
              <div className="confirm-actions">
                <button className="confirm-btn cancel" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>Cancel</button>
                <button className="confirm-btn delete" onClick={executeRemoveUser}>Yes, Deactivate</button>
              </div>
            </div>
          </div>
        )}

        {viewingUser && (
          <UserProfileModal 
            user={viewingUser} 
            onClose={() => setViewingUser(null)} 
          />
        )}
      </div>
    </PageLayout>
  );
}

// === UPDATED USER PROFILE MODAL ===
function UserProfileModal({ user, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolvedPfp, setResolvedPfp] = useState(null);
  const [imgError, setImgError] = useState(false);

  const isArtist = user.AccountType === "Artist";

  useEffect(() => {
    let isMounted = true;
    
    setResolvedPfp(null);
    setImgError(false);
    setLoading(true);
    setDetails(null);

    const fetchDetails = async () => {
      try {
        let url = isArtist
          ? `${API_BASE_URL}/artists/${user.SpecificID}`
          : `${API_BASE_URL}/listeners/${user.SpecificID}/profile`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;

          // Handle data structure difference
          let profileData = isArtist ? data : data.listener;
          if (!profileData) return;

          setDetails(profileData);

          // --- FIX START: Robust Image Resolution ---
          // 1. Check for Media ID (using snake_case from DB schema)
          const mediaId = profileData.image_media_id || profileData.ImageMediaID; 
          
          if (mediaId) {
            // Fetch fresh signed URL from Media API
            const mediaRes = await fetch(`${API_BASE_URL}/media/${mediaId}`);
            if (mediaRes.ok) {
              const mediaData = await mediaRes.json();
              setResolvedPfp(mediaData.url);
            }
          } else {
            // 2. Fallback to PFP string
            let rawPfp = profileData.pfpUrl || profileData.PFP || null;
            
            // If it's a relative path (legacy upload), prepend API URL
            if (rawPfp && typeof rawPfp === 'string' && rawPfp.startsWith('/')) {
                rawPfp = `${API_BASE_URL}${rawPfp}`;
            }
            setResolvedPfp(rawPfp);
          }
          // --- FIX END ---
        }
      } catch (err) {
        console.error("Failed to load user details", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDetails();
    return () => { isMounted = false; };
  }, [user, isArtist]);

  const displayName = details?.ArtistName || details?.FirstName ? (isArtist ? details.ArtistName : `${details.FirstName} ${details.LastName}`) : user.DisplayName;
  const displayUsername = details?.Username || user.Username;
  const bio = details?.Bio || "No bio provided.";

  return (
    <div className="modal-overlay profile-z-index" onClick={onClose}>
      <div className="modal-box profile-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Profile Preview</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">Loading profile...</div>
          ) : (
            <>
              <div className="profile-preview-header">
                {/* Image Rendering Logic */}
                {resolvedPfp && !imgError ? (
                  <img 
                    src={resolvedPfp} 
                    alt={displayName} 
                    className="profile-preview-avatar"
                    onError={() => setImgError(true)} 
                  />
                ) : (
                  // Fallback Circle
                  <div className="profile-preview-fallback">
                    {displayName ? displayName.charAt(0).toUpperCase() : "?"}
                  </div>
                )}

                <div className="profile-preview-text">
                  <h3>{displayName}</h3>
                  <span className="profile-preview-tag">@{displayUsername}</span>
                  <span className={`type-badge ${isArtist ? 'artist' : 'listener'}`}>{user.AccountType}</span>
                </div>
              </div>
              <div className="profile-preview-bio">
                <label>Bio:</label>
                <p>{bio}</p>
              </div>
              <div className="profile-preview-stats">
                <div className="stat-chip">ID: {user.SpecificID}</div>
                {isArtist && <div className="stat-chip">{details?.IsVerified ? "Verified ✓" : "Standard Artist"}</div>}
                {!isArtist && <div className="stat-chip">{details?.Major ? `Major: ${details.Major}` : "Major: N/A"}</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}