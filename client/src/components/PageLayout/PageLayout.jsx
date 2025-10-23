import NavigationBar from "../NavigationBar/NavigationBar";
import recordImg from "../../assets/figmaRecord.svg";
import "./PageLayout.css";
import AlbumPage from "../../pages/src/pages/AlbumPage.jsx";

export default function PageLayout({ children }) {
  return (
    <div
      className="pageContainer"
      style={{ backgroundImage: `url("${recordImg}")` }}
    >
      <NavigationBar />
      <main className="pageMain" style={{backgroundImage: "none"}}>{children}
      <AlbumPage />
      </main>
    </div>
  );
}