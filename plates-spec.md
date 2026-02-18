# Plates — Product Specification & Claude Code Build Prompt

## Project Overview

**Plates** is a personal life management web application that helps users organize, prioritize, and execute across all areas of their life. It structures tasks under "life pillars" (major life areas), generates intelligent daily plans, and provides a nightly review workflow to keep everything on track.

The core metaphor: keeping all the plates spinning. Each pillar of your life is a plate. Drop your attention from one too long and it wobbles. Plates helps you see which ones need attention and guides your daily actions accordingly.

**Target user for v1**: A single busy professional juggling a full-time job, family responsibilities, a major life project (e.g., buying a home), a side business, and personal wellbeing — all at once.

**Long-term vision**: Multi-user SaaS application with AI-powered daily planning via Claude API integration.

---

## Tech Stack

This app should follow the same architecture and conventions as the **ktchp** project (a Next.js app by the same developer). Match that project's patterns wherever possible.

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router, React 19, Turbopack) |
| Database | Vercel Postgres (Neon) — raw SQL via `@vercel/postgres`, no ORM |
| Styling | Tailwind CSS 4, dark theme default (DM Sans + JetBrains Mono) |
| Deployment | Vercel (hosting) + GitHub Actions (daily cron for plan generation) |
| Auth | Skip for v1 (single-user with seeded default user), but design the schema with a `users` table so auth can be added later (same invite-based pattern as ktchp) |

### Key Architecture Decisions (matching ktchp patterns)

- **No ORM** — Use raw SQL queries via `@vercel/postgres` `sql` tagged template literals, organized into `lib/db/*.ts` modules per entity (e.g., `lib/db/pillars.ts`, `lib/db/tasks.ts`).
- **Schema auto-init** — Database tables are auto-created on first connection, with a schema definition file (`lib/db/schema.ts`) and seed script for the default user.
- **API routes in App Router** — All backend logic lives in `app/api/` route handlers. No separate Express server.
- **Server Components by default** — Pages use React Server Components for data fetching. Client Components (`"use client"`) only where interactivity is required.
- **Shared lib structure** — Business logic in `lib/`, database queries in `lib/db/`, config in `lib/config.ts`.

### Project Structure

