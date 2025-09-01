absolutely — let’s give Copilot a **visionary, modern** north star it can actually execute. below is a **compact, copilot-ready design spec**: 4 key screens + a **component design document**, complete color tokens, and clear styling rules. paste sections (as needed) into VS Code Copilot and it’ll generate consistent UI.

# POTY — “Easing Parenting”

_Warmth + clarity + quiet competence. Friendly curves, confident contrast, zero clutter._

---

## 1) Color system (tokens)

**Brand**

- `brand.teal700` **#264E60** (primary) — trust
- `brand.teal600` #2E5F73
- `brand.teal500` #3B7186

**Accents (small doses)**

- `accent.mint300` **#A9E3DA** — calm background chips
- `accent.seafoam400` **#7FC8BF** — schedule ribbons
- `accent.coral400` **#FF8F7E** — important/alerts
- `accent.gold400` **#FFC86B** — focus ring & highlights

**Neutrals**

- `neutral.ink900` **#0F1720** — primary text
- `neutral.ink700` #2A3442 — secondary text
- `neutral.ink400` #6B7280 — placeholders
- `neutral.ink100` #E5E7EB — borders/dividers
- `neutral.ink050` **#F5F7FA** — app background
- `neutral.white` **#FFFFFF** — cards/surfaces

**Semantic**

- `semantic.primary` = brand.teal700
- `semantic.onPrimary` **#FFFFFF**
- `semantic.success` #1E9E6F
- `semantic.warning` #B7791F
- `semantic.danger` #D25353
- `semantic.info` = accent.seafoam400

**Usage**

- Background: `neutral.ink050`
- Surfaces/cards: `neutral.white` with subtle border `neutral.ink100`
- Primary CTAs, tabs, selection: `semantic.primary`
- Focus ring: `accent.gold400` (3 px)
- High-priority labels/chips: `accent.coral400` with white text

---

## 2) Typography

- Family: **Inter** (fallback: System)
- Sizes (dp):
  - **Display** 32/40, weight 800
  - **Headline** 24/32, weight 700
  - **Title** 20/28, weight 700
  - **Subtitle** 18/24, weight 600
  - **Body** 16/24, weight 500
  - **Label** 14/20, weight 600
  - **Caption** 12/16, weight 600

---

## 3) Shape, spacing, elevation, motion

- Corner radius: **12 / 16 / 24** (chips/buttons = pill)
- Spacing scale: **4, 8, 12, 16, 20, 24, 32** (outer padding = 16)
- Tap targets: **≥ 44dp**
- Shadows (iOS)/Elevation (Android):
  - Level 1: soft, for tabs and small cards
  - Level 2: primary surfaces (cards)
  - Level 3: **FAB** / sticky actions

- Motion: **200ms base**, 120ms fast, 320ms slow
  - Enter: `cubic-bezier(0.2, 0.8, 0.2, 1)`
  - Exit: `cubic-bezier(0.4, 0.0, 1, 1)`
  - Micro-delight: checkmark “draw” and subtle heart pulse (once)

---

## 4) Components (design document)

### AppBar

- **Height**: 88, **BG**: `semantic.primary`, **Text**: `onPrimary`, weight 800
- Optional right slot (icon/group). Replace platform header; use rounded top (24) when floating.

### Button

- Sizes: **md 48**, **lg 56**
- **Primary**: bg `semantic.primary`, label `onPrimary`
- **Outline**: stroke `semantic.primary`, label `semantic.primary`, bg transparent
- **Ghost**: transparent, label `semantic.primary`
- States: pressed (opacity 0.92), disabled (opacity 0.4)

### Input

- Label (14/20, ink700) above field
- Field: height 48, bg white, radius 12
- Border: 1px `ink100` → **focus:** 3px `accent.gold400` → **error:** 2px `semantic.danger`
- Placeholder color: `ink400`
- Error text: 12/16, `semantic.danger`, weight 600

