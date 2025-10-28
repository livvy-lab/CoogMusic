import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireArtist({ children }) {
  const [isArtist, setIsArtist] = useState(null);
  const location = useLocation();

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      const accountType = (stored?.accountType || "").toLowerCase();
      const artistId = stored?.artistId ?? stored?.ArtistID ?? null;
      setIsArtist(accountType === "artist" || !!artistId);
    } catch {
      setIsArtist(false);
    }
  }, []);

  // still loading
  if (isArtist === null) return null;

  if (!isArtist) {
    // redirect non-artists to home (or login)
    return <Navigate to="/home" replace state={{ from: location }} />;
  }

  return children;
}
