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

        // Check subscription status
        if (listenerId) {
          try {
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
                return; // Subscribers don't see ads
              }
            }
          } catch (subErr) {
            console.warn("Error checking subscription:", subErr);
          }
        }

        // Fetch banner ads only (type=banner)
        const resAds = await fetch(`${API_BASE_URL}/advertisements?type=banner`);
        if (resAds.ok) {
          const dataAds = await resAds.json();
          
          // Ensure dataAds is an array
          const adsArray = Array.isArray(dataAds) ? dataAds : [];
          
          if (adsArray.length > 0) {
            // Shuffle the ads
            const shuffled = [...adsArray];
            for (let i = shuffled.length - 1; i > 0; i -= 1) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            
            // Pick top 3
            const picked = shuffled.slice(0, 3);
            setAds(picked);
          }
        } else {
          console.warn("Failed to fetch banner ads:", resAds.status);
        }

        setLoading(false);
      } catch (e) {
        console.error("AdBanner error:", e);
        setLoading(false);
      }
    }

    load();
  }, []);

  // Don't render if subscriber, loading, or no ads available
  if (isSubscriber || loading || ads.length === 0) return null;

  return (
    <section className="adGrid">
      {ads.map((ad, index) => {
        // Use AdFileUrl (signed URL) or fall back to AdFile (canonical URL)
        const imageUrl = ad.AdFileUrl || ad.AdFile;
        
        return (
          <div 
            key={`${ad.AdID || ad.AdName}-${index}`} 
            className="adCard"
          >
            {imageUrl && (
              <img
                src={imageUrl}
                alt={ad.AdName || "Advertisement"}
                className="adCard__img"
                onError={(e) => {
                  console.error(`Failed to load image for ad ${ad.AdID}:`, e);
                  e.target.style.display = 'none';
                }}
              />
            )}
            <div className="adCard__meta">
              <p className="adCard__label">Sponsored</p>
              <h3 className="adCard__title">{ad.AdName}</h3>
              {ad.AdType && (
                <p className="adCard__type">
                  {ad.AdType === 'banner' ? 'Promoted' : 'Audio Ad'}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
