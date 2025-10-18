import React from "react";
import ReactDOM from "react-dom/client";
import ListenerHead from "./components/ListenerProfile/ListenerHead.jsx";

const listener = {
  FirstName: "Olivia",
  LastName: "Smith",
  Bio: "Music lover 🎵",
  PFP: "/default-pfp.jpg"
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <ListenerHead listener={listener} />
);
