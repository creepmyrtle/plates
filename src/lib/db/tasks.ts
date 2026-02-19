import { sql } from '@vercel/postgres';
import type { Task, RecurrenceRule } from '@/lib/types';
import { getDb } from './index';

interface TaskFilters {
  plateId?: string;
  status?: string;
  priority?: string;
  context?: string;
}

export async function getTasksByUserId(userId: string, filters?: TaskFilters): Promise<Task[]> {
  await getDb();

  let query = `
    SELECT t.* FROM tasks t
    JOIN plates p ON t.plate_id = p.id
    WHERE p.user_id = $1
  `;
  const values: unknown[] = [userId];
  let paramIndex = 2;

  if (filters?.plateId) {
    query += ` AND t.plate_id = $${paramIndex}`;
    values.push(filters.plateId);
    paramIndex++;
  }
  if (filters?.status) {
    query += ` AND t.status = $${paramIndex}`;
    values.push(filters.status);
    paramIndex++;
  }
  if (filters?.priority) {
    query += ` AND t.priority = $${paramIndex}`;
    values.push(filters.priority);
    paramIndex++;
  }
  if (filters?.context) {
    query += ` AND t.context = $${paramIndex}`;
    values.push(filters.context);
    paramIndex++;
  }

  query += ` ORDER BY t.sort_order ASC, t.created_at ASC`;

  const { rows } = await sql.query(query, values);
  return rows as Task[];
}

export async function getTasksByPlateId(plateId: string): Promise<Task[]> {
  await getDb();
  const { rows } = await sql`
    SELECT * FROM tasks
    WHERE plate_id = ${plateId}
    ORDER BY
      CASE WHEN status = 'completed' THEN 1 ELSE 0 END ASC,
      sort_order ASC,
      created_at ASC
  `;
  return rows as Task[];
}

export async function getTaskById(id: string): Promise<Task | null> {
  await getDb();
  const { rows } = await sql`SELECT * FROM tasks WHERE id = ${id}`;
  return (rows[0] as Task) ?? null;
}

export async function createTask(data: {
  plate_id: string;
  title: string;
  description?: string;
  priority?: string;
  effort_minutes?: number;
  energy_level?: string;
  context?: string;
  time_preference?: string;
  due_date?: string;
  is_recurring?: boolean;
  recurrence_rule?: RecurrenceRule;
}): Promise<Task> {
  await getDb();

  // Get next sort order for this plate
  const { rows: countRows } = await sql`
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
    FROM tasks WHERE plate_id = ${data.plate_id}
  `;
  const sortOrder = countRows[0]?.next_order ?? 0;

  const recurrenceJson = data.recurrence_rule ? JSON.stringify(data.recurrence_rule) : null;

  // Calculate initial next_occurrence for recurring tasks
  let nextOccurrence: string | null = null;
  if (data.is_recurring && data.recurrence_rule) {
    nextOccurrence = new Date().toISOString().split('T')[0];
  }

  const { rows } = await sql`
    INSERT INTO tasks (
      plate_id, title, description, priority, effort_minutes,
      energy_level, context, time_preference, due_date,
      is_recurring, recurrence_rule, next_occurrence, sort_order
    )
    VALUES (
      ${data.plate_id},
      ${data.title},
      ${data.description || null},
      ${data.priority || 'medium'},
      ${data.effort_minutes || null},
      ${data.energy_level || 'medium'},
      ${data.context || 'anywhere'},
      ${data.time_preference || 'anytime'},
      ${data.due_date || null},
      ${data.is_recurring || false},
      ${recurrenceJson}::jsonb,
      ${nextOccurrence},
      ${sortOrder}
    )
    RETURNING *
  `;
  return rows[0] as Task;
}

export async function updateTask(
  id: string,
  data: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'effort_minutes' | 'energy_level' | 'context' | 'time_preference' | 'due_date' | 'status' | 'is_recurring' | 'recurrence_rule'>>
): Promise<Task | null> {
  await getDb();

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (key === 'recurrence_rule') {
        setClauses.push(`${key} = $${paramIndex}::jsonb`);
        values.push(value !== null ? JSON.stringify(value) : null);
      } else {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return getTaskById(id);

  setClauses.push(`updated_at = now()`);
  values.push(id);

  const query = `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  const { rows } = await sql.query(query, values);
  return (rows[0] as Task) ?? null;
}

export async function deleteTask(id: string): Promise<boolean> {
  await getDb();
  const { rowCount } = await sql`DELETE FROM tasks WHERE id = ${id}`;
  return (rowCount ?? 0) > 0;
}

export async function completeTask(id: string): Promise<Task | null> {
  await getDb();
  const task = await getTaskById(id);
  if (!task) return null;

  if (task.is_recurring && task.recurrence_rule) {
    // For recurring tasks: mark completed, calculate next occurrence, reset to pending
    const nextDate = calculateNextOccurrence(task.recurrence_rule, new Date());

    if (nextDate) {
      const { rows } = await sql`
        UPDATE tasks SET
          completed_at = now(),
          next_occurrence = ${nextDate},
          status = 'pending',
          updated_at = now()
        WHERE id = ${id}
        RETURNING *
      `;
      return (rows[0] as Task) ?? null;
    }
    // If no next date (end date passed), complete permanently
  }

  // One-time task: mark completed
  const { rows } = await sql`
    UPDATE tasks SET
      status = 'completed',
      completed_at = now(),
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as Task) ?? null;
}

export async function skipTask(id: string): Promise<Task | null> {
  await getDb();
  const task = await getTaskById(id);
  if (!task) return null;

  if (task.is_recurring && task.recurrence_rule) {
    const nextDate = calculateNextOccurrence(task.recurrence_rule, new Date());
    if (nextDate) {
      const { rows } = await sql`
        UPDATE tasks SET
          next_occurrence = ${nextDate},
          updated_at = now()
        WHERE id = ${id}
        RETURNING *
      `;
      return (rows[0] as Task) ?? null;
    }
  }

  // For non-recurring, just return the task unchanged
  return task;
}

function calculateNextOccurrence(rule: RecurrenceRule, fromDate: Date): string | null {
  const next = new Date(fromDate);
  next.setHours(0, 0, 0, 0);

  switch (rule.pattern) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;

    case 'weekly': {
      if (rule.days && rule.days.length > 0) {
        const currentDay = next.getDay();
        const sortedDays = [...rule.days].sort((a, b) => a - b);
        const nextDay = sortedDays.find(d => d > currentDay);
        if (nextDay !== undefined) {
          next.setDate(next.getDate() + (nextDay - currentDay));
        } else {
          // Wrap to next week
          next.setDate(next.getDate() + (7 - currentDay + sortedDays[0]));
        }
      } else {
        next.setDate(next.getDate() + 7);
      }
      break;
    }

    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;

    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      if (rule.dayOfMonth) {
        next.setDate(Math.min(rule.dayOfMonth, daysInMonth(next.getFullYear(), next.getMonth())));
      }
      break;

    case 'custom':
      next.setDate(next.getDate() + (rule.interval || 1));
      break;
  }

  // Check if past end date
  if (rule.endDate && next > new Date(rule.endDate)) {
    return null;
  }

  return next.toISOString().split('T')[0];
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
