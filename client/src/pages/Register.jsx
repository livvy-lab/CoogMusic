import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";
import Loading from "../components/LoadingLayout/Loading";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export default function Register() {
  const navigate = useNavigate();

  const [first, setFirstName] = useState("");
  const [last, setLastName] = useState("");
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
      // 1) Register first (no image yet)
      const regRes = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first, last, major, minor, username, password }),
      });

      const regData = await regRes.json().catch(() => ({}));
      if (!regRes.ok || !regData?.success) {
        alert(`Sign up failed: ${regData?.message || regData?.error || "Unknown error"}`);
        setSubmitting(false);
        return;
      }

      const listenerId = regData.listenerId;

      // 2) If a file was chosen, upload avatar with the new listenerId
      if (file && listenerId) {
        const fd = new FormData();
        fd.append("file", file);

        const upRes = await fetch(`${API_BASE}/listeners/${listenerId}/avatar`, {
          method: "POST",
          body: fd,
        });

        const upData = await upRes.json().catch(() => ({}));
        if (upRes.ok && upData?.url) {
          const cached = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem(
            "user",
            JSON.stringify({ ...cached, listenerId, username, pfpUrl: upData.url })
          );
        } else {
          console.warn("Avatar upload failed:", upData);
        }
      }

      alert("You are signed up!");
      navigate("/login");
    } catch (err) {
      console.error("Error during sign-up:", err);
      // If you see "TypeError: Failed to fetch", your API is unreachable or blocked by CORS.
      alert("Sign up failed. Please ensure the API is running and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = () => navigate("/login");

  return (
    <Loading>
      <div className="authCard authCardLarge">
        <div className="authChip">LISTENER REGISTRATION</div>

        {/* Optional preview */}
        {previewUrl && <img className="pfpThumb" src={previewUrl} alt="profile preview" />}

        <form className="regGrid" onSubmit={handleSubmit}>
          <label className="regField">
            <span>First name:</span>
            <input
              className="authInput"
              type="text"
              value={first}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </label>

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

          <label className="regField">
            <span>User:</span>
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

            {/* Hidden file input + styled label that looks like your chip */}
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

            <button type="submit" className="authBtn authBtnPrimary" disabled={submitting}>
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
