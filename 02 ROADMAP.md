Heck yes—React Native + Firebase it is. Let’s make something that actually _lightens_ the load. Below you’ll get: a lean Firestore schema, **Security Rules** (your Firebase equivalent of “RLS”), Storage rules, a pinch of Cloud Functions scaffolding, and a clear 3-sprint roadmap with bite-sized issues.

I’ll be optimistic but suspicious on your behalf, so we don’t ship a nag-bot in a trench coat. 😉

## Next steps

- [x] Add app icons: run npx expo customize to generate assets/icon.png and assets/adaptive-icon.png, then re-add those fields in app.json.
- [x] Install ESLint deps to enable linting: npm install (already in devDependencies)
- [x] EAS build: add eas.json if you plan to ship to stores.
- [ ] Strengthen Functions:
  - [x] Expand RRULE edge cases (EXDATE/COUNT/UNTIL, BYDAY/BYMONTHDAY, DST) with tests
  - [x] Quiet-hours-aware push queue with retries/backoff + daily digest and escalation
  - [x] Finalize invite email via SMTP + Dynamic Links
    - Config via env or functions:config (smtp._, dynamiclinks._); long DL builder; docs added; unit test added
- [x] Add icons, create an eas.json and wire a basic invite flow in the app UI.
- [x] Deploy Firestore/Storage rules, Cloud Functions, and Firestore indexes; smoke-test Activity feed and invite flow.

---

# Firestore data model (collections)

```
/users/{userId}
/households/{householdId}
/households/{householdId}/members/{memberId}
/households/{householdId}/invites/{inviteId}
/households/{householdId}/children/{childId}
/households/{householdId}/tasks/{taskId}
/households/{householdId}/tasks/{taskId}/checklist/{itemId}
/households/{householdId}/measurements/{measurementId}
/households/{householdId}/inventory/{inventoryItemId}
/households/{householdId}/activity/{activityId}
```

## DONE

Next steps

All sub-items are done; the parent “Strengthen Functions” box can be checked.

- Sprint 1 (Foundations)
  - Auth screens; create household flow; Today/Overdue/Upcoming lists
  - Add Task screen + Task Detail (edit, checklist, complete)
  - Activity feed UI
  - Basic local notifications
  - QA/accessibility
  - Analytics/crash (Sentry + minimal PostHog)

- Sprint 2 (Multi-user, invites, digests)
  - Member list UI + admin badge
  - Permissions in UI (hide admin-only actions)
  - Quiet hours UI + validation
  - Server-side daily digest scheduling + escalation
  - Checklist templates (generate)
  - Child profiles & measurements UI
  - Storage upload UI for task photos
  - Index tuning/perf pass

- Sprint 3 (Smart lists & polish)
  - Smart Lists/filters (by kid/context/energy)
  - Seasonal views (gear gaps)
  - RRULE exceptions UI
  - Undo window for destructive actions
  - Conflict resolution affordances
  - Batch assign/self-assign
  - Accessibility/localization polish
  - Settings: data export + delete household
  - QA hardening + store readiness

**Document shapes (representative)**

