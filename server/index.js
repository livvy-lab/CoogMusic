// server/index.js
import http from "http";
import fs from "fs";
import path from "path";

import { handleAdminRoutes } from "./routes/administrator.js";
import { handleAdViewRoutes } from "./routes/ad_view.js";
import { handleAlbumRoutes } from "./routes/album.js";
import { handleAdRoutes } from "./routes/advertisement.js";
import { handleCompanyRoutes } from "./routes/company.js";
import { handleCompanyBuyRoutes } from "./routes/company_buy.js";
import { handleFollowsRoutes } from "./routes/follows.js";
import { handleGenreRoutes } from "./routes/genre.js";
import { handleListenerRoutes } from "./routes/listener.js";
import { handleListenHistoryRoutes } from "./routes/listen_history.js";
import { handlePlaylistRoutes } from "./routes/playlist.js";
import { handlePlaylistTrackRoutes } from "./routes/playlist_track.js";
import { handleSongRoutes } from "./routes/song.js";
import { handleAuthRoutes } from "./routes/auth.js";
import { handleArtistBuyRoutes } from "./routes/artist_buy.js";
import { handleArtistRoutes } from "./routes/artist.js";
import { handleSongArtistRoutes } from "./routes/song_artist.js";
import { handleSongGenreRoutes } from "./routes/song_genre.js";
import { handleSubscriptionRoutes } from "./routes/subscription.js";
import { handleUserReportsRoutes } from "./routes/user_reports.js";
import { handleAlbumArtistRoutes } from "./routes/album_artist.js";
import { handleAlbumGenreRoutes } from "./routes/album_genre.js";
import { handleAlbumTrackRoutes } from "./routes/album_track.js";
import { handleLikedSongRoutes } from "./routes/liked_song.js";
import { handleLogin } from "./routes/login.js";
import { handleListenerFavoriteArtist } from "./routes/listener_favorite_artist.js";
import { handleListenerProfile } from "./routes/listener_profile.js";
import { handleArtistProfileRoutes } from "./routes/artist_profile.js";
import { handlePlayRoutes } from "./routes/plays.js";
import { handleUploadRoutes } from "./routes/upload.js";
import { handlePfpRoutes } from "./routes/pfp.js";
import { handleSetListenerAvatar } from "./routes/avatar.js";
import { handleSetArtistAvatar } from "./routes/avatar_artist.js";
import { handleLikesPinRoutes } from "./routes/likes_pins.js";

const PORT = process.env.PORT || 3001;

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (pathname.startsWith("/uploads/")) {
      const filePath = path.join(path.resolve("."), "server", pathname.replace("/uploads/", "uploads/"));
      if (fs.existsSync(filePath)) {
        const stream = fs.createReadStream(filePath);
        res.writeHead(200);
        stream.pipe(res);
        return;
      }
      res.writeHead(404);
      res.end();
      return;
    }

    if (pathname.startsWith("/upload/")) { await handleUploadRoutes(req, res); return; }
    if (pathname.startsWith("/pfp")) { await handlePfpRoutes(req, res); return; }

    if (pathname.startsWith("/listeners/") && pathname.endsWith("/avatar")) {
      const id = pathname.split("/")[2];
      if (!/^\d+$/.test(id)) { res.writeHead(400, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "invalid_listener_id" })); return; }
      await handleSetListenerAvatar(req, res, Number(id));
      return;
    }

    if (pathname.startsWith("/artists/") && pathname.endsWith("/avatar")) {
      const id = pathname.split("/")[2];
      if (!/^\d+$/.test(id)) { res.writeHead(400, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "invalid_artist_id" })); return; }
      await handleSetArtistAvatar(req, res, Number(id));
      return;
    }

    if (/^\/listeners\/\d+\/profile$/.test(pathname)) { await handleListenerProfile(req, res); return; }
    if (/^\/listeners\/\d+\/favorite-artists(?:\/.*)?$/.test(pathname)) { await handleListenerFavoriteArtist(req, res); return; }
    if (/^\/artists\/\d+\/(profile|about|top-tracks|discography)$/.test(pathname)) { await handleArtistProfileRoutes(req, res); return; }
    if (pathname === "/plays" || /^\/plays\/streams\/\d+$/.test(pathname)) { await handlePlayRoutes(req, res); return; }
    if (pathname.startsWith("/login")) { await handleLogin(req, res); return; }

    if (pathname.startsWith("/songs/status") || pathname.startsWith("/likes") || pathname.startsWith("/pin")) {
      await handleLikesPinRoutes(req, res); return;
    }

    if (pathname.startsWith("/administrators")) { await handleAdminRoutes(req, res); return; }
    if (pathname.startsWith("/advertisements")) { await handleAdRoutes(req, res); return; }
    if (pathname.startsWith("/albums")) { await handleAlbumRoutes(req, res); return; }
    if (pathname.startsWith("/ad_views")) { await handleAdViewRoutes(req, res); return; }
    if (pathname.startsWith("/companies")) { await handleCompanyRoutes(req, res); return; }
    if (pathname.startsWith("/company_buys")) { await handleCompanyBuyRoutes(req, res); return; }
    if (pathname.startsWith("/follows")) { await handleFollowsRoutes(req, res); return; }
    if (pathname.startsWith("/genres")) { await handleGenreRoutes(req, res); return; }
    if (pathname.includes("/liked_songs")) { await handleLikedSongRoutes(req, res); return; }
    if (pathname.startsWith("/listen_history")) { await handleListenHistoryRoutes(req, res); return; }
    if (pathname.startsWith("/playlists")) { await handlePlaylistRoutes(req, res); return; }
    if (pathname.startsWith("/playlist_tracks")) { await handlePlaylistTrackRoutes(req, res); return; }
    if (pathname.startsWith("/songs")) { await handleSongRoutes(req, res); return; }
    if (pathname.startsWith("/auth")) { await handleAuthRoutes(req, res); return; }
    if (pathname.startsWith("/album_artists")) { await handleAlbumArtistRoutes(req, res); return; }
    if (pathname.startsWith("/album_genres")) { await handleAlbumGenreRoutes(req, res); return; }
    if (pathname.startsWith("/album_tracks")) { await handleAlbumTrackRoutes(req, res); return; }
    if (pathname.startsWith("/artists")) { await handleArtistRoutes(req, res); return; }
    if (pathname.startsWith("/song_artists")) { await handleSongArtistRoutes(req, res); return; }
    if (pathname.startsWith("/song_genres")) { await handleSongGenreRoutes(req, res); return; }
    if (pathname.startsWith("/subscriptions")) { await handleSubscriptionRoutes(req, res); return; }
    if (pathname.startsWith("/user_reports")) { await handleUserReportsRoutes(req, res); return; }
    if (pathname.startsWith("/artist_buys")) { await handleArtistBuyRoutes(req, res); return; }
    if (pathname.startsWith("/listeners")) { await handleListenerRoutes(req, res); return; }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Endpoint not found" }));
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
