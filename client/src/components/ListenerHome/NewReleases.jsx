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
    <section className="nr">
      <h2 className="nr__title">{title}</h2>

      <div className="nr__rail" ref={railRef}>
        {items.map((it, i) => (
          <div className="nr__card" key={it.id ?? i}>
            <img className="nr__img" src={it.image} alt={it.title ?? `Item ${i + 1}`} />
          </div>
        ))}
      </div>

      <div className="nr__controls">
        <button onClick={() => scrollByPage(-1)}>‹</button>
        <button onClick={() => scrollByPage(1)}>›</button>
      </div>
    </section>
  );
}
