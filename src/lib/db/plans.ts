import { sql } from '@vercel/postgres';
import type { DailyPlan, PlanItem, PlanItemWithTask } from '@/lib/types';
import { getDb } from './index';

export async function getPlanByUserAndDate(
  userId: string,
  date: string
): Promise<DailyPlan | null> {
  await getDb();
  const { rows } = await sql`
    SELECT * FROM daily_plans
    WHERE user_id = ${userId} AND date = ${date}
  `;
  return (rows[0] as DailyPlan) ?? null;
}

export async function getPlanById(id: string): Promise<DailyPlan | null> {
  await getDb();
  const { rows } = await sql`SELECT * FROM daily_plans WHERE id = ${id}`;
  return (rows[0] as DailyPlan) ?? null;
}

export async function getPlanItemsWithTasks(planId: string): Promise<PlanItemWithTask[]> {
  await getDb();
  const { rows } = await sql`
    SELECT
      pi.*,
      t.pillar_id, t.title, t.description, t.status AS task_status,
      t.priority, t.effort_minutes, t.energy_level, t.context,
      t.time_preference, t.due_date, t.is_recurring, t.recurrence_rule,
      t.next_occurrence, t.completed_at AS task_completed_at,
      p.color AS pillar_color,
      p.name AS pillar_name
    FROM plan_items pi
    JOIN tasks t ON pi.task_id = t.id
    JOIN pillars p ON t.pillar_id = p.id
    WHERE pi.daily_plan_id = ${planId}
    ORDER BY pi.sort_order ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    daily_plan_id: row.daily_plan_id,
    task_id: row.task_id,
    sort_order: row.sort_order,
    context_group: row.context_group,
    completed: row.completed,
    completed_at: row.completed_at,
    skipped: row.skipped,
    task: {
      id: row.task_id,
      pillar_id: row.pillar_id,
      title: row.title,
      description: row.description,
      status: row.task_status,
      priority: row.priority,
      effort_minutes: row.effort_minutes,
      energy_level: row.energy_level,
      context: row.context,
      time_preference: row.time_preference,
      due_date: row.due_date,
      completed_at: row.task_completed_at,
      is_recurring: row.is_recurring,
      recurrence_rule: row.recurrence_rule,
      next_occurrence: row.next_occurrence,
      sort_order: row.sort_order,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    pillar_color: row.pillar_color,
    pillar_name: row.pillar_name,
  })) as PlanItemWithTask[];
}

export async function createPlan(data: {
  userId: string;
  date: string;
  dayType: string;
  availableMinutes: number;
  items: { taskId: string; sortOrder: number; contextGroup: string }[];
}): Promise<DailyPlan> {
  await getDb();

  // Delete existing plan for this date if regenerating
  await sql`
    DELETE FROM daily_plans
    WHERE user_id = ${data.userId} AND date = ${data.date}
  `;

  const { rows } = await sql`
    INSERT INTO daily_plans (user_id, date, day_type, available_minutes)
    VALUES (${data.userId}, ${data.date}, ${data.dayType}, ${data.availableMinutes})
    RETURNING *
  `;
  const plan = rows[0] as DailyPlan;

  // Insert plan items
  for (const item of data.items) {
    await sql`
      INSERT INTO plan_items (daily_plan_id, task_id, sort_order, context_group)
      VALUES (${plan.id}, ${item.taskId}, ${item.sortOrder}, ${item.contextGroup})
    `;
  }

  return plan;
}

export async function reorderPlanItems(
  planId: string,
  itemIds: string[]
): Promise<void> {
  await getDb();
  for (let i = 0; i < itemIds.length; i++) {
    await sql`
      UPDATE plan_items SET sort_order = ${i}
      WHERE id = ${itemIds[i]} AND daily_plan_id = ${planId}
    `;
  }
}

export async function completePlanItem(itemId: string): Promise<PlanItem | null> {
  await getDb();
  const { rows } = await sql`
    UPDATE plan_items SET completed = true, completed_at = now()
    WHERE id = ${itemId}
    RETURNING *
  `;
  return (rows[0] as PlanItem) ?? null;
}

export async function skipPlanItem(itemId: string): Promise<PlanItem | null> {
  await getDb();
  const { rows } = await sql`
    UPDATE plan_items SET skipped = true
    WHERE id = ${itemId}
    RETURNING *
  `;
  return (rows[0] as PlanItem) ?? null;
}

export async function getRecentCompletions(
  userId: string,
  days: number = 7
): Promise<{ pillarId: string; completedAt: Date }[]> {
  await getDb();
  const { rows } = await sql`
    SELECT t.pillar_id, t.completed_at
    FROM tasks t
    JOIN pillars p ON t.pillar_id = p.id
    WHERE p.user_id = ${userId}
      AND t.completed_at IS NOT NULL
      AND t.completed_at >= now() - make_interval(days => ${days})
    ORDER BY t.completed_at DESC
  `;
  return rows.map((r) => ({
    pillarId: r.pillar_id,
    completedAt: new Date(r.completed_at),
  }));
}
