# Plates — Comprehensive Project Overview

## What It Is

Plates is a personal life management web application. The core metaphor is spinning plates — a busy person has many areas of life to manage (work, family, health, side projects, personal goals), and if they stop paying attention to any one plate for too long, it drops. Plates helps users organize tasks under these life areas, generates intelligent daily plans, and provides a nightly review loop to maintain balance across everything.

**Target user:** A busy professional juggling a full-time job, family responsibilities, health/fitness, a side business, major life goals (like buying a home), and personal wellbeing — all at once.

**Live URL:** Deployed on Vercel (Next.js). Single-user for v1 but the database schema is multi-user ready.

---

## Core Concepts

### Plates
Plates are the major areas of a user's life. Each plate has a name, icon, color, and type:
- **Ongoing plates** represent permanent life areas (Work, Family, Health)
- **Goal plates** represent finite objectives with milestones (Buying a Home, Learning Spanish)

Goal-type plates support **milestones** — ordered checkpoints with target dates.

Every plate has a **health score** (0-100) that reflects how much attention it's getting. The plan generator uses the inverse of health to prioritize neglected areas.

### Tasks
Tasks belong to plates. Each task has:
- **Priority:** critical, high, medium, low
- **Context:** at_work, at_home, errands, anywhere
- **Time preference:** morning, afternoon, evening, anytime
- **Effort estimate:** minutes (used for time-budget fitting)
- **Recurrence:** one-time or recurring (daily, weekly with specific days, biweekly, monthly, custom interval)

Recurring tasks use a `next_occurrence` date. When completed, the system calculates the next occurrence and resets the task to pending. This means recurring tasks are never "done" — they cycle perpetually.

### Daily Plans
Each day, the system generates a plan by scoring all eligible tasks and fitting them into the user's available time. Plans are grouped by context (At Work, At Home, Errands, Anywhere) and ordered by time preference (morning tasks first, evening tasks last).

The plan generator is a **pure function** — no database calls, no side effects. It takes structured input and returns a plan. This design makes it testable and swappable for an AI-powered generator later.

### Nightly Reviews
At the end of each day, the user does a quick review:
1. Rate overall mood (1-5)
2. Rate each plate (1-5) — how well did this area go today?
3. Handle incomplete tasks (push to tomorrow or drop)
4. Optionally quick-add new tasks discovered during the day

Review data feeds back into plate health scores and the plan generator's balance calculations.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16.1.6 (App Router) | React 19, Turbopack for dev |
| Database | Vercel Postgres (Neon) | Raw SQL via `@vercel/postgres`, no ORM |
| Styling | Tailwind CSS 4 | Custom design tokens, dark/light themes |
| Fonts | DM Sans + JetBrains Mono | Body + monospace for data |
| Deployment | Vercel | Serverless functions for API routes |
| Cron | GitHub Actions | Daily plan generation at 5 AM CT |
| Auth | Simplified (v1) | Single default user, session cookie placeholder |

**Key dependency:** `@vercel/postgres` — all database access uses its `sql` tagged template literal for parameterized queries. There is no ORM. Every query is hand-written SQL.

---

## Architecture

### Project Structure

