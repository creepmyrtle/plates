/**
 * Daily Plan Generator — Pure function, no DB calls.
 *
 * Takes structured input, returns a plan. Isolated and testable.
 * Designed to be swappable for AI-powered generation later.
 */

import type {
  User,
  Task,
  Plate,
  Review,
  DayType,
  GeneratedPlan,
  PlanGeneratorInput,
} from './types';

// --- Scoring weights ---
const WEIGHT_URGENCY = 0.35;
const WEIGHT_PRIORITY = 0.30;
const WEIGHT_PLATE_BALANCE = 0.20;
const WEIGHT_STALENESS = 0.15;

// --- Limits ---
const WORKDAY_MIN_TASKS = 8;
const WORKDAY_MAX_TASKS = 12;
const WEEKEND_MIN_TASKS = 10;
const WEEKEND_MAX_TASKS = 15;
const DEFAULT_EFFORT_MINUTES = 30;

// --- Context labels ---
const CONTEXT_LABELS: Record<string, string> = {
  at_work: 'At Work',
  at_home: 'At Home',
  errands: 'Errands',
  anywhere: 'Anywhere',
};

// --- Time preference sort order ---
const TIME_PREF_ORDER: Record<string, number> = {
  morning: 0,
  afternoon: 1,
  anytime: 2,
  evening: 3,
};