### Card

- BG: white, radius 16, 0.5px border `ink100`, elevation 1–2
- Use for any grouped content; never nest heavy shadows.

### Tabs (segmented)

- Container: height 56, radius 28, bg white, elevation 1
- Selected chip: bg `semantic.primary`, label `onPrimary`
- Unselected label: `ink700`

### Chip

- Pill, height 36, **selected:** bg `semantic.primary`, text `onPrimary`
- **Unselected:** bg `accent.mint300`, text `ink900`

### Checkbox

- 24x24, radius 6, 2px stroke `ink400`
- Checked: bg/stroke `semantic.primary`, white tick

### Toast

- Pill card; bg by type (`success/warning/danger/info`), text `onPrimary`; auto-dismiss in \~2s

### TaskCard (compound)

- Grid: checkbox • title/subtitle • category chip
- Title: 18/… bold; Subtitle: 14–16 `ink700`
- Category chip colors: Routine=mint, Event=seafoam, Important=coral(white text)

### SettingsRow (new)

- Height 56; left label, optional right value (ink700), trailing chevron; divider `ink100`

### EmptyState (new)

- Card with roomy padding, subtle illustration space, Title 20/28, Body 16/24, primary CTA, ghost secondary

---

## 5) Four hero screens (mobile)

### A) Home (Daily hub)

**Goal:** Today at a glance + add quick actions.
**Layout (top→bottom)**

1. **AppBar** “Home”
2. **Tabs**: All • Tasks • Events • Routines
3. **Task list** (stack of **TaskCard**)
4. **FAB** bottom-right → Add Task

**Notes:** TaskCard category chips provide instant priority; completed items gray label or struck through lightly (never dim entire card).

---

### B) Calendar (Plan & preview)

**Goal:** Monthly orientation + daily agenda recap.
**Layout**

1. **AppBar** “Calendar”
2. **Card**: month grid (pill selection); highlight selected day with `semantic.primary`
3. **Card**: “Friday, Sep 12” agenda rows
   - Agenda chips use accent fills (mint/seafoam/coral) with appropriate contrast

4. Optional: Outline “+ Add event” at section bottom

---

### C) Task Detail (Focus & finish)

**Goal:** One task from intent to done.
**Layout**

1. **AppBar** “Task Detail”
2. **Card**: Title (24/32 bold), meta line (date • time • context)
3. **Card**: Checklist (Checkbox rows)
4. **Card**: Schedule (repeat, alerts)
5. **Sticky primary** bottom: “Mark Done” (safe-area aware)

**Micro-motion:** On mark done → checkmark draws in 200ms, toast “Task completed” (success).

---

### D) Members (Household)

**Goal:** clarity of who’s in, easy inviting.
**Layout**

1. **AppBar** “Members”
2. **Card**: Household name + member count
3. **List** of **SettingsRow**: member name + role Chip (Owner, Parent, Kid)
4. **Card**: Invite
   - Outline **“Share invite link”**
   - Outline **“Show QR”**
   - Ghost **“Scan invite”**

**Notes:** Roles use Chips (Owner=teal selected, others mint). Keep actions high contrast but not shouty.

---

## 6) Copilot-ready tokens (paste in your project)

