import http from "http";
import { parse } from "url";
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

const PORT = 3001;

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/administrators")) {
    handleAdminRoutes(req, res);
  } else if (req.url.startsWith("/advertisements")) {
    handleAdRoutes(req, res);
  } else if (req.url.startsWith("/albums")) {
    handleAlbumRoutes(req, res);
  } else if (req.url.startsWith("/ad_views")) {
    handleAdViewRoutes(req, res);
  } else if (req.url.startsWith("/companies")) {
    handleCompanyRoutes(req, res);
  } else if (req.url.startsWith("/company_buys")) {
    handleCompanyBuyRoutes(req, res);
  } else if (req.url.startsWith("/follows")) {
    handleFollowsRoutes(req, res);
  } else if (req.url.startsWith("/genres")) {
    handleGenreRoutes(req, res);
  } else if (req.url.includes("/liked_songs")) {
    handleLikedSongRoutes(req, res);
  } else if (req.url.startsWith("/listeners")) {
    handleListenerRoutes(req, res);
  } else if (req.url.startsWith("/listen_history")) {
    handleListenHistoryRoutes(req, res);
  } else if (req.url.startsWith("/playlists")) {
    handlePlaylistRoutes(req, res);
  } else if (req.url.startsWith("/playlist_tracks")) {
    handlePlaylistTrackRoutes(req, res);
  } else if (req.url.startsWith("/songs")) {
    handleSongRoutes(req, res);
  } else if (req.url.startsWith("/auth")) {
    handleAuthRoutes(req, res);
  } else if (req.url.startsWith("/album_artists")){
    handleAlbumArtistRoutes(req, res);
  } else if (req.url.startsWith("/album_genres")){
    handleAlbumGenreRoutes(req, res);
  } else if (req.url.startsWith("/album_tracks")){
    handleAlbumTrackRoutes(req, res);
  } else if (req.url.startsWith("/artists")){
    handleArtistRoutes(req, res);
  } else if (req.url.startsWith("/song_artists")) {
    handleSongArtistRoutes(req, res);
  } else if (req.url.startsWith("/song_genres")) {
    handleSongGenreRoutes(req, res);
  } else if (req.url.startsWith("/subscriptions")) {
    handleSubscriptionRoutes(req, res);
  } else if (req.url.startsWith("/user_reports")) {
    handleUserReportsRoutes(req, res);
  } else if (req.url.startsWith("/artist_buys")){
    handleArtistBuyRoutes(req, res);
  }
  else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Endpoint not found" }));
  }
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
