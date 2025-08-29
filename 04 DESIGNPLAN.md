# Design & Layout Integration Plan

Goal: Merge the improved design and layout into the existing app without breaking current features. Roll out behind flags, verify with QA, and migrate screen-by-screen.

Update 2025-08-29: Proceeding without feature flags per decision; any flag-related tasks are marked as (skipped/N/A).
Progress 2025-08-29: Theme mode toggle added; ScreenContainer and AppBar created; icons-only tabs + FAB in place; Home/Members/Search now use theme tokens.
Progress 2025-08-29 (cont.): Activity, AddTask, CreateHousehold, Calendar, Kids, TaskDetail, and Heatmap now use ScreenContainer/theme tokens.
Progress 2025-08-29 (cont.2): Stack headers themed with design tokens; FAB uses theme.primary; Home tabs/chips/borders migrated off hardcoded colors.
Progress 2025-08-29 (cont.3): Calendar and Settings screens swept for hardcoded colors; chips, borders, labels, and grids now use theme tokens; dark mode compliant.
Progress 2025-08-29 (cont.4): Sprint 2 deep links/back navigation validated; no-household chooser implemented (Create or Join via QR/paste).
Progress 2025-08-29 (cont.5): Adopted theme.typography and onSurface headings on Settings, Members, Home, Heatmap, AddTask, and Kids screens.
Progress 2025-08-29 (cont.6): Completed adoption on Task Detail, Activity (header), and Templates family (Templates/Picker/Manage). Added onPrimary/onEmphasis tokens; replaced hardcoded #fff on chips/badges. Added `npm run contrast` (WCAG AA check) and verified PASS for key pairs. Default theme mode set to Dark per request (manual override still available).
Progress 2025-08-29 (cont.7): Sprint 4 underway — Input/Button components finalized and integrated into SignIn/AddTask/TemplatePicker/ManageTemplates, and now Settings. Added Input.containerStyle for row layouts; increased tab bar hit area. Typecheck/lint clean.
Progress 2025-08-29 (cont.8): Replaced remaining native Buttons across app with design-system Button (Home, Calendar, Task Detail, Templates, Scan Invite, Widget Preview, Household Chooser, DevToolbar). Calendar/Home controls now reflect active states via variants; added explicit a11y labels for arrow-only controls.
Progress 2025-08-29 (cont.9): Sprint 4 closed — completed a focused a11y sweep (labels, selected/disabled states, and hints on destructive actions) across high-traffic screens. Tabs hit area and roles/state verified.

## Guiding principles

- Preserve current functionality; all changes are opt-in behind feature flags until accepted.
- Keep diffs small and reversible; migrate per screen/module.
- Accessibility, keyboard handling, and safe areas are baseline requirements.
- Theming scales to dark mode and a spacing/typography system.

## Global checklist

- [ ] Feature flags scaffolded (dev toggles + remote/config stub) (skipped)
- [x] Icons library chosen and wired (Expo vector icons)
- [x] Safe area + layout wrappers available across screens
- [x] Dark mode support added (system + manual override in DevToolbar)
- [ ] Regression checklist created per top screen (Today, Activity, Members, Search, Add, Details)
- [x] Regression checklist created per top screen (Today, Activity, Members, Search, Add, Details) — see QA_CHECKLIST.md

---

## Sprint 1 — Auth UX overhaul (non-breaking)

Focus: Restructure Sign In/Sign Up screens for better ergonomics and clarity. Add keyboard handling, validation, and secondary actions.

Deliverables

- [x] New auth container using SafeAreaView + KeyboardAvoidingView + centered ScrollView
- [x] Replace AppBar on auth with brand header (logo/wordmark) or minimal header
- [x] Input improvements: returnKeyType, textContentType, autoCapitalize, autoCorrect=false
- [x] Password field: show/hide toggle and onSubmitEditing=submit
- [x] Primary CTA: "Continue" with disabled + loading states
- [x] Secondary links: "Create account" (link-style) and "Forgot password?"
- [x] Inline validation errors and form-level error slot
- [ ] Feature flag `ui.authV2` (dev settings toggle + conditional navigator route) (skipped)

Acceptance criteria