```ts
// design/tokens.ts
export const colors = {
  brand: { teal700: "#264E60", teal600: "#2E5F73", teal500: "#3B7186" },
  accent: {
    mint300: "#A9E3DA",
    seafoam400: "#7FC8BF",
    coral400: "#FF8F7E",
    gold400: "#FFC86B",
  },
  neutral: {
    ink900: "#0F1720",
    ink700: "#2A3442",
    ink400: "#6B7280",
    ink100: "#E5E7EB",
    ink050: "#F5F7FA",
    white: "#FFFFFF",
  },
  semantic: {
    primary: "#264E60",
    onPrimary: "#FFFFFF",
    success: "#1E9E6F",
    warning: "#B7791F",
    danger: "#D25353",
    info: "#7FC8BF",
  },
} as const;

export const radius = { sm: 12, md: 16, lg: 24, pill: 999 } as const;
export const spacing = [0, 4, 8, 12, 16, 20, 24, 32, 40] as const;

export const typography = {
  family: { sans: "Inter, System" },
  scale: {
    display: { size: 32, lh: 40, weight: "800" as const },
    headline: { size: 24, lh: 32, weight: "700" as const },
    title: { size: 20, lh: 28, weight: "700" as const },
    subtitle: { size: 18, lh: 24, weight: "600" as const },
    body: { size: 16, lh: 24, weight: "500" as const },
    label: { size: 14, lh: 20, weight: "600" as const },
    caption: { size: 12, lh: 16, weight: "600" as const },
  },
} as const;
```

---

## 7) Copilot brief (paste verbatim in VS Code)

```
You are refactoring our React Native app to the POTY design system.

Principles: warm, clear, organized. No raw TextInput/TouchableOpacity; use POTY components. Keep all business logic and navigation unchanged.

Use:
import { useTheme } from "../design/theme";
import { AppBar, Button, Card, Input, Tabs, Chip, Checkbox, ToastProvider, TaskCard } from "../design/components";

Rules:
- Screen root: flex:1; backgroundColor colors.neutral.ink050; contentContainerStyle { padding:16 }.
- Replace inputs with <Input label="..." .../>; focus ring is 3px accent.gold400.
- Replace buttons with <Button variant="primary|outline|ghost" />.
- Group content in <Card>.
- Tabs for top filters; Chips for inline filters.
- Use TaskCard for any task row; categories: Routine/Event/Important/Task.
- Use SettingsRow (create if missing) for lists with chevron; divider ink100.
- FAB for primary “add” actions; elevation 3.
- No inline hexes; pull from useTheme().colors.

Deliver 4 screens:
1) Home: AppBar, Tabs (All/Tasks/Events/Routines), list of TaskCard, FAB.
2) Calendar: AppBar, month grid in Card, agenda Card with accent ribbons, Add event (outline).
3) Task Detail: AppBar, Title card, Checklist card, Schedule card, sticky primary “Mark Done”.
4) Members: AppBar, Household summary Card, SettingsRow list of members with role Chips, Invite actions (outline/ghost).

Acceptance:
- Primary color #264E60 appears on AppBar, selected Tabs, primary Button, FAB.
- Inputs show gold #FFC86B focus ring.
- Cards have white bg, 16 radius, 0.5px ink100 border; subtle elevation.
- Tap targets ≥ 44dp; spacing rhythm 8/16.
```

---

## 8) Quick component APIs (for Copilot)

- `<Button title string, variant "primary"|"outline"|"ghost", size "md"|"lg" />`
- `<Input label string, placeholder string, value string, onChangeText fn, error string? />`
- `<Tabs items string[], value number, onChange (i)=>void />`
- `<Chip label string, selected? boolean, onPress? fn />`
- `<Checkbox checked? boolean, onToggle (v)=>void />`
- `<TaskCard title string, subtitle? string, category? "Routine"|"Event"|"Important"|"Task", completed? boolean />`
- `<AppBar title string, right? ReactNode />`
- `<Card>{children}</Card>`

---

## 9) Accessibility & QA checklist

- Contrast ≥ 4.5:1 for text; coral chips use white text.
- Hit areas ≥ 44dp; list rows min height 56dp.
- Focus/pressed states visible for all interactives.
- Dynamic type: allow 15–20% growth without clipping.
- VoiceOver/TalkBack labels on buttons, tabs, checkboxes.

---

### micro-promise

give this spec to Copilot and your pages stop looking “generated” and start looking **intentional**. if anything feels off (spacing, weight, corner), we tune the **tokens once** and all screens follow — like magic, but with math.
