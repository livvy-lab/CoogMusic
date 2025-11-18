import React, { useEffect, useState, useMemo } from "react";
import PageLayout from "../components/PageLayout/PageLayout";
import "./EditProfile.css";
import { API_BASE_URL } from "../config/api";
import { getUser, setUser } from "../lib/userStorage";
import { showToast } from '../lib/toast';


export default function EditProfile() {
  const user = useMemo(() => getUser(), []);
  const isArtist = (user?.accountType || "").toLowerCase() === "artist";

  if (isArtist) {
    return <EditArtistProfile user={user} />;
  }
  return <EditListenerProfile user={user} />;
}

function EditListenerProfile({ user }) {
  const [listenerId, setListenerId] = useState(user?.listenerId || null);
  const [form, setForm] = useState({
    first: "",
    last: "",
    major: "",
    minor: "",
    bio: "",
  });
  const [pfpUrl, setPfpUrl] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!listenerId) {
      setError("No listener ID found. Please log in again.");
      setLoading(false);
    }
  }, [listenerId]);

  useEffect(() => {
    if (!listenerId) return;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/listeners/${listenerId}/profile`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data?.listener) {
          setForm({
            first: data.listener.FirstName || "",
            last: data.listener.LastName || "",
            major: data.listener.Major || "",
            minor: data.listener.Minor || "",
            bio: data.listener.Bio || "",
          });
          setPfpUrl(data.listener.PFP || "");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [listenerId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleImageChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPfpUrl(URL.createObjectURL(f));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!listenerId) return;
    setSaving(true);

    try {
      const res = await fetch(`${API_BASE_URL}/listeners/${listenerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FirstName: form.first,
          LastName: form.last,
          Major: form.major,
          Minor: form.minor,
          Bio: form.bio,
        }),
      });

      if (!res.ok) throw new Error(`Update failed: ${res.statusText}`);

      if (file) {
        const fd = new FormData();
        fd.append("file", file);

        const up = await fetch(
          `${API_BASE_URL}/listeners/${listenerId}/avatar`,
          {
            method: "POST",
            body: fd,
          },
        );

        const upData = await up.json();
        if (up.ok && upData.url) {
          setPfpUrl(upData.url);
          const stored = getUser() || {};
          setUser({ ...stored, pfpUrl: upData.url });
        }
      }

      showToast("Profile updated successfully!", 'success');
    } catch (err) {
      console.error("Save failed:", err);
      showToast("Error updating profile. Please try again.", 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="edit-profile-container">Loading profile…</div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="edit-profile-container error">{error}</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="edit-profile-container">
        <h1 className="edit-profile-title">Edit Profile</h1>

        <form className="edit-profile-form" onSubmit={handleSubmit}>
          <div className="profile-pic-section">
            {pfpUrl && (
              <img src={pfpUrl} alt="Profile" className="profile-pic-preview" />
            )}
            <input
              type="file"
              id="pfpUpload"
              accept="image/*"
              onChange={handleImageChange}
              className="fileInputHidden"
            />
            <label htmlFor="pfpUpload" className="update-image-btn">
              {pfpUrl ? "Change Image" : "Upload Image"}
            </label>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label>First name:</label>
              <input
                type="text"
                name="first"
                value={form.first}
                onChange={handleChange}
                required
              />
            </div>
            <div className="input-group">
              <label>Last name:</label>
              <input
                type="text"
                name="last"
                value={form.last}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label>Major:</label>
              <input
                type="text"
                name="major"
                value={form.major}
                onChange={handleChange}
              />
            </div>
            <div className="input-group">
              <label>Minor (optional):</label>
              <input
                type="text"
                name="minor"
                value={form.minor}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="input-group bio-group">
            <label>Bio:</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself"
              rows={4}
            />
          </div>

          <div className="edit-profile-buttons">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => window.history.back()}
            >
              Cancel
            </button>
            <button type="submit" className="save-changes-btn" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}

function EditArtistProfile({ user }) {
  const [artistId, setArtistId] = useState(
    user?.artistId ?? (user?.ArtistID || null),
  );
  const [form, setForm] = useState({
    artistName: "",
    bio: "",
  });
  const [originalData, setOriginalData] = useState(null); 
  const [pfpUrl, setPfpUrl] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!artistId) {
      setError("No artist ID found. Please log in again.");
      setLoading(false);
    }
  }, [artistId]);

  useEffect(() => {
    if (!artistId) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/artists/${artistId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setForm({
          artistName: data.ArtistName || "",
          bio: data.Bio || "",
        });
        setPfpUrl(data.pfpUrl || "");
        setOriginalData(data);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [artistId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleImageChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPfpUrl(URL.createObjectURL(f));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!artistId || !originalData) return;
    setSaving(true);

    try {
      const dataToSave = {
        ...originalData,
        ArtistName: form.artistName,
        Bio: form.bio,
      };
      delete dataToSave.pfpUrl;

      const res = await fetch(`${API_BASE_URL}/artists/${artistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      });

      if (!res.ok) throw new Error(`Update failed: ${res.statusText}`);

      if (file) {
        const fd = new FormData();
        fd.append("file", file);

        const up = await fetch(`${API_BASE_URL}/artists/${artistId}/avatar`, {
          method: "POST",
          body: fd,
        });

        const upData = await up.json();
        if (up.ok && upData.url) {
          setPfpUrl(upData.url);
          const stored = getUser() || {};
          setUser({ ...stored, pfpUrl: upData.url });
        }
      }

      showToast("Profile updated successfully!", 'success');
    } catch (err) {
      console.error("Save failed:", err);
      showToast("Error updating profile. Please try again.", 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="edit-profile-container">Loading profile…</div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="edit-profile-container error">{error}</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="edit-profile-container">
        <h1 className="edit-profile-title">Edit Artist Profile</h1>

        <form className="edit-profile-form" onSubmit={handleSubmit}>
          <div className="profile-pic-section">
            {pfpUrl && (
              <img src={pfpUrl} alt="Profile" className="profile-pic-preview" />
            )}
            <input
              type="file"
              id="pfpUpload"
              accept="image/*"
              onChange={handleImageChange}
              className="fileInputHidden"
            />
            <label htmlFor="pfpUpload" className="update-image-btn">
              {pfpUrl ? "Change Image" : "Upload Image"}
            </label>
          </div>

          <div className="input-row">
            <div className="input-group" style={{ width: "100%" }}>
              <label>Artist Name:</label>
              <input
                type="text"
                name="artistName"
                value={form.artistName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="input-group bio-group">
            <label>Bio:</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Tell your fans about yourself"
              rows={4}
            />
          </div>

          <div className="edit-profile-buttons">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => window.history.back()}
            >
              Cancel
            </button>
            <button type="submit" className="save-changes-btn" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}