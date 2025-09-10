# Repository Guidelines

## Project Structure & Module Organization
- App code in `src/`: `components/` (UI), `screens/` (views), `services/` (data, Firebase calls), `models/` (domain types), `utils/`, `design/`, `locales/`.
- Tests in `__tests__/` at root and in feature folders (e.g., `src/services/__tests__`).
- Cloud Functions in `functions/` (TypeScript, built to `functions/lib`).
- Assets in `assets/`. Scripts in `scripts/`. Expo config in `app.json`, Firebase in `firebase.json`, rules and indexes at repo root.

## Build, Test, and Development Commands
- Start app: `npm run start` (Expo Dev Server). iOS/Android: `npm run ios` / `npm run android`. Web: `npm run web`.
- Tunnel/Dev Client: `npm run start:go` (Expo Go via tunnel), `npm run start:dev` (Dev Client).
- Type check: `npm run typecheck`. Lint/format: `npm run lint` / `npm run format`.
- Tests: `npm test` or `npm run test:watch` (Jest + Testing Library).
- Firebase emulators: `npm run emulators`. Deploy pieces: `npm run deploy[:functions|:rules|:indexes]` (requires `FIREBASE_PROJECT`).
- Functions (from repo root): `npm --prefix functions run build|test`.

## Coding Style & Naming Conventions
- Language: TypeScript (strict, noEmit). Indentation: 2 spaces. Prefer functional React.
- Lint: ESLint (expo flat config). Format: Prettier 3. Fix: `npm run lint:fix`.
- Filenames: Components/Screens `PascalCase.tsx`; services/utils/models `camelCase.ts` or `PascalCase.ts` for domain types.
- Exports: default for components/screens; named exports for hooks/utils/services.

## Testing Guidelines
- Framework: `jest-expo` with `@testing-library/react-native`.
- Test files: `__tests__/**/*.(test).ts(x)` or `*.test.ts(x)` alongside feature.
- Write tests for new logic-heavy services/models and critical UI states. Prefer accessible queries (`getByRole`, `getByText`).
- Avoid network; mock Firebase and timers. Keep emulator tests in scripts (`scripts/smoke-*.js`).

## Commit & Pull Request Guidelines
- Use Conventional Commits when possible: `feat(scope): ...`, `fix(scope): ...`. Keep messages imperative and scoped (see Git history).
- PRs: include purpose, linked issues, screenshots for UI changes, test plan (commands + emulator notes), and any config/env changes (`.env`, `FIREBASE_PROJECT`).
- Pre-submit: `npm run lint && npm run typecheck && npm test` must pass.

## Security & Configuration
- Never commit secrets. Copy `.env.example` to `.env`; Expo public vars use `EXPO_PUBLIC_*`. Use emulators by default.
- Deploy only from clean mainline or release branches; verify rules (`firestore.rules`, `storage.rules`) and indexes before deploy.
