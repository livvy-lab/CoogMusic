import { useEffect, useState } from "react";
import "./AboutBox.css";

const FALLBACK_TEXT = "This artist hasn’t filled out their information yet.";

export default function AboutBox({ artistId }) {
  const [bio, setBio] = useState("Loading artist info...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[AboutBox] artistId:", artistId);

    // Guard: no/invalid id → show fallback immediately
    const parsedId = Number(artistId);
    if (!artistId || Number.isNaN(parsedId)) {
      setBio(FALLBACK_TEXT);
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      console.warn("[AboutBox] fetch timeout");
      setBio(FALLBACK_TEXT);
      setLoading(false);
      ctrl.abort();
    }, 8000); // safety timeout

    (async () => {
      try {
        const res = await fetch(`http://localhost:3001/artists/${parsedId}/about`, {
          signal: ctrl.signal,
        });

        if (res.status === 404) {
          setBio(FALLBACK_TEXT);
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const text = (data?.Bio || "").trim();
        setBio(text.length ? text : FALLBACK_TEXT);
      } catch (err) {
        console.error("[AboutBox] error fetching artist bio:", err);
        setBio(FALLBACK_TEXT);
      } finally {
        clearTimeout(timer);
        setLoading(false);
      }
    })();

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [artistId]);

  return (
    <section className="about">
      <h2 className="about__title">About</h2>
      <div className="about__card">
        <p className="about__text">
          {loading ? "Loading artist info..." : bio}
        </p>
      </div>
    </section>
  );
}
