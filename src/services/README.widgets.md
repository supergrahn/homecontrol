Widgets and Live Activities scaffolding

Summary

- Next up widget data is persisted per-household in AsyncStorage under key: @hc:widget:nextup:<hid>
- Payload shape:

  {
  "updatedAt": "2025-08-29T12:34:56.789Z",
  "tasks": [
  { "id": "...", "title": "...", "when": "ISO", "priority": 2, "status": "open" }
  ]
  }

- refreshNextUpWidget(hid) computes top 3 upcoming items using fetchTasksInRange and updates the store.
- startTaskLiveActivity/end/cancel emit events on a global app event bus (src/events.ts). Native can bridge these.

Next steps

- Add native widget modules via Expo prebuild (iOS WidgetKit + ActivityKit, Android AppWidgetProvider).
- Read from the AsyncStorage key on native side (or mirror to a shared group container on iOS via a bridge).
- Push-triggered refresh: have notification handlers call refreshNextUpWidget and schedule background updates.
