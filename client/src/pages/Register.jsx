import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Auth.css";
import Loading from "../components/LoadingLayout/Loading";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  // ?role=artist or ?role=listener
  const params = new URLSearchParams(location.search);
  const roleParam = (params.get("role") || "").toLowerCase();
  const selectedAccountType = roleParam === "artist" ? "Artist" : "Listener";

  const [first, setFirstName] = useState("");
  const [last, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [major, setMajor] = useState("");
  const [minor, setMinor] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const endpoint =
        selectedAccountType === "Artist"
          ? `${API_BASE}/auth/register/artist`
          : `${API_BASE}/auth/register`;

      const body =
        selectedAccountType === "Artist"
          ? { first, bio, username, password }
          : { first, last, major, minor, username, password };

      const regRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const raw = await regRes.text();
      let regData = {};
      try { regData = JSON.parse(raw); } catch {}

      if (!regRes.ok || !regData?.success) {
        const msg = regData?.message || regData?.error || `HTTP ${regRes.status}`;
        console.warn("[register] server error:", { status: regRes.status, raw, parsed: regData });
        alert(`Sign up failed: ${msg}`);
        setSubmitting(false);
        return;
      }

      // derive account type & ids
      const accountTypeLower = String(regData.accountType || selectedAccountType).toLowerCase();
      const artistId = regData.ArtistID ?? regData.artistId ?? null;
      const listenerId = regData.listenerId ?? null;

      // stash a minimal user snapshot for subsequent pages
      const snapshot = {
        username,
        accountType: accountTypeLower,   // "artist" | "listener"
        artistId: accountTypeLower === "artist" ? Number(artistId) || null : null,
        listenerId: accountTypeLower === "listener" ? Number(listenerId) || null : null,
      };
      localStorage.setItem("user", JSON.stringify(snapshot));

      // optional avatar upload
      const entityId = accountTypeLower === "artist" ? artistId : listenerId;
      if (file && entityId) {
        const fd = new FormData();
        fd.append("file", file);
        const upRes = await fetch(
          `${API_BASE}/${accountTypeLower === "artist" ? "artists" : "listeners"}/${entityId}/avatar`,
          { method: "POST", body: fd }
        );
        const upRaw = await upRes.text();
        let upData = {};
        try { upData = JSON.parse(upRaw); } catch {}
        if (upRes.ok && upData?.url) {
          const curr = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem("user", JSON.stringify({ ...curr, pfpUrl: upData.url }));
        } else {
          console.warn("[register] avatar upload failed:", { status: upRes.status, upRaw });
        }
      }

      // ✅ Route based on account type
      if (accountTypeLower === "artist") {
        navigate("/upload", { replace: true });
      } else {
        navigate("/login", { replace: true }); // or "/home" if you prefer
      }
    } catch (err) {
      console.error("Error during sign-up:", err);
      alert("Sign up failed. Please ensure the API is running and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = () => navigate("/login");

  return (
    <Loading>
      <div className="authCard authCardLarge">
        <div className="authChip">{selectedAccountType.toUpperCase()} REGISTRATION</div>

        {previewUrl && <img className="pfpThumb" src={previewUrl} alt="profile preview" />}

        <form className="regGrid" onSubmit={handleSubmit}>
          <label className="regField">
            <span>{selectedAccountType === "Artist" ? "Artist name:" : "First name:"}</span>
            <input className="authInput" type="text" value={first} onChange={(e) => setFirstName(e.target.value)} required />
          </label>

          {selectedAccountType === "Listener" && (
            <label className="regField">
              <span>Last name:</span>
              <input className="authInput" type="text" value={last} onChange={(e) => setLastName(e.target.value)} required />
            </label>
          )}

          {selectedAccountType === "Artist" && (
            <label className="regField">
              <span>Bio (optional):</span>
              <textarea className="authInput" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
            </label>
          )}

          {selectedAccountType === "Listener" && (
            <>
              <label className="regField">
                <span>Major:</span>
                <input className="authInput" type="text" value={major} onChange={(e) => setMajor(e.target.value)} required />
              </label>
              <label className="regField">
                <span>Minor (optional):</span>
                <input className="authInput" type="text" value={minor} onChange={(e) => setMinor(e.target.value)} />
              </label>
            </>
          )}

          <label className="regField">
            <span>Username:</span>
            <input className="authInput" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>

          <label className="regField">
            <span>Password:</span>
            <input className="authInput" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <small className="text-xs text-gray-600">Must be ≥8 chars, include one uppercase and one special character.</small>
          </label>

          <div className="regActions">
            <button type="button" className="authBtn authBtnGhost" onClick={onCancel} disabled={submitting}>Cancel</button>

            <input id="pfpInput" className="fileInputHidden" type="file" accept="image/*" onChange={onFileChange} />
            <label htmlFor="pfpInput" className="authBtn authBtnChip fileBtn">profile pic</label>

            <button type="submit" className="authBtn authBtnPrimary" disabled={submitting}>
              {submitting ? "Signing Up…" : "Sign Up"}
            </button>
          </div>
        </form>

        <p className="authMeta">
          Already have an account? <Link to="/login" className="authLinkInline">Login here</Link>
        </p>
      </div>
    </Loading>
  );
}
