import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Auth.css";
import Loading from "../components/LoadingLayout/Loading";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  // get account type from URL query (?role=artist or ?role=listener)
  const params = new URLSearchParams(location.search);
  const roleParam = (params.get("role") || "").toLowerCase();
  const accountType = roleParam === "artist" ? "Artist" : "Listener";

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
      // pick the right endpoint
      const endpoint =
        accountType === "Artist"
          ? `${API_BASE}/auth/register/artist`
          : `${API_BASE}/auth/register`;

      // build the request body
      const body =
        accountType === "Artist"
          ? { first, bio, username, password }
          : { first, last, major, minor, username, password };

      const regRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const regData = await regRes.json().catch(() => ({}));
      if (!regRes.ok || !regData?.success) {
        alert(
          `Sign up failed: ${regData?.message || regData?.error || "Unknown error"}`
        );
        setSubmitting(false);
        return;
      }

      // extract correct ID depending on role
      const entityId =
        accountType === "Artist" ? regData.artistId : regData.listenerId;

      // upload avatar (works for both artist & listener)
      if (file && entityId) {
        const fd = new FormData();
        fd.append("file", file);

        const upRes = await fetch(
          `${API_BASE}/${accountType.toLowerCase()}s/${entityId}/avatar`,
          {
            method: "POST",
            body: fd,
          }
        );

        const upData = await upRes.json().catch(() => ({}));
        if (upRes.ok && upData?.url) {
          const cached = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem(
            "user",
            JSON.stringify({
              ...cached,
              entityId,
              username,
              pfpUrl: upData.url,
              accountType,
            })
          );
        } else {
          console.warn("Avatar upload failed:", upData);
        }
      }

      alert("You are signed up!");
      navigate("/login");
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
        <div className="authChip">{accountType.toUpperCase()} REGISTRATION</div>

        {previewUrl && (
          <img className="pfpThumb" src={previewUrl} alt="profile preview" />
        )}

        <form className="regGrid" onSubmit={handleSubmit}>
          {/* first name or artist name */}
          <label className="regField">
            <span>
              {accountType === "Artist" ? "Artist name:" : "First name:"}
            </span>
            <input
              className="authInput"
              type="text"
              value={first}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </label>

          {/* only show last name for listeners */}
          {accountType === "Listener" && (
            <label className="regField">
              <span>Last name:</span>
              <input
                className="authInput"
                type="text"
                value={last}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </label>
          )}

          {/* Artist bio */}
          {accountType === "Artist" && (
            <label className="regField">
              <span>Bio (optional):</span>
              <textarea
                className="authInput"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
              />
            </label>
          )}

          {/* Listener academic info */}
          {accountType === "Listener" && (
            <>
              <label className="regField">
                <span>Major:</span>
                <input
                  className="authInput"
                  type="text"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  required
                />
              </label>

              <label className="regField">
                <span>Minor (optional):</span>
                <input
                  className="authInput"
                  type="text"
                  value={minor}
                  onChange={(e) => setMinor(e.target.value)}
                />
              </label>
            </>
          )}

          <label className="regField">
            <span>Username:</span>
            <input
              className="authInput"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>

          <label className="regField">
            <span>Password:</span>
            <input
              className="authInput"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <div className="regActions">
            <button
              type="button"
              className="authBtn authBtnGhost"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>

            {/* Hidden file input */}
            <input
              id="pfpInput"
              className="fileInputHidden"
              type="file"
              accept="image/*"
              onChange={onFileChange}
            />
            <label htmlFor="pfpInput" className="authBtn authBtnChip fileBtn">
              profile pic
            </label>

            <button
              type="submit"
              className="authBtn authBtnPrimary"
              disabled={submitting}
            >
              {submitting ? "Signing Up…" : "Sign Up"}
            </button>
          </div>
        </form>

        <p className="authMeta">
          Already have an account?{" "}
          <Link to="/login" className="authLinkInline">
            Login here
          </Link>
        </p>
      </div>
    </Loading>
  );
}
