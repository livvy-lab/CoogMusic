import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ArtistCard.css";
import { API_BASE_URL } from "../../config/api";
import VerifiedIcon from "../../assets/Verified.svg";

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
        <div className="artistCard__headingRow">
          <h1 className="artistCard__name">Unknown Artist</h1>
        </div>
        <div className="artistCard__stats">
          <button disabled>0 followers</button>
          <button disabled>0 albums</button>
        </div>
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

  const [isFollowing, setIsFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);

  const navigate = useNavigate();
  const currentUser = getUser();
  const currentUserId =
    currentUser?.listenerId ||
    currentUser?.artistId ||
    currentUser?.accountId;

  const currentUserType =
    (currentUser?.accountType?.charAt(0).toUpperCase() ?? "") +
    (currentUser?.accountType?.slice(1) ?? "");

  const isOwnProfile =
    Number(currentUserId) === Number(artistId) &&
    currentUserType === "Artist";

  const listenerId = useMemo(() => {
    if (currentUserType === "Listener") {
      return currentUserId;
    }
    return null;
  }, [currentUserType, currentUserId]);

  // fetch artist profile
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
        console.log("DEBUG /artists/:id/profile data:", data);

        setArtist(data);
        setState({ loading: false, notFound: false });
      } catch (e) {
        if (!ctrl.signal.aborted) {
          console.error("Artist profile fetch failed", e);
          setArtist(null);
          setState({ loading: false, notFound: true });
        }
      }
    })();

    return () => ctrl.abort();
  }, [artistId]);

  // check pin/favorite status
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
        setFavorited(
          pins.some((p) => Number(p.ArtistID) === Number(artistId))
        );
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

  // follow state
  useEffect(() => {
    async function checkFollow() {
      if (!listenerId || !artistId || isOwnProfile) {
        setIsFollowing(false);
        return;
      }
      try {
        const res = await fetch(
          `${API_BASE_URL}/follows/relationship?followerId=${listenerId}&followerType=Listener&followingId=${artistId}&followingType=Artist`
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
  }, [artistId, listenerId, isOwnProfile]);

  async function handleFollowToggle() {
    if (!listenerId || isOwnProfile || followPending) return;
    setFollowPending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/follows`, {
        method: isFollowing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FollowerID: listenerId,
          FollowerType: "Listener",
          FollowingID: artistId,
          FollowingType: "Artist",
        }),
      });

      if (res.ok) {
        setIsFollowing(!isFollowing);

        try {
          const profileRes = await fetch(
            `${API_BASE_URL}/artists/${artistId}/profile`
          );
          if (profileRes.ok) {
            const data = await profileRes.json();
            setArtist(data);
          }
        } catch {}
      }
    } catch (e) {
      console.error("Follow toggle failed", e);
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

  // verification logic
  const isVerified =
    Number(
      artist?.IsVerified ??
        artist?.isVerified ??
        artist?.artist?.IsVerified ??
        artist?.artist?.isVerified ??
        0
    ) === 1;

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
        <div className="artistCard__headingRow">
          {/* name + verified badge side-by-side */}
          <div className="artistCard__nameRow">
            <h1 className="artistCard__name">
              {artist?.ArtistName || "Unknown Artist"}
            </h1>
            {isVerified && (
              <img
                src={VerifiedIcon}
                alt="Verified artist"
                title="Verified artist"
                className="artistCard__verifiedBadge"
              />
            )}
          </div>

          {!isOwnProfile && (
            <>
              {currentUserType === "Listener" && (
                <button
                  type="button"
                  className={`pc__followBtn${
                    isFollowing ? " following" : ""
                  }`}
                  onClick={handleFollowToggle}
                  disabled={followPending}
                >
                  {isFollowing ? "Following" : "+ Follow"}
                </button>
              )}
              <button
                type="button"
                className="pc__reportBtn"
                onClick={handleReportClick}
              >
                Report
              </button>
            </>
          )}
        </div>

        <div className="artistCard__stats">
          <button
            onClick={() =>
              navigate(`/artists/${artistId}/follows?tab=followers`)
            }
            aria-label="View followers"
            title="View followers"
          >
            {Number(artist?.FollowerCount || 0).toLocaleString()} followers
          </button>
          <button
            onClick={() => navigate(`/artists/${artistId}/albums`)}
            aria-label="View albums"
            title="View albums"
          >
            {Number(artist?.AlbumCount || 0).toLocaleString()} albums
          </button>
        </div>
      </div>

      <div className="artistCard__songs">♪ {artist?.SongCount || 0} songs</div>

      {/* bottom-right corner: only the star now */}
      <div className="artistCard__corner">
        {currentUserType === "Listener" && (
          <button
            type="button"
            className={`artistCard__fav${favorited ? " is-active" : ""}`}
            onClick={togglePin}
            aria-label={favorited ? "Unpin artist" : "Pin artist"}
            title={favorited ? "Unpin" : "Pin to profile"}
            disabled={pending}
          >
            <svg
              viewBox="0 0 24 24"
              className="artistCard__favIcon"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"
                fill="currentColor"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