```
plates/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Landing/redirect → today or onboarding
│   │   ├── onboarding/page.tsx       # Guided setup wizard
│   │   ├── today/page.tsx            # Daily plan view (main screen)
│   │   ├── pillars/page.tsx          # Pillar list view
│   │   ├── pillars/[id]/page.tsx     # Pillar detail + task management
│   │   ├── review/page.tsx           # Nightly review flow
│   │   ├── dashboard/page.tsx        # Stats, streaks, pillar health
│   │   ├── layout.tsx                # Root layout with nav + quick-add FAB
│   │   └── api/
│   │       ├── pillars/              # CRUD + reorder
│   │       ├── milestones/           # CRUD for goal milestones
│   │       ├── tasks/                # CRUD + complete + skip + quick-add
│   │       ├── plans/                # Get/generate daily plans + reorder + item actions
│   │       ├── reviews/              # Submit + history
│   │       ├── user/                 # Profile, settings, stats, onboard
│   │       └── cron/                 # Plan generation endpoint (called by GitHub Actions)
│   │
│   ├── components/
│   │   ├── TaskCard.tsx              # Swipeable task card with pillar color
│   │   ├── PillarCard.tsx            # Pillar summary card with health indicator
│   │   ├── QuickAdd.tsx              # FAB + modal for fast task creation
│   │   ├── BottomNav.tsx             # Mobile bottom tab navigation
│   │   ├── OnboardingWizard.tsx      # Multi-step setup flow
│   │   ├── ReviewFlow.tsx            # Guided nightly review steps
│   │   ├── PlanContextGroup.tsx      # Collapsible context group in daily plan
│   │   ├── PillarHealthChart.tsx     # Radar or bar chart for dashboard
│   │   ├── StreakStats.tsx           # Completion streaks and stats
│   │   ├── DragReorderList.tsx       # Drag-and-drop reorderable list wrapper
│   │   └── Toast.tsx                 # Toast notification system
│   │
│   ├── hooks/
│   │   ├── useSwipeAction.ts         # Swipe-to-complete/skip gesture hook
│   │   └── useDragReorder.ts         # Drag-and-drop reorder hook
│   │
│   └── lib/
│       ├── config.ts                 # Environment config, defaults
│       ├── auth.ts                   # Session management (minimal for v1)
│       ├── plan-generator.ts         # Daily plan generation algorithm (isolated, pure logic)
│       ├── pillar-health.ts          # Pillar health score calculation
│       ├── db/
│       │   ├── index.ts              # DB connection + schema init
│       │   ├── schema.ts             # Table definitions, migrations
│       │   ├── seed.ts               # Default user + optional sample data
│       │   ├── pillars.ts            # Pillar CRUD
│       │   ├── milestones.ts         # Milestone CRUD
│       │   ├── tasks.ts              # Task CRUD + recurring logic
│       │   ├── plans.ts              # Daily plan CRUD
│       │   ├── reviews.ts            # Review CRUD
│       │   └── users.ts              # User CRUD
│       └── types.ts                  # Shared TypeScript types and enums
│
├── scripts/
│   ├── generate-plan.ts              # Standalone plan generation (for GitHub Actions cron)
│   └── seed.ts                       # Database seeding script
│
├── .github/
│   └── workflows/
│       └── generate-plan.yml         # Daily cron: triggers plan generation
│
├── package.json
├── tailwind.config.ts
├── next.config.ts
└── .env.local                        # POSTGRES_URL, CRON_SECRET
```

---

## Database Schema

