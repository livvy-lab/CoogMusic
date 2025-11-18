const KEY = "user";

export function setUser(user) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function getUser() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem('listener') || null;
    const parsed = JSON.parse(raw || "null");
    
    if (parsed && !parsed.artistId && parsed.ArtistID) {
      parsed.artistId = parsed.ArtistID;
    }
    
    return parsed;
  } catch (err) {
    console.error("Error parsing user from storage:", err);
    return null;
  }
}

export function clearUser() {
  localStorage.removeItem(KEY);
  localStorage.removeItem('listener'); // Also clear fallback key
}