```jsonc
// /users/{userId}
{
  "displayName": "Ava",
  "email": "ava@example.com",
  "householdIds": ["abc123"],   // denormalized for quick lookups
  "locale": "en",
  "quietHours": {"start":"21:00","end":"07:00","tz":"Europe/Oslo"},
  "createdAt": <serverTimestamp>,
  "updatedAt": <serverTimestamp>
}

// /households/{householdId}
{
  "name": "The Fjords",
  "timezone": "Europe/Oslo",
  "createdBy": "<uid>",
  "createdAt": <serverTimestamp>
}

// /households/{householdId}/members/{memberId}
{
  "userId": "<uid>",
  "role": "admin" | "adult",
  "displayName": "Ava",
  "joinedAt": <serverTimestamp>
}

// /households/{householdId}/invites/{inviteId}
{
  "email": "newcaregiver@example.com",
  "role": "adult",
  "status": "pending" | "accepted" | "revoked" | "expired",
  "tokenHash": "<hash>",               // NEVER store raw token
  "createdBy": "<uid>",
  "createdAt": <serverTimestamp>,
  "expiresAt": <timestamp>
}

// /households/{householdId}/tasks/{taskId}
{
  "title": "Measure feet",
  "type": "chore" | "event" | "deadline" | "checklist",
  "description": "Every 3 months",
  "context": ["Clothing","Kids"],
  "visibility": "adults" | "all",
  "status": "open" | "in_progress" | "blocked" | "done" | "verified",
  "priority": 0,                      // 0=normal, 1=high
  "householdId": "<same as path>",
  "assigneeIds": ["<memberId>", "..."],
  "childIds": ["<childId>"],
  "startAt": <timestamp|null>,        // for events / prep
  "dueAt": <timestamp|null>,          // for deadlines
  "rrule": "FREQ=MONTHLY;INTERVAL=3", // optional
  "prepWindowHours": 24,              // optional
  "nextOccurrenceAt": <timestamp|null>, // denormalized for Today/Upcoming
  "createdBy": "<uid>",
  "createdAt": <serverTimestamp>,
  "updatedAt": <serverTimestamp>
}

// /households/{householdId}/tasks/{taskId}/checklist/{itemId}
{
  "label": "Update sizes in app",
  "done": false,
  "assigneeId": "<memberId|null>"
}

// /households/{householdId}/children/{childId}
{
  "name": "Noah",
  "schoolType": "kindergarten" | "elementary",
  "notes": ""
}

// /households/{householdId}/measurements/{measurementId}
{
  "childId": "<childId>",
  "kind": "foot_len_cm",
  "value": 17.8,
  "measuredAt": <timestamp>,
  "createdBy": "<uid>"
}

// /households/{householdId}/inventory/{inventoryItemId}
{
  "childId": "<childId>",
  "season": "winter",
  "category": "boots",
  "size": "28",
  "status": "has" | "need",
  "updatedAt": <serverTimestamp>
}

// /households/{householdId}/activity/{activityId}
{
  "actorId": "<uid>",
  "action": "task.create" | "task.update" | "task.complete" | "invite.accept",
  "taskId": "<taskId|null>",
  "payload": {...},                    // small, safe summary
  "at": <serverTimestamp>
}
```

---

# Firebase Security Rules (“RLS” for Firebase)

