# List of future features

- Add bottom tab navigation with icons only (Home, Events, Members and Lists)
- "Create household" should be a part of the register process
- Notification when certain tasks, events or anything else is added by someone else in the household. (What notifications should be selectable in household settings per user)
- Add birthdays for people, not as events. When a birthdays are getting close, send a notification and ask if one want to add a date for the celebration. (Toggleable in household settings per user)
- Add household messages (Needs to be planned and specified)
- Add view for weekly tasks and events, monthly tasks and events and custom period. Make it possible to save custom period
- Take the digests next (expand the CF, add a dry-run mode, and a tiny push/local notification stub)
- Save and search checklists
- Task labels and priority: tags, priority, and color chips; filter/sort by tag.
- Rich notifications: add “Accept,” “Snooze,” “Mark done” actions; per-user notification toggles by category.
- Comments and @mentions on tasks: lightweight chat thread with push on mention.
- Rotations and fairness: round-robin/weighted assignment; rotation previews and fairness stats.
- Task dependencies and blockers: “Do X after Y,” with automatic reschedule.
- Approval flow: optional “verify” step for kids’ tasks (adult can approve/reject with notes).
- Simple kid tabs and tag events, tasks and lists with kids and users
- Shared household calendar: combined task/event view and ICS export.
- Tie checklist to tasks and events
- Agenda and timeline views: continuous scroll agenda with “free slots.”
- Workload heatmap: weekly load per member; spot over/under-utilization.
- Exceptions to recurrence: skip/shift single instance; pause task series for vacation.
- Digest customization: choose sections (overdue, upcoming, wins), per-user schedule.
- Quiet-hours tiers: hard quiet hours vs. soft (deliver silently).
- Bundled “morning brief” on device: local notification summary when app opens.
- Calendar: Google/Apple/Outlook one-way or two-way sync; per-user mapping.
- Smart home: HomeKit/Google/Alexa routines (e.g., washer finished → create “Move laundry”).
- Grocery & pantry: shared lists tied to tasks; auto-add consumables when a restock task occurs.
- Points and rewards: earn points for completed chores; parent-configurable rewards store.
- Streaks and badges: drive habit formation; streak freeze passes for vacations.
- Allowance tracking: optional payout rules tied to completed tasks.
- Widgets: iOS/Android home screen “Next up” + quick actions.
- Live Activities (iOS): show accepted task in progress with timer.
- Offline-first: robust local cache, conflict resolution, background sync.
- Pro tier: advanced automations, AI suggestions, smart home integrations, extra storage.
- Family plan: multiple households, unlimited members, priority support.

## severity ranking
### Critical
Bottom tab navigation (Home, Events, Members, Lists)
“Create household” during registration
Notifications when content is added (per-user configurable)
Digests: CF expansion + dry-run mode + local/push stub

### High
Save & search checklists
Task labels/priority + filters/sorting
Rich notifications (Accept/Snooze/Mark done)
Comments & @mentions
Weekly/monthly/custom period views (savable)
Exceptions to recurrence (skip/shift/pause)
### Medium
Tie checklists to tasks/events consistently
Agenda/timeline view
Rotations & fairness
Approval flow (kids → adult verify)
Simple kid tabs + tagging
Digest customization (sections, per-user schedule)
Quiet-hours tiers (hard vs soft)
Shared household calendar + ICS export
Bundled “morning brief” local summary
### Low
Calendar sync (Google/Apple/Outlook 1–2 way)
Workload heatmap
Task dependencies/blockers
Offline-first (conflict resolution, background sync)
Widgets + Live Activities
Grocery/pantry + auto-restock tasks
Points/rewards, streaks/badges, allowance tracking
Smart home (HomeKit/Google/Alexa)
Pro tier & Family plan


### SPRINTS

Sprint 1 — Core IA, onboarding, and digest scaffolding (Critical)

