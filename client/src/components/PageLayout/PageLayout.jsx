import NavigationBar from "../NavigationBar/NavigationBar";
import recordImg from "../../assets/figmaRecord.svg";
import SearchBar from "../SearchBar/SearchBar";
import NotificationBell from "../NotificationBell/NotificationBell";
import "./PageLayout.css";

export default function PageLayout({ children }) {
  return (
    <div className="pageContainer">
      {/* Background record image */}
      <div
        className="recordBg"
        aria-hidden="true"
        style={{ backgroundImage: `url("${recordImg}")` }}
      />

      {/* Sidebar Navigation */}
      <NavigationBar />

      {/* Main content area */}
      <main className="pageMain">
        <div className="pageHeader">
          <SearchBar />
          <NotificationBell />
        </div>

        <div className="pageContent">{children}</div>
      </main>
    </div>
  );
}