### Firestore Rules (v2 syntax)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function userId()     { return request.auth.uid; }

    // Household membership check: read member doc by userId
    function isHouseholdMember(householdId) {
      return exists(/databases/$(database)/documents/households/$(householdId)/members/$(userId()));
    }

    function isHouseholdAdmin(householdId) {
      return get(/databases/$(database)/documents/households/$(householdId)/members/$(userId())).data.role == "admin";
    }

    match /users/{uid} {
      allow read: if isSignedIn() && uid == userId();
      allow write: if isSignedIn() && uid == userId();
    }

    match /households/{householdId} {
      // Create a household if signed in
      allow create: if isSignedIn();

      // Read/write only for members
      allow read: if isSignedIn() && isHouseholdMember(householdId);
      allow update, delete: if isSignedIn() && isHouseholdAdmin(householdId);

      // Members subcollection: only admins can add/remove; members can read self
      match /members/{memberId} {
        allow read: if isSignedIn() && isHouseholdMember(householdId);
        allow create, update, delete: if isSignedIn() && isHouseholdAdmin(householdId);
      }

      // Invites: admins manage; invited user can accept with valid token through CF
      match /invites/{inviteId} {
        allow read: if isSignedIn() && isHouseholdAdmin(householdId);
        allow create, update, delete: if isSignedIn() && isHouseholdAdmin(householdId);
      }

      // Children
      match /children/{childId} {
        allow read, write: if isSignedIn() && isHouseholdMember(householdId);
      }

      // Tasks
      match /tasks/{taskId} {
        allow read: if isSignedIn() && isHouseholdMember(householdId);

        allow create: if isSignedIn() && isHouseholdMember(householdId)
          && request.resource.data.householdId == householdId
          && request.resource.data.title is string
          && request.resource.data.type in ["chore","event","deadline","checklist"]
          && request.resource.data.createdBy == userId();

        allow update: if isSignedIn() && isHouseholdMember(householdId)
          // Only allow fields we expect; prevent privilege escalation
          && request.resource.data.diff(resource.data).changedKeys().hasOnly(
              ["title","description","context","visibility","status","priority",
               "assigneeIds","childIds","startAt","dueAt","rrule",
               "prepWindowHours","nextOccurrenceAt","updatedAt"]
             );

        allow delete: if isSignedIn() && isHouseholdMember(householdId);

        // Checklist items follow same membership rule
        match /checklist/{itemId} {
          allow read, write: if isSignedIn() && isHouseholdMember(householdId);
        }
      }

      // Measurements, Inventory, Activity
      match /measurements/{measurementId} {
        allow read, write: if isSignedIn() && isHouseholdMember(householdId);
      }
      match /inventory/{inventoryItemId} {
        allow read, write: if isSignedIn() && isHouseholdMember(householdId);
      }
      match /activity/{activityId} {
        // append-only: clients can create entries but not edit/delete
        allow create: if isSignedIn() && isHouseholdMember(householdId);
        allow read: if isSignedIn() && isHouseholdMember(householdId);
        allow update, delete: if false;
      }
    }
  }
}
```

> Skeptical check: client-side writes are validated, but **invite acceptance** and **role changes** should run via Cloud Functions to avoid spoofing.

### Cloud Storage Rules (task photos, docs)

Use a dedicated bucket path to scope by household:

```
/households/{householdId}/tasks/{taskId}/{filename}
```

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isSignedIn() { return request.auth != null; }

    // NOTE: Storage rules cannot read Firestore to check membership.
    // Enforce membership in app/Cloud Functions; here we restrict to signed-in users
    // and constrain uploads by size/content-type. Deletions allowed for signed-in users.

    match /households/{hid}/{allPaths=**} {
      allow read: if isSignedIn();
      allow delete: if isSignedIn();
      allow create, update: if isSignedIn()
        && request.resource.size < 10 * 1024 * 1024
        && request.resource.contentType.matches('image/.*|application/pdf');
    }
  }
}
```

---

# React Native (Expo) app structure (high-level)

```
/src
  /app                      // expo-router or react-navigation
  /components
  /screens
    Home.tsx
    TaskDetail.tsx
    AddTask.tsx
    Templates.tsx
    Kids.tsx
    Settings.tsx
  /store                    // Zustand or Redux
  /services
    firebase.ts             // init
    tasks.ts                // queries/mutations
    households.ts
    invites.ts
    notifications.ts
    rrule.ts                // rrule parsing helpers
  /models                   // TypeScript types
  /hooks
  /utils
```

- **State**: React Query for server cache + Zustand for UI state.
- **Offline**: Firestore cache + `@react-native-async-storage/async-storage` for extras.
- **Date/rrule**: `rrule` npm + dayjs (timezone plugin).
- **Push**: Expo Notifications → FCM/APNs.

---

# Cloud Functions (Node 20, TypeScript) — essential endpoints

**1) Create household (onCreate) → add creator as admin**

```ts
export const onHouseholdCreate = functions.firestore
  .document("households/{hid}")
  .onCreate(async (snap, ctx) => {
    const { createdBy } = snap.data();
    await db.doc(`households/${ctx.params.hid}/members/${createdBy}`).set({
      userId: createdBy,
      role: "admin",
      joinedAt: FieldValue.serverTimestamp(),
    });
    await db.doc(`users/${createdBy}`).set(
      {
        householdIds: FieldValue.arrayUnion(ctx.params.hid),
      },
      { merge: true }
    );
  });
```

**2) Invite flow (callable)**

- Admin calls `createInvite({email, role})` → generates token, stores `tokenHash`, sends email.
- Invitee opens app link → `acceptInvite({householdId, token})` validates and upserts member doc.

**3) Daily digests & escalation**

- Cloud Scheduler → HTTPS function `runDailyDigests` per tz window.
- For each member: query tasks where `dueAt` in next 24h OR `nextOccurrenceAt` today; respect quiet hours; send one tidy push.
- Optional escalation: if deadline within 3h and no assignee accepted → ping other adult.

