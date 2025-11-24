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
Follow these steps to get the project running on your local machine for testing
Prerequisites

Node.js (v16+ recommended)

npm (comes with Node.js)

MySQL server (or compatible SQL database)

AWS credentials/configuration (if using AWS services for hosting/storage)

Git (to clone the repo)

1. Clone the repository
git clone https://github.com/livvy-lab/CoogMusic.git
cd CoogMusic

2. Set up the backend
cd server
npm install


Create a .env file in the server/ or root directory

Populate .env with required environment variables, e.g.:

DB_HOST=<your-mysql-host>
DB_USER=<your-mysql-username>
DB_PASSWORD=<your-mysql-password>
DB_NAME=<your-database-name>

AWS_ACCESS_KEY_ID=<your AWS access key>
AWS_SECRET_ACCESS_KEY=<your AWS secret key>
AWS_S3_BUCKET=<your S3 bucket name>


Run database migrations / SQL scripts located in server/sql/ (if applicable) to initialize the schema

3. Set up the frontend
cd ../client
npm install


In the client/ directory, locate a configuration file (for example config, src/config, or src/apiConfig.ts) and update the backend API URL. Example:

const backendBaseUrl = 'http://localhost:3001';  

Frontend will run on the port 5173

Also configure any AWS-storage endpoints or other environment values if needed (e.g., for uploading songs).

4. Running the application locally
Running the backend

From server/ directory:

npm start   

Ensure the backend is listening (e.g., on http://localhost:3001). It will say Connected to MySQL (pool) Server running on port 3001

Running the frontend

From client/ directory:

npm run dev     # for example, using Vite or similar dev server

Open http://localhost:5173 in your browser to view the app

6. Configuration & Environment Notes

Make sure your MySQL database is accessible and that the user has the necessary permissions (CREATE, SELECT, INSERT, UPDATE, DELETE).

If using AWS S3 for storage of music/assets: ensure the bucket policy allows required read/write operations and the environment variables above are correctly set.

For local development, you may use a local S3 emulator or other storage mock if desired.

Ensure CORS (Cross Origin Resource Sharing) is correctly configured on the backend so the frontend can make API requests

7. Troubleshooting

If the frontend cannot reach the backend: check API URL in client configuration, ensure backend is running and listening on the correct port, check firewalls/localhost bindings.

If the backend cannot connect to MySQL: verify host, port, credentials; check that MySQL service is running.

If uploads to S3 fail: check AWS credentials, bucket permissions, region configuration, and ensure server has network access to S3

## Contributors
- [Liv](https://github.com/livvy-lab)
- [Kenth](https://github.com/kztecson)
- [Vinny](https://github.com/vinnydycruz)
- [Diana](https://github.com/dianaxnguyen)
- [Sid](https://github.com/siddharthpanchal20)
