import { sql } from '@vercel/postgres';
import type { Plate, PlateWithCounts } from '@/lib/types';
import { getDb } from './index';

export async function getPlatesByUserId(userId: string): Promise<PlateWithCounts[]> {
  await getDb();
  const { rows } = await sql`
    SELECT
      p.*,
      COALESCE(tc.task_count, 0)::int AS task_count,
      COALESCE(tc.pending_count, 0)::int AS pending_count,
      COALESCE(tc.completed_count, 0)::int AS completed_count
    FROM plates p
    LEFT JOIN (
      SELECT
        plate_id,
        COUNT(*)::int AS task_count,
        COUNT(*) FILTER (WHERE status = 'pending' OR status = 'in_progress')::int AS pending_count,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count
      FROM tasks
      GROUP BY plate_id
    ) tc ON tc.plate_id = p.id
    WHERE p.user_id = ${userId} AND p.status != 'archived'
    ORDER BY p.sort_order ASC, p.created_at ASC
  `;
  return rows as PlateWithCounts[];
}

export async function getPlateById(id: string): Promise<Plate | null> {
  await getDb();
  const { rows } = await sql`SELECT * FROM plates WHERE id = ${id}`;
  return (rows[0] as Plate) ?? null;
}

export async function createPlate(
  userId: string,
  data: { name: string; color: string; type?: string; description?: string; icon?: string }
): Promise<Plate> {
  await getDb();
  // Get next sort order
  const { rows: countRows } = await sql`
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
    FROM plates WHERE user_id = ${userId}
  `;
  const sortOrder = countRows[0]?.next_order ?? 0;

  const { rows } = await sql`
    INSERT INTO plates (user_id, name, color, type, description, icon, sort_order)
    VALUES (
      ${userId},
      ${data.name},
      ${data.color},
      ${data.type || 'ongoing'},
      ${data.description || null},
      ${data.icon || null},
      ${sortOrder}
    )
    RETURNING *
  `;
  return rows[0] as Plate;
}

export async function updatePlate(
  id: string,
  data: Partial<Pick<Plate, 'name' | 'color' | 'type' | 'description' | 'icon' | 'status'>>
): Promise<Plate | null> {
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

  if (setClauses.length === 0) return getPlateById(id);

  setClauses.push(`updated_at = now()`);
  values.push(id);

  const query = `UPDATE plates SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  const { rows } = await sql.query(query, values);
  return (rows[0] as Plate) ?? null;
}

export async function archivePlate(id: string): Promise<Plate | null> {
  await getDb();
  const { rows } = await sql`
    UPDATE plates SET status = 'archived', updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as Plate) ?? null;
}

export async function reorderPlates(userId: string, ids: string[]): Promise<void> {
  await getDb();
  for (let i = 0; i < ids.length; i++) {
    await sql`
      UPDATE plates SET sort_order = ${i}, updated_at = now()
      WHERE id = ${ids[i]} AND user_id = ${userId}
    `;
  }
}
