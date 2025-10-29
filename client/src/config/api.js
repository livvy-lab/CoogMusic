// Centralized API configuration
// In production (Vercel), VITE_API_URL should point to Railway backend
// In development, it falls back to localhost:3001
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
