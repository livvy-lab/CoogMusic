import { useEffect, useState } from "react";
import "./AdBanner.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export default function AdBanner({ isSubscriber }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSubscriber) return;
    async function fetchAds() {
      try {
        const res = await fetch(`${API_BASE}/advertisements`);
        if (res.ok) {
          const data = await res.json();
          const cloned = [...data];
          for (let i = cloned.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
          }
          const picked = cloned.slice(0, 3);
          setAds(picked);
        }
      } catch {}
      setLoading(false);
    }
    fetchAds();
  }, [isSubscriber]);

  if (isSubscriber || loading || ads.length === 0) return null;

  return (
    <section className="adGrid">
      {ads.map((ad, index) => {
        const imageUrl = ad.AdFileUrl || ad.AdFile;
        return (
          <div key={`${ad.adId || ad.AdName}-${index}`} className="adCard">
            {imageUrl && <img src={imageUrl} alt={ad.AdName} className="adCard__img" />}
            <div className="adCard__meta">
              <p className="adCard__label">Sponsored</p>
              <h3 className="adCard__title">{ad.AdName}</h3>
              {ad.AdLength && <p className="adCard__length">{ad.AdLength} seconds</p>}
            </div>
          </div>
        );
      })}
    </section>
  );
}
