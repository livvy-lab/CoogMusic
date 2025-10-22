import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/auth.css";

export default function Register() {
  const [form, setForm] = useState({ username: "", password: "", firstName: "", lastName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nav = useNavigate();

  function upd(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Sign up failed");
      await res.json();
      nav("/login");
    } catch (e) {
      setError(e.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth__page">
      <div className="auth__card auth__card--wide">
        <div className="auth__banner">LISTENER REGISTRATION</div>
        <form className="auth__grid" onSubmit={onSubmit}>
          <label className="auth__label">Username:</label>
          <input className="auth__input" value={form.username} onChange={(e) => upd("username", e.target.value)} />
          <label className="auth__label">Password:</label>
          <input className="auth__input" type="password" value={form.password} onChange={(e) => upd("password", e.target.value)} />
          <label className="auth__label">First name:</label>
          <input className="auth__input" value={form.firstName} onChange={(e) => upd("firstName", e.target.value)} />
          <label className="auth__label">Last name:</label>
          <input className="auth__input" value={form.lastName} onChange={(e) => upd("lastName", e.target.value)} />
          <div className="auth__actions">
            <Link to="/login" className="auth__secondary">Cancel</Link>
            <button className="auth__primary" disabled={loading} type="submit">Sign Up</button>
          </div>
          {error && <div className="auth__error">{error}</div>}
        </form>
        <div className="auth__switch">
          <span>already have an account?</span>
          <Link to="/login" className="auth__link">login</Link>
        </div>
      </div>
    </div>
  );
}
