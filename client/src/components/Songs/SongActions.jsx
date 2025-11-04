// client/src/components/Songs/SongActions.jsx
import { useFavPins } from "../../context/FavoritesPinsContext";
import AddToPlaylistMenu from "../Playlist/AddToPlaylistMenu";
import "./SongActions.css";

export default function SongActions({ songId, size = "sm" }) {
  const ctx = useFavPins();

  // if provider isn’t mounted yet, don’t crash
  const favoriteIds = ctx?.favoriteIds ?? new Set();
  const pinnedSongId = ctx?.pinnedSongId ?? null;
  const toggleFavorite = ctx?.toggleFavorite ?? (() => {});
  const togglePin = ctx?.togglePin ?? (() => {});

  const fav = favoriteIds.has(songId);
  const pin = pinnedSongId === songId;

  return (
    <div className={`songActions songActions--${size}`}>
      <button
        className={`songActions__btn ${fav ? "is-on" : ""}`}
        aria-pressed={fav}
        onClick={(e) => { e.stopPropagation(); toggleFavorite(songId); }}
        title={fav ? "Unfavorite" : "Favorite"}
      >
        {fav ? "♥" : "♡"}
      </button>
      <button
        className={`songActions__btn ${pin ? "is-on" : ""}`}
        aria-pressed={pin}
        onClick={(e) => { e.stopPropagation(); togglePin(songId); }}
        title={pin ? "Unpin song" : "Pin song"}
      >
        {pin ? "📍" : "📌"}
      </button>
      {/* Add to playlist menu/button */}
      <div className="songActions__add">
        <AddToPlaylistMenu songId={songId} compact={true} />
      </div>
    </div>
  );
}
