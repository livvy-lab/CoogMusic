import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/auth.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error("Login failed");
      await res.json();
      nav("/profile");
    } catch (e) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth__page">
      <div className="auth__card">
        <div className="auth__title">
          <div>Welcome</div>
          <div>to</div>
          <div>Coogs Music</div>
        </div>
        <form className="auth__form" onSubmit={onSubmit}>
          <input
            className="auth__input"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="auth__input"
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="auth__primary" disabled={loading} type="submit">
            <span className="auth__play" />
          </button>
        </form>
        <div className="auth__switch">
          <span>no account?</span>
          <Link to="/register" className="auth__link">register</Link>
        </div>
        {error && <div className="auth__error">{error}</div>}
      </div>
    </div>
  );
}
