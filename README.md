# Welcome to Coog Music!
## Table of Contents
1. [Overview](#1-overview)
2. [User Roles](#2-user-roles)
3. [Technology Stack](#3-technology-stack)
4. [Folder Structure](#4-folder-structure)
---
## 1. Overview
Coog Music is a full-stack web application designed as a music streaming platform. It connects Listeners and Artists and allows users to stream music, create playlists, and follow their favorite creators. The platform includes a user system (Listener, Artist, Admin) with features for monetization (ads/subscriptions), analytics, and content moderation.

## 2. User Roles

### Listener
Listeners can stream music, manage public and private playlists, follow artists, and upgrade to a premium subscription to remove advertisements.

### Artist
Artists can upload songs and albums, view performance analytics on streams and followers, and purchase advertisement campaigns to promote their work.

### Administrator
Administrators oversee the platform by managing user reports, verifying artist profiles, and monitoring system-wide revenue and user growth analytics.

## 3. Technology Stack
* **Frontend:** React.js
* **Backend:** Node.js
* **Database:** MySQL
* **Hosting/Storage:** AWS

## 4. Folder Structure
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
