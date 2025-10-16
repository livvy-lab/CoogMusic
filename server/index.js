import http from "http";
import { handleAdminRoutes } from "./routes/administrator.js";
import { handleAdViewRoutes } from "./routes/ad_view.js";
import { handleAlbumRoutes } from "./routes/album.js";
import { handleAdRoutes } from "./routes/advertisement.js";
import { handleCompanyRoutes } from "./routes/company.js";
import { handleCompanyBuyRoutes } from "./routes/company_buy.js";
import { handleFollowsRoutes } from "./routes/follows.js";
import { handleGenreRoutes } from "./routes/genre.js";

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
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Endpoint not found" }));
  }
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
