import { useRef } from "react";
import "./NewReleases.css";

export default function NewReleases({ title = "New releases", items = [] }) {
  const railRef = useRef(null);

  const scrollByPage = (dir) => {
    const rail = railRef.current;
    if (!rail) return;
    const page = rail.clientWidth * 0.95;
    rail.scrollBy({ left: dir * page, behavior: "smooth" });
  };

  return (
    <section className="newRel">
      <h2 className="newRel__title">{title}</h2>

      <div className="newRel__rail" ref={railRef}>
        {items.map((it, i) => (
          <div className="newRel__card" key={it.id ?? i}>
            <img className="newRel__img" src={it.image} alt={it.title ?? `Item ${i + 1}`} />
          </div>
        ))}
      </div>

      <div className="newRel__controls">
        <button onClick={() => scrollByPage(-1)}>‹</button>
        <button onClick={() => scrollByPage(1)}>›</button>
      </div>
    </section>
  );
}