```
plates/
├── .env.local.example          # Required env vars template
├── .github/workflows/
│   └── generate-plan.yml       # Daily cron job (5 AM CT)
├── scripts/
│   ├── seed.ts                 # npm run seed — populates sample data
│   └── generate-plan.ts        # npm run generate-plan — manual plan generation
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── layout.tsx          # Root layout (fonts, providers, nav)
│   │   ├── page.tsx            # Landing — redirects to /today or /onboarding
│   │   ├── globals.css         # Design system (CSS variables, animations)
│   │   ├── loading.tsx         # Root loading skeleton
│   │   ├── error.tsx           # Root error boundary
│   │   ├── not-found.tsx       # 404 page
│   │   ├── onboarding/        # 5-step setup wizard
│   │   ├── today/             # Daily plan view (main screen)
│   │   ├── plates/           # Plate list + [id] detail
│   │   ├── review/            # Nightly review flow + summary
│   │   ├── dashboard/         # Stats, health, deadlines
│   │   └── api/               # 23 API route handlers
│   ├── components/            # Shared React components
│   │   ├── BottomNav.tsx      # 4-tab mobile navigation
│   │   ├── TaskCard.tsx       # Swipeable task card
│   │   ├── PlateCard.tsx     # Plate summary card
│   │   ├── QuickAdd.tsx       # FAB + modal for fast task creation
│   │   ├── OnboardingWizard.tsx # 5-step guided setup
│   │   ├── ReviewFlow.tsx     # 5-step nightly review
│   │   ├── Toast.tsx          # Toast notification system
│   │   └── ThemeProvider.tsx  # Dark/light theme context
│   ├── hooks/
│   │   └── useSwipeAction.ts  # Touch gesture hook (swipe to complete/skip)
│   └── lib/                   # Core business logic & data access
│       ├── types.ts           # All TypeScript type definitions
│       ├── config.ts          # Environment configuration
│       ├── auth.ts            # Session management (simplified for v1)
│       ├── plan-generator.ts  # Pure function daily plan algorithm
│       ├── plate-health.ts   # Health score calculation
│       ├── onboarding-data.ts # Suggested plates/tasks for setup
│       └── db/                # Database layer
│           ├── index.ts       # Lazy schema initialization
│           ├── schema.ts      # CREATE TABLE statements
│           ├── seed.ts        # Seed functions (default user + sample data)
│           ├── users.ts       # User CRUD
│           ├── plates.ts     # Plate CRUD (with task count joins)
│           ├── tasks.ts       # Task CRUD + recurring logic
│           ├── milestones.ts  # Milestone CRUD
│           ├── plans.ts       # Daily plan CRUD + plan items
│           ├── reviews.ts     # Review CRUD + streak calculation
│           └── plan-operations.ts # Shared plan generation utility
```

### Database Schema

8 tables with foreign keys and cascade deletes:

```
users
  ├── plates (user_id → users.id)
  │     ├── milestones (plate_id → plates.id)
  │     ├── tasks (plate_id → plates.id)
  │     └── plate_review_ratings (plate_id → plates.id)
  ├── daily_plans (user_id → users.id)
  │     └── plan_items (daily_plan_id → daily_plans.id, task_id → tasks.id)
  └── reviews (user_id → users.id)
        └── plate_review_ratings (review_id → reviews.id)
```

**Key schema details:**
- All primary keys are `TEXT DEFAULT gen_random_uuid()::text`
- `tasks.recurrence_rule` is JSONB storing pattern, days, interval, etc.
- `daily_plans` has a `UNIQUE(user_id, date)` constraint — one plan per user per day
- `plan_items` has `UNIQUE(daily_plan_id, task_id)` — each task appears once per plan
- Schema auto-creates via `CREATE TABLE IF NOT EXISTS` on first request (no migrations needed)

### Data Flow

```
User creates Plates
  → Adds Tasks to Plates (with recurrence, priority, context)
    → Goal Plates get Milestones
      → Plan Generator runs daily:
        - Fetches all pending tasks, plate health, recent completions
        - Scores each task (urgency 35%, priority 30%, balance 20%, staleness 15%)
        - Fits to time budget, ensures plate coverage
        - Groups by context, orders by time preference
      → User works through daily plan:
        - Complete tasks (checkbox or swipe right)
        - Skip tasks (skip button or swipe left)
        - Progress bar updates in real-time
      → Nightly Review:
        - Rate mood (1-5)
        - Rate each plate (1-5)
        - Triage incomplete tasks (push to tomorrow or drop)
        - Quick-add new tasks
      → Review data feeds into plate health scores
      → Health scores influence next day's plan generation
```

---

## API Routes (23 endpoints)

