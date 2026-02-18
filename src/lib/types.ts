// ============================================================
// Plates — Shared TypeScript Types
// ============================================================

// --- Enums / Literal Unions ---

export type PillarType = 'ongoing' | 'goal';
export type PillarStatus = 'active' | 'completed' | 'archived';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type TaskContext = 'at_work' | 'at_home' | 'errands' | 'anywhere';
export type TimePreference = 'morning' | 'afternoon' | 'evening' | 'anytime';

export type DayType = 'workday' | 'weekend' | 'holiday' | 'day_off';

export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

// --- Core Entities ---

export interface User {
  id: string;
  username: string | null;
  email: string | null;
  name: string | null;
  wake_time: string;
  sleep_time: string;
  work_start_time: string;
  work_end_time: string;
  work_days: number[];
  timezone: string;
  review_time: string;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface Pillar {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  type: PillarType;
  status: PillarStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  pillar_id: string;
  name: string;
  description: string | null;
  target_date: string | null;
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RecurrenceRule {
  pattern: RecurrencePattern;
  days?: number[];        // For weekly: [0,1,2,3,4,5,6] (Sun-Sat)
  dayOfMonth?: number;    // For monthly: 1-31
  interval?: number;      // For custom: every N days
  endDate?: string;       // Optional: stop recurring after this date
}

export interface Task {
  id: string;
  pillar_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  effort_minutes: number | null;
  energy_level: EnergyLevel;
  context: TaskContext;
  time_preference: TimePreference;
  due_date: string | null;
  completed_at: string | null;
  is_recurring: boolean;
  recurrence_rule: RecurrenceRule | null;
  next_occurrence: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DailyPlan {
  id: string;
  user_id: string;
  date: string;
  day_type: DayType;
  available_minutes: number | null;
  generated_at: string;
  is_locked: boolean;
}

export interface PlanItem {
  id: string;
  daily_plan_id: string;
  task_id: string;
  sort_order: number;
  context_group: string | null;
  completed: boolean;
  completed_at: string | null;
  skipped: boolean;
}

export interface Review {
  id: string;
  user_id: string;
  date: string;
  mood: number | null;
  notes: string | null;
  created_at: string;
}

export interface PillarReviewRating {
  id: string;
  review_id: string;
  pillar_id: string;
  rating: number;
  note: string | null;
}

// --- Extended / Joined Types ---

export interface PillarWithCounts extends Pillar {
  task_count: number;
  pending_count: number;
  completed_count: number;
  health_score: number | null;
}

export interface PlanItemWithTask extends PlanItem {
  task: Task;
  pillar_color: string;
  pillar_name: string;
}

// --- API Response Types ---

export interface ApiSuccess<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// --- Plan Generator Types ---

export interface PlanGeneratorInput {
  user: User;
  date: Date;
  tasks: Task[];
  pillars: Pillar[];
  recentReviews: Review[];
  recentCompletions: { pillarId: string; completedAt: Date }[];
}

export interface GeneratedPlan {
  date: Date;
  dayType: DayType;
  availableMinutes: number;
  items: { taskId: string; sortOrder: number; contextGroup: string }[];
}