**4) Denormalize `nextOccurrenceAt`**

- On task write, recompute next occurrence from `rrule`, `startAt`, and `dueAt`.

---

# Firestore indexes (sample)

Create composite indexes for the “Today / Upcoming / Overdue” lists:

- `households/{hid}/tasks`
  - `status ASC, nextOccurrenceAt ASC`
  - `status ASC, dueAt ASC`
  - `assigneeIds ARRAY_CONTAINS, status ASC, dueAt ASC`
  - `childIds ARRAY_CONTAINS, status ASC, nextOccurrenceAt ASC`

---

# Sprint roadmap (3 sprints, 2 weeks each)

Tiny steps, visible value, no yak-shaving.

## Sprint 1 — Foundations & single-household happy path

**Goal:** Create/assign/complete tasks within one household, basic security, and a usable Home.

**Backlog issues**

1. **Project setup**: Expo (RN), TypeScript, EAS config.
2. **Firebase setup**: Firestore, Auth (email+password, magic link), Storage, Functions, Scheduler. EU multi-region.
3. **Implement Firestore & Storage Rules** (above) + deploy.
4. **Auth screens**: sign up/in/out; error handling; passwordless magic link optional.
5. **Create household** flow; onCreate CF adds creator as admin.
6. **Home screen (Today/Overdue/Upcoming)** with queries:
   - Today: `status != 'done'` && (`nextOccurrenceAt` is today OR `dueAt` is today).
   - Overdue: `dueAt < now` && `status != 'done'`.
   - Upcoming: next 7 days.

7. **Add Task screen**: types (chore/event/deadline/checklist), `dueAt/startAt/rrule`, assignees, child tags.
8. **Task detail**: edit core fields; checklist CRUD; mark complete; optimistic updates + rollback.
9. **Activity feed (append-only)**: show last 20 actions per household.
10. **Basic notifications**: local push for tasks due today (client-side for now).
11. **QA & accessibility**: large text, talkback/voiceover checks.
12. **Analytics & crash**: Sentry + minimal PostHog (EU).

**Definition of Done:** Two adults in one household can add/edit/complete tasks; rule enforcement works; app doesn’t shout at night.

---

## Sprint 2 — Multi-user, invites, and digests

**Goal:** Share the load: invites, roles, and calm notifications.

**Backlog issues**

1. **Member list UI** (roles shown; admin badge).
2. **Invite flow (admin only)**:
   - Callable `createInvite` → email with magic link (Dynamic Links).
   - Accept invite in-app (deep link), CF validates token, adds member, updates `/users`.

3. **Permissions in UI**: hide dangerous buttons from non-admins.
4. **Quiet hours per user** UI; validation (start/end/tz).
5. **Server-side daily digest**:
   - Cloud Scheduler triggers at 06:30 local household tz.
   - CF compiles tasks (Today/Overdue), batches notifications per user.
   - Respect quiet hours (queue to 07:00 if needed).

6. **Escalation (opt-in)**: if due in <3h and unaccepted, ping unassigned adult.
7. **Checklist templates (Birthday, Day Trip, Season Change)**: one-tap generate.

> Shipped along the way (app polish):
>
> - Quick accept/release and complete on TaskCard, with badges (Mine / accepted count)
> - Photo upload + delete in Task Detail
> - Checklist inline rename and fast entry (submit + refocus)
> - Clone checklist as template (labels only)
>
> 8. **Child profiles & measurements** UI; record foot length; history chart (client-side).
> 9. **Storage upload UI** for task photos (evidence, receipts).
> 10. **Index tuning** & perf pass for task lists.

**Definition of Done:** Household invites work; people get **one** helpful morning summary, not 17 pings; templates save time.

---

## Sprint 3 — Smart lists, seasonal magic, and polish

**Goal:** Make it feel _intuitive_ and slightly psychic.

**Backlog issues**

