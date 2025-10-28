# FPP Light Show Control Website

This is a Next.js web application for controlling Falcon Player (FPP) light shows. It provides a user-friendly interface to manage playlists, sequences, and system settings remotely.

## Features

- **Dashboard**: View current FPP status, including playing playlist/sequence, mode, and volume control.
- **Playlist Control**: List available playlists and start/stop them.
- **Sequence Control**: List available sequences and start/stop them.
- **API Proxy**: Backend routes proxy requests to FPP's local APIs (web API and FPPD API).

## Prerequisites

- FPP (Falcon Player) installed and running on the same machine.
- Node.js and npm installed.

## Installation

1. Clone or download this project.
2. Install dependencies:

```bash
npm install
```

## Running the Application

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

Update the FPP IP address in `app/api/fppd/[...slug]/route.ts` and `app/api/web/[...slug]/route.ts` if your FPP instance is not on 192.168.5.2.

## API Endpoints

The application proxies API calls to FPP:

- `/api/fppd/*` → `http://192.168.5.2/api/fppd/*` (FPPD daemon API for status and volume)
- `/api/web/*` → `http://192.168.5.2/api/*` (FPP web API for playlists, sequences, schedule)
- Commands are sent via `POST /api/web/command` with JSON payload: `{"command": "CommandName", "args": [...]}`

## Authentication

The application supports two user types:

- **Standard Users**: No login required, location-based access control
- **Admin Users**: OAuth login (Google, Facebook) for full control

### Admin Setup

1. Create OAuth apps:
   - [Google Console](https://console.cloud.google.com/) - Create credentials
   - [Facebook Developers](https://developers.facebook.com/) - Create app

2. Add to `.env.local`:
   ```
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   FACEBOOK_CLIENT_ID=your-facebook-client-id
   FACEBOOK_CLIENT_SECRET=your-facebook-client-secret
   ADMIN_EMAILS=admin@example.com,another-admin@example.com
   ```

3. Admins can sign in via the dashboard to access volume controls and other admin features.

## Location-Based Access

Standard users (non-admins) must be within 1 mile of the FPP location to access controls:

- **Coordinates**: 36.47066867976104, -89.10852792197582
- **Radius**: 2 miles
- **Browser Permission**: Users must allow location access
- **Admin Bypass**: Signed-in admins can access from anywhere

If location access is denied or the user is too far, a restriction message is displayed.

## Voting System

Users can vote on sequences using thumbs up/down buttons:

- **Storage**: SQLite database (`votes.db`)
- **Tracking**: Votes by sequence name with user IP for uniqueness
- **Display**: Vote counts shown next to each sequence
- **Admin Access**: Admins can view voting analytics

Vote data helps improve future show playlists based on user preferences.

## Admin Features

Admin users (authenticated via OAuth) have access to:

- **Volume Control**: Adjust FPP volume from the dashboard
- **Analytics Dashboard** (`/admin`): View detailed voting analytics including:
  - Total sequences and votes
  - Vote counts per sequence (upvotes/downvotes)
  - Popularity scores and rankings
  - Visual progress bars for vote distribution

Admin access requires sign-in with Google or Facebook using emails listed in `ADMIN_EMAILS`.

## Deployment

For production, build the application:

```bash
npm run build
npm start
```

Ensure the application runs on the same machine as FPP for local API access.

## Learn More

- [FPP Documentation](https://github.com/FalconChristmas/fpp)
- [Next.js Documentation](https://nextjs.org/docs)
