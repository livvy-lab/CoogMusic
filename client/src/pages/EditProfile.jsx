import React, { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout/PageLayout";
import "./EditProfile.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export default function EditProfile() {
  const [listenerId, setListenerId] = useState(null);
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
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      if (stored?.listenerId) {
        setListenerId(stored.listenerId);
      } else {
        setError("No listener ID found. Please log in again.");
      }
    } catch {
      setError("Error loading user info.");
    }
  }, []);

  useEffect(() => {
    if (!listenerId) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/listeners/${listenerId}/profile`);
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
      const res = await fetch(`${API_BASE}/listeners/${listenerId}`, {
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

        const up = await fetch(`${API_BASE}/listeners/${listenerId}/avatar`, {
          method: "POST",
          body: fd,
        });

        const upData = await up.json();
        if (up.ok && upData.url) {
          setPfpUrl(upData.url);
          const stored = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem(
            "user",
            JSON.stringify({ ...stored, pfpUrl: upData.url })
          );
        }
      }

      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Save failed:", err);
      alert("Error updating profile. Please try again.");
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