1. **Smart Lists & filters**: by kid, by context (Home/Outing/Shopping), by energy (5-min vs deep clean).
2. **Seasonal views**: Winter/Autumn gear gaps per child (derive from inventory + measurements).
3. **RRULE exceptions**: skip or move single occurrence; UI affordance.
4. **Undo window**: 10-minute undo for destructive actions (client queue + server activity marker).
5. **Conflict resolution**: last-write-wins with visible “edited by X at hh\:mm”.
6. **Batch assign/self-assign**: “I’ve got it” action in lists.
7. **Accessibility & localization**: EN + NB; date/time locale; RTL audit (future-proof).
8. **Settings → Data export** (JSON) & delete household (admin).
9. **QA hardening**: airplane mode tests, low-end device perf, cold start.
10. **Store readiness**: app icons, privacy labels, consent screens.

**Definition of Done:** The app feels like a calm co-parent: organized, respectful, seasonal-savvy.

---

# A couple of code sprinkles you can paste today

**React Query + Firestore: fetch Today**

```ts
import { useQuery } from "@tanstack/react-query";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import dayjs from "dayjs";

export function useTodayTasks(hid: string) {
  return useQuery({
    queryKey: ["todayTasks", hid],
    queryFn: async () => {
      const start = dayjs().startOf("day").toDate();
      const end = dayjs().endOf("day").toDate();
      const ref = collection(db, `households/${hid}/tasks`);
      const q = query(
        ref,
        where("status", "in", ["open", "in_progress", "blocked"]),
        where("nextOccurrenceAt", ">=", start),
        where("nextOccurrenceAt", "<=", end),
        orderBy("nextOccurrenceAt", "asc")
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
  });
}
```

**Callable function: createInvite**

```ts
export const createInvite = https.onCall(async (data, context) => {
  const { householdId, email, role } = data;
  const uid = context.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in");

  const memberRef = db.doc(`households/${householdId}/members/${uid}`);
  const member = await memberRef.get();
  if (!member.exists || member.data()?.role !== "admin")
    throw new HttpsError("permission-denied", "Admin only");

  const token = crypto.randomUUID();
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const inviteRef = db.collection(`households/${householdId}/invites`).doc();
  const expiresAt = Timestamp.fromDate(dayjs().add(7, "day").toDate());
  await inviteRef.set({
    email,
    role,
    status: "pending",
    tokenHash,
    createdBy: uid,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  });

  // TODO: send email w/ Firebase Dynamic Link including ?hid=...&token=...
  return { inviteId: inviteRef.id };
});
```

**Callable function: acceptInvite**

```ts
export const acceptInvite = https.onCall(async (data, context) => {
  const { householdId, inviteId, token } = data;
  const uid = context.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in");

  const inviteRef = db.doc(`households/${householdId}/invites/${inviteId}`);
  const snap = await inviteRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Invite missing");

  const inv = snap.data()!;
  if (inv.status !== "pending" || inv.expiresAt.toDate() < new Date())
    throw new HttpsError("failed-precondition", "Invite invalid/expired");

  const hash = createHash("sha256").update(token).digest("hex");
  if (hash !== inv.tokenHash)
    throw new HttpsError("permission-denied", "Bad token");

  await db.doc(`households/${householdId}/members/${uid}`).set({
    userId: uid,
    role: inv.role ?? "adult",
    joinedAt: FieldValue.serverTimestamp(),
  });

  await inviteRef.update({ status: "accepted" });

  await db
    .doc(`users/${uid}`)
    .set({ householdIds: FieldValue.arrayUnion(householdId) }, { merge: true });

  return { ok: true };
});
```

---

# Final skeptical nits (because future-you will thank us)

- **EU data residency**: create your Firebase project in **europe-west** locations; set Firestore/Storage to EU multi-region.
- **Never write roles from the client.** Only CF changes `members/{memberId}.role`.
- **Denormalize sparingly**: `nextOccurrenceAt` is worth it; everything else, only if it meaningfully speeds Today/Upcoming.
- **One push per morning** per user. Digests > drip torture.

---

If you want, I can turn this into:

- A **ready-to-deploy `firestore.rules` and `storage.rules` files**,
- An **Expo starter repo layout** with the providers wired,
- A **postman collection** for callable functions,
- Or **sample UI mocks** for the Today/Task/Template flows.

Say the word and I’ll drop the actual files you can run.
