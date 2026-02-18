import { sql } from '@vercel/postgres';

export async function ensureSchema(): Promise<void> {
  // Users
  await sql`
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
    )
  `;

  // Pillars
  await sql`
    CREATE TABLE IF NOT EXISTS pillars (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'ongoing',
      status TEXT NOT NULL DEFAULT 'active',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_pillars_user_status ON pillars(user_id, status)`;

  // Milestones
  await sql`
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
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_milestones_pillar ON milestones(pillar_id)`;

  // Tasks
  await sql`
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
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_pillar_status ON tasks(pillar_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON tasks(status, due_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_next_occurrence ON tasks(next_occurrence)`;

  // Daily Plans
  await sql`
    CREATE TABLE IF NOT EXISTS daily_plans (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      day_type TEXT DEFAULT 'workday',
      available_minutes INTEGER,
      generated_at TIMESTAMPTZ DEFAULT now(),
      is_locked BOOLEAN DEFAULT false,
      UNIQUE(user_id, date)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_plans_user_date ON daily_plans(user_id, date)`;

  // Plan Items
  await sql`
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
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_plan_items_plan ON plan_items(daily_plan_id)`;

  // Reviews
  await sql`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      mood INTEGER,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, date)
    )
  `;

  // Pillar Review Ratings
  await sql`
    CREATE TABLE IF NOT EXISTS pillar_review_ratings (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      review_id TEXT REFERENCES reviews(id) ON DELETE CASCADE,
      pillar_id TEXT REFERENCES pillars(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL,
      note TEXT,
      UNIQUE(review_id, pillar_id)
    )
  `;
}
