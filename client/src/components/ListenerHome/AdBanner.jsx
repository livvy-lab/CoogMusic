import { useEffect, useState } from "react";
import "./AdBanner.css";
import { API_BASE_URL } from "../../config/api";

export default function AdBanner() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubscriber, setIsSubscriber] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const raw = localStorage.getItem("user");
        const user = raw ? JSON.parse(raw) : null;
        const listenerId = user?.listenerId ?? user?.ListenerID ?? null;

        if (listenerId) {
          const resSub = await fetch(
            `${API_BASE_URL}/subscriptions/listener/${listenerId}`
          );

          if (resSub.ok) {
            const sub = await resSub.json();
            const activeFlag =
              sub.IsActive ?? sub.isActive ?? sub.active ?? 0;
            const deletedFlag =
              sub.IsDeleted ?? sub.isDeleted ?? sub.deleted ?? 0;
            const subscribed =
              Number(activeFlag) === 1 && Number(deletedFlag) === 0;

            setIsSubscriber(subscribed);
            if (subscribed) {
              setLoading(false);
              return;
            }
          }
        }

        const resAds = await fetch(`${API_BASE_URL}/advertisements`);
        if (resAds.ok) {
          const dataAds = await resAds.json();
          const cloned = Array.isArray(dataAds) ? [...dataAds] : [];
          for (let i = cloned.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
          }
          const picked = cloned.slice(0, 3);
          setAds(picked);
        }

        setLoading(false);
      } catch (e) {
        console.error("AdBanner error:", e);
        setLoading(false);
      }
    }

    load();
  }, []);

  if (isSubscriber || loading || ads.length === 0) return null;

  return (
    <section className="adGrid">
      {ads.map((ad, index) => {
        const imageUrl = ad.AdFileUrl || ad.AdFile;
        return (
          <div key={`${ad.adId || ad.AdName}-${index}`} className="adCard">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={ad.AdName}
                className="adCard__img"
              />
            )}
            <div className="adCard__meta">
              <p className="adCard__label">Sponsored</p>
              <h3 className="adCard__title">{ad.AdName}</h3>
              {ad.AdLength && (
                <p className="adCard__length">
                  {ad.AdLength} seconds
                </p>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
