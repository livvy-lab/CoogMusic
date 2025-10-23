import "./DiscographyGrid.css";
import { useRef } from "react";

export default function Discography() {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const { clientWidth } = scrollRef.current;
    const scrollAmount = direction === "left" ? -clientWidth / 2 : clientWidth / 2;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  // temporary blank placeholders
  const albums = [
    { id: 1, title: "Album One" },
    { id: 2, title: "Album Two" },
    { id: 3, title: "Album Three" },
    { id: 4, title: "Album Four" },
    { id: 5, title: "Album Five" },
    { id: 6, title: "Album Six" },
    { id: 7, title: "Album Seven" },
  ];

  return (
    <section className="nr">
      <h2 className="nr__title">Discography</h2>

      <div className="nr__rail" ref={scrollRef}>
        {albums.map((album) => (
          <div key={album.id} className="nr__card">
            <div className="nr__img" style={{ backgroundColor: "#d7b5c6" }} />
          </div>
        ))}
      </div>

      <div className="nr__controls">
        <button onClick={() => scroll("left")} aria-label="Scroll left">
          ‹
        </button>
        <button onClick={() => scroll("right")} aria-label="Scroll right">
          ›
        </button>
      </div>
    </section>
  );
}
