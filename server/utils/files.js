import formidable from "formidable";
import os from "os";
import fs from "fs";
import path from "path";

// Single, safe upload directory under OS tmp
const TMP_ROOT = path.join(os.tmpdir(), "coogmusic-uploads");
function ensureUploadDir(dir) {
  // No existsSync needed; mkdirSync with recursive is idempotent
  if (typeof dir === "string" && dir.length > 0) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  }
}

function pickFirst(x) {
  if (!x) return undefined;
  return Array.isArray(x) ? x[0] : x;
}

const EXT_TO_AUDIO_MIME = {
  ".mp3": "audio/mpeg",
  ".mpeg": "audio/mpeg",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".aac": "audio/aac",
  ".m4a": "audio/mp4",
  ".mp4": "audio/mp4",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".webm": "audio/webm",
};

function inferAudioMimeFromName(name) {
  const ext = path.extname(String(name || "")).toLowerCase();
  return EXT_TO_AUDIO_MIME[ext] || null;
}

function isAllowedMime(mime, allowed) {
  if (!allowed || allowed.length === 0) return true;
  if (!mime) return false;
  if (allowed.includes(mime)) return true;
  // Support wildcard types like image/*, audio/*, video/*, application/*
  for (const a of allowed) {
    if (typeof a === "string" && a.endsWith("/*")) {
      const prefix = a.slice(0, a.indexOf("/"));
      if (mime.startsWith(prefix + "/")) return true;
    }
  }
  return false;
}

export async function parseMultipart(req, { allowed = ["audio/*"], maxMB = 80 } = {}) {
  ensureUploadDir(TMP_ROOT);

  const form = formidable({
    uploadDir: TMP_ROOT,
    keepExtensions: true,
    multiples: false,
    allowEmptyFiles: false,
    minFileSize: 1,
    maxFileSize: maxMB * 1024 * 1024,

    // If it's a text field (part.originalFilename is null), keep it
    // If it is a file, we check its name against the allowed file field names
    filter: (part) => {
      if (!part.originalFilename) {
        return true; // Keep all text fields
      }
      const allowedFileNames = ["audio", "file", "upload", "adFile", "image"];
      return allowedFileNames.includes(part.name);
    },

    // Preserve the original extension; add a timestamp to avoid collisions
    filename: (name, ext, part) => {
      const orig = part.originalFilename || "upload";
      const base = path.basename(orig, path.extname(orig));
      const safeBase = String(base).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "upload";
      const extension = path.extname(orig) || ext || "";
      return `${safeBase}-${Date.now()}${extension}`;
    },
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fieldsRaw, filesRaw) => {
      if (err) return reject(err);

      // normalize fields to single values
      const fields = {};
      for (const [k, v] of Object.entries(fieldsRaw || {})) {
        fields[k] = Array.isArray(v) ? v[0] : v;
      }

      // accept common keys: audio / file / upload / adFile
      // check for 'image' as used in SongForm
      const f =
        pickFirst(filesRaw?.audio) ||
        pickFirst(filesRaw?.file) ||
        pickFirst(filesRaw?.upload) ||
        pickFirst(filesRaw?.adFile) ||
        pickFirst(filesRaw?.image); // added 'image' for your cover upload

      if (!f) return resolve({ fields, files: {} });

      const normalized = {
        filepath: f.filepath || f.path || f.tempFilePath || null,
        originalFilename:
          f.originalFilename || f.newFilename || f.filename || f.name || "",
        mimetype: f.mimetype || f.type || f.mimeType || "",
        size: typeof f.size === "number" ? f.size : Number(f.size || 0),
      };

      // Ensure a temp file path exists and is a string
      if (typeof normalized.filepath !== "string" || normalized.filepath.length === 0) {
        const e = new Error("tempfile_missing"); // Changed key to be more generic
        e.code = "TEMPFILE_MISSING";
        return reject(e);
      }

      // Infer MIME if blank/octet-stream
      let mime = normalized.mimetype;
      if (!mime || mime === "application/octet-stream") {
        const inferred = inferAudioMimeFromName(normalized.originalFilename);
        if (inferred) mime = inferred;
      }
      normalized.mimetype = mime || "application/octet-stream";

      // Enforce allowed mimes (supports "audio/*")
      if (!isAllowedMime(normalized.mimetype, allowed)) {
        // Best-effort cleanup; path is known string per guard above
        try { fs.rmSync(normalized.filepath, { force: true }); } catch {}
        const e = new Error(`unsupported_mime:${normalized.mimetype}`);
        e.code = "UNSUPPORTED_MIME";
        return reject(e);
      }

      // resolve with the key that was found
      const resolvedFiles = {};
      const key = f === pickFirst(filesRaw?.audio) ? "audio" :
                  f === pickFirst(filesRaw?.image) ? "image" :
                  f === pickFirst(filesRaw?.file) ? "file" :
                  f === pickFirst(filesRaw?.upload) ? "upload" :
                  f === pickFirst(filesRaw?.adFile) ? "adFile" : "unknown";

      if (key !== 'unknown') {
        resolvedFiles[key] = normalized;
      }

      resolve({ fields, files: resolvedFiles });
    });
  });
}
