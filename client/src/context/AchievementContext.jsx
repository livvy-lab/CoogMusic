import React, { createContext, useContext, useState, useEffect } from "react";
import AchievementPopup from "../components/Achievement/AchievementPopUp";
import { getUser } from "../lib/userStorage";
import { API_BASE_URL } from "../config/api";

const AchievementContext = createContext(null);

export function AchievementProvider({ children, refreshAchievements }) {
  const [popupAchievement, setPopupAchievement] = useState(null);

  // show the popup
  const showAchievement = (achievementData) => {
    setPopupAchievement(achievementData);
  };

  // hide the popup
  const close = () => {
    setPopupAchievement(null);
  };

  const handleDisplay = async () => {
    const user = getUser();
    if (!popupAchievement?.AchievementID || !user?.listenerId) {
      console.error("Missing achievement or listener ID");
      return;
    }
    const listenerId = user.listenerId;
    const achievementId = popupAchievement.AchievementID;
    try {
      const response = await fetch(
        `${API_BASE_URL}/listeners/${listenerId}/display-achievement`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ achievementId }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to set display achievement");
      }
      if (typeof refreshAchievements === "function") {
        await refreshAchievements();
      }
      close();
    } catch (err) {
      console.error("Error setting display achievement:", err);
    }
  };

  useEffect(() => {
    console.log("Popup achievement state:", popupAchievement);
  }, [popupAchievement]);

  return (
    <AchievementContext.Provider value={{ showAchievement }}>
      {children}
      <AchievementPopup
        visible={!!popupAchievement}
        achievement={popupAchievement}
        onDisplay={handleDisplay}
        onClose={close}
      />
    </AchievementContext.Provider>
  );
}

export function useAchievement() {
  return useContext(AchievementContext);
}
