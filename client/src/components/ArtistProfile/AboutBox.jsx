import { useEffect, useState } from "react";
import "./AboutBox.css";

const FALLBACK_TEXT = "This artist hasn’t filled out their information yet.";

export default function AboutBox({ artistId }) {
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = Number(artistId);
    if (!artistId || Number.isNaN(id)) {
      setBio(FALLBACK_TEXT);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const fetchBio = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:3001/artists/${id}/about`, {
          signal: controller.signal,
        });

        if (res.status === 404) {
          setBio(FALLBACK_TEXT);
          return;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const text = (data?.Bio ?? "").trim();
        setBio(text || FALLBACK_TEXT);
      } catch (err) {
        console.error("[AboutBox] Failed to load artist bio:", err);
        setBio(FALLBACK_TEXT);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    fetchBio();
    return () => {
      clearTimeout(timeout);
      controller.abort();
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