### User & Auth
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/user` | Get current user profile |
| PATCH | `/api/user` | Update user settings (schedule, timezone, etc.) |
| POST | `/api/user/onboard` | Mark onboarding complete |
| GET | `/api/user/stats` | Dashboard statistics (streak, completion rate, plate health, deadlines) |

### Plates
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/plates` | List plates with task counts and health scores |
| POST | `/api/plates` | Create a new plate |
| PATCH | `/api/plates/[id]` | Update a plate |
| DELETE | `/api/plates/[id]` | Archive/delete a plate |
| PATCH | `/api/plates/reorder` | Reorder plates (drag-and-drop) |
| GET | `/api/plates/[id]/milestones` | List milestones for a plate |
| POST | `/api/plates/[id]/milestones` | Create a milestone |
| PATCH | `/api/milestones/[id]` | Update/toggle a milestone |
| DELETE | `/api/milestones/[id]` | Delete a milestone |

### Tasks
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tasks` | List tasks (filterable by plate, status, priority, context) |
| POST | `/api/tasks` | Create a task |
| PATCH | `/api/tasks/[id]` | Update a task |
| DELETE | `/api/tasks/[id]` | Delete a task |
| POST | `/api/tasks/[id]/complete` | Complete a task (handles recurring next_occurrence) |
| POST | `/api/tasks/[id]/skip` | Skip a task (advances recurring to next occurrence) |
| POST | `/api/tasks/quick-add` | Quick-add with smart defaults (title + plate only) |

### Daily Plans
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/plans/today` | Get today's plan (auto-generates if none exists) |
| GET | `/api/plans/[id]` | Get plan by ID or date (`YYYY-MM-DD` format auto-detected) |
| POST | `/api/plans/generate` | Force regenerate today's plan |
| PATCH | `/api/plans/[id]/reorder` | Reorder plan items |
| POST | `/api/plans/[id]/items/[itemId]/complete` | Complete a plan item |
| POST | `/api/plans/[id]/items/[itemId]/skip` | Skip a plan item |

### Reviews
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/reviews/today` | Get today's review (or empty template) |
| POST | `/api/reviews` | Submit a review (mood, plate ratings, notes) |
| GET | `/api/reviews/history` | Get review history for trends |

### Cron
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/cron/generate-plan` | Generate tomorrow's plan (protected by CRON_SECRET bearer token) |

**All responses follow a consistent shape:**
```typescript
// Success
{ data: T, meta?: { ... } }

// Error
{ error: { code: string, message: string } }
```

---

## Key Algorithms

### Plan Generation (`src/lib/plan-generator.ts`)

A pure function that takes user settings, tasks, plate data, and recent history, then returns a daily plan.

**Scoring formula (per task):**
```
score = (urgency × 0.35) + (priority × 0.30) + (plate_balance × 0.20) + (staleness × 0.15)
```

Each factor returns 0-100:
- **Urgency (35%):** Overdue=100, Due today=90, Tomorrow=70, This week=50, This month=30, No due date=10
- **Priority (30%):** Critical=100, High=75, Medium=50, Low=25
- **Plate Balance (20%):** 100 minus plate health — neglected plates score higher
- **Staleness (15%):** Days since task creation, capped at 50

**Time budget calculation:**
- Workday: (awake hours) - (work hours) - 2h meals/transit
- Weekend: (awake hours) - 3h meals/rest
- Minimum floor: 120 min (workday), 180 min (weekend)

**Task limits:** 8-12 tasks per workday, 10-15 per weekend.

**Ordering:** Primary by time preference (morning → afternoon → anytime → evening), secondary by context grouping, tertiary by score.

**Plate coverage guarantee:** After initial selection, a second pass ensures at least one task per active plate is included if room allows.

### Plate Health (`src/lib/plate-health.ts`)

Returns 0-100 where 100 = well-managed, 0 = neglected.

