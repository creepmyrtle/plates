'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PillarHealth {
  id: string;
  name: string;
  color: string;
  health: number;
}

interface UpcomingDeadline {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  pillar_name: string;
  pillar_color: string;
}

interface Stats {
  reviewStreak: number;
  weeklyCompletionRate: number;
  completedThisWeek: number;
  totalTasks: number;
  todayPlan: { total: number; completed: number; skipped: number };
  overdueCount: number;
  upcomingDeadlines: UpcomingDeadline[];
  pillarHealth: PillarHealth[];
}

export default function DashboardView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/stats')
      .then((res) => res.json())
      .then((json) => setStats(json.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-2 text-text-secondary">Unable to load stats.</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-text-secondary">Your progress at a glance.</p>

      {/* Quick stats row */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <StatCard label="Review Streak" value={`${stats.reviewStreak}d`} icon="🔥" />
        <StatCard label="Weekly Completion" value={`${stats.weeklyCompletionRate}%`} icon="📊" />
        <StatCard label="Tasks Done (Week)" value={`${stats.completedThisWeek}`} icon="✅" />
        <StatCard
          label="Overdue"
          value={`${stats.overdueCount}`}
          icon="⚠️"
          alert={stats.overdueCount > 0}
        />
      </div>

      {/* Today's progress */}
      {stats.todayPlan.total > 0 && (
        <div className="mt-5 rounded-lg border border-border bg-bg-card p-4">
          <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Today&apos;s Plan</h2>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1">
              <div className="h-2.5 rounded-full bg-bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{
                    width: `${Math.round(((stats.todayPlan.completed + stats.todayPlan.skipped) / stats.todayPlan.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <span className="text-sm font-mono text-text-secondary">
              {stats.todayPlan.completed + stats.todayPlan.skipped}/{stats.todayPlan.total}
            </span>
          </div>
        </div>
      )}

      {/* Pillar Health */}
      {stats.pillarHealth.length > 0 && (
        <div className="mt-5 rounded-lg border border-border bg-bg-card p-4">
          <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Pillar Health</h2>
          <div className="mt-3 space-y-3">
            {stats.pillarHealth.map((p) => (
              <div key={p.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-sm">{p.name}</span>
                  </div>
                  <span className={`text-xs font-mono font-semibold ${healthColor(p.health)}`}>
                    {p.health}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${p.health}%`, backgroundColor: p.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Deadlines */}
      {stats.upcomingDeadlines.length > 0 && (
        <div className="mt-5 rounded-lg border border-border bg-bg-card p-4">
          <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Upcoming Deadlines</h2>
          <div className="mt-3 space-y-2">
            {stats.upcomingDeadlines.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-md border border-border p-2.5"
                style={{ borderLeftWidth: '3px', borderLeftColor: d.pillar_color }}
              >
                <div>
                  <span className="text-sm font-medium">{d.title}</span>
                  <span className="ml-2 text-xs text-text-secondary">{d.pillar_name}</span>
                </div>
                <span className="text-xs font-mono text-text-secondary">
                  {formatDeadline(d.due_date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue link */}
      {stats.overdueCount > 0 && (
        <Link
          href="/pillars"
          className="mt-5 flex items-center justify-between rounded-lg border border-danger/30 bg-danger/5 p-4 transition-colors hover:bg-danger/10"
        >
          <div>
            <span className="text-sm font-semibold text-danger">
              {stats.overdueCount} overdue task{stats.overdueCount !== 1 ? 's' : ''}
            </span>
            <p className="text-xs text-text-secondary mt-0.5">Review in Pillars</p>
          </div>
          <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  alert = false,
}: {
  label: string;
  value: string;
  icon: string;
  alert?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${alert ? 'border-danger/30 bg-danger/5' : 'border-border bg-bg-card'}`}>
      <div className="flex items-center justify-between">
        <span className="text-lg">{icon}</span>
        <span className={`text-xl font-mono font-bold ${alert ? 'text-danger' : 'text-text-primary'}`}>
          {value}
        </span>
      </div>
      <p className="mt-1 text-xs text-text-secondary">{label}</p>
    </div>
  );
}

function healthColor(score: number): string {
  if (score >= 70) return 'text-success';
  if (score >= 40) return 'text-warning';
  return 'text-danger';
}

function formatDeadline(dateStr: string): string {
  const due = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${diff}d`;
}
