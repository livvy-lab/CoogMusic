import http from "http";
import { handleAdminRoutes } from "./routes/administrator.js";
import { handleAdViewRoutes } from "./routes/ad_view.js";
import { handleAlbumRoutes } from "./routes/album.js";
import { handleAdRoutes } from "./routes/advertisement.js";
import { handleCompanyRoutes } from "./routes/company.js";
import { handleListenerRoutes } from "./routes/listener.js";
import { handleListenHistoryRoutes } from "./routes/listen_history.js";
import { handlePlaylistRoutes } from "./routes/playlist.js";
import { handlePlaylistTrackRoutes } from "./routes/playlist_track.js";
import { handleSongRoutes } from "./routes/song.js";



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
  } else if (req.url.startsWith("/listeners")) {
    handleListenerRoutes(req, res);
}   else if (req.url.startsWith("/listen_history")) {
    handleListenHistoryRoutes(req, res);
}   else if (req.url.startsWith("/playlists")) {
    handlePlaylistRoutes(req, res);
}   else if (req.url.startsWith("/playlist_tracks")) {
    handlePlaylistTrackRoutes(req, res);
}   else if (req.url.startsWith("/songs")) {
    handleSongRoutes(req, res);
}   else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Endpoint not found" }));
  }
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
