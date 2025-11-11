const KEY = "user";

export function setUser(user) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function getUser() {
  try {
    // Some parts of the app store the user under 'user' and others under 'listener'.
    const raw = localStorage.getItem(KEY) || localStorage.getItem('listener') || null;
    return JSON.parse(raw || "null");
  } catch { return null; }
}

export function clearUser() {
  localStorage.removeItem(KEY);
}
