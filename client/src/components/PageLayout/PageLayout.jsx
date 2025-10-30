import NavigationBar from "../NavigationBar/NavigationBar";
import recordImg from "../../assets/figmaRecord.svg";
import SearchBar from "../SearchBar/SearchBar";
import AdDisplay from "../AdDisplay/AdDisplay";
import { getUser } from "../../lib/userStorage";
import React, { useState, useEffect } from "react";
import "./PageLayout.css";
import { API_BASE_URL } from "../../config/api";

export default function PageLayout({ children }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isListener, setIsListener] = useState(false);
  const [listenerId, setListenerId] = useState(null);

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      const user = getUser();
      
      // Only show ads to listeners
      if (!user || user.accountType !== 'listener') {
        setIsListener(false);
        return;
      }

      setIsListener(true);
      setListenerId(user.listenerId);

      // Check if listener has active subscription
      if (user.listenerId) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/subscriptions/listener/${user.listenerId}`
          );
          
          if (response.ok) {
            const data = await response.json();
            setIsSubscribed(!!data.IsActive);
          } else {
            setIsSubscribed(false);
          }
        } catch (err) {
          console.error('Error checking subscription:', err);
          setIsSubscribed(false);
        }
      }
    };

    checkSubscriptionStatus();
  }, []);

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
        </div>

        <div className="pageContent">{children}</div>
      </main>

      {/* Ad Display - only for non-subscribed listeners */}
      {isListener && <AdDisplay isSubscribed={isSubscribed} listenerId={listenerId} />}
    </div>
  );
}
