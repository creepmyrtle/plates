'use client';

import Link from 'next/link';
import type { PlateWithCounts } from '@/lib/types';

interface PlateCardProps {
  plate: PlateWithCounts;
}

export default function PlateCard({ plate }: PlateCardProps) {
  const healthPercent = plate.health_score ?? null;

  return (
    <Link href={`/plates/${plate.id}`}>
      <div
        className="card-hover rounded-lg border border-border bg-bg-card p-4"
        style={{ borderLeftWidth: '4px', borderLeftColor: plate.color }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {plate.icon && <span className="text-lg">{plate.icon}</span>}
            <h3 className="font-semibold">{plate.name}</h3>
            {plate.type === 'goal' && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                GOAL
              </span>
            )}
          </div>
          {healthPercent !== null && (
            <HealthDot score={healthPercent} />
          )}
        </div>

        {plate.description && (
          <p className="mt-1 text-xs text-text-secondary line-clamp-1">{plate.description}</p>
        )}

        <div className="mt-3 flex items-center gap-4 text-xs text-text-secondary">
          <span className="font-mono">
            <span className="text-text-primary font-semibold">{plate.pending_count}</span> pending
          </span>
          <span className="font-mono">
            <span className="text-success">{plate.completed_count}</span> done
          </span>
          <span className="font-mono">{plate.task_count} total</span>
        </div>
      </div>
    </Link>
  );
}

function HealthDot({ score }: { score: number }) {
  let color = 'bg-success';
  if (score < 40) color = 'bg-danger';
  else if (score < 70) color = 'bg-warning';

  return (
    <div className="flex items-center gap-1.5" title={`Health: ${score}%`}>
      <div className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-xs font-mono text-text-secondary">{score}</span>
    </div>
  );
}
