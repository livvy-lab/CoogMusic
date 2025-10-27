import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Busboy from "busboy";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export function ensureDir(p) {
if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}


export function parseMultipart(req, { destDir, allowed } = {}) {
return new Promise((resolve, reject) => {
const bb = Busboy({ headers: req.headers, limits: { files: 2, fileSize: 1024 * 1024 * 100 } });
const fields = {};
const files = {};
ensureDir(destDir);
bb.on("field", (name, val) => {
fields[name] = val;
});
bb.on("file", (name, file, info) => {
const { filename, mimeType } = info;
if (allowed && !allowed.includes(mimeType)) return file.resume();
const safeName = Date.now() + "-" + filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
const savePath = path.join(destDir, safeName);
const ws = fs.createWriteStream(savePath);
file.pipe(ws);
files[name] = { filename: safeName, path: savePath, mime: mimeType };
});
bb.on("close", () => resolve({ fields, files }));
bb.on("error", reject);
req.pipe(bb);
});
}
