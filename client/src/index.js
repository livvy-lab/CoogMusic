import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import ListenerHead from "./components/ListenerProfileistenerprofile/ListenerHead";

const listener = {
  FirstName: "Olivia",
  LastName: "Smith",
  Bio: "Music lover 🎵",
  PFP: "/default-pfp.jpg",
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ListenerHead listener={listener} />
  </React.StrictMode>
);
