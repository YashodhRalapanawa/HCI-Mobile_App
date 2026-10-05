# Frontend (Expo + React Native + TypeScript + Expo Router)

See the [root README](../README.md) for setup, environment configuration, scripts, and team conventions.

Quick start:

```bash
npm install
cp .env.example .env   # then set EXPO_PUBLIC_API_URL
npm start
```

- Routes live in `src/app/` (Expo Router). Keep non-route code (components, services, hooks, utils) outside `src/app/`.
- Feature code goes in `src/features/<feature>/`.
- Use `npx expo install <package>` for Expo/native packages so versions match the Expo SDK.