Use raw SQL table definitions (matching ktchp's `lib/db/schema.ts` pattern). Auto-create tables on first connection. Design with multi-user support in mind even though v1 is single-user.

### Tables

```sql
-- Users (single user for v1, multi-user ready)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  name TEXT,
  wake_time TEXT DEFAULT '06:30',
  sleep_time TEXT DEFAULT '22:30',
  work_start_time TEXT DEFAULT '08:00',
  work_end_time TEXT DEFAULT '17:00',
  work_days INTEGER[] DEFAULT '{1,2,3,4,5}',
  timezone TEXT DEFAULT 'America/Chicago',
  review_time TEXT DEFAULT '21:00',
  onboarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pillars (life areas)
CREATE TABLE IF NOT EXISTS pillars (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'ongoing',      -- 'ongoing' or 'goal'
  status TEXT NOT NULL DEFAULT 'active',     -- 'active', 'completed', 'archived'
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pillars_user_status ON pillars(user_id, status);

-- Milestones (for goal-type pillars)
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  pillar_id TEXT REFERENCES pillars(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_milestones_pillar ON milestones(pillar_id);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  pillar_id TEXT REFERENCES pillars(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  effort_minutes INTEGER,
  energy_level TEXT DEFAULT 'medium',
  context TEXT DEFAULT 'anywhere',
  time_preference TEXT DEFAULT 'anytime',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule JSONB,
  next_occurrence DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_pillar_status ON tasks(pillar_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON tasks(status, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_next_occurrence ON tasks(next_occurrence);

-- Daily Plans
CREATE TABLE IF NOT EXISTS daily_plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  day_type TEXT DEFAULT 'workday',
  available_minutes INTEGER,
  generated_at TIMESTAMPTZ DEFAULT now(),
  is_locked BOOLEAN DEFAULT false,
  UNIQUE(user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_plans_user_date ON daily_plans(user_id, date);

-- Plan Items (tasks assigned to a daily plan)
CREATE TABLE IF NOT EXISTS plan_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  daily_plan_id TEXT REFERENCES daily_plans(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  context_group TEXT,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  skipped BOOLEAN DEFAULT false,
  UNIQUE(daily_plan_id, task_id)
);
CREATE INDEX IF NOT EXISTS idx_plan_items_plan ON plan_items(daily_plan_id);

-- Reviews (nightly check-ins)
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Pillar Review Ratings
CREATE TABLE IF NOT EXISTS pillar_review_ratings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  review_id TEXT REFERENCES reviews(id) ON DELETE CASCADE,
  pillar_id TEXT REFERENCES pillars(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  note TEXT,
  UNIQUE(review_id, pillar_id)
);
```

### Recurrence Rule Format

Store recurrence as structured JSONB in the `recurrence_rule` field:

```typescript
type RecurrenceRule = {
  pattern: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  days?: number[];          // For weekly: [0,1,2,3,4,5,6] (Sun-Sat)
  dayOfMonth?: number;      // For monthly: 1-31
  interval?: number;        // For custom: every N days
  endDate?: string;         // Optional: stop recurring after this date
};
```

---

## API Endpoints

All API routes live in `src/app/api/`. Use Next.js App Router route handlers. Consistent JSON response structure:

```typescript
// Success
{ data: T, meta?: { ... } }

// Error
{ error: { code: string, message: string } }
```

### Pillars
```
GET    /api/pillars              # List all pillars (with task counts, health scores)
POST   /api/pillars              # Create a pillar
PATCH  /api/pillars/[id]         # Update a pillar
DELETE /api/pillars/[id]         # Archive a pillar (soft delete)
PATCH  /api/pillars/reorder      # Reorder pillars (accepts { ids: string[] })
```

### Milestones
```
GET    /api/pillars/[id]/milestones    # List milestones for a pillar
POST   /api/pillars/[id]/milestones    # Create a milestone
PATCH  /api/milestones/[id]            # Update a milestone
DELETE /api/milestones/[id]            # Delete a milestone
```

### Tasks
```
GET    /api/tasks                 # List tasks (filters: pillarId, status, priority, context)
POST   /api/tasks                 # Create a task
PATCH  /api/tasks/[id]            # Update a task
DELETE /api/tasks/[id]            # Delete a task
POST   /api/tasks/[id]/complete   # Mark complete (handles recurring task logic)
POST   /api/tasks/[id]/skip       # Skip for today
POST   /api/tasks/quick-add       # Quick add: { title, pillarId } with smart defaults
```

### Daily Plans
```
GET    /api/plans/today           # Get today's plan (generate if not exists)
GET    /api/plans/[date]          # Get plan for specific date (YYYY-MM-DD)
POST   /api/plans/generate        # Force regenerate today's plan
PATCH  /api/plans/[id]/reorder    # Reorder plan items (drag-and-drop)
POST   /api/plans/[id]/items/[itemId]/complete   # Complete a plan item
POST   /api/plans/[id]/items/[itemId]/skip       # Skip a plan item
```

### Reviews
```
GET    /api/reviews/today         # Get today's review (or empty template)
POST   /api/reviews               # Submit a review
GET    /api/reviews/history       # Review history (for trends/stats)
```

### User / Settings
```
GET    /api/user                  # Get user profile + settings
PATCH  /api/user                  # Update settings
GET    /api/user/stats            # Dashboard stats (streaks, completion rates, pillar health)
POST   /api/user/onboard          # Mark onboarding complete
```

### Cron
```
POST   /api/cron/generate-plan    # Called by GitHub Actions — generates next day's plan
```
Protect with `CRON_SECRET` header check (same pattern as ktchp's `/api/ingest`).

---

## Daily Plan Generation Algorithm

Core intelligence of the app. For v1, implement rules-based. Design as an isolated module (`lib/plan-generator.ts`) — a pure function that takes data in and returns a plan. No direct database calls inside. This makes it testable and swappable for AI later.

### Generation Trigger
- GitHub Actions cron calls `/api/cron/generate-plan` daily at 11:00 UTC (5:00 AM CT)
- Also generated on-demand when user hits `GET /api/plans/today` and no plan exists
- User can force regenerate via `POST /api/plans/generate`

### Algorithm

```typescript
interface PlanGeneratorInput {
  user: User;
  date: Date;
  tasks: Task[];
  pillars: Pillar[];
  recentReviews: Review[];
  recentCompletions: { pillarId: string; completedAt: Date }[];
}

interface GeneratedPlan {
  date: Date;
  dayType: 'workday' | 'weekend' | 'holiday' | 'day_off';
  availableMinutes: number;
  items: { taskId: string; sortOrder: number; contextGroup: string }[];
}

function generateDailyPlan(input: PlanGeneratorInput): GeneratedPlan {
  // 1. DETERMINE DAY TYPE
  //    Check if date falls on user's workDays → workday, else weekend

  // 2. CALCULATE AVAILABLE TIME
  //    Workday: ~2-3 hours discretionary + work task block
  //    Weekend: ~6-8 hours available

  // 3. GATHER CANDIDATE TASKS
  //    - status = 'pending' or 'in_progress'
  //    - Recurring tasks where next_occurrence <= today
  //    - Overdue tasks (due_date < today)
  //    - Filter by context for day type (no 'at_work' on weekends)

  // 4. SCORE EACH TASK
  //    Score = weighted sum of:
  //      urgencyScore (0-100): due date proximity
  //        Overdue=100, Due today=90, Tomorrow=70, This week=50, This month=30, None=10
  //      priorityScore (0-100): critical=100, high=75, medium=50, low=25
  //      pillarBalanceScore (0-100): higher if pillar is neglected
  //        Based on review ratings + days since last completion in pillar
  //      stalenessScore (0-50): days since task created, capped at 50
  //
  //    Weights: urgency=0.35, priority=0.30, pillarBalance=0.20, staleness=0.15

  // 5. GROUP BY CONTEXT
  //    "At Work", "At Home", "Errands", "Anywhere"
  //    Sort by score within each group

  // 6. FIT TO AVAILABLE TIME
  //    Fill with highest-scored tasks until time budget used
  //    Ensure at least one task per active pillar if possible
  //    Cap: 8-12 tasks workday, 10-15 weekend
  //    Default effort: 30 minutes if not set

  // 7. APPLY TIME PREFERENCE ORDERING
  //    Morning tasks float up, evening down, anytime by score

  // 8. RETURN (caller handles DB writes)
}
```

### Pillar Health Score (`lib/pillar-health.ts`)

```typescript
function calculatePillarHealth(pillarId, recentReviews, recentCompletions): number {
  // Returns 0-100 (100 = well-managed, 0 = neglected)
  //
  // recentReviewRating (40%): avg of last 7 review ratings, scaled to 0-100
  // completionRate (35%): tasks completed vs due in last 7 days
  // recency (25%): inverse of days since last completion
  //   0 days=100, 1 day=85, 3 days=60, 7+ days=20
  //
  // Plan generator uses INVERSE (neglected pillars get priority boost)
}
```

---

## Frontend Screens & Components

### Design Direction

**Mobile-first, dark theme default** (matching ktchp). DM Sans body text, JetBrains Mono for data/numbers. Muted palette with pillar colors as accents. Generous touch targets (44px min). Smooth transitions.

### Navigation

Bottom tab bar on mobile (4 tabs):
1. **Today** — daily plan (default/home)
2. **Pillars** — pillar management + task lists
3. **Review** — nightly review flow
4. **Dashboard** — stats, streaks, pillar health

Persistent **quick-add FAB** on all screens.

### Screen Details

#### 1. Onboarding Wizard (first-run only)

Redirect here if `user.onboarded === false`. Multi-step guided setup.

**Step 1: Welcome** — Explain the Plates concept. "Let's set up your plates."

**Step 2: Life Pillars** — Suggested pillars (Work, Family & Home, Health & Fitness, Side Business, Recreation, Buying a Home, Education, Social, Finances). User selects or creates custom. For each: name, color, type (ongoing/goal), optional description. Allow reordering.

**Step 3: Tasks (per pillar)** — For each pillar, suggest common tasks:
- Family & Home: "Laundry", "Grocery shopping", "Cook dinner", "Kids' homework help", "Yard work", "Pet care"
- Work: "Check email", "Team standup", "Weekly report"
- etc.
User selects or adds custom. Per task: title (required), recurrence (quick-set: one-time/daily/weekly/custom), priority (optional, default medium). Keep lightweight.

**Step 4: Your Schedule** — Wake time, sleep time, work hours, work days, timezone, review time.

**Step 5: Ready** — Summary. "Generate your first daily plan" button → Today view.

#### 2. Today View (Daily Plan) — Main Screen

- Date header + day type badge
- Progress bar ("5 of 12 tasks done")
- Context groups as collapsible sections, each with header + task count
- Task cards: pillar color left border, title, priority badge (critical/high only), effort estimate, swipe right to complete, swipe left to skip/defer, tap to expand
- Drag handle for reordering
- Empty state: "All plates spinning! Enjoy your evening."

#### 3. Pillars View

**List**: Cards with icon/emoji, name, color, type badge, health indicator, task counts. Tap → detail. + to add pillar.

**Detail**: Header, milestones (for goals), task list with filters (All/Pending/Completed/Recurring), swipe to complete, + to add task.

#### 4. Review View

5-10 minute guided flow:
1. **Day Rating** — 1-5 mood + optional notes
2. **Pillar Check-in** — Per-pillar 1-5 rating + optional note
3. **Incomplete Tasks** — "Do Tomorrow" / "Reschedule" / "Drop It"
4. **New Tasks** — Quick-add interface
5. **Tomorrow Preview** — Preview next plan, allow reorder, "Looks good" confirm

If review exists for today, show summary with edit option.

#### 5. Dashboard

- Pillar Health Overview (radar chart or bars, color-coded green/yellow/red)
- Streaks & Stats (review streak, completion rates, tasks this week, most productive day)
- Pillar Trends (sparklines of review ratings over 30 days)
- Overdue Tasks count + link
- Upcoming Deadlines (7 days)

#### 6. Quick-Add Modal

From FAB: title (auto-focused), pillar chips, optional due date, optional priority. "Add" button. No other fields.

### Touch Interactions

**Swipe to complete**: Right → green + checkmark → complete. Left → orange/red → Skip or Defer. Adapt ktchp's `useSwipeToArchive` hook pattern. Haptic via navigator.vibrate.

**Drag to reorder**: @dnd-kit or similar. Drag handle on task cards in Today view. Save order on drop.

---

## Key Business Logic

### Completing a Recurring Task
1. Set `completed_at = now()`
2. Calculate next occurrence from `recurrence_rule`
3. Update `next_occurrence`
4. Reset status to `pending`

### Completing a One-Time Task
Set status = 'completed', completed_at = now().

### Plan Item Completion
1. Mark PlanItem completed
2. Complete underlying Task (trigger recurring logic if applicable)
3. Optimistic UI update

---

## Cron / Scheduled Jobs

GitHub Actions cron (matching ktchp pattern):

```yaml
# .github/workflows/generate-plan.yml
name: Generate Daily Plan
on:
  schedule:
    - cron: '0 11 * * *'  # 5:00 AM CT daily
  workflow_dispatch:
jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - name: Generate plan
        run: |
          curl -X POST "${{ secrets.APP_URL }}/api/cron/generate-plan" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

Also runs recurring task advancement in the same job.

---

## Design System

### Colors (dark theme default, matching ktchp)

```css
--bg-primary: #0F0F12;
--bg-secondary: #1A1A1F;
--bg-card: #222228;
--text-primary: #EAEAE8;
--text-secondary: #9A9A9A;
--border: #2E2E34;

--accent: #2563EB;
--success: #16A34A;
--warning: #D97706;
--danger: #DC2626;

/* Pillar colors */
--pillar-blue: #3B82F6;
--pillar-purple: #8B5CF6;
--pillar-green: #10B981;
--pillar-amber: #F59E0B;
--pillar-red: #EF4444;
--pillar-cyan: #06B6D4;
```

### Typography
```css
font-family: 'DM Sans', sans-serif;          /* Body */
font-family: 'JetBrains Mono', monospace;    /* Data/numbers */
```

### Spacing
Base unit: 4px. Touch targets: 44px min. Card padding: 16px. Section spacing: 24px. Screen padding: 16px mobile, 24px tablet+.

---

## Implementation Phases

Each phase → working, deployable state.

### Phase 1: Foundation
1. Init Next.js + App Router + React 19 + TypeScript + Tailwind CSS 4
2. Set up Vercel Postgres (`@vercel/postgres`)
3. Create `lib/db/schema.ts` with all tables, auto-init
4. Create `lib/db/seed.ts` — default user
5. Deploy to Vercel with database
6. Verify pipeline: page → API → database → response
7. Bottom tab navigation shell + routing

### Phase 2: Pillar & Task Management
1. `lib/db/pillars.ts` and `lib/db/tasks.ts` query modules
2. API routes for pillars and tasks
3. Pillars page (list + detail)
4. Task list with swipe-to-complete
5. QuickAdd FAB + modal
6. Mobile-responsive, dark theme

### Phase 3: Onboarding Wizard
1. Multi-step onboarding component
2. Suggested pillars and tasks
3. Schedule configuration
4. Generate first plan on completion
5. Gate app behind onboarding

### Phase 4: Daily Plan
1. `lib/plan-generator.ts` (pure function)
2. `lib/db/plans.ts` query module
3. API routes for plans
4. Today page with context groups
5. Drag-to-reorder
6. Completion/skip with optimistic updates
7. Progress bar + animations
8. GitHub Actions cron setup

### Phase 5: Review & Dashboard
1. Nightly review flow
2. Review API routes
3. `lib/pillar-health.ts`
4. Dashboard page
5. Chart visualizations

### Phase 6: Polish
1. Light/dark mode toggle
2. Transitions + micro-interactions
3. Empty states + loading states
4. Error handling + toasts
5. Performance optimization
6. Seed data script

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `POSTGRES_URL` | Yes | Vercel Postgres connection string |
| `CRON_SECRET` | Yes | Auth for GitHub Actions cron endpoint |

---

## Future Enhancements (Post v1)

- AI-powered daily plans via Claude API
- Invite-based multi-user auth (reuse ktchp pattern)
- Push notifications / review reminders
- Google Calendar integration
- Shared pillars (collaboration)
- Weekly/monthly review cycles
- Task dependencies
- Time blocking mode
- Import from Todoist, Notion, etc.
- PWA / offline support

---

## Important Development Notes

1. **Match ktchp patterns**: Same code organization, naming, raw SQL in `lib/db/`, API routes in `app/api/`, schema auto-init, GitHub Actions cron.
2. **Mobile-first**: Design at 375px. Primary use case is phone.
3. **Touch interactions are critical**: Swipe and drag must feel native. Adapt ktchp's swipe hook. Test on real devices.
4. **Keep reviews fast**: 5-10 min max. Quick taps, minimal typing.
5. **Plan generation is isolated**: Pure function, no side effects, no DB calls inside.
6. **Pillar colors everywhere**: Left borders, dots, section colors. Instant visual identification.
7. **Optimistic updates**: UI updates immediately, syncs in background.
8. **Seed data**: 4-5 pillars, 30+ tasks, sample reviews and plans for development.
9. **Dark theme default**: DM Sans body, JetBrains Mono for data.
