# QA Smoke Checklist

Run on iOS and Android (small device + current flagship). Verify voiceover labels and basic flows.

Auth
- Open app, sign in with valid credentials → lands on Today tab
- Invalid email shows error; disabled sign-in until valid
- Reset password link sends confirmation

Navigation & Tabs
- Tabs hit area ≥ 44px, icons selected state visible
- Header left Home button returns to Today
- Deep link homecontrol://today opens Today

Today/Home
- Household picker opens and selects household
- Add button navigates to AddTask
- Filters chips toggle selected state and list updates

Members
- Outbox badge shows when pending actions exist

Search
- Typing text filters results; clear restores

Settings
- Theme toggle cycles: system → dark → light

Calendar
- Prev/next arrow buttons are accessible with labels

Heatmap
- Filter chips announce selected state

General
- No red screen; no crashes; scrolling performant
