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

    let mounted = true;
    const ctrl = new AbortController();

    const fetchBio = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:3001/artists/${id}/about`, {
          signal: ctrl.signal,
        });
        if (!res.ok) {
          if (!mounted) return;
          setBio(FALLBACK_TEXT);
          return;
        }
        const data = await res.json();
        const text = (data?.Bio || "").trim();
        if (!mounted) return;
        setBio(text.length ? text : FALLBACK_TEXT);
      } catch (err) {
        if (err?.name !== "AbortError") {
          if (mounted) setBio(FALLBACK_TEXT);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchBio();
    return () => {
      mounted = false;
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
