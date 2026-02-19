import { sql } from '@vercel/postgres';
import type { Review, PlateReviewRating } from '@/lib/types';
import { getDb } from './index';

export async function getRecentReviews(userId: string, limit: number = 7): Promise<Review[]> {
  await getDb();
  const { rows } = await sql`
    SELECT * FROM reviews
    WHERE user_id = ${userId}
    ORDER BY date DESC
    LIMIT ${limit}
  `;
  return rows as Review[];
}

export async function getReviewByDate(userId: string, date: string): Promise<Review | null> {
  await getDb();
  const { rows } = await sql`
    SELECT * FROM reviews
    WHERE user_id = ${userId} AND date = ${date}
  `;
  return (rows[0] as Review) ?? null;
}

export async function getReviewWithRatings(
  userId: string,
  date: string
): Promise<{ review: Review; ratings: PlateReviewRating[] } | null> {
  await getDb();
  const review = await getReviewByDate(userId, date);
  if (!review) return null;

  const { rows } = await sql`
    SELECT * FROM plate_review_ratings
    WHERE review_id = ${review.id}
  `;

  return { review, ratings: rows as PlateReviewRating[] };
}

export async function createReview(data: {
  userId: string;
  date: string;
  mood: number;
  notes?: string;
  plateRatings: { plateId: string; rating: number; note?: string }[];
}): Promise<Review> {
  await getDb();

  // Upsert review
  const { rows } = await sql`
    INSERT INTO reviews (user_id, date, mood, notes)
    VALUES (${data.userId}, ${data.date}, ${data.mood}, ${data.notes || null})
    ON CONFLICT (user_id, date) DO UPDATE SET
      mood = ${data.mood},
      notes = ${data.notes || null}
    RETURNING *
  `;
  const review = rows[0] as Review;

  // Upsert plate ratings
  for (const rating of data.plateRatings) {
    await sql`
      INSERT INTO plate_review_ratings (review_id, plate_id, rating, note)
      VALUES (${review.id}, ${rating.plateId}, ${rating.rating}, ${rating.note || null})
      ON CONFLICT (review_id, plate_id) DO UPDATE SET
        rating = ${rating.rating},
        note = ${rating.note || null}
    `;
  }

  return review;
}

export async function getReviewHistory(
  userId: string,
  limit: number = 30
): Promise<(Review & { plate_ratings: PlateReviewRating[] })[]> {
  await getDb();
  const reviews = await getRecentReviews(userId, limit);

  const result = [];
  for (const review of reviews) {
    const { rows } = await sql`
      SELECT * FROM plate_review_ratings WHERE review_id = ${review.id}
    `;
    result.push({ ...review, plate_ratings: rows as PlateReviewRating[] });
  }

  return result;
}

export async function getReviewStreak(userId: string): Promise<number> {
  await getDb();
  const { rows } = await sql`
    SELECT date FROM reviews
    WHERE user_id = ${userId}
    ORDER BY date DESC
    LIMIT 60
  `;

  if (rows.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from today or yesterday
  const firstReviewDate = new Date(rows[0].date + 'T00:00:00');
  const diffFromToday = Math.floor((today.getTime() - firstReviewDate.getTime()) / (1000 * 60 * 60 * 24));

  // If most recent review is more than 1 day ago, streak is 0
  if (diffFromToday > 1) return 0;

  const checkDate = new Date(firstReviewDate);

  for (const row of rows) {
    const reviewDate = new Date(row.date + 'T00:00:00');
    const expected = new Date(checkDate);

    if (reviewDate.getTime() === expected.getTime()) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
