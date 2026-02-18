'use client';

import { useState, useCallback } from 'react';
import { useSwipeAction } from '@/hooks/useSwipeAction';
import type { Task } from '@/lib/types';

interface TaskCardProps {
  task: Task;
  pillarColor: string;
  pillarName: string;
  onComplete?: (taskId: string) => void;
  onSkip?: (taskId: string) => void;
  onTap?: (task: Task) => void;
  swipeEnabled?: boolean;
}

const priorityBadge: Record<string, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-danger/15 text-danger border-danger/30' },
  high: { label: 'High', className: 'bg-warning/15 text-warning border-warning/30' },
};

export default function TaskCard({
  task,
  pillarColor,
  pillarName,
  onComplete,
  onSkip,
  onTap,
  swipeEnabled = true,
}: TaskCardProps) {
  const [completing, setCompleting] = useState(false);

  const handleComplete = useCallback(() => {
    setCompleting(true);
    onComplete?.(task.id);
  }, [task.id, onComplete]);

  const handleSkip = useCallback(() => {
    setCompleting(true);
    onSkip?.(task.id);
  }, [task.id, onSkip]);

  const { ref, bgRef, handlers } = useSwipeAction({
    onSwipeRight: handleComplete,
    onSwipeLeft: handleSkip,
    enabled: swipeEnabled && task.status !== 'completed',
  });

  const isCompleted = task.status === 'completed';

  return (
    <div className={`relative overflow-hidden rounded-lg ${completing ? 'card-completing' : ''}`}>
      {/* Swipe background indicator */}
      <div
        ref={bgRef}
        className="absolute inset-0 flex items-center justify-between px-6 opacity-0"
        style={{ transition: 'opacity 0.15s ease' }}
      >
        <div className="flex items-center gap-2 text-success font-medium">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Done
        </div>
        <div className="flex items-center gap-2 text-warning font-medium">
          Skip
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061A1.125 1.125 0 0 1 3 16.811V8.69ZM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061a1.125 1.125 0 0 1-1.683-.977V8.69Z" />
          </svg>
        </div>
      </div>

      {/* Card content */}
      <div
        ref={ref}
        {...handlers}
        onClick={() => onTap?.(task)}
        className={`relative flex items-start gap-3 rounded-lg border border-border bg-bg-card p-4 ${
          isCompleted ? 'opacity-50' : 'cursor-pointer active:bg-bg-secondary'
        }`}
        style={{ borderLeftWidth: '3px', borderLeftColor: pillarColor }}
      >
        {/* Completion checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isCompleted) handleComplete();
          }}
          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            isCompleted
              ? 'border-success bg-success'
              : 'border-text-secondary hover:border-success'
          }`}
        >
          {isCompleted && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isCompleted ? 'line-through text-text-secondary' : ''}`}>
              {task.title}
            </span>
            {priorityBadge[task.priority] && !isCompleted && (
              <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${priorityBadge[task.priority].className}`}>
                {priorityBadge[task.priority].label}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs text-text-secondary">
            <span>{pillarName}</span>
            {task.effort_minutes && (
              <span className="font-mono">{task.effort_minutes}m</span>
            )}
            {task.is_recurring && (
              <span className="text-accent">Recurring</span>
            )}
            {task.due_date && !isCompleted && (
              <span className={isDueOrOverdue(task.due_date) ? 'text-danger font-medium' : ''}>
                {formatDueDate(task.due_date)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function isDueOrOverdue(dateStr: string): boolean {
  const due = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due <= today;
}

function formatDueDate(dateStr: string): string {
  const due = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 7) return `Due in ${diffDays}d`;
  return `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}