export function generateDailyPlan(input: PlanGeneratorInput): GeneratedPlan {
  const { user, date, tasks, plates, recentReviews, recentCompletions } = input;

  // 1. DETERMINE DAY TYPE
  const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
  const dayType: DayType = user.work_days.includes(dayOfWeek) ? 'workday' : 'weekend';

  // 2. CALCULATE AVAILABLE TIME
  const availableMinutes = calculateAvailableMinutes(user, dayType);

  // 3. GATHER CANDIDATE TASKS
  const today = date.toISOString().split('T')[0];
  const candidates = tasks.filter((task) => {
    // Must be pending or in_progress
    if (task.status !== 'pending' && task.status !== 'in_progress') return false;

    // For recurring tasks, check next_occurrence
    if (task.is_recurring && task.next_occurrence) {
      if (task.next_occurrence > today) return false;
    }

    // Filter context: no 'at_work' tasks on weekends
    if (dayType === 'weekend' && task.context === 'at_work') return false;

    return true;
  });

  // 4. Build plate health map for balance scoring
  const plateHealthMap = buildPlateHealthMap(plates, recentReviews, recentCompletions);

  // 5. SCORE EACH TASK
  const scored = candidates.map((task) => ({
    task,
    score: scoreTask(task, date, plateHealthMap),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // 6. FIT TO AVAILABLE TIME
  const maxTasks = dayType === 'workday' ? WORKDAY_MAX_TASKS : WEEKEND_MAX_TASKS;
  const minTasks = dayType === 'workday' ? WORKDAY_MIN_TASKS : WEEKEND_MIN_TASKS;

  // First pass: fill by score until time budget used
  const selected: typeof scored = [];
  let totalMinutes = 0;
  const selectedPlates = new Set<string>();

  for (const item of scored) {
    if (selected.length >= maxTasks) break;

    const effort = item.task.effort_minutes || DEFAULT_EFFORT_MINUTES;
    if (totalMinutes + effort > availableMinutes && selected.length >= minTasks) break;

    selected.push(item);
    totalMinutes += effort;
    selectedPlates.add(item.task.plate_id);
  }

  // Second pass: ensure at least one task per active plate if possible
  const activePlates = plates.filter((p) => p.status === 'active');
  for (const plate of activePlates) {
    if (selectedPlates.has(plate.id)) continue;
    if (selected.length >= maxTasks) break;

    const plateTask = scored.find(
      (s) => s.task.plate_id === plate.id && !selected.includes(s)
    );
    if (plateTask) {
      selected.push(plateTask);
      selectedPlates.add(plate.id);
    }
  }

  // 7. GROUP BY CONTEXT & APPLY TIME PREFERENCE ORDERING
  selected.sort((a, b) => {
    // Primary: time preference
    const timeDiff = (TIME_PREF_ORDER[a.task.time_preference] ?? 2) -
                     (TIME_PREF_ORDER[b.task.time_preference] ?? 2);
    if (timeDiff !== 0) return timeDiff;

    // Secondary: context grouping
    const ctxDiff = (a.task.context ?? 'anywhere').localeCompare(b.task.context ?? 'anywhere');
    if (ctxDiff !== 0) return ctxDiff;

    // Tertiary: score
    return b.score - a.score;
  });

  // 8. BUILD RESULT
  const items = selected.map((s, index) => ({
    taskId: s.task.id,
    sortOrder: index,
    contextGroup: CONTEXT_LABELS[s.task.context] || 'Anywhere',
  }));

  return {
    date,
    dayType,
    availableMinutes,
    items,
  };
}

// ==========================================================================
// Scoring
// ==========================================================================

function scoreTask(
  task: Task,
  date: Date,
  plateHealthMap: Map<string, number>
): number {
  const urgency = urgencyScore(task, date);
  const priority = priorityScore(task);
  const balance = plateBalanceScore(task, plateHealthMap);
  const staleness = stalenessScore(task, date);

  return (
    urgency * WEIGHT_URGENCY +
    priority * WEIGHT_PRIORITY +
    balance * WEIGHT_PLATE_BALANCE +
    staleness * WEIGHT_STALENESS
  );
}

function urgencyScore(task: Task, date: Date): number {
  if (!task.due_date) return 10;

  const today = new Date(date);
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.due_date + 'T00:00:00');
  const daysUntilDue = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) return 100;  // Overdue
  if (daysUntilDue === 0) return 90;  // Due today
  if (daysUntilDue === 1) return 70;  // Tomorrow
  if (daysUntilDue <= 7) return 50;   // This week
  if (daysUntilDue <= 30) return 30;  // This month
  return 10;
}

function priorityScore(task: Task): number {
  switch (task.priority) {
    case 'critical': return 100;
    case 'high': return 75;
    case 'medium': return 50;
    case 'low': return 25;
    default: return 50;
  }
}

function plateBalanceScore(task: Task, healthMap: Map<string, number>): number {
  const health = healthMap.get(task.plate_id);
  if (health === undefined) return 50;
  // Inverse: neglected plates (low health) get higher score
  return 100 - health;
}

function stalenessScore(task: Task, date: Date): number {
  const created = new Date(task.created_at);
  const daysSinceCreated = Math.floor(
    (date.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.min(daysSinceCreated, 50);
}

// ==========================================================================
// Helpers
// ==========================================================================

function calculateAvailableMinutes(user: User, dayType: DayType): number {
  const wakeMinutes = timeToMinutes(user.wake_time);
  const sleepMinutes = timeToMinutes(user.sleep_time);
  const totalAwake = sleepMinutes - wakeMinutes;

  if (dayType === 'workday') {
    const workStart = timeToMinutes(user.work_start_time);
    const workEnd = timeToMinutes(user.work_end_time);
    const workHours = workEnd - workStart;
    // Discretionary = awake time minus work, minus 2 hours for meals/transit
    return Math.max(totalAwake - workHours - 120, 120);
  }

  // Weekend: all awake time minus 3 hours for meals/rest
  return Math.max(totalAwake - 180, 180);
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function buildPlateHealthMap(
  plates: Plate[],
  recentReviews: Review[],
  recentCompletions: { plateId: string; completedAt: Date }[]
): Map<string, number> {
  const map = new Map<string, number>();

  for (const plate of plates) {
    // Simple health estimate based on recent completions
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const plateCompletions = recentCompletions.filter(
      (c) => c.plateId === plate.id && c.completedAt >= sevenDaysAgo
    );

    // Quick heuristic: more completions = healthier
    let health = 20 + Math.min(plateCompletions.length * 15, 60);

    // Boost from recent reviews
    // Reviews don't have per-plate ratings in the input here,
    // so we use completion data as the primary signal
    if (recentReviews.length > 0) {
      health = Math.min(health + 10, 100);
    }

    map.set(plate.id, Math.min(health, 100));
  }

  return map;
}
