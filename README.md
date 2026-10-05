# HCI-Mobile_App

**Blood Donor–Recipient Matching and Emergency Blood Request** mobile application.

> [!IMPORTANT]
> **Current status: project scaffold only.** The development foundation (tooling, folder structure, config, health checks) is in place. **No application features are implemented yet** — see [Scaffold status](#scaffold-status).

---

## Tech stack

| Layer    | Technology |
| -------- | ---------- |
| Mobile   | React Native, Expo SDK 57, TypeScript, Expo Router |
| Planned mobile libs (installed, not used yet) | `react-native-maps`, `expo-location`, `socket.io-client` |
| API      | Node.js, Express 5, TypeScript (native ESM) |
| Database | MongoDB via Mongoose 9 |
| Validation / config | Zod, dotenv |
| Realtime (installed, not used yet) | Socket.IO |
| Tooling  | npm, ESLint (flat config), `tsc`, `tsx` |

Each app has its **own** `package.json` and `package-lock.json`. There are no npm workspaces and no Docker setup.

## Requirements

- **Node.js 22 LTS (≥ 22.13)**, or Node 24 LTS (≥ 24.3). The scaffold was set up with Node 22.19.0. React Native 0.86 needs `^22.13.0 || ^24.3.0`.
- npm (comes with Node).
- The **Expo Go** app on a phone, or an Android emulator / iOS simulator.
- A MongoDB deployment (MongoDB Atlas or a local `mongod`). This is only needed for `/api/ready` and for future features.

Check your Node version: `node -v`

## Repository layout

```
HCI-Mobile_App/
├── frontend/                  # Expo React Native app
│   ├── assets/images/         # App icon, splash, favicon
│   ├── src/
│   │   ├── app/               # Expo Router routes ONLY (file-based navigation)
│   │   │   ├── _layout.tsx    # Root navigation layout (shared – coordinate changes)
│   │   │   └── index.tsx      # Starter screen
│   │   ├── components/        # Shared UI components (shared – coordinate changes)
│   │   ├── features/          # One folder per feature (auth, profile, requests,
│   │   │                      #   tracking, donors, notifications, chat, inventory, campaigns)
│   │   ├── services/api.ts    # fetch-based API helper using EXPO_PUBLIC_API_URL (shared)
│   │   ├── theme/             # Shared design tokens
│   │   ├── hooks/             # Shared React hooks
│   │   ├── types/             # Shared TypeScript types
│   │   └── utils/             # Shared helpers
│   ├── app.json               # Expo app config
│   ├── eslint.config.js
│   ├── tsconfig.json
│   └── .env.example
├── backend/                   # Express API
│   ├── src/
│   │   ├── config/env.ts      # Loads + validates environment variables (zod)
│   │   ├── config/database.ts # Mongoose connect / disconnect / status
│   │   ├── modules/           # One folder per feature (auth, users, requests, tracking,
│   │   │                      #   donors, notifications, chat, inventory, campaigns)
│   │   ├── middleware/        # Express middleware
│   │   ├── utils/             # Shared helpers
│   │   ├── app.ts             # Express app (JSON parsing, /api/health, /api/ready)
│   │   └── server.ts          # HTTP server start + graceful shutdown
│   ├── tests/
│   ├── tsconfig.json          # Type checking (src + tests)
│   ├── tsconfig.build.json    # Build (src → dist)
│   ├── eslint.config.js
│   └── .env.example
├── .gitignore
└── README.md
```

Empty folders contain a `.gitkeep` file so Git keeps them. Delete the `.gitkeep` once the folder has real files in it.

## First-time setup

```bash
# 1. Install dependencies (run each app separately)
cd backend  && npm install && cd ..
cd frontend && npm install && cd ..

# 2. Create your local env files from the templates
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env
```

Edit the two `.env` files for your own machine (see below). **Never commit `.env` files.**

> Use `npm ci` instead of `npm install` if you want an exact install from the lockfile without changing it.

## Environment configuration

### Backend: `backend/.env`

| Variable      | Example | Notes |
| ------------- | ------- | ----- |
| `NODE_ENV`    | `development` | `development`, `test` or `production` |
| `PORT`        | `5000` | API port |
| `MONGODB_URI` | *(empty)* | Leave empty to run without a database. `/api/ready` then returns 503. |

**Using an existing MongoDB deployment (e.g. Atlas):** paste its connection string. Ask the team member who manages the cluster for credentials, and share them privately, never through Git.

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>/blood_donor_dev?retryWrites=true&w=majority
```
On Atlas, also make sure your current IP is on the cluster's *Network Access* list.

**Using a local MongoDB:** install MongoDB Community Server and start `mongod`, then:

```
MONGODB_URI=mongodb://127.0.0.1:27017/blood_donor_dev
```

If `MONGODB_URI` is set but the server can't connect, it logs the error (never the connection string) and exits.

### Frontend: `frontend/.env`

```
EXPO_PUBLIC_API_URL=http://<host>:5000/api
```

The value must be the backend base URL **including `/api`**. Pick the host for how you run the app:

| Running the app on…        | Use |
| -------------------------- | --- |
| Physical phone (Expo Go)   | Your computer's **LAN IP**, e.g. `http://192.168.1.20:5000/api`. `localhost` on a phone means the phone itself. |
| Android emulator           | `http://10.0.2.2:5000/api` (the emulator's alias for the host machine) |
| iOS simulator / web        | `http://localhost:5000/api` |

Find your LAN IP: macOS `ipconfig getifaddr en0`, Windows `ipconfig`, Linux `hostname -I`.

- The phone or emulator must be able to **reach the backend over the network**: same Wi-Fi, and the firewall must allow port 5000. Some campus or guest Wi-Fi blocks device-to-device traffic.
- `npx expo start --tunnel` only exposes the **Metro bundler**. It does **not** expose the backend. If you use a tunnel, the backend still needs a URL the phone can reach.
- Restart Expo after changing `.env` (`npx expo start -c` clears the cache).
- `EXPO_PUBLIC_*` values are bundled into the app and anyone can read them. **Never put MongoDB credentials or other server secrets in the frontend.**

## Running the apps (two terminals)

**Terminal 1: backend**
```bash
cd backend
npm run dev          # tsx watch, reloads on change → http://localhost:5000
```

**Terminal 2: frontend**
```bash
cd frontend
npm start            # Expo dev server; scan the QR code with Expo Go
# or: npm run android   /   npm run ios
```

### Verify the backend

```bash
curl -i http://localhost:5000/api/health
# 200 {"status":"ok",...}         → API process is running

curl -i http://localhost:5000/api/ready
# 200 {"status":"ready","database":"connected"}        → MongoDB connected
# 503 {"status":"unavailable","database":"disconnected"} → no DB configured / not connected
```

From a phone, open `http://<LAN-IP>:5000/api/health` in its browser to confirm it can reach the API.

## Quality checks

```bash
# Frontend
cd frontend
npm run typecheck        # tsc --noEmit
npm run lint             # expo lint (eslint-config-expo)
npx expo install --check # Expo SDK dependency compatibility

# Backend
cd backend
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run build            # tsc → dist/
npm start                # runs compiled dist/server.js
```

Run lint and typecheck before opening a pull request.

### Dependency rules

- Use **npm** only, and run it inside `frontend/` or `backend/`, never at the repo root.
- Frontend Expo/native packages: **`npx expo install <pkg>`** so versions match the Expo SDK.
- Don't use `--force` or `--legacy-peer-deps`. Fix the version conflict instead.
- Backend TypeScript is pinned to `~6.0.x` because `typescript-eslint` doesn't support TypeScript 7 yet.
- Don't install `@types/mongoose`. Mongoose ships its own types.

## What to commit

**Commit:** source code, `package.json`, **`package-lock.json`** (both apps), `.env.example` files, config files (`tsconfig*.json`, `eslint.config.js`, `app.json`), `assets/`, `.gitkeep` files, docs.

**Never commit:** `node_modules/`, `.env` / `.env.*` (except `.env.example`), `.expo/`, `dist/`, `build/`, `coverage/`, logs, OS files (`.DS_Store`), signing keys. The root `.gitignore` enforces this.

## Team ownership

| Member   | Area | Frontend | Backend |
| -------- | ---- | -------- | ------- |
| Member 1 | Authentication & profiles | `features/auth`, `features/profile` | `modules/auth`, `modules/users` |
| Member 2 | Emergency requests & donor tracking | `features/requests`, `features/tracking` | `modules/requests`, `modules/tracking` |
| Member 3 | Donor search, matching, notifications & chat | `features/donors`, `features/notifications`, `features/chat` | `modules/donors`, `modules/notifications`, `modules/chat` |
| Member 4 | Blood bank inventory & campaigns | `features/inventory`, `features/campaigns` | `modules/inventory`, `modules/campaigns` |

**Shared areas, coordinate before changing:** root navigation (`frontend/src/app/_layout.tsx` and route groups), API configuration (`frontend/src/services/api.ts`, `backend/src/app.ts`, `backend/src/config/`), shared components / theme / types, and the Socket.IO setup once it is added.

## Scaffold status

### Completed (scaffold)
- Expo SDK 57 + TypeScript + Expo Router app with a minimal root layout and starter screen
- Frontend folder structure, ESLint, typecheck, `fetch`-based API helper, `.env.example`
- `react-native-maps`, `expo-location`, `socket.io-client` installed with Expo-compatible versions (**not used yet**)
- Express 5 + TypeScript API with validated env config, JSON body parsing, graceful shutdown
- Optional MongoDB connection via Mongoose (only when `MONGODB_URI` is set)
- `GET /api/health` (liveness) and `GET /api/ready` (503 unless MongoDB is connected)
- Backend lint, typecheck, build/start scripts; root `.gitignore`; this README

### Not implemented yet (future tasks)
- Authentication, user profiles, dashboards
- Emergency blood request forms, donor search & matching
- Chat, notifications, Socket.IO events
- Maps UI, live donor tracking, location permission requests
- Blood bank inventory, campaigns
- Database models / schemas, feature routes, controllers
- Automated tests (the `backend/tests/` folder is a placeholder)
- **Google Maps app-build configuration**: an Android Google Maps API key in `app.json` / EAS for production or development builds. Expo Go works for early testing, and no Google Cloud setup has been done.
- **Background location setup**: `expo-location` background permissions, iOS `UIBackgroundModes`, Android foreground service, and a development build. None of this is configured yet. The app requests no location permissions at present.