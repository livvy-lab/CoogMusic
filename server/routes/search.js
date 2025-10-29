import db from "../db.js";

function notDeleted(column = "IsDeleted") {
  return `(${column} IS NULL OR ${column} = 0)`;
}

export async function handleSearchRoutes(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname, searchParams } = url;
  if (!(req.method === "GET" && pathname === "/search")) return;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const q = (searchParams.get("q") || "").trim();
  const empty = { songs: [], artists: [], listeners: [], albums: [], playlists: [] };

  if (!q) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ query: "", groups: empty }));
    return;
  }

  const like = `%${q}%`;

  try {
    const [songs] = await db.query(
      `SELECT s.SongID AS id, s.Title AS title, 'song' AS type
       FROM Song s
       WHERE ${notDeleted("s.IsDeleted")} AND s.Title LIKE ?
       LIMIT 25`,
      [like]
    );

    const [artists] = await db.query(
      `SELECT a.ArtistID AS id, a.ArtistName AS title, 'artist' AS type
       FROM Artist a
       WHERE ${notDeleted("a.IsDeleted")} AND a.ArtistName LIKE ?
       LIMIT 15`,
      [like]
    );

    const [listeners] = await db.query(
      `SELECT l.ListenerID AS id,
              TRIM(CONCAT_WS(' ', NULLIF(l.FirstName,''), NULLIF(l.LastName,''))) AS title,
              'listener' AS type
       FROM Listener l
       WHERE (${notDeleted("l.IsDeleted")})
         AND (
           COALESCE(l.FirstName,'') LIKE ?
           OR COALESCE(l.LastName,'') LIKE ?
           OR TRIM(CONCAT_WS(' ', COALESCE(l.FirstName,''), COALESCE(l.LastName,''))) LIKE ?
         )
       LIMIT 15`,
      [like, like, like]
    );

    const [albums] = await db.query(
      `SELECT al.AlbumID AS id, al.Title AS title, 'album' AS type
       FROM Album al
       WHERE ${notDeleted("al.IsDeleted")} AND al.Title LIKE ?
       LIMIT 15`,
      [like]
    );

    const [playlists] = await db.query(
      `SELECT p.PlaylistID AS id, p.Name AS title, 'playlist' AS type
       FROM Playlist p
       WHERE ${notDeleted("p.IsDeleted")} AND p.Name LIKE ?
       LIMIT 15`,
      [like]
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ query: q, groups: { songs, artists, listeners, albums, playlists } }));
  } catch (e) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ query: q, groups: empty }));
  }
}
