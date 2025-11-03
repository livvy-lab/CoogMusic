import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ArtistCard.css";
import { API_BASE_URL } from "../../config/api";

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function PlaceholderCard() {
  return (
    <div className="artistCard">
      <div className="artistCard__avatarWrap">
        <div className="artistCard__avatar">
          <img src="/assets/artist-avatar.png" alt="" aria-hidden="true" />
        </div>
      </div>
      <div className="artistCard__info">
        <h1 className="artistCard__name">Unknown Artist</h1>
        <div className="artistCard__followers">This artist hasn’t started creating yet.</div>
      </div>
      <div className="artistCard__songs">♪ 0 songs</div>
    </div>
  );
}

export default function ArtistCard({ artistId }) {
  const [artist, setArtist] = useState(null);
  const [favorited, setFavorited] = useState(false);
  const [state, setState] = useState({ loading: false, notFound: false });
  const [pending, setPending] = useState(false);

  // Follow/report logic
  const [isFollowing, setIsFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);

  const navigate = useNavigate();

  const currentUser = getUser();
  const currentUserId =
    currentUser?.listenerId || currentUser?.artistId || currentUser?.accountId;
  const currentUserType =
    currentUser?.accountType?.charAt(0).toUpperCase() +
      (currentUser?.accountType?.slice(1) ?? "") || "";
  const isOwnProfile =
    Number(currentUserId) === Number(artistId) && currentUserType === "Artist";

  const listenerId = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      return u?.listenerId ?? u?.ListenerID ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (
      artistId === undefined ||
      artistId === null ||
      Number.isNaN(Number(artistId))
    ) {
      setArtist(null);
      setState({ loading: false, notFound: true });
      return;
    }
    const ctrl = new AbortController();
    (async () => {
      setState({ loading: true, notFound: false });
      try {
        const res = await fetch(
          `${API_BASE_URL}/artists/${artistId}/profile`,
          { signal: ctrl.signal }
        );
        if (res.status === 404) {
          setArtist(null);
          setState({ loading: false, notFound: true });
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setArtist(data);
        setState({ loading: false, notFound: false });
      } catch {
        setArtist(null);
        setState({ loading: false, notFound: true });
      }
    })();
    return () => ctrl.abort();
  }, [artistId]);

  useEffect(() => {
    if (!listenerId || !artistId) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch(
          `${API_BASE_URL}/listeners/${listenerId}/pins/artists`
        );
        if (!r.ok) return;
        const pins = await r.json();
        if (!alive) return;
        setFavorited(pins.some((p) => Number(p.ArtistID) === Number(artistId)));
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [listenerId, artistId]);

  async function togglePin() {
    if (!listenerId || !artistId || pending) return;
    setPending(true);
    try {
      if (!favorited) {
        const r = await fetch(
          `${API_BASE_URL}/listeners/${listenerId}/pins/artists`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ artistId: Number(artistId) }),
          }
        );
        if (r.ok) setFavorited(true);
      } else {
        const r = await fetch(
          `${API_BASE_URL}/listeners/${listenerId}/pins/artists/${artistId}`,
          { method: "DELETE" }
        );
        if (r.ok) setFavorited(false);
      }
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    async function checkFollow() {
      if (!artistId || !currentUserId || isOwnProfile) {
        setIsFollowing(false);
        return;
      }
      try {
        const res = await fetch(
          `${API_BASE_URL}/follows/relationship?followerId=${currentUserId}&followerType=${currentUserType}&followingId=${artistId}&followingType=Artist`
        );
        if (!res.ok) {
          setIsFollowing(false);
          return;
        }
        const data = await res.json();
        setIsFollowing(Boolean(data.isFollowing));
      } catch {
        setIsFollowing(false);
      }
    }
    checkFollow();
  }, [artistId, currentUserId, currentUserType, isOwnProfile]);

  async function handleFollowToggle() {
    if (!currentUserId || isOwnProfile || followPending) return;
    setFollowPending(true);
    try {
      if (isFollowing) {
        await fetch(`${API_BASE_URL}/follows`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            FollowerID: currentUserId,
            FollowerType: currentUserType,
            FollowingID: artistId,
            FollowingType: "Artist",
          }),
        });
      } else {
        await fetch(`${API_BASE_URL}/follows`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            FollowerID: currentUserId,
            FollowerType: currentUserType,
            FollowingID: artistId,
            FollowingType: "Artist",
          }),
        });
      }
      const res = await fetch(
        `${API_BASE_URL}/follows/relationship?followerId=${currentUserId}&followerType=${currentUserType}&followingId=${artistId}&followingType=Artist`
      );
      const data = await res.json();
      setIsFollowing(Boolean(data.isFollowing));
    } finally {
      setFollowPending(false);
    }
  }

  function handleReportClick() {
  navigate("/user-report", {
    state: {
      reportedId: artistId,
      reportedType: "Artist",
      reportedName: artist?.ArtistName || "",
    },
  });
}

  if (state.loading) return <div className="artistCard">Loading…</div>;
  if (state.notFound) return <PlaceholderCard />;

  return (
    <div className="artistCard">
      <div className="artistCard__avatarWrap">
        <div className="artistCard__avatar">
          <img
            src={
              artist?.pfpSignedUrl ||
              artist?.pfpUrl ||
              "/assets/artist-avatar.png"
            }
            alt={artist?.ArtistName || "Artist"}
          />
        </div>
      </div>
      <div className="artistCard__info">
        <h1 className="artistCard__name">{artist?.ArtistName || "Unknown Artist"}</h1>
        <div className="artistCard__followers">
          {Number(artist?.FollowerCount || 0).toLocaleString()} followers
        </div>
        {/* Follow/Report Buttons */}
        {!isOwnProfile && (
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className={`pc__followBtn${isFollowing ? " following" : ""}`}
              onClick={handleFollowToggle}
              disabled={followPending}
              style={{ marginRight: 10 }}
            >
              {isFollowing ? "Following" : "+ Follow"}
            </button>
            <button
              type="button"
              className="pc__reportBtn"
              onClick={handleReportClick}
              style={{ marginLeft: 12 }}
            >
              Report
            </button>
          </div>
        )}
      </div>
      <div className="artistCard__songs">♪ {artist?.SongCount || 0} songs</div>
      <button
        type="button"
        className={`artistCard__fav${favorited ? " is-active" : ""}`}
        onClick={togglePin}
        aria-label={favorited ? "Unpin artist" : "Pin artist"}
        title={favorited ? "Unpin" : "Pin to profile"}
        disabled={pending || !listenerId}
        style={{ marginTop: 10 }}
      >
        <svg viewBox="0 0 24 24" className="artistCard__favIcon" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
