'use client';

import type { Review, PillarReviewRating, PillarWithCounts } from '@/lib/types';

interface Props {
  review: Review;
  ratings: PillarReviewRating[];
  pillars: PillarWithCounts[];
}

const moodEmojis = ['😫', '😔', '😐', '🙂', '😄'];
const moodLabels = ['Rough', 'Tough', 'Okay', 'Good', 'Great'];

export default function ReviewSummary({ review, ratings, pillars }: Props) {
  const date = new Date(review.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold">Today&apos;s Review</h1>
      <p className="mt-1 text-sm text-text-secondary">{date}</p>

      <div className="mt-6 space-y-4">
        {/* Mood */}
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Mood</h3>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-3xl">{review.mood ? moodEmojis[review.mood - 1] : '❓'}</span>
            <span className="text-lg font-semibold">
              {review.mood ? moodLabels[review.mood - 1] : 'Not rated'}
            </span>
          </div>
          {review.notes && (
            <p className="mt-2 text-sm text-text-secondary">{review.notes}</p>
          )}
        </div>

        {/* Pillar ratings */}
        {ratings.length > 0 && (
          <div className="rounded-lg border border-border bg-bg-card p-4">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Pillar Ratings</h3>
            <div className="mt-3 space-y-3">
              {ratings.map((r) => {
                const pillar = pillars.find((p) => p.id === r.pillar_id);
                if (!pillar) return null;
                return (
                  <div key={r.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: pillar.color }} />
                        <span className="text-sm font-medium">{pillar.name}</span>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <div
                            key={v}
                            className={`h-2 w-5 rounded-full ${
                              v <= r.rating ? '' : 'bg-bg-secondary'
                            }`}
                            style={v <= r.rating ? { backgroundColor: pillar.color } : undefined}
                          />
                        ))}
                      </div>
                    </div>
                    {r.note && <p className="mt-0.5 ml-5 text-xs text-text-secondary">{r.note}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-text-secondary">
        Review completed. Come back tomorrow for your next check-in.
      </p>
    </div>
  );
}
