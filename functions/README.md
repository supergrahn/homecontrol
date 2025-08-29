# Cloud Functions

This folder contains Firebase Cloud Functions for the app.

## Quick start

- Install deps
  - From repo root: `npm --prefix functions ci` or `npm --prefix functions install`
- Build
  - `npm --prefix functions run build`
- Test
  - `npm --prefix functions run test`
- Emulators
  - From repo root: `npm run emulators` (functions + firestore)
- Deploy
  - From repo root: `npm run deploy:functions` (requires $FIREBASE_PROJECT)

## Notes

- Node engine is pinned to 20 for consistency with deployed Functions.
- RRULE handling uses `RRule.parseString` with an explicit `dtstart` to honor DTSTART/COUNT/UNTIL semantics.
- Push notifications are queued to respect quiet-hours and retried with exponential backoff; invalid tokens are cleaned up.

### Heatmap parity (aggregate queries)

- New admin-only callable: `checkHeatmapParity`.
  - Args: `{ householdId, rangeDays: 7|14|30, types: ["blocked","upcoming"] }`
  - Returns: `{ ok: boolean, diff: { "YYYY-MM-DD|userId": { base, agg } }, meta }`
  - Base uses the same logic as `getWorkloadHeatmap`; Agg uses Firestore count() queries with inclusion–exclusion.
  - Use this to verify your dataset produces identical heatmaps for both approaches before migrating.
