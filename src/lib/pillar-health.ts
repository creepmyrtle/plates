/**
 * Pillar Health Score Calculator
 *
 * Returns 0-100 (100 = well-managed, 0 = neglected).
 * Plan generator uses INVERSE (neglected pillars get priority boost).
 */

interface ReviewRating {
  pillarId: string;
  rating: number; // 1-5
  date: string;
}

interface Completion {
  pillarId: string;
  completedAt: Date;
}

export function calculatePillarHealth(
  pillarId: string,
  recentReviews: ReviewRating[],
  recentCompletions: Completion[]
): number {
  const now = new Date();

  // 1. Recent review rating (40%) — avg of last 7 review ratings, scaled to 0-100
  const pillarRatings = recentReviews
    .filter((r) => r.pillarId === pillarId)
    .slice(0, 7);

  let reviewScore = 50; // default if no reviews
  if (pillarRatings.length > 0) {
    const avg = pillarRatings.reduce((sum, r) => sum + r.rating, 0) / pillarRatings.length;
    reviewScore = (avg / 5) * 100;
  }

  // 2. Completion rate (35%) — tasks completed in last 7 days
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const pillarCompletions = recentCompletions.filter(
    (c) => c.pillarId === pillarId && c.completedAt >= sevenDaysAgo
  );

  // Scale: 0 completions = 20, 1 = 40, 2 = 60, 3+ = 80-100
  const completionScore = Math.min(20 + pillarCompletions.length * 20, 100);

  // 3. Recency (25%) — inverse of days since last completion
  let recencyScore = 20; // default if no completions ever
  if (pillarCompletions.length > 0) {
    const latest = pillarCompletions.reduce((max, c) =>
      c.completedAt > max.completedAt ? c : max
    );
    const daysSince = Math.floor(
      (now.getTime() - latest.completedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSince === 0) recencyScore = 100;
    else if (daysSince === 1) recencyScore = 85;
    else if (daysSince <= 3) recencyScore = 60;
    else if (daysSince <= 7) recencyScore = 30;
    else recencyScore = 20;
  }

  // Weighted sum
  const health = Math.round(
    reviewScore * 0.4 +
    completionScore * 0.35 +
    recencyScore * 0.25
  );

  return Math.max(0, Math.min(100, health));
}
