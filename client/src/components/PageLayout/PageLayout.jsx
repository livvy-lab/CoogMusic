import NavigationBar from "../NavigationBar/NavigationBar";
import recordImg from "../../assets/figmaRecord.png";
import "./PageLayout.css";

export default function PageLayout({ children }) {
  return (
    <div
      className="pageContainer"
      style={{
        backgroundImage: `url(${recordImg})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right center",
        backgroundSize: "auto 100%", // full height, auto width
      }}
    >
      <NavigationBar />
      <main className="pageMain">{children}</main>
    </div>
  );
}
