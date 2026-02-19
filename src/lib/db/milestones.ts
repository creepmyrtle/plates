import { sql } from '@vercel/postgres';
import type { Milestone } from '@/lib/types';
import { getDb } from './index';

export async function getMilestonesByPlateId(plateId: string): Promise<Milestone[]> {
  await getDb();
  const { rows } = await sql`
    SELECT * FROM milestones
    WHERE plate_id = ${plateId}
    ORDER BY sort_order ASC, created_at ASC
  `;
  return rows as Milestone[];
}

export async function getMilestoneById(id: string): Promise<Milestone | null> {
  await getDb();
  const { rows } = await sql`SELECT * FROM milestones WHERE id = ${id}`;
  return (rows[0] as Milestone) ?? null;
}

export async function createMilestone(data: {
  plate_id: string;
  name: string;
  description?: string;
  target_date?: string;
}): Promise<Milestone> {
  await getDb();
  const { rows: countRows } = await sql`
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
    FROM milestones WHERE plate_id = ${data.plate_id}
  `;
  const sortOrder = countRows[0]?.next_order ?? 0;

  const { rows } = await sql`
    INSERT INTO milestones (plate_id, name, description, target_date, sort_order)
    VALUES (
      ${data.plate_id},
      ${data.name},
      ${data.description || null},
      ${data.target_date || null},
      ${sortOrder}
    )
    RETURNING *
  `;
  return rows[0] as Milestone;
}

export async function updateMilestone(
  id: string,
  data: Partial<Pick<Milestone, 'name' | 'description' | 'target_date' | 'completed'>>
): Promise<Milestone | null> {
  await getDb();

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (data.completed === true) {
    setClauses.push(`completed_at = now()`);
  } else if (data.completed === false) {
    setClauses.push(`completed_at = NULL`);
  }

  if (setClauses.length === 0) return getMilestoneById(id);

  setClauses.push(`updated_at = now()`);
  values.push(id);

  const query = `UPDATE milestones SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  const { rows } = await sql.query(query, values);
  return (rows[0] as Milestone) ?? null;
}

export async function deleteMilestone(id: string): Promise<boolean> {
  await getDb();
  const { rowCount } = await sql`DELETE FROM milestones WHERE id = ${id}`;
  return (rowCount ?? 0) > 0;
}
