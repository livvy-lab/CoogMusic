// src/components/ToggleBarButton/ToggleBarButton.jsx
import React from "react";
import "./ToggleBarButton.css";
import upArrowIcon from "../../assets/up-arrow.svg";
import downArrowIcon from "../../assets/down-arrow.svg";

export default function ToggleBarButton({ isMinimized, onClick }) {
  return (
    <button
      className="toggle-bar-btn"
      onClick={onClick}
      aria-label={isMinimized ? "Show player" : "Hide player"}
      title={isMinimized ? "Show player" : "Hide player"}
    >
      <img src={isMinimized ? upArrowIcon : downArrowIcon} alt="" />
    </button>
  );
}