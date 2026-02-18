import { sql } from '@vercel/postgres';
import type { User } from '@/lib/types';
import { getDb } from './index';

export async function getUserById(id: string): Promise<User | null> {
  await getDb();
  const { rows } = await sql`SELECT * FROM users WHERE id = ${id}`;
  return (rows[0] as User) ?? null;
}

export async function getDefaultUser(): Promise<User | null> {
  await getDb();
  const { rows } = await sql`SELECT * FROM users ORDER BY created_at ASC LIMIT 1`;
  return (rows[0] as User) ?? null;
}

export async function createUser(
  id: string,
  username: string,
  name: string
): Promise<User> {
  await getDb();
  const { rows } = await sql`
    INSERT INTO users (id, username, name)
    VALUES (${id}, ${username}, ${name})
    ON CONFLICT (id) DO NOTHING
    RETURNING *
  `;
  // If ON CONFLICT hit, fetch existing
  if (rows.length === 0) {
    const existing = await getUserById(id);
    return existing!;
  }
  return rows[0] as User;
}

export async function updateUser(
  id: string,
  updates: Partial<Pick<User, 'name' | 'wake_time' | 'sleep_time' | 'work_start_time' | 'work_end_time' | 'work_days' | 'timezone' | 'review_time' | 'onboarded'>>
): Promise<User | null> {
  await getDb();

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      if (key === 'work_days') {
        setClauses.push(`${key} = $${paramIndex}::integer[]`);
      } else {
        setClauses.push(`${key} = $${paramIndex}`);
      }
      values.push(value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return getUserById(id);

  setClauses.push(`updated_at = now()`);
  values.push(id);

  const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  const { rows } = await sql.query(query, values);
  return (rows[0] as User) ?? null;
}

export async function markOnboarded(id: string): Promise<User | null> {
  await getDb();
  const { rows } = await sql`
    UPDATE users SET onboarded = true, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as User) ?? null;
}
