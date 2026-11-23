import React, { useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { notify } from '../../services/toast';
import {
  CheckSquare,
  Square,
  AlertTriangle,
  Target,
  Filter,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export const PlayerActionPlansPage: React.FC = () => {
  const { videos, toggleActionPlanTask, activeSubscription, currentUser } = useApp();
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const playerVideos = videos.filter((v) => currentUser && v.playerId === currentUser.id);
  const isExpired = activeSubscription?.status === 'expired';

  // Extract all tasks with their parent video metadata
  const allTasks: {
    videoId: string;
    videoTitle: string;
    coachName: string;
    id: string;
    title: string;
    description: string;
    isCompleted: boolean;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
  }[] = [];

  playerVideos.forEach((v) => {
    if (v.review?.actionPlanTasks) {
      v.review.actionPlanTasks.forEach((t) => {
        allTasks.push({
          videoId: v.id,
          videoTitle: v.title,
          coachName: v.review?.coachName || 'Assigned Coach',
          ...t,
        });
      });
    }
  });

  const filteredTasks = allTasks.filter(
    (t) => priorityFilter === 'all' || t.priority === priorityFilter
  );

  const completedCount = allTasks.filter((t) => t.isCompleted).length;
  const totalCount = allTasks.length;
  const progressPercent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggle = async (videoId: string, taskId: string) => {
    if (isExpired) {
      notify.error('Subscription is expired. Task edits are disabled in read-only mode.');
      return;
    }
    try {
      await toggleActionPlanTask(videoId, taskId);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to update task progress.');
    }
  };

  return (
    <DashboardLayout role="player">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Action Plans &amp; Tasks</h1>
            <p className="text-xs text-slate-500 mt-1">
              Consolidated net session tasks and homework prescribed by your coach.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-900">{progressPercent}% Completed</div>
              <div className="text-[10px] text-slate-400">{completedCount} of {totalCount} Tasks Done</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#00BFA6]/10 text-[#00BFA6] font-black text-sm flex items-center justify-center">
              {progressPercent}%
            </div>
          </div>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 text-xs">
          <span className="font-bold text-slate-700">Filter by Priority:</span>
          <div className="flex gap-1.5">
            {(['all', 'high', 'medium', 'low'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1 rounded-lg font-bold capitalize transition-all ${
                  priorityFilter === p
                    ? 'bg-[#00BFA6] text-[#0F172A]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => handleToggle(task.videoId, task.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                  task.isCompleted
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-white border-slate-200 hover:border-[#00BFA6] shadow-xs'
                }`}
              >
                <button
                  type="button"
                  disabled={isExpired}
                  className="mt-0.5 text-[#00BFA6] shrink-0"
                >
                  {task.isCompleted ? (
                    <CheckSquare className="w-5 h-5 text-[#00BFA6]" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3
                      className={`text-xs font-bold ${
                        task.isCompleted ? 'line-through text-slate-500' : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        task.priority === 'high'
                          ? 'bg-rose-100 text-rose-800'
                          : task.priority === 'medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {task.priority} Priority
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 mt-1">{task.description}</p>

                  <div className="mt-2.5 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Source: {task.videoTitle}</span>
                    <span>Due by: {task.dueDate}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
              No tasks found for this filter.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
