// Centralized API configuration
// Toggle between local and production by changing USE_LOCAL_SERVER

const USE_LOCAL_SERVER = false; // Set to false for production

const LOCAL_API_URL = "http://localhost:3001";
const PRODUCTION_API_URL = "https://server-964167802859.us-south1.run.app";

export const API_BASE_URL = USE_LOCAL_SERVER
  ? LOCAL_API_URL
  : PRODUCTION_API_URL;

console.log("API_BASE_URL:", API_BASE_URL);
