import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";
import Loading from "../components/LoadingLayout/Loading";

export default function Register() {
  const navigate = useNavigate();

  const [first, setFirstName] = useState("");
  const [last, setLastName] = useState("");
  const [major, setMajor] = useState("");
  const [minor, setMinor] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [image, setImage] = useState("");
    
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:3001/auth/register", {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ first, last, major, minor, username, password})
      });

      const data = await response.json();

      if (data.success){
        alert(
          'You are signed up!'
        );
        navigate('/login');
      }
      else{
        alert(`Sign up failed: ${data.message}`);
      }
    }
    catch (err){
      console.error('Error occured while trying to sign up: ', err);
      alert('Sign up failed. Please try again.');
    }
  };

  const onCancel = () => navigate("/login");

  return (
    <Loading>
      <div className="authCard authCardLarge">
        <div className="authChip">LISTENER REGISTRATION</div>

        <form className="regGrid" onSubmit={handleSubmit}>
          <label className="regField">
            <span>First name:</span>
            <input
              className="authInput"
              type="first"
              value={first}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label className="regField">
            <span>Last name:</span>
            <input
              className="authInput"
              type="last"
              value={last}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>

          <label className="regField">
            <span>Major:</span>
            <input
              className="authInput"
              type="major"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
            />
          </label>
          <label className="regField">
            <span>Minor (optional):</span>
            <input
              className="authInput"
              type="minor"
              value={minor}
              onChange={(e) => setMinor(e.target.value)}
            />
          </label>

          <label className="regField">
            <span>User:</span>
            <input
              className="authInput"
              type="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="regField">
            <span>Password:</span>
            <input
              className="authInput"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <div className="regActions">
            <button
              type="button"
              className="authBtn authBtnGhost"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button type="button" className="authBtn authBtnChip">
              profile pic
            </button>
            <button type="submit" className="authBtn authBtnPrimary">
              Sign Up
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