- [x] Home icon, top left besides the page title
- [x] Move setttings icon top right besides the page title
- [x] Bottom tab navigation with icons only (Today, Activity, Members, Search, Add)
- [x] “Create household” during register flow
- [x] Onboarding: Invite join with secure token via pasted link (+ Skip option)
- [x] Notifications when items are added (per-user toggles in settings)
- [x] Digest: CF dry-run mode and callable; on-device/local notification stub (pending) Acceptance:
- [x] Tabs render consistently; deep links and back nav OK
- [x] New users can create/select household without leaving registration
- [x] Per-user toggle gates add-item pushes; dry-run digest visible without sending real pushes
	- Notes: Deep links (homecontrol://invite?hid=…&inviteId=…&token=…) and Firebase Dynamic Links are parsed; onboarding requires token for acceptance.

Sprint 2 — Task organization and collaboration (High)

- [x] Save & search checklists
- [x] Task labels/priority + filter/sort by tag/priority
- [x] Rich notification actions (Accept/Snooze/Done)
- [x] Comments & @mentions with push on mention Acceptance:
- [x] Saved checklists reused in task/event creation
- [x] List screens support tag/priority filters and persisted sort
- [x] Quick tag chips from visible tasks with “+N more/Show less”
- [x] Debounced tag filter input for smoother UX
- [x] “Reset to defaults” in Settings clears filters for Today/Overdue/Upcoming
- [x] Notification categories with working actions; action audit in activity
- [x] Comment thread per task; mention pushes respect quiet-hours rules

Sprint 3 — Scheduling views and recurrence control (High)

- [x] Weekly view
- [x] Monthly view
- [x] Agenda view (infinite scroll)
- [x] Custom period view; save custom ranges
- [x] Exceptions to recurrence (skip/shift instance, pause series)
- [x] Tie checklists to tasks/events consistently (single model + UI)
- [x] Day drill-down from Week/Month to Agenda
- [x] Calendar timezone awareness (household timezone)
- [x] Calendar filters: tags + priority parity with Home
- [x] Timeline view (free slots)
Acceptance:
- [ ] Calendar views performant with 1k+ items
- [x] Single-instance overrides don’t mutate the base rule
- [x] Checklist model shared between tasks/events; UI parity

Sprint 4 — Households with kids and fairness (Medium)

- [x] Simple kid tabs; tagging tasks/events/lists with users/kids (tasks done; events/lists TBD)
- [x] Approval flow (adult verify step)
- [ ] Rotations (round-robin/weighted) + fairness stats Acceptance:  - need planning and speccing
- [x] Kid-filtered views and per-kid badges
- [x] Approval state machine enforced in rules and UI
- [ ] Rotation assignment applies on create/renewal; fairness dashboard  - need planning and speccing

Sprint 5 — Digests polish and calendar sharing (Medium)

- [ ] Digest customization (sections, per-user schedules)
- [ ] Quiet-hours tiers (hard vs soft/silent)
- [ ] Shared household calendar + ICS export
- [ ] Bundled “morning brief” device summary Acceptance:  - need planning and speccing
- [ ] Users tune digest timing/content; audit shows last sent
- [ ] Soft quiet hours deliver silently; hard blocks
- [ ] ICS export subscribable; time zones correct

Sprint 6 — Advanced ops and offline/base platform (Low/Medium mix)

- [ ] Task dependencies/blockers with auto-reschedule  - need planning and speccing
- [ ] Workload heatmap per member  - need planning and speccing
- [ ] Offline-first groundwork (query cache + replay; conflict policy)  - need planning and speccing
- [ ] Widgets (Next up) and Live Activities (accepted task timer) Acceptance: - need planning and speccing
- [ ] Dependency graph prevents premature scheduling; clear UX on blockers - need planning and speccing
- [ ] Heatmap matches aggregate queries - need planning and speccing
- [ ] Basic offline actions sync back; conflict policy documented - need planning and speccing
- [ ] Widgets/Live Activities show real-time state - need planning and speccing

Sprint 7 — Integrations and growth (Low)

Priority 1: 
- [ ] Calendar sync (Google/Apple/Outlook) 1–2 way - need planning and speccing
- [ ] Grocery/pantry with task tie-ins - need planning and speccing
- [ ] Points/rewards, streaks/badges, allowance - need planning and speccing
- [ ] Smart home routines - need planning and speccing
- [ ] Pro tier and Family plan (feature gating) - need planning and speccing
- [ ] OAuth-based calendar linking with selective calendars  - need planning and speccing
- [ ] Pantry items link to chores; auto-create restock tasks  - need planning and speccing
- [ ] Reward redemption flow; parental controls  - need planning and speccing
- [ ] Minimal smart home recipes; opt-in permissions  - need planning and speccing
- [ ] Paywall/feature flags; graceful downgrade  - need planning and speccing

### notes and dependencies
- Rich notification actions depend on defining categories and client handlers; plan for Expo bare/dev client if needed.
- Offline-first touches many surfaces—start with cache + retry, expand later.
- Calendar and smart home integrations require careful privacy and per-user auth tokens.
- Many features (digests, notification policy) should be guardrailed by remote config/feature flags for safe rollout.