```
health = (review_score × 0.40) + (completion_score × 0.35) + (recency_score × 0.25)
```

- **Review score (40%):** Average of last 7 plate ratings (1-5), scaled to 0-100. Default 50.
- **Completion score (35%):** Tasks completed in last 7 days. 0=20, 1=40, 2=60, 3+=80-100.
- **Recency score (25%):** Days since last completion. 0 days=100, 1=85, 3=60, 7+=20.

### Recurring Task Logic (`src/lib/db/tasks.ts`)

When a recurring task is completed:
1. `completed_at` is set to now
2. `next_occurrence` is calculated based on `recurrence_rule`:
   - **daily:** tomorrow
   - **weekly:** next matching day of week
   - **biweekly:** same calculation + 7 days
   - **monthly:** same day next month
   - **custom:** today + interval days
3. Status resets to `pending`

The task is never truly "done" — it perpetually cycles. Skipping works the same way but doesn't set `completed_at`.

---

## Frontend Screens

### 1. Onboarding Wizard (`/onboarding`)
Five-step guided setup:
1. **Welcome** — app introduction
2. **Plates** — select from 9 suggested plates or create custom ones
3. **Tasks** — per-plate task selection from suggestions, with custom add
4. **Schedule** — set wake/sleep/work times, work days, timezone
5. **Ready** — summary and confirm

Creates all selected plates and tasks with recurrence rules, updates user schedule, marks user as onboarded.

### 2. Today View (`/today`) — Main Screen
- Date header with day-type badge (Workday/Weekend)
- Overall progress bar (completed + skipped / total)
- Tasks grouped by context (collapsible sections)
- Each task shows: plate color accent, title, priority badge, effort estimate, recurring indicator, due date
- Complete via checkbox or swipe right
- Skip via button or swipe left
- "Regenerate Plan" button to force a new plan
- Celebration state when all tasks are done
- Empty state with "Generate Plan" button if no plan exists

### 3. Plates (`/plates`)
- Card grid showing each plate with icon, color, task counts, health indicator
- Inline creation form (name, description, color picker, type toggle)
- Click through to plate detail

### 4. Plate Detail (`/plates/[id]`)
- Color-themed header with plate info
- Milestones section (for goal-type plates) with add/toggle
- Task list with filter tabs: All, Pending, Completed, Recurring
- Swipe/button complete and skip
- Inline task creation form

### 5. Review (`/review`)
If no review exists for today, shows the 5-step ReviewFlow:
1. **Mood** — emoji picker (1-5) + optional notes
2. **Plate Check-in** — rate each plate 1-5
3. **Incomplete Tasks** — for each: "Do tomorrow" or "Drop it"
4. **Quick-Add** — add new tasks discovered during the day
5. **Summary** — review all inputs, submit

If review already exists, shows ReviewSummary (read-only display).

### 6. Dashboard (`/dashboard`)
- Quick stats grid: review streak, weekly completion %, tasks done this week, overdue count
- Today's plan progress bar
- Plate health bars (colored, 0-100%)
- Upcoming deadlines list (sorted by due date)
- Overdue alert banner with link to plates
- Theme toggle button (sun/moon icon)

### Global UI Elements
- **BottomNav:** 4 tabs (Today, Plates, Review, Dashboard), hidden during onboarding
- **QuickAdd FAB:** Floating action button (bottom-right), opens modal for fast task creation with plate selection
- **Toast notifications:** Success/error/warning/info messages, auto-dismiss 3 seconds

---

## Design System

### Theme
Dark mode default, toggleable to light. Theme persists in localStorage. An inline script in `<head>` prevents flash of wrong theme on load.

**Dark palette:**
- Background: #0F0F12 / #1A1A1F / #222228
- Text: #EAEAE8 / #9A9A9A
- Border: #2E2E34

**Light palette:**
- Background: #F5F5F7 / #FFFFFF
- Text: #1A1A1F / #6B7280
- Border: #E5E7EB

