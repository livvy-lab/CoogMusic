import db from "../db.js";
import { parse } from "url";

export async function handleListenerProfile(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (method !== "GET") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const listenerId = pathname.split("/")[2];

  try {
    const [listenerRows] = await db.query(
      `SELECT ListenerID, FirstName, LastName, DateCreated, PFP, Bio, Major, Minor,
              PinnedSongID, PinnedPlaylistID
         FROM Listener
        WHERE ListenerID = ? AND IsDeleted = 0`,
      [listenerId]
    );
    if (listenerRows.length === 0) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Listener not found" }));
      return;
    }
    const listener = listenerRows[0];

    let favArtists = [];
    try {
      const [rows] = await db.query(
        `SELECT a.ArtistID, a.ArtistName, lfa.RankTiny AS FavRank, a.PFP
           FROM Listener_Favorite_Artist lfa
           JOIN Artist a ON a.ArtistID = lfa.ArtistID
          WHERE lfa.ListenerID = ?
          ORDER BY lfa.RankTiny ASC
          LIMIT 3`,
        [listenerId]
      );
      favArtists = rows.map((r) => ({
        ArtistID: r.ArtistID,
        ArtistName: r.ArtistName,
        rank: r.FavRank,
        PFP: r.PFP ?? null,
      }));
    } catch (e) {
      console.error("[profile] favorite artists SELECT failed:", e);
      favArtists = [];
    }

    // 3) Pinned song (guard)
    let pinnedSong = null;
    if (listener.PinnedSongID) {
      try {
        const [ps] = await db.query(
          `SELECT s.SongID, s.Title, 
                  MIN(a.ArtistID) AS ArtistID,
                  COALESCE(GROUP_CONCAT(DISTINCT a.ArtistName ORDER BY a.ArtistName SEPARATOR ', '), '') AS Artists
             FROM Song s
        LEFT JOIN Song_Artist sa ON sa.SongID = s.SongID
        LEFT JOIN Artist a ON a.ArtistID = sa.ArtistID
            WHERE s.SongID = ?
            GROUP BY s.SongID, s.Title`,
          [listener.PinnedSongID]
        );
        pinnedSong = ps[0] || null;
      } catch (e) {
        console.error("[profile] pinned song SELECT failed:", e);
        pinnedSong = null;
      }
    }

    // 4) Pinned playlist (guard + IsDeleted)
    let pinnedPlaylist = null;
    if (listener.PinnedPlaylistID) {
      try {
        const [pp] = await db.query(
          `SELECT p.PlaylistID, p.Name AS Name, p.Description, p.cover_media_id
             FROM Playlist p
            WHERE p.PlaylistID = ? AND p.IsDeleted = 0`,
          [listener.PinnedPlaylistID]
        );
        pinnedPlaylist = pp[0] || null;
      } catch (e) {
        console.error("[profile] pinned playlist SELECT failed:", e);
        pinnedPlaylist = null;
      }
    }

    // 5) Counts (defensive about Follows schema)
    let followers = 0,
      following = 0,
      playlists = 0,
      songs = 0;

    try {
      const [[followersCountRow]] = await db.query(
        `SELECT COUNT(*) AS cnt
           FROM Follows
          WHERE FollowingType = 'Listener' AND FollowingID = ?`,
        [listenerId]
      );
      followers = followersCountRow.cnt ?? 0;

      const [[followingCountRow]] = await db.query(
        `SELECT COUNT(*) AS cnt
           FROM Follows
          WHERE FollowerType = 'Listener' AND FollowerID = ?`,
        [listenerId]
      );
      following = followingCountRow.cnt ?? 0;
    } catch (eTypeful) {
      console.warn(
        "[profile] Follows typeful schema failed; falling back:",
        eTypeful.message
      );
      try {
        const [[followersCountRow]] = await db.query(
          `SELECT COUNT(*) AS cnt FROM Follows WHERE FolloweeID = ? AND IsDeleted = 0`,
          [listenerId]
        );
        followers = followersCountRow.cnt ?? 0;
        const [[followingCountRow]] = await db.query(
          `SELECT COUNT(*) AS cnt FROM Follows WHERE FollowerID = ? AND IsDeleted = 0`,
          [listenerId]
        );
        following = followingCountRow.cnt ?? 0;
      } catch (eSimple) {
        console.error("[profile] Follows simple schema also failed:", eSimple);
        followers = 0;
        following = 0;
      }
    }

    try {
      const [[playlistsCountRow]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM Playlist WHERE ListenerID = ? AND IsDeleted = 0`,
        [listenerId]
      );
      playlists = playlistsCountRow.cnt ?? 0;
    } catch (e) {
      console.error("[profile] playlists COUNT failed:", e);
      playlists = 0;
    }

    try {
      const [[likedSongsCountRow]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM Liked_Song WHERE ListenerID = ?`,
        [listenerId]
      );
      songs = likedSongsCountRow.cnt ?? 0;
    } catch (e) {
      console.error("[profile] liked songs COUNT failed:", e);
      songs = 0;
    }

    // 6) Respond
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        listener: {
          ListenerID: listener.ListenerID,
          FirstName: listener.FirstName,
          LastName: listener.LastName,
          DateCreated: listener.DateCreated,
          PFP: listener.PFP,
          Bio: listener.Bio,
          Major: listener.Major,
          Minor: listener.Minor,
        },
        counts: { followers, following, playlists, songs },
        favorites: { artists: favArtists, pinnedSong, pinnedPlaylist },
      })
    );
  } catch (e) {
    console.error("profile error (outer):", e);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
