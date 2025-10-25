import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";
import Loading from "../components/LoadingLayout/Loading";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch("http://localhost:3001/login", {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username, password})
      });

      const data = await response.json();

      if (data.success){
        alert(
          'You are logged in!'
        );
        navigate('/home');
      }
      else{
        alert(`Log in failed: ${data.message}`);
      }
    }
    catch (err){
      console.error('Error occured while trying to log in: ', err);
      alert('Log in failed. Please try again.');
    }
  };

  return (
    <Loading>
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
          <Link to="/register" className="authLinkInline">
            Register here
          </Link>
        </p>
      </div>
    </Loading>
  );
}
