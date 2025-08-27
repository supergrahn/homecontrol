Local software you need

- Node.js 18+ (recommend 20 LTS).
- Expo CLI (npx is fine): npx expo start.
- Firebase CLI: npm i -g firebase-tools (for deploying firestore.rules, storage.rules, functions).
- iOS: Xcode + CocoaPods (sudo gem install cocoapods).
- Android: Android Studio + SDKs + JDK 17.
- Watchman (macOS): brew install watchman.
- EAS CLI if building binaries: npm i -g eas-cli.

Run it

1. Copy .env.example to .env and fill firebase values used by config.ts.
2. Install deps: npm install
3. Start: npm run start
4. If assets are missing, add assets/icon.png and assets/adaptive-icon.png or run npx expo customize.

Notes

- Today query relies on a composite index; your firestore.indexes.json covers status + nextOccurrenceAt.
- The hardcoded HID in screens (e.g., src/screens/HomeScreen.tsx) is fine for MVP; later, read household selection from user state.
- Consider adding eslint/prettier later or remove the lint script in package.json.

If you want, I can add a minimal household selector and remove the HID constant next.

supergrahn: Fix everything you can

GitHub Copilot: I’ll quickly scan the project structure and key config files to identify issues and confirm what needs fixing for Expo and Firebase, then proceed with targeted edits. Applying code and config fixes to align the app with Expo best practices, correct import paths, add missing config files, and set up git ignores; then I’ll run quick type checks on touched files.

How to run

```sh
# macOS, zsh
cd /Users/tomespen/src/homecontrol
npm install
npm run start
```

Local software you need

- Node.js: Recommend 20 LTS. You have v22.14.0; if any Expo plugin issues arise, use Node 20.
- Expo CLI: Detected; version shown: 0.18.31. You can also use npx expo.
- Watchman (macOS): brew install watchman
- iOS: Xcode + CocoaPods (sudo gem install cocoapods)
- Android: Android Studio + SDKs + JDK 17
- Firebase CLI (deploy rules/emulators/functions): npm i -g firebase-tools
- EAS CLI (if building binaries): npm i -g eas-cli
