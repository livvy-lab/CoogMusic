import "./Loading.css";
import leftRecord from "../../assets/left_record.svg";
import rightRecord from "../../assets/right_record.svg";
import earbuds from "../../assets/earbuds.svg";

export default function Loading({ children }) {
  return (
    <div
      className="pageContainer"
      style={{
        backgroundImage: `url("${earbuds}"), url("${rightRecord}"), url("${leftRecord}")`,
      }}
    >
      <main className="pageMain">{children}</main>
    </div>
  );
}
