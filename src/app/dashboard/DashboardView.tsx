'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';

interface PlateHealth {
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
  plate_name: string;
  plate_color: string;
}

interface Stats {
  reviewStreak: number;
  weeklyCompletionRate: number;
  completedThisWeek: number;
  totalTasks: number;
  todayPlan: { total: number; completed: number; skipped: number };
  overdueCount: number;
  upcomingDeadlines: UpcomingDeadline[];
  plateHealth: PlateHealth[];
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

  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-text-secondary">Your progress at a glance.</p>
        </div>
        <button
          onClick={toggleTheme}
          className="rounded-lg border border-border p-2.5 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </svg>
          )}
        </button>
      </div>

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

      {/* Plate Health */}
      {stats.plateHealth.length > 0 && (
        <div className="mt-5 rounded-lg border border-border bg-bg-card p-4">
          <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Plate Health</h2>
          <div className="mt-3 space-y-3">
            {stats.plateHealth.map((p) => (
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
                style={{ borderLeftWidth: '3px', borderLeftColor: d.plate_color }}
              >
                <div>
                  <span className="text-sm font-medium">{d.title}</span>
                  <span className="ml-2 text-xs text-text-secondary">{d.plate_name}</span>
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
          href="/plates"
          className="mt-5 flex items-center justify-between rounded-lg border border-danger/30 bg-danger/5 p-4 transition-colors hover:bg-danger/10"
        >
          <div>
            <span className="text-sm font-semibold text-danger">
              {stats.overdueCount} overdue task{stats.overdueCount !== 1 ? 's' : ''}
            </span>
            <p className="text-xs text-text-secondary mt-0.5">Review in Plates</p>
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
