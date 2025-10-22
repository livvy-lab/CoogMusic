import NavigationBar from "../NavigationBar/NavigationBar";
import recordImg from "../../assets/figmaRecord.svg";
import "./PageLayout.css";

export default function PageLayout({ children }) {
  return (
    <div
      className="pageContainer"
      style={{ backgroundImage: `url("${recordImg}")` }}
    >
      <NavigationBar />
      <main className="pageMain">{children}</main>
    </div>
  );
}