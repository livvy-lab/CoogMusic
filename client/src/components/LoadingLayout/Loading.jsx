import "./Loading.css";
import leftRecord from "../../assets/left_record.svg";
import rightRecord from "../../assets/right_record.svg";
import earbuds from "../../assets/earbuds.svg";

export default function Loading({ children }) {
  return (
    <div
      className="authShell"
      style={{
        // pass URLs via CSS variables so CSS controls ALL bg props
        "--bg-left": `url("${leftRecord}")`,
        "--bg-right": `url("${rightRecord}")`,
        "--bg-buds": `url("${earbuds}")`,
      }}
    >
      <main className="authMain">{children}</main>
    </div>
  );
}
