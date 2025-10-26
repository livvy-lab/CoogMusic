import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "url";
import jwt from "jsonwebtoken";
import db from "../db.js";
import { parseMultipart, ensureDir } from "../utils/files.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const AUDIO_DIR = path.join(ROOT, "uploads", "audio");
const IMAGE_DIR = path.join(ROOT, "uploads", "images");
ensureDir(AUDIO_DIR);
ensureDir(IMAGE_DIR);

function verifyArtist(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = auth.slice(7);
  const payload = jwt.verify(token, process.env.SECRET_KEY);
  const role = (payload.role || payload.accountType || "").toString().toLowerCase();
  if (role !== "artist") throw new Error("Forbidden");
  return payload;
}
function parseDurationToSeconds(s) {
  if (!s) return null;
  const m = /^(\d+):([0-5]?\d)$/.exec(String(s).trim());
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export async function handleUploadRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;
  if (!pathname.startsWith("/upload")) return;

  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (method === "OPTIONS") { res.writeHead(204).end(); return; }

  try {
    const artist = verifyArtist(req);

    if (method === "POST" && pathname === "/upload/album") {
      const { fields, files } = await parseMultipart(req, { destDir: IMAGE_DIR, allowed: ["image/png","image/jpeg","image/webp"] });
      const title = fields.title?.trim();
      const releaseDate = fields.releaseDate || null;
      const coverRel = files.cover ? `/uploads/images/${files.cover.filename}` : null;
      if (!title) { res.writeHead(400,{"Content-Type":"application/json"}).end(JSON.stringify({error:"title required"})); return; }
      const [r] = await db.query("INSERT INTO Album (Title, ArtistID, ReleaseDate, CoverImagePath) VALUES (?, ?, ?, ?)",
        [title, artist.artistId || artist.id, releaseDate, coverRel]);
      res.writeHead(201,{"Content-Type":"application/json"}).end(JSON.stringify({ albumId: r.insertId, coverImagePath: coverRel }));
      return;
    }

    if (method === "POST" && pathname === "/upload/song") {
      const { fields, files } = await parseMultipart(req, { destDir: AUDIO_DIR, allowed: ["audio/mpeg","audio/mp3","audio/wav","audio/x-wav","audio/flac","audio/aac","audio/ogg"] });
      const title = fields.title?.trim();
      const albumId = fields.albumId ? Number(fields.albumId) : null;
      const genreId = fields.genreId ? Number(fields.genreId) : null;
      const explicit = fields.explicit ? Number(fields.explicit) : 0;
      const durationSeconds = parseDurationToSeconds(fields.duration);
      const audioRel = files.audio ? `/uploads/audio/${files.audio.filename}` : null;
      if (!title || !audioRel) { res.writeHead(400,{"Content-Type":"application/json"}).end(JSON.stringify({error:"title and audio required"})); return; }
      const [sr] = await db.query("INSERT INTO Song (Title, ArtistID, GenreID, Explicit, AudioPath, DurationSeconds) VALUES (?, ?, ?, ?, ?, ?)",
        [title, artist.artistId || artist.id, genreId, explicit, audioRel, durationSeconds]);
      const songId = sr.insertId;
      if (albumId) {
        const trackNumber = fields.trackNumber ? Number(fields.trackNumber) : null;
        await db.query("INSERT INTO Album_Track (AlbumID, SongID, TrackNumber) VALUES (?, ?, ?)", [albumId, songId, trackNumber]);
        if (durationSeconds != null) {
          try {
            await db.query(
              "UPDATE Album a JOIN (SELECT at2.AlbumID, COALESCE(SUM(s.DurationSeconds),0) ttl FROM Album_Track at2 JOIN Song s ON s.SongID=at2.SongID WHERE at2.AlbumID=? ) x ON a.AlbumID=x.AlbumID SET a.TotalDurationSeconds=x.ttl",
              [albumId]
            );
          } catch {}
        }
      }
      res.writeHead(201,{"Content-Type":"application/json"}).end(JSON.stringify({ songId, audioPath: audioRel, durationSeconds }));
      return;
    }

    if (method === "POST" && pathname === "/upload/album-batch") {
      const { fields, files } = await parseMultipart(req, { destDir: AUDIO_DIR });
      const title = fields.title?.trim();
      const releaseDate = fields.releaseDate || null;
      if (!title) { res.writeHead(400,{"Content-Type":"application/json"}).end(JSON.stringify({error:"title required"})); return; }

      let coverRel = null;
      if (files.cover) {
        const destName = `${Date.now()}-${files.cover.filename}`.replace(/[^a-zA-Z0-9_.-]/g,"_");
        const destPath = path.join(IMAGE_DIR, destName);
        fs.renameSync(files.cover.path, destPath);
        coverRel = `/uploads/images/${destName}`;
      }

      await db.beginTransaction();
      try {
        const [ar] = await db.query("INSERT INTO Album (Title, ArtistID, ReleaseDate, CoverImagePath) VALUES (?, ?, ?, ?)",
          [title, artist.artistId || artist.id, releaseDate, coverRel]);
        const albumId = ar.insertId;

        const order = JSON.parse(fields.order || "[]");
        let totalSeconds = 0;

        for (let i = 0; i < order.length; i++) {
          const key = order[i];
          const f = files[key];
          if (!f) continue;
          const meta = JSON.parse(fields[`${key}_meta`] || "{}");
          const songTitle = (meta.title || f.filename || "Untitled").toString().trim();
          const genreId = meta.genreId ? Number(meta.genreId) : null;
          const explicit = meta.explicit ? 1 : 0;
          const dur = parseDurationToSeconds(meta.duration);
          const rel = `/uploads/audio/${path.basename(f.path)}`;

          const [sr] = await db.query(
            "INSERT INTO Song (Title, ArtistID, GenreID, Explicit, AudioPath, DurationSeconds) VALUES (?, ?, ?, ?, ?, ?)",
            [songTitle, artist.artistId || artist.id, genreId, explicit, rel, dur]
          );
          await db.query("INSERT INTO Album_Track (AlbumID, SongID, TrackNumber) VALUES (?, ?, ?)", [albumId, sr.insertId, i + 1]);
          totalSeconds += dur || 0;
        }

        try { await db.query("UPDATE Album SET TotalDurationSeconds=? WHERE AlbumID=?", [totalSeconds, albumId]); } catch {}
        await db.commit();
        res.writeHead(201,{"Content-Type":"application/json"}).end(JSON.stringify({ albumId, totalDurationSeconds: totalSeconds, totalDurationMinutes: Math.round(totalSeconds/60) }));
      } catch (e) {
        await db.rollback();
        res.writeHead(400,{"Content-Type":"application/json"}).end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    if (method === "DELETE" && /^\/upload\/song\/\d+$/.test(pathname)) {
      const songId = Number(pathname.split("/").pop());
      const [rows] = await db.query("SELECT ArtistID, AudioPath FROM Song WHERE SongID=?", [songId]);
      if (!rows.length) { res.writeHead(404).end(); return; }
      if ((artist.artistId || artist.id) !== rows[0].ArtistID) { res.writeHead(403).end(); return; }
      await db.query("DELETE FROM Album_Track WHERE SongID=?", [songId]);
      await db.query("DELETE FROM Song WHERE SongID=?", [songId]);
      try { if (rows[0].AudioPath) { const p = path.join(ROOT, rows[0].AudioPath.replace("/uploads/","uploads/")); if (fs.existsSync(p)) fs.unlinkSync(p); } } catch {}
      res.writeHead(204).end(); return;
    }

    if (method === "DELETE" && /^\/upload\/album\/\d+$/.test(pathname)) {
      const albumId = Number(pathname.split("/").pop());
      const [a] = await db.query("SELECT ArtistID, CoverImagePath FROM Album WHERE AlbumID=?", [albumId]);
      if (!a.length) { res.writeHead(404).end(); return; }
      if ((artist.artistId || artist.id) !== a[0].ArtistID) { res.writeHead(403).end(); return; }
      const [tracks] = await db.query("SELECT s.SongID, s.AudioPath FROM Album_Track at2 JOIN Song s ON s.SongID=at2.SongID WHERE at2.AlbumID=?", [albumId]);
      await db.query("DELETE FROM Album_Track WHERE AlbumID=?", [albumId]);
      await db.query("DELETE FROM Album WHERE AlbumID=?", [albumId]);
      for (const t of tracks) { try { const p = path.join(ROOT, t.AudioPath.replace("/uploads/","uploads/")); if (fs.existsSync(p)) fs.unlinkSync(p); } catch {} }
      try { if (a[0].CoverImagePath) { const p = path.join(ROOT, a[0].CoverImagePath.replace("/uploads/","uploads/")); if (fs.existsSync(p)) fs.unlinkSync(p); } } catch {}
      res.writeHead(204).end(); return;
    }

    res.writeHead(404).end();
  } catch (e) {
    const code = e.message === "Unauthorized" ? 401 : e.message === "Forbidden" ? 403 : 500;
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: e.message }));
  }
}