- [x] Keyboard never obscures fields/buttons on small devices
- [x] Form is navigable via return key; submit from password works
- [x] Clear errors; CTA disabled until valid
- [ ] Toggling `ui.authV2` switches between old/new layouts without navigation breakage (N/A — no flags)

Notes

- Keep current auth logic intact; only wrap existing handlers with new UI.

---

## Sprint 2 — Tabs & navigation alignment

Focus: Align bottom navigation with the spec (icons-only), adjust IA, and improve headers.

Deliverables

- [x] Switch to icons-only tabs with accessible labels (Today, Activity, Members, Search)
- [x] Decide on Add: center tab OR floating FAB overlay (choose one and document) (FAB chosen)
- [x] Hide tab labels; set sizes, active/inactive colors from theme
- [x] Per-screen headers: native header enabled for detail screens (e.g., Task Detail)
- [x] Deep links and back nav validated for tabs + details
- [ ] Feature flag `ui.tabsV2` (skipped)
- [x] If logged in and no household is registered to the user, show a screen to either "Create Household" or "Join Household"
    - [x] "Create Household" should navigate to the create household screen
    - [x] "Join Household" should navigate to the scan QR code screen and when QR code is scanned successfully, the user should be navigated to the home screen for that household
    - [ ] We might consider "Join Household" by code as well. User may have broken cameras and so on. (moved to Sprint 7)


Acceptance criteria

- [x] Tabs match icons-only spec; touch targets ≥ 44x44
- [x] Deep links open the correct tab and stack state
- [x] Detail screens show an appropriate header/back behavior
- [ ] Toggling `ui.tabsV2` preserves access to all current areas (N/A — no flags)

Notes

- If Add is a FAB, ensure safe overlap with keyboard and insets; otherwise center tab with larger icon.

---

## Sprint 3 — Theme, spacing, and dark mode

Focus: Strengthen the design system for scale and readability.

Deliverables

- [x] Extend theme to include dark mode and system-follow mode
- [x] Add spacing scale and typography scale (sizes + weights)
- [x] Introduce semantic roles (surface, surfaceVariant, outline, onSurface, onPrimary, onEmphasis, success, warning, error)
- [x] DevToolbar toggle to force light/dark and show current tokens
- [x] Update AppBar to flex layout (left/title/right), SafeArea-aware

Acceptance criteria

- [x] Dark mode is default (per request); manual override still works in dev
- [x] No contrast violations against WCAG AA for primary surfaces and text (checked via `npm run contrast` on key pairs)
- [ ] AppBar does not visually collide on small screens; right actions do not overlap title

---

## Sprint 4 — Component a11y and ergonomics polish

Focus: Improve component APIs and accessibility.

Deliverables

- [x] Input: consistent 2px border with subtle focus style; left/right adornments; accessibility labels
- [x] Button: add link variant and optional iconLeft/iconRight; a11yRole=button and labels
- [x] Tabs: larger hit area and a11y roles/state (icons optional; icons-only covered in Sprint 2)
- [x] Utilities: ScreenContainer (SafeArea + padding), KeyboardAvoidingWrapper

Acceptance criteria

- [x] VoiceOver/TalkBack correctly announces role, state, and labels for inputs/tabs/buttons
- [x] Keyboard focus order matches visual order
- [x] Reusable wrappers reduce per-screen boilerplate

---

## Sprint 5 — Incremental screen migration in app

Focus: Apply new wrappers/components screen-by-screen in the existing app.

Deliverables

- [x] Convert SignIn/SignUp screens to new auth container (done for SignIn; proceeding without flags)
- [x] Convert Home/Today screen to new ScreenContainer (AppBar hookup pending)
- [x] Convert Members and Search to icon-only tabs (proceeding without flags)
- [x] Detail screens adopt native header; confirm back behavior
- [x] Convert Activity to new ScreenContainer + theme tokens
- [x] Convert AddTask to new ScreenContainer + theme tokens
- [x] Convert CreateHousehold to theme tokens (already keyboard-safe)
- [x] Convert TaskDetail to ScreenContainer + theme tokens (rotation chips, banners, headings)
- [x] Update Settings to include toggles: Dark mode (system/dark/light). (Auth V2 / Tabs V2 toggles skipped)
- [x] Convert Calendar to ScreenContainer + theme tokens
- [x] Convert Heatmap to ScreenContainer + theme tokens
- [x] Convert Kids to ScreenContainer + theme tokens
- [x] Settings color sweep (borders, muted labels) to theme tokens

