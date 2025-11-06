# Quick Start: Testing Profile Pictures Locally

## What Changed?
✅ Search results now show profile pictures for Artists and Listeners/Profiles
✅ Easy toggle between local and production API in `client/src/config/api.js`

## Setup (First Time Only)

### 1. Create Environment File
```powershell
# In the project root directory
Copy-Item .env.example .env
```

Edit `.env` with your database credentials and other settings.

### 2. Install Dependencies (if not already done)
```powershell
# Install backend dependencies
cd server
npm install
cd ..

# Install frontend dependencies
cd client
npm install
cd ..
```

## Running Locally

### Quick Start (Recommended)
Just run the PowerShell script from the project root:

```powershell
.\start-local.ps1
```

This will:
- ✅ Start the backend server on port 3001
- ✅ Start the frontend on port 5173
- ✅ Open your browser automatically
- ✅ Show both servers in separate windows

### Manual Start (Alternative)

**Terminal 1 - Backend:**
```powershell
cd server
npm start
```

**Terminal 2 - Frontend:**
```powershell
cd client
npm run dev
```

Then open http://localhost:5173 in your browser.

## Testing the Profile Pictures

1. Go to http://localhost:5173
2. Use the search bar to search for:
   - Artist names (will show artist profile pictures)
   - User names (will show listener profile pictures)
3. Profile pictures will appear in:
   - Search result rows (56x56px circular for profiles/artists)
   - Top result card (96x96px circular for profiles/artists)

## Switching Between Local and Production

Edit `client/src/config/api.js`:

```javascript
const USE_LOCAL_SERVER = true;  // For local testing
// const USE_LOCAL_SERVER = false;  // For production
```

**Current Setting:** LOCAL (true) - connects to http://localhost:3001

## Stopping the Servers

If you used `start-local.ps1`:
- Close the two PowerShell windows that opened

If you started manually:
- Press `Ctrl+C` in each terminal window

## Files Modified

### Backend Changes:
- `server/routes/search.js` - Added pfpUrl to artist and listener queries

### Frontend Changes:
- `client/src/pages/SearchResults.jsx` - Display profile pictures in search results
- `client/src/config/api.js` - Easy local/production toggle

### New Files:
- `.env.example` - Template for environment variables
- `start-local.ps1` - Convenient startup script
- `LOCAL_DEVELOPMENT.md` - Detailed setup guide
- `QUICK_START.md` - This file!

## Need Help?

See `LOCAL_DEVELOPMENT.md` for detailed troubleshooting and configuration options.
