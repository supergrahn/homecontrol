# HomeControl (Expo + Firebase)

Small Expo app for household tasks with Firebase Auth/Firestore/Storage.

## Run

1. Copy `.env.example` to `.env` and fill Firebase values (EXPO*PUBLIC*\*).
2. Install deps: `npm install`
3. Start: `npm run start`

If building with EAS, set a real EAS project ID in `app.json > expo.extra.eas.projectId` and run `eas init`.

### Run on iPhone (Expo Go)

- Install Expo Go from the App Store on your iPhone.
- Start the dev server in tunnel mode so the phone can reach it even across networks:

  ```sh
  npm run start:go
  # or: npx expo start --tunnel
  ```

- Open Expo Go on the iPhone, tap “Scan QR Code”, and scan the QR from the Expo DevTools page (press `d` in the terminal to open it in your browser). Avoid using the iOS Camera app; it will show “Could not find any data”.

Troubleshooting:

- If the terminal QR is too small, use the bigger QR in the DevTools web page.
- You can also tap “Enter URL” in Expo Go and paste the `exp://` / `https://u.expo.dev/...` URL printed by Expo.
- On WSL/Windows, always use `--tunnel` and ensure Windows firewall/VPN isn’t blocking. If needed, try a different network or mobile hotspot.
- Clear cache if stuck: `npx expo start -c --tunnel`.

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

## Invites: SMTP and Dynamic Links setup

Cloud Functions supports two ways to provide configuration:

- Environment variables (useful for local emulators and CI)
- `firebase functions:config:set` (recommended for production)

Supported keys:

- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Dynamic Links: `DYNAMIC_LINK_DOMAIN`, `DYNAMIC_LINK_LINK_BASE`, `DYNAMIC_LINK_APN`, `DYNAMIC_LINK_IBI`, `DYNAMIC_LINK_ISI`

Alternatively in Functions Config (preferred):

- `smtp.host`, `smtp.port`, `smtp.user`, `smtp.pass`, `smtp.from`
- `dynamiclinks.domain`, `dynamiclinks.link_base`, `dynamiclinks.apn`, `dynamiclinks.ibi`, `dynamiclinks.isi`

Example (Functions Config):

```
firebase functions:config:set \
	smtp.host="smtp.example.com" \
	smtp.port="587" \
	smtp.user="apikey" \
	smtp.pass="<secret>" \
	smtp.from="HomeControl <no-reply@example.com>" \
	dynamiclinks.domain="hc.page.link" \
	dynamiclinks.link_base="https://homecontrol.app/invite" \
	dynamiclinks.apn="app.homecontrol" \
	dynamiclinks.ibi="app.homecontrol" \
	dynamiclinks.isi="123456789"
```

For local development, export env vars before starting emulators:

```
export SMTP_HOST=smtp.example.com
export SMTP_PORT=587
export SMTP_USER=apikey
export SMTP_PASS=...
export SMTP_FROM="HomeControl <no-reply@example.com>"
export DYNAMIC_LINK_DOMAIN=hc.page.link
export DYNAMIC_LINK_LINK_BASE=https://homecontrol.app/invite
export DYNAMIC_LINK_APN=app.homecontrol
export DYNAMIC_LINK_IBI=app.homecontrol
export DYNAMIC_LINK_ISI=123456789
```

When SMTP is not configured, invites will return a shareable token and app link for manual sharing.
