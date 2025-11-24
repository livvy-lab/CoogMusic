# Welcome to Coog Music!
Coog Music is a full stack web application designed as a music streaming platform for UH students and alumni. It connects Listeners and Artists for an interactive experience through music streaming, playlist curation, and social engagement. The platform implements a user role system (Listener, Artist, Admin) with features such as tiered monetization, performance analytics , and administrative moderation.

## Table of Contents
1. [Deployment](#deployment)
2. [User Roles](#user-roles)
3. [Technology Stack](#technology-stack)
4. [Folder Structure](#folder-structure)
5. [Installation & Setup](#installation--setup)
6. [Contributors](#contributors)
---
## Deployment
https://client-964167802859.us-south1.run.app/login

## User Roles

### Listener
Listeners can stream music, manage public and private playlists, follow artists, and upgrade to a premium subscription to remove advertisements.

### Artist
Artists can upload songs and albums, view performance analytics on streams and followers, and purchase advertisement campaigns to promote their work.

### Administrator
Administrators oversee the platform by managing user reports, verifying artist profiles, and monitoring system-wide revenue and user growth analytics.

## Technology Stack
* **Frontend:** React.js
* **Backend:** Node.js
* **Database:** MySQL
* **Hosting/Storage:** AWS

## Folder Structure
```text
CoogMusic/
├── .anima/
├── client/                     # React Frontend
│   ├── public/                 # Static public assets
│   ├── scripts/                # Build/Utility scripts
│   └── src/
│       ├── assets/             # Icons
│       ├── components/         # Reusable UI components
│       ├── config/             # Frontend configuration
│       ├── context/            # React Context (State Management)
│       ├── hooks/              # Custom React Hooks
│       ├── lib/                # Utility libraries
│       ├── pages/              # Main application pages
│       └── styles/             # Global CSS styles
│
└── server/                     # Node.js Backend
    ├── routes/                 # API Route Handlers
    ├── sql/                    # SQL scripts and queries
    ├── utils/                  # Helper functions
    └── index.js                # Server entry point
```

## Installation & Setup

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

## Contributors
- [Liv](https://github.com/livvy-lab)
- [Kenth](https://github.com/kztecson)
- [Vinny](https://github.com/vinnydycruz)
- [Diana](https://github.com/dianaxnguyen)
- [Sid](https://github.com/siddharthpanchal20)
