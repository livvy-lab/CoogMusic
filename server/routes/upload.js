import { parse } from "url";
import path from "path";
import db from "../db.js";
import { parseMultipart, ensureDir } from "../utils/files.js";

export async function handleUploadRoutes(req, res) {
const { pathname } = parse(req.url, true);
const method = req.method;


res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");


if (method === "OPTIONS") {
res.writeHead(204);
res.end();
return;
}


try {
if (method === "POST" && pathname === "/upload/album") {
const { fields, files } = await parseMultipart(req, { destDir: IMAGE_DIR, allowed: ["image/png", "image/jpeg", "image/webp"] });
const title = fields.title?.trim();
const artistId = Number(fields.artistId);
const releaseDate = fields.releaseDate || null;
const coverRel = files.cover ? `/uploads/images/${files.cover.filename}` : null;
if (!title || !artistId) {
res.writeHead(400, { "Content-Type": "application/json" });
res.end(JSON.stringify({ error: "title and artistId required" }));
return;
}
const [result] = await db.query(
"INSERT INTO Album (Title, ArtistID, ReleaseDate, CoverImagePath) VALUES (?, ?, ?, ?)",
[title, artistId, releaseDate, coverRel]
);
res.writeHead(201, { "Content-Type": "application/json" });
res.end(JSON.stringify({ albumId: result.insertId, coverImagePath: coverRel }));
return;
}


if (method === "POST" && pathname === "/upload/song") {
const { fields, files } = await parseMultipart(req, { destDir: AUDIO_DIR, allowed: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/flac", "audio/aac", "audio/ogg"] });
const title = fields.title?.trim();
const artistId = Number(fields.artistId);
const albumId = fields.albumId ? Number(fields.albumId) : null;
const genreId = fields.genreId ? Number(fields.genreId) : null;
const explicit = fields.explicit ? Number(fields.explicit) : 0;
const audioRel = files.audio ? `/uploads/audio/${files.audio.filename}` : null;
if (!title || !artistId || !audioRel) {
res.writeHead(400, { "Content-Type": "application/json" });
res.end(JSON.stringify({ error: "title, artistId, and audio file required" }));
return;
}
const [songResult] = await db.query(
"INSERT INTO Song (Title, ArtistID, GenreID, Explicit, AudioPath) VALUES (?, ?, ?, ?, ?)",
[title, artistId, genreId, explicit, audioRel]
);
const songId = songResult.insertId;
if (albumId) {
await db.query("INSERT INTO Album_Track (AlbumID, SongID, TrackNumber) VALUES (?, ?, ?)", [albumId, songId, fields.trackNumber ? Number(fields.trackNumber) : null]);
}
res.writeHead(201, { "Content-Type": "application/json" });
res.end(JSON.stringify({ songId, audioPath: audioRel }));
return;
}
} catch (e) {
res.writeHead(500, { "Content-Type": "application/json" });
res.end(JSON.stringify({ error: e.message }));
return;
}
}
