const KEY = "user";

export function setUser(user) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
  catch { return null; }
}

export function clearUser() {
  localStorage.removeItem(KEY);
}