**Status colors (both themes):** Accent #2563EB, Success #16A34A, Warning #D97706, Danger #DC2626

**9 plate colors:** Blue, Purple, Green, Amber, Red, Cyan, Pink, Indigo, Teal

### Typography
- **DM Sans:** Body text, headings, labels
- **JetBrains Mono:** Numbers, stats, dates, progress indicators

### Interactions
- Swipe gestures: right to complete (green), left to skip (amber)
- Velocity detection for swipe threshold
- Haptic feedback on mobile
- Card hover effects with top accent line reveal
- `animate-pulse` loading skeletons
- `fadeUp` / `fadeIn` entrance animations
- `card-completing` collapse animation on task completion

---

## Scripts & Automation

### `npm run seed`
Populates the database with sample data for development/demo:
- 5 plates (Work, Family & Home, Health & Fitness, Side Business, Buying a Home)
- 4 milestones for the "Buying a Home" goal plate
- 30+ tasks spanning all priorities, contexts, time preferences, and recurrence patterns
- Some tasks are overdue, some in-progress — realistic for demo
- 3 sample reviews with per-plate ratings

### `npm run generate-plan`
Manually triggers plan generation by calling the cron endpoint locally.

### GitHub Actions Cron
Runs daily at 11:00 UTC (5:00 AM Central) to generate tomorrow's plan via the `/api/cron/generate-plan` endpoint, protected by CRON_SECRET bearer token.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_URL` | Yes | Vercel Postgres (Neon) connection string |
| `CRON_SECRET` | For cron | Bearer token to authenticate GitHub Actions requests |

---

## Current State & What's Built

All 6 phases of the spec are implemented:

1. **Foundation** — Project scaffold, database schema, auth, layout, providers
2. **Plate & Task Management** — Full CRUD for plates, tasks, milestones with swipe gestures
3. **Onboarding Wizard** — 5-step guided setup with suggested plates/tasks
4. **Daily Plan** — Algorithm-driven plan generation, context grouping, complete/skip, progress tracking
5. **Review & Dashboard** — Nightly review flow, stats, plate health visualization, streaks
6. **Polish** — Loading skeletons, error boundaries, not-found pages, dark/light theme toggle, seed data, code cleanup

## Known Limitations & Future Opportunities

### Authentication
V1 uses a simplified single-user auth (`getSessionUserId()` always returns the default user). The database schema supports multiple users via foreign keys, but there's no login flow, session management, or user registration. Adding real auth (e.g., NextAuth, Clerk, or a custom session cookie system) would unlock multi-user support.

### Onboarding Task Recurrence
During onboarding, users can select suggested tasks but cannot customize which specific days recurring tasks should happen on. The tasks get created with the default recurrence patterns from `onboarding-data.ts`. Users can edit recurrence after onboarding by modifying individual tasks, but the onboarding UX could be improved.

### Plan Generation
The plan generator is rules-based with fixed scoring weights. It's designed as a pure function specifically to be swappable — an AI-powered version could consider natural language context, learn from user behavior patterns, or handle more nuanced scheduling. The function signature and input/output types would remain the same.

### Drag-and-Drop Reorder
The API routes for reordering (plates, plan items) exist and work, but the frontend doesn't yet implement drag-and-drop UI. Items can be reordered via API but not via touch/mouse interaction in the UI.

### Notifications
No push notifications or reminders. The review time is stored in user settings but nothing actually triggers a notification. This could be implemented with web push notifications or a service worker.

### Offline Support
No offline capability. All data fetches require network. A service worker with IndexedDB caching could enable offline plan viewing and task completion with sync-on-reconnect.

### Testing
No test suite exists. The plan generator is a pure function and is the highest-value target for unit tests. API routes could be tested with integration tests against a test database.

### Analytics & Trends
The dashboard shows current stats but doesn't visualize historical trends. Review history data is stored and retrievable — charting completion rates, mood trends, and plate health over time would add value.
