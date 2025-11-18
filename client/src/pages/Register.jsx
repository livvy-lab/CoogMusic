import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Auth.css";
import Loading from "../components/LoadingLayout/Loading";
import { API_BASE_URL } from "../config/api";
import ShowPasswordIcon from "../assets/show-password.svg";
import HidePasswordIcon from "../assets/hide-password.svg";
import { showToast } from '../lib/toast';
import { setUser } from "../lib/userStorage";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();

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
  const [showPassword, setShowPassword] = useState(false);

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
      // 1. Register the User
      const endpoint =
        selectedAccountType === "Artist"
          ? `${API_BASE_URL}/auth/register/artist`
          : `${API_BASE_URL}/auth/register`;

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
        showToast(`Sign up failed: ${msg}`, 'error');
        setSubmitting(false);
        return;
      }

      const accountTypeLower = String(regData.accountType || selectedAccountType).toLowerCase();
      const artistId = regData.ArtistID ?? regData.artistId ?? regData.id ?? null;
      const listenerId = regData.ListenerID ?? regData.listenerId ?? regData.id ?? null;
      const entityId = accountTypeLower === "artist" ? artistId : listenerId;
      const avatarPath = accountTypeLower === "artist" ? "artists" : "listeners";

      if (file && entityId) {
        try {
          const fd = new FormData();
          fd.append("file", file);
          await fetch(`${API_BASE_URL}/${avatarPath}/${entityId}/avatar`, { method: "POST", body: fd });
        } catch (uploadErr) {
          console.error("Avatar upload failed, but registration succeeded", uploadErr);
        }
      }

      // 3. Auto-Login
      const loginRes = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const loginData = await loginRes.json();

      if (loginData.success) {
        // Store user session
        const user = {
          username: loginData.username,
          accountId: loginData.accountId,
          accountType: loginData.accountType,
          listenerId: loginData.listenerId,
          artistId: loginData.artistId,
          adminId: loginData.adminId,
          name: loginData.name,
        };
        setUser(user);
        
        showToast("Welcome to Coog Music!", "success");

        // 4. Redirect based on Account Type
        if (accountTypeLower === "artist") {
          navigate("/artist-dashboard", { replace: true });
        } else {
          navigate("/home", { replace: true });
        }
      } else {
        // Fallback if auto-login fails
        showToast("Account created! Please log in.", "success");
        navigate("/login", { replace: true });
      }

    } catch (err) {
      showToast("Sign up failed. Please ensure the API is running and try again.", 'error');
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
            <div className="authInputContainer">
              <input 
                className="authInput" 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
              <button 
                type="button" 
                className="authShowPassBtn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <img 
                  src={showPassword ? HidePasswordIcon : ShowPasswordIcon} 
                  alt="Toggle password visibility" 
                />
              </button>
            </div>
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
