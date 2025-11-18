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
import { handlePremiumRoutes } from "./routes/premium.js";
import { handleNotificationRoutes } from "./routes/notifications.js";
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
import { handleLikesPins } from "./routes/likes_pins.js";
import { handleMediaRoutes } from "./routes/media.js";
import { handleSearchRoutes } from "./routes/search.js";
import { handleArtistAnalyticsRoutes } from "./routes/artist_analytics.js";
import { handleListenerAnalyticsRoutes } from "./routes/listener_analytics.js";
import { handleAdminAnalyticsRoutes } from "./routes/admin_analytics.js";
import { handleAchievements } from "./routes/achievements.js";
import { handleSoftDeleteRoutes } from "./routes/soft_delete.js";
import { handleRecentUsersRoutes } from "./routes/users_recent.js";
import { handleAdminSongReport } from "./routes/admin_song_report.js";
import { handleRevenueReport } from "./routes/revenue_report.js";
import { handleAdminUserRoutes } from "./routes/admin_users.js";


const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  "https://coog-music3.vercel.app,https://coog-music3-vdycruz-8059s-projects.vercel.app,http://localhost:5173"
)
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

function applyCORS(req, res) {
  const origin = req.headers.origin || "";
  res.setHeader("Vary", "Origin");
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  applyCORS(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (pathname === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

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

    // ───────────────────────────────────────────────
    // Uploads & Media endpoints
    // ───────────────────────────────────────────────
    if (pathname.startsWith("/upload/")) { 
      await handleUploadRoutes(req, res); 
      return; 
    }
    if (pathname.startsWith("/pfp")) { 
      await handlePfpRoutes(req, res); 
      return; 
    }

    // Route media endpoints (upload + media lookup + song/album cover association)
    if (pathname.startsWith("/media") || /^\/(?:songs|albums)\/\d+\/cover$/.test(pathname)) {
      await handleMediaRoutes(req, res);
      return;
    }

    if (pathname.startsWith("/api/soft_delete")) {
      await handleSoftDeleteRoutes(req, res);
      return;
    }

    if (pathname.startsWith("/listeners/") && pathname.endsWith("/avatar")) {
      const id = pathname.split("/")[2];
      if (!/^\d+$/.test(id)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_listener_id" }));
        return;
      }
      await handleSetListenerAvatar(req, res, Number(id));
      return;
    }

    if (pathname.startsWith("/artists/") && pathname.endsWith("/avatar")) {
      const id = pathname.split("/")[2];
      if (!/^\d+$/.test(id)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_artist_id" }));
        return;
      }
      await handleSetArtistAvatar(req, res, Number(id));
      return;
    }

    // ───────────────────────────────────────────────
    // Listener + Artist profile routes
    // ───────────────────────────────────────────────
    if (/^\/listeners\/\d+\/profile$/.test(pathname)) { 
      await handleListenerProfile(req, res); 
      return; 
    }
    if (/^\/listeners\/\d+\/favorite-artists(?:\/.*)?$/.test(pathname)) { 
      await handleListenerFavoriteArtist(req, res); 
      return; 
    }
    if (/^\/artists\/\d+\/(profile|about|top-tracks|discography)$/.test(pathname)) { 
      await handleArtistProfileRoutes(req, res); 
      return; 
    }
    
    if (pathname.startsWith("/achievements/listener/")) {
      req.url = pathname.replace("/achievements", "");
      await handleAchievements(req, res);
      return;
    }

    // ───────────────────────────────────────────────
    // Plays + Login
    // ───────────────────────────────────────────────
    if (pathname.startsWith("/plays")) { 
      await handlePlayRoutes(req, res); 
      return; 
    }
    if (pathname.startsWith("/login")) { 
      await handleLogin(req, res); 
      return; 
    }

    // ───────────────────────────────────────────────
    // Likes + Pins (songs + artists join table)
    // ───────────────────────────────────────────────
    if (
      pathname.startsWith("/songs/status") ||
      pathname.startsWith("/likes") ||
      pathname.startsWith("/pin") ||
      /^\/listeners\/\d+\/pins\/artists(?:\/\d+)?$/.test(pathname) ||
      /^\/listeners\/\d+\/pins\/playlist$/.test(pathname)
    ) {
      await handleLikesPins(req, res);
      return;
    }

    if (pathname.startsWith("/search")) { 
      await handleSearchRoutes(req, res); 
      return; 
    }

    if (pathname === "/admin/song-report") {
      return handleAdminSongReport(req, res);
    }

    if (pathname === "/api/analytics/admin/revenue") {
    await handleRevenueReport(req, res);
    return;
    }

    if (pathname.startsWith("/admin/users") || pathname.startsWith("/admin/artists/")) {
    await handleAdminUserRoutes(req, res);
    return;
   }

    // ───────────────────────────────────────────────
    // Main API routes
    // ───────────────────────────────────────────────
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
    if (pathname.startsWith("/subscriptions") || pathname.startsWith("/subscription-plans")) { 
      await handleSubscriptionRoutes(req, res); 
      return; 
    }
    if (pathname.startsWith("/premium")) { await handlePremiumRoutes(req, res); return; }
    if (pathname.startsWith("/notifications")) { await handleNotificationRoutes(req, res); return; }
    if (pathname.startsWith("/user_reports")) { await handleUserReportsRoutes(req, res); return; }
    if (pathname.startsWith("/artist_buys")) { await handleArtistBuyRoutes(req, res); return; }
    if (pathname.startsWith("/listeners")) { await handleListenerRoutes(req, res); return; }
    if (pathname.startsWith("/analytics/artist")) { await handleArtistAnalyticsRoutes(req, res); return; }
    if (pathname.startsWith("/analytics/listener")) { await handleListenerAnalyticsRoutes(req, res); return; }
    if (pathname.startsWith("/analytics/admin")) { await handleAdminAnalyticsRoutes(req, res); return; }
    if (pathname === "/users/recent") { await handleRecentUsersRoutes(req, res); return; }

    // ───────────────────────────────────────────────
    // Fallback - 404
    // ───────────────────────────────────────────────
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Endpoint not found" }));

  } catch (e) {
    console.error("Server error:", e);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
});

server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
