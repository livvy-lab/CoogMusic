import { useNavigate } from "react-router-dom";
import Loading from "../../components/LoadingLayout/Loading";
import "./AccountType.css";

import ListenerCardSVG from "../../assets/listener-register-card.svg";
import ArtistCardSVG from "../../assets/artist-register-card.svg";

function TypeCard({ onClick, title, children }) {
  return (
    <button className="acctType__svgBtn" onClick={onClick} aria-label={title}>
      {children}
    </button>
  );
}

export default function AccountType() {
  const nav = useNavigate();
  return (
    <Loading>
      <section className="acctType">
        <div className="acctType__panel">
          <div className="acctType__badge">REGISTER</div>
          <h1 className="acctType__heading">Select an account type</h1>
          <div className="acctType__grid">
            <TypeCard
              onClick={() => nav("/register?role=listener")}
              title="listener"
            >
              <img src={ListenerCardSVG} alt="select listener account" />
            </TypeCard>
            <TypeCard
              onClick={() => nav("/register?role=artist")}
              title="artist"
            >
              <img src={ArtistCardSVG} alt="select artist account" />
            </TypeCard>
          </div>
          <footer className="acctType__footer">
            <p>
              Already have an account?{" "}
              <a href="/login" className="acctType__signinLink">
                Sign In
              </a>
            </p>
          </footer>
        </div>
      </section>
    </Loading>
  );
}
