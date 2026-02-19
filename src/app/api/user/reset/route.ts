import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSessionUserId } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST() {
  try {
    await getDb();
    const userId = await getSessionUserId();

    // Delete all user data (CASCADE handles plan_items, milestones, plate_review_ratings)
    await sql`DELETE FROM daily_plans WHERE user_id = ${userId}`;
    await sql`DELETE FROM reviews WHERE user_id = ${userId}`;
    await sql`DELETE FROM plates WHERE user_id = ${userId}`;

    // Reset user to pre-onboarded defaults
    await sql`
      UPDATE users SET
        onboarded = false,
        wake_time = '06:30',
        sleep_time = '22:30',
        work_start_time = '08:00',
        work_end_time = '17:00',
        work_days = '{1,2,3,4,5}',
        timezone = 'America/Chicago',
        review_time = '21:00',
        updated_at = now()
      WHERE id = ${userId}
    `;

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
