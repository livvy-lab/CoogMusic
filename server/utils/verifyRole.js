import jwt from "jsonwebtoken";

export function verifyArtist(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, process.env.SECRET_KEY);

  if (!decoded || decoded.role?.toLowerCase() !== "artist") {
    throw new Error("Forbidden: artist role required");
  }

  return decoded; 
}
