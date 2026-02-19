'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';
import type { Task, TaskPriority, EnergyLevel, TaskContext, TimePreference } from '@/lib/types';

interface TaskEditSheetProps {
  task: Task;
  onClose: () => void;
  onUpdated: (task: Task) => void;
  onDeleted: (taskId: string) => void;
}

export default function TaskEditSheet({ task, onClose, onUpdated, onDeleted }: TaskEditSheetProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [effortMinutes, setEffortMinutes] = useState(task.effort_minutes?.toString() || '');
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>(task.energy_level);
  const [context, setContext] = useState<TaskContext>(task.context);
  const [timePreference, setTimePreference] = useState<TimePreference>(task.time_preference);
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [isRecurring, setIsRecurring] = useState(task.is_recurring);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          priority,
          effort_minutes: effortMinutes ? parseInt(effortMinutes, 10) : null,
          energy_level: energyLevel,
          context,
          time_preference: timePreference,
          due_date: dueDate || null,
          is_recurring: isRecurring,
          recurrence_rule: isRecurring ? (task.recurrence_rule || { pattern: 'daily' }) : null,
        }),
      });

      if (res.ok) {
        const { data } = await res.json();
        showToast('Task updated', 'success');
        onUpdated(data);
      } else {
        showToast('Failed to update task', 'error');
      }
    } catch {
      showToast('Failed to update task', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Task deleted', 'success');
        onDeleted(task.id);
      } else {
        showToast('Failed to delete task', 'error');
      }
    } catch {
      showToast('Failed to delete task', 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl border-t border-border bg-bg-secondary p-6 animate-fade-up max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Edit Task</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-text-secondary hover:text-text-primary hover:bg-bg-card transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className="w-full rounded-lg border border-border bg-bg-card px-4 py-3 text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
        />

        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={3}
          className="mt-3 w-full rounded-lg border border-border bg-bg-card px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none resize-none"
        />

        {/* Priority + Effort row */}
        <div className="mt-3 flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-text-secondary">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-text-secondary">Effort (min)</label>
            <input
              type="number"
              value={effortMinutes}
              onChange={(e) => setEffortMinutes(e.target.value)}
              placeholder="—"
              min={1}
              className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        {/* Energy + Context row */}
        <div className="mt-3 flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-text-secondary">Energy</label>
            <select
              value={energyLevel}
              onChange={(e) => setEnergyLevel(e.target.value as EnergyLevel)}
              className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-text-secondary">Context</label>
            <select
              value={context}
              onChange={(e) => setContext(e.target.value as TaskContext)}
              className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="anywhere">Anywhere</option>
              <option value="at_work">At Work</option>
              <option value="at_home">At Home</option>
              <option value="errands">Errands</option>
            </select>
          </div>
        </div>

        {/* Time preference + Due date row */}
        <div className="mt-3 flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-text-secondary">Time</label>
            <select
              value={timePreference}
              onChange={(e) => setTimePreference(e.target.value as TimePreference)}
              className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="anytime">Anytime</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-text-secondary">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        {/* Recurring toggle */}
        <label className="mt-3 flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-text-primary">Recurring task</span>
          {isRecurring && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
              {task.recurrence_rule?.pattern || 'daily'}
            </span>
          )}
        </label>

        {/* Action buttons */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="flex-1 rounded-lg bg-accent py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={handleDelete}
            className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
              confirmDelete
                ? 'border-danger bg-danger text-white'
                : 'border-danger/30 text-danger hover:bg-danger/10'
            }`}
          >
            {confirmDelete ? 'Confirm' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
