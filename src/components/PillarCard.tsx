'use client';

import Link from 'next/link';
import type { PillarWithCounts } from '@/lib/types';

interface PillarCardProps {
  pillar: PillarWithCounts;
}

export default function PillarCard({ pillar }: PillarCardProps) {
  const healthPercent = pillar.health_score ?? null;

  return (
    <Link href={`/pillars/${pillar.id}`}>
      <div
        className="card-hover rounded-lg border border-border bg-bg-card p-4"
        style={{ borderLeftWidth: '4px', borderLeftColor: pillar.color }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {pillar.icon && <span className="text-lg">{pillar.icon}</span>}
            <h3 className="font-semibold">{pillar.name}</h3>
            {pillar.type === 'goal' && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                GOAL
              </span>
            )}
          </div>
          {healthPercent !== null && (
            <HealthDot score={healthPercent} />
          )}
        </div>

        {pillar.description && (
          <p className="mt-1 text-xs text-text-secondary line-clamp-1">{pillar.description}</p>
        )}

        <div className="mt-3 flex items-center gap-4 text-xs text-text-secondary">
          <span className="font-mono">
            <span className="text-text-primary font-semibold">{pillar.pending_count}</span> pending
          </span>
          <span className="font-mono">
            <span className="text-success">{pillar.completed_count}</span> done
          </span>
          <span className="font-mono">{pillar.task_count} total</span>
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
