# Local Development Setup Guide

This guide will help you run CoogMusic locally for testing and development.

## Prerequisites

- Node.js (v16 or higher)
- MySQL database
- AWS account (for S3 storage) - optional for basic testing

## Step-by-Step Setup

### 1. Environment Configuration

Create a `.env` file in the root directory by copying the example:

```powershell
Copy-Item .env.example .env
```

Then edit `.env` with your actual credentials:
- Database credentials (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
- AWS credentials (if using S3 for media storage)
- JWT_SECRET (can be any random string for local testing)

### 2. Install Dependencies

#### Install Server Dependencies
```powershell
cd server
npm install
cd ..
```

#### Install Client Dependencies
```powershell
cd client
npm install
cd ..
```

### 3. Configure API URL

The API URL is controlled in `client/src/config/api.js`:

```javascript
const USE_LOCAL_SERVER = true; // Set to true for local testing
```

- **Local Development**: Set `USE_LOCAL_SERVER = true`
- **Production**: Set `USE_LOCAL_SERVER = false`

### 4. Start the Application

#### Option A: Manual Start (Two Terminals)

**Terminal 1 - Start Backend Server:**
```powershell
cd server
npm start
```
Server will run on http://localhost:3001

**Terminal 2 - Start Frontend Client:**
```powershell
cd client
npm run dev
```
Client will run on http://localhost:5173

#### Option B: Using PowerShell Script

Create a `start-local.ps1` script in the root directory:

```powershell
# Start backend in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; npm start"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev"

Write-Host "Starting CoogMusic locally..."
Write-Host "Backend: http://localhost:3001"
Write-Host "Frontend: http://localhost:5173"
```

Then run:
```powershell
.\start-local.ps1
```

### 5. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

The frontend will communicate with the backend at `http://localhost:3001`

## Testing Your Changes

After making changes to the search functionality:

1. Make sure the backend server is running
2. The client will hot-reload automatically when you save files
3. Check the browser console for any errors
4. Test searching for profiles and artists to see the profile pictures

## Troubleshooting

### Server won't start
- Check that port 3001 is not already in use
- Verify database credentials in `.env`
- Check MySQL is running and accessible

### Client won't start
- Check that port 5173 is not already in use
- Run `npm install` in the client directory

### CORS errors
- Ensure `ALLOWED_ORIGINS` in `.env` includes `http://localhost:5173`
- Restart the server after changing `.env`

### Profile pictures not showing
- Check that the database has profile picture data
- Verify AWS credentials if using S3
- Check browser console for image loading errors

## Switching to Production

When ready to deploy or test against production:

1. Open `client/src/config/api.js`
2. Change `USE_LOCAL_SERVER = false`
3. The app will now use the production API

## Project Structure

```
CoogMusic/
├── server/              # Backend API (Node.js)
│   ├── routes/         # API route handlers
│   ├── db.js           # Database connection
│   └── index.js        # Server entry point
├── client/             # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/      # Page components
│   │   └── config/     # Configuration files
│   └── package.json
└── .env               # Environment variables (create from .env.example)
```

## Additional Commands

### Backend
```powershell
cd server
npm start          # Start server
```

### Frontend
```powershell
cd client
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run linter
```