Acceptance criteria

- [ ] No navigation regressions in cold/warm start, deep links, or back navigation
- [ ] Visual parity or intentional improvement documented per screen
- [ ] QA regression passes on iOS and Android (phone + small device)

---

## Sprint 6 — QA, performance, and rollout

Focus: Lock in stability and roll out progressively.

Deliverables

- [x] Add basic UI tests/snapshots for auth and tabs
- [ ] Performance pass: ensure tab transitions and auth render under 100ms on mid-tier devices
- [ ] Implement rollout plan: dev → internal → beta → prod (flags default on at each step)
- [ ] Remove legacy code paths after acceptance (or mark deprecated)

Acceptance criteria

- [ ] All tests pass in CI; lint/typecheck clean
- [ ] No crash or critical UI regressions in beta cohort
- [ ] Flags default on in prod; legacy paths removable

---

## Sprint 7 — Backlog & enhancements

Focus: Nice-to-haves and follow-ups that aren’t required to complete current sprints.

Deliverables

- [ ] Join Household by code (fallback when camera is broken/no QR)
- [ ] (Optional) Household chooser UX polish and i18n copy review
- [ ] (Optional) Invite deep link acknowledgement UI (success/failure states)

Acceptance criteria

- [ ] Users can join a household by manually entering an invite code
- [ ] Copy is localized for chooser and invite flows

---

## Technical details & tasks

Feature flags

- [ ] Add `src/featureFlags.ts` with in-memory defaults and optional remote override (skipped)
- [ ] Expose toggles in DevToolbar/Settings for `ui.authV2`, `ui.tabsV2`, `ui.darkMode` (skipped)

Icons

- [ ] Use `@expo/vector-icons` (Ionicons/Material) and create `design/icons.ts` map
- [x] Define canonical tab icons for Today/Activity/Members/Search/Add

Layout wrappers

- [x] `ScreenContainer`: SafeAreaView + horizontal padding + background color
- [x] `KeyboardAvoidingWrapper`: platform-aware behavior with sensible defaults

AppBar

- [x] Refactor to flex row; slots: left, title, right; SafeArea-aware
- [ ] Variant for auth screens: minimal/transparent

Inputs & Buttons

- [x] Input props: returnKeyType, textContentType, autoCapitalize, autoCorrect, onSubmitEditing
- [x] Input adornments: right toggle for password visibility
- [x] Button: link variant, icon support, a11y props

Accessibility

- [ ] Add accessibilityRole/Label/Hint to core components
- [x] Ensure tab bar icons have `tabBarAccessibilityLabel`

Navigation

- [x] Update bottom tabs to icons-only; hide labels; a11y labels added
- [x] Optionally add FAB for Add; ensure safe hit area and no keyboard overlap
- [x] Enable native header on detail stack screens

Testing & QA

- [ ] Unit tests for theme helpers and feature flags
- [ ] Snapshot tests for SignIn and TabBar
- [ ] Manual regression checklist per screen (navigation, deep links, offline)

Rollout

- [ ] Document rollback plan (flip feature flags off)
- [ ] Track basic UX metrics (auth submit errors, time-to-home)

---

## Dependencies & risks

- Icons library availability and bundle size (choose a single family to minimize size)
- Platform differences for KeyboardAvoidingView and insets
- Potential route name changes with IA alignment (add aliases/deeplink routes)
- Dark mode contrast issues; verify on real OLED devices

---

## Done definition (per sprint)

- [ ] Code merged behind flags with docs
- [ ] Lint/typecheck/tests green
- [ ] Manual QA checklist completed on iOS/Android
- [ ] Screenshots updated (light + dark) and attached to PR

---

## Owner & tracking

- DRIs: UI/Design System, Navigation, QA
- Link PRs to this plan and tick items as they land.
