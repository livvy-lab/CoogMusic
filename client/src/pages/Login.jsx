import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import leftRecord from "../assets/left_record.svg";
import rightRecord from "../assets/right_record.svg";
import earbuds from "../assets/earbuds.svg";
import "./Auth.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="authShell">
      <img src={leftRecord} alt="" className="bg bg-left-record" />
      <img src={rightRecord} alt="" className="bg bg-right-record" />
      <img src={earbuds} alt="" className="bg bg-earbuds" />
      <div className="authCard">
        <div className="authTitleBlock">
          <div className="authTitle">Welcome</div>
          <div className="authSubtitle">to</div>
          <div className="authBrand">Coogs Music</div>
        </div>
        <form className="authForm" onSubmit={onSubmit}>
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
          <Link to="/register" className="authLinkInline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
