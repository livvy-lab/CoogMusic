import { useFavPins } from "../../context/FavoritesPinsContext";
import AddToPlaylistMenu from "../Playlist/AddToPlaylistMenu";
import "./SongActions.css";

export default function SongActions({ songId, songTitle, size = "sm" }) {
  const ctx = useFavPins();
  

  // if provider isn’t mounted yet, don’t crash
  const favoriteIds = ctx?.favoriteIds ?? new Set();
  const pinnedSongId = ctx?.pinnedSongId ?? null;
  const toggleFavorite = ctx?.toggleFavorite ?? (() => {});
  const togglePin = ctx?.togglePin ?? (() => {});

  // normalize incoming id to a number for consistent comparisons
  const sid = Number(songId);
  const hasValidId = Number.isFinite(sid) && sid > 0;
  const fav = hasValidId ? favoriteIds.has(sid) : false;
  const pin = hasValidId ? (pinnedSongId === sid) : false;

  try {
    console.debug("SongActions render", {
      songId: sid,
      hasValidId,
      fav,
      favoriteIdsSize: favoriteIds?.size,
    });
  } catch (e) {}

  return (
    <div className={`songActions songActions--${size}`}>
      <button
        className={`songActions__btn ${fav ? "is-on" : ""}`}
        aria-pressed={fav}
        onClick={(e) => {
          e.stopPropagation();
          if (hasValidId) {
            try {
              toggleFavorite(sid);
            } catch (err) {}
          }
        }}
        title={hasValidId ? (fav ? "Unfavorite" : "Favorite") : "Unavailable"}
        disabled={!hasValidId}
      >
        {fav ? "♥" : "♡"}
      </button>
      <button
        className={`songActions__btn ${pin ? "is-on" : ""}`}
        aria-pressed={pin}
        onClick={(e) => {
          e.stopPropagation();
          if (hasValidId) {
            const wasPinned = pin; // check the state *before* toggling
            togglePin(sid);
            if (!wasPinned) {
              alert("This song has been pinned to your profile");
            }
          }
        }}
        title={hasValidId ? (pin ? "Unpin song" : "Pin song") : "Unavailable"}
        disabled={!hasValidId}
      >
        <span className="songActions__icon songActions__icon--pin"></span>
      </button>
      {/* Add to playlist menu/button */}
      <div className="songActions__add">
        <AddToPlaylistMenu
          songId={songId}
          songTitle={songTitle}
          compact={true}
        />
      </div>
    </div>
  );
}
