'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TaskCard from '@/components/TaskCard';
import TaskEditSheet from '@/components/TaskEditSheet';
import PlateEditSheet from '@/components/PlateEditSheet';
import { useToast } from '@/components/Toast';
import type { Plate, Task, Milestone } from '@/lib/types';

type Filter = 'all' | 'pending' | 'completed' | 'recurring';

interface Props {
  plate: Plate;
  initialTasks: Task[];
  initialMilestones: Milestone[];
}

export default function PlateDetail({ plate, initialTasks, initialMilestones }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [currentPlate, setCurrentPlate] = useState<Plate>(plate);
  const [tasks, setTasks] = useState(initialTasks);
  const [milestones, setMilestones] = useState(initialMilestones);
  const [filter, setFilter] = useState<Filter>('all');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingPlate, setEditingPlate] = useState(false);

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskRecurring, setTaskRecurring] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Milestone form state
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');

  const filteredTasks = tasks.filter((t) => {
    switch (filter) {
      case 'pending': return t.status === 'pending' || t.status === 'in_progress';
      case 'completed': return t.status === 'completed';
      case 'recurring': return t.is_recurring;
      default: return true;
    }
  });

  const handleCompleteTask = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, { method: 'POST' });
      if (res.ok) {
        const { data } = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data : t)));
        showToast('Task completed', 'success');
      }
    } catch {
      showToast('Failed to complete task', 'error');
    }
  }, [showToast]);

  const handleSkipTask = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/skip`, { method: 'POST' });
      if (res.ok) {
        const { data } = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data : t)));
        showToast('Task skipped', 'info');
      }
    } catch {
      showToast('Failed to skip task', 'error');
    }
  }, [showToast]);

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plate_id: currentPlate.id,
          title: taskTitle.trim(),
          priority: taskPriority,
          is_recurring: taskRecurring,
          recurrence_rule: taskRecurring ? { pattern: 'daily' } : undefined,
        }),
      });

      if (res.ok) {
        const { data } = await res.json();
        setTasks((prev) => [...prev, data]);
        setTaskTitle('');
        setTaskRecurring(false);
        setShowTaskForm(false);
        showToast('Task created', 'success');
      }
    } catch {
      showToast('Failed to create task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMilestone = async () => {
    if (!milestoneName.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/plates/${currentPlate.id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: milestoneName.trim(),
          target_date: milestoneDate || undefined,
        }),
      });

      if (res.ok) {
        const { data } = await res.json();
        setMilestones((prev) => [...prev, data]);
        setMilestoneName('');
        setMilestoneDate('');
        setShowMilestoneForm(false);
        showToast('Milestone added', 'success');
      }
    } catch {
      showToast('Failed to add milestone', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleMilestone = async (milestone: Milestone) => {
    try {
      const res = await fetch(`/api/milestones/${milestone.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !milestone.completed }),
      });

      if (res.ok) {
        const { data } = await res.json();
        setMilestones((prev) => prev.map((m) => (m.id === milestone.id ? data : m)));
      }
    } catch {
      showToast('Failed to update milestone', 'error');
    }
  };

  const handleTaskUpdated = useCallback((updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditingTask(null);
  }, []);

  const handleTaskDeleted = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setEditingTask(null);
  }, []);

  const handlePlateUpdated = useCallback((updated: Plate) => {
    setCurrentPlate(updated);
    setEditingPlate(false);
  }, []);

  const handlePlateArchived = useCallback(() => {
    setEditingPlate(false);
    router.push('/plates');
  }, [router]);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'completed', label: 'Completed' },
    { key: 'recurring', label: 'Recurring' },
  ];

  return (
    <div className="px-4 pt-6">
      {/* Back link + header */}
      <Link
        href="/plates"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Plates
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-10 w-1 rounded-full" style={{ backgroundColor: currentPlate.color }} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {currentPlate.icon && <span>{currentPlate.icon}</span>}
            {currentPlate.name}
            {currentPlate.type === 'goal' && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                GOAL
              </span>
            )}
          </h1>
          {currentPlate.description && (
            <p className="text-sm text-text-secondary">{currentPlate.description}</p>
          )}
        </div>
        <button
          onClick={() => setEditingPlate(true)}
          className="flex-shrink-0 rounded-lg p-2 text-text-secondary hover:text-text-primary hover:bg-bg-card transition-colors"
          title="Edit plate"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
        </button>
      </div>

      {/* Milestones (for goal-type plates) */}
      {currentPlate.type === 'goal' && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Milestones</h2>
          <div className="mt-2 space-y-2">
            {milestones.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-bg-card px-4 py-3"
              >
                <button
                  onClick={() => handleToggleMilestone(m)}
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    m.completed ? 'border-success bg-success' : 'border-text-secondary hover:border-success'
                  }`}
                >
                  {m.completed && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </button>
                <div className="flex-1">
                  <span className={`text-sm ${m.completed ? 'line-through text-text-secondary' : 'font-medium'}`}>
                    {m.name}
                  </span>
                  {m.target_date && (
                    <span className="ml-2 text-xs text-text-secondary font-mono">
                      {new Date(m.target_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {showMilestoneForm ? (
              <div className="rounded-lg border border-border bg-bg-card p-3 animate-fade-up">
                <input
                  type="text"
                  value={milestoneName}
                  onChange={(e) => setMilestoneName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateMilestone(); }}
                  placeholder="Milestone name"
                  className="w-full rounded border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
                  autoFocus
                />
                <div className="mt-2 flex gap-2">
                  <input
                    type="date"
                    value={milestoneDate}
                    onChange={(e) => setMilestoneDate(e.target.value)}
                    className="flex-1 rounded border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                  />
                  <button
                    onClick={handleCreateMilestone}
                    disabled={!milestoneName.trim() || submitting}
                    className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowMilestoneForm(false)}
                    className="rounded border border-border px-3 py-2 text-sm text-text-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowMilestoneForm(true)}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-text-secondary hover:border-accent hover:text-accent transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Milestone
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tasks */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Tasks</h2>
          <span className="text-xs text-text-secondary font-mono">{filteredTasks.length} tasks</span>
        </div>

        {/* Filters */}
        <div className="mt-2 flex gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'bg-accent text-white'
                  : 'border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Task list */}
        <div className="mt-3 space-y-2">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              plateColor={currentPlate.color}
              plateName={currentPlate.name}
              onComplete={handleCompleteTask}
              onSkip={handleSkipTask}
              onTap={setEditingTask}
            />
          ))}

          {filteredTasks.length === 0 && (
            <p className="py-6 text-center text-sm text-text-secondary">
              {filter === 'all' ? 'No tasks yet.' : `No ${filter} tasks.`}
            </p>
          )}
        </div>

        {/* Add task */}
        {showTaskForm ? (
          <div className="mt-3 rounded-lg border border-border bg-bg-card p-4 animate-fade-up">
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTask(); }}
              placeholder="Task title"
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
              autoFocus
            />

            <div className="mt-2 flex items-center gap-3">
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
                className="rounded border border-border bg-bg-secondary px-3 py-1.5 text-xs text-text-primary focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={taskRecurring}
                  onChange={(e) => setTaskRecurring(e.target.checked)}
                  className="rounded"
                />
                Recurring
              </label>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={handleCreateTask}
                disabled={!taskTitle.trim() || submitting}
                className="flex-1 rounded-lg bg-accent py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {submitting ? 'Creating...' : 'Add Task'}
              </button>
              <button
                onClick={() => setShowTaskForm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowTaskForm(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm font-medium text-text-secondary hover:border-accent hover:text-accent transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Task
          </button>
        )}
      </div>

      {/* Edit sheets */}
      {editingTask && (
        <TaskEditSheet
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
        />
      )}

      {editingPlate && (
        <PlateEditSheet
          plate={currentPlate}
          onClose={() => setEditingPlate(false)}
          onUpdated={handlePlateUpdated}
          onArchived={handlePlateArchived}
        />
      )}
    </div>
  );
}
