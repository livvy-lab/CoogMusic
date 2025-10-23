import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import leftRecord from "../assets/left_record.svg";
import rightRecord from "../assets/right_record.svg";
import earbuds from "../assets/earbuds.svg";
import "./Auth.css";

export default function Register() {
  const [form, setForm] = useState({
    first: "",
    last: "",
    major: "",
    minor: "",
    user: "",
    password: "",
  });
  const navigate = useNavigate();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    navigate("/login");
  };

  return (
    <div className="authShell">
      <img src={leftRecord} alt="" className="bg bg-left-record" />
      <img src={rightRecord} alt="" className="bg bg-right-record" />
      <img src={earbuds} alt="" className="bg bg-earbuds" />

      <div className="authCard authCardLarge">
        <div className="authChip">LISTENER REGISTRATION</div>

        <form className="regGrid" onSubmit={onSubmit}>
          <label className="regField">
            <span>First name:</span>
            <input className="authInput" value={form.first} onChange={set("first")} />
          </label>
          <label className="regField">
            <span>Last name:</span>
            <input className="authInput" value={form.last} onChange={set("last")} />
          </label>

          <label className="regField">
            <span>Major:</span>
            <input className="authInput" value={form.major} onChange={set("major")} />
          </label>
          <label className="regField">
            <span>Minor(optional):</span>
            <input className="authInput" value={form.minor} onChange={set("minor")} />
          </label>

          <label className="regField">
            <span>User:</span>
            <input className="authInput" value={form.user} onChange={set("user")} />
          </label>
          <label className="regField">
            <span>Password:</span>
            <input className="authInput" type="password" value={form.password} onChange={set("password")} />
          </label>

          <div className="regActions">
            <button type="button" className="authBtn authBtnGhost">Cancel</button>
            <button type="button" className="authBtn authBtnChip">profile pic</button>
            <button type="submit" className="authBtn authBtnPrimary">Sign Up</button>
          </div>
        </form>

        <p className="authMeta">
          Already have an account?{" "}
          <Link to="/login" className="authLinkInline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
