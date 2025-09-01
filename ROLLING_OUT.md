# Rollout plan (Sprint 6)

Goal: dev → internal → beta → prod with confidence.

1. Dev (default)
   - Manual smoke tests: Auth (sign in/up/reset), Tabs, Create/Join household, Deep links.
   - Monitor console perf logs for tabs (<100ms) and auth transitions.

2. Internal
   - Ship via Expo dev/bundles to internal testers.
   - Track crashes and critical UI regressions.

3. Beta
   - Expand cohort. Verify dark mode visuals and a11y.
   - Watch for perf warnings in logs (`[perf:warn]`). Investigate any >200ms.

4. Prod
   - Promote when QA passes; tags: v1.0.x.

Rollback

- Revert the release commit or promote previous build in store dashboards.
- No feature flags used in this phase per decision; changes are incremental and reversible.

Metrics

- Perf: tab switch and initial tabs render time from console logs.
- Auth: failures per day; time-to-home (instrumented as `auth:*`).
