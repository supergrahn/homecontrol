# HomeControl (Expo + Firebase)

Small Expo app for household tasks with Firebase Auth/Firestore/Storage.

## Run

1. Copy `.env.example` to `.env` and fill Firebase values (EXPO_PUBLIC_*).
2. Install deps: `npm install`
3. Start: `npm run start`

## Build (optional)
- Install EAS CLI: `npm i -g eas-cli`
- Config: `eas.json` is included with dev/preview/production profiles.
- Login: `eas login`
- Configure project: `eas init`
- iOS build: `eas build -p ios --profile preview`
- Android build: `eas build -p android --profile preview`
- Submit (optional): `eas submit -p ios|android`

## Firebase
- Rules and indexes are in root: `firestore.rules`, `firestore.indexes.json`, `storage.rules`.
- `firebase.json` added so CLI picks these up.

## Notes
- Entry: `expo/AppEntry` with root `App.tsx` that re-exports `src/App.tsx`.
- Babel: `babel-preset-expo`.
- TypeScript config: `tsconfig.json` (noEmit).
