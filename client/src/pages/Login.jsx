import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";
import { setUser } from "../lib/userStorage";
import Loading from "../components/LoadingLayout/Loading";
import { API_BASE_URL } from "../config/api";
import FloatingCats from "../components/CoogIcon/FloatingCats";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (data.success) {
        const user = {
          username: data.username,
          accountId: data.accountId,
          accountType: data.accountType,
          listenerId: data.listenerId,
          artistId: data.artistId,
          adminId: data.adminId,
          name: data.name,
        };
        setUser(user);
        if (data.accountType === "artist") {
          navigate("/artist-dashboard");
        } else {
          navigate("/home");
        }
      } else {
        alert(`Log in failed: ${data.message}`);
      }
    } catch (err) {
      console.error("Error occured while trying to log in: ", err);
      alert("Log in failed. Please try again.");
    }
  };

  return (
    <Loading>
      <FloatingCats />
      <div className="authCard">
        <div className="authTitleBlock">
          <div className="authTitle">Welcome</div>
          <div className="authSubtitle">to</div>
          <div className="authBrand">Coogs Music</div>
        </div>
        <form className="authForm" onSubmit={handleSubmit}>
          <input
            className="authInput"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="authInput"
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="authBtn authBtnPlay" type="submit">
            <span className="playIcon" />
          </button>
        </form>
        <p className="authMeta">
          Don’t have an account?{" "}
          <Link to="/register/select" className="authLinkInline">
            Register here
          </Link>
        </p>
      </div>
    </Loading>
  );
}
