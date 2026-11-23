import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { notify } from '../../services/toast';
import { VideoPlayer } from '../../components/common/VideoPlayer';
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  Clock,
  Award,
  AlertTriangle,
  Target,
  Activity,
  CheckSquare,
  Square,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export const PlayerVideoDetailPage: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const { videos, toggleActionPlanTask, activeSubscription, currentUser } = useApp();

  const video = videos.find((v) => v.id === videoId) || videos[0];
  if (!video) {
    return (
      <DashboardLayout role="player">
        <div className="max-w-5xl mx-auto rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          No video submission was found.
        </div>
      </DashboardLayout>
    );
  }
  const review = video.review;
  const isExpired = activeSubscription?.status === 'expired';

  const handleTaskCheck = async (taskId: string) => {
    if (isExpired) {
      notify.error('Subscription is expired. Modifying task progress is disabled in read-only mode.');
      return;
    }
    try {
      await toggleActionPlanTask(video.id, taskId);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to update task progress.');
    }
  };

  const completedTasksCount = review?.actionPlanTasks.filter((t) => t.isCompleted).length || 0;
  const totalTasksCount = review?.actionPlanTasks.length || 0;

  return (
    <DashboardLayout role="player">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          to="/player/videos"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#00BFA6] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Video Submissions</span>
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00BFA6]/10 text-[#00BFA6]">
                {video.category}
              </span>
              <span className="text-xs text-slate-400">Uploaded {video.uploadedAt}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">{video.title}</h1>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
              video.status === 'completed'
                ? 'bg-emerald-100 text-emerald-800'
                : video.status === 'in_progress'
                ? 'bg-sky-100 text-sky-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {video.status === 'completed'
              ? 'Review Completed'
              : video.status === 'in_progress'
              ? 'In Progress'
              : 'Pending Coach Review'}
          </span>
        </div>

        {/* Read-Only Banner if Expired */}
        {isExpired && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>Read-Only Mode:</strong> Your subscription has expired. Existing review notes and drills remain viewable, but task editing is disabled.
            </span>
          </div>
        )}

        {/* Main Grid: Video Player + Observations */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Video player & Player's Submission Notes */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-lg border border-slate-800">
              <VideoPlayer
                video={video}
                className="w-full aspect-video object-contain bg-black"
              />
              <div className="p-4 bg-slate-800/80 text-white flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold">{video.title}</div>
                  <div className="text-[11px] text-slate-400">Trainee: {video.playerName}</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px]">
                  Frame Sync Active
                </span>
              </div>
            </div>

            {/* Trainee Notes */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-2">
              <h3 className="font-extrabold text-sm text-slate-900">Your Submission Notes:</h3>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {video.notes || 'No specific notes entered with this video.'}
              </p>
            </div>
          </div>

          {/* Right Column: Coach Feedback Overview Card */}
          <div className="lg:col-span-5 space-y-6">
            {review ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <img
                    src={review.coachAvatar}
                    alt={review.coachName}
                    className="w-12 h-12 rounded-xl object-cover border-2 border-[#00BFA6]"
                  />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{review.coachName}</h3>
                    <div className="text-[11px] text-[#00BFA6] font-semibold">
                      Accredited Master Coach
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Reviewed on {new Date(review.reviewedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Technical Observations */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Coach's Technical Observations
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                    "{review.technicalObservations}"
                  </p>
                </div>

                {/* Strengths List */}
                <div>
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Key Strengths Identified</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {review.strengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Areas to Improve */}
                <div>
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Areas for Technical Improvement</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {review.areasToImprove.map((a, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4">
                <Clock className="w-12 h-12 text-amber-400 mx-auto" />
                <h3 className="font-bold text-base text-slate-900">Review In Progress</h3>
                <p className="text-xs text-slate-500">
                  Your coach is currently examining your technique. You will be notified when the detailed analysis and drills are posted.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recommended Drills Section (Required by prompt) */}
        {review && review.recommendedDrills.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[#00BFA6]" />
              <h3 className="font-extrabold text-base text-slate-900">
                Prescribed Net &amp; Home Drills
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {review.recommendedDrills.map((drill) => (
                <div
                  key={drill.id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900">{drill.title}</h4>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00BFA6]/15 text-[#00BFA6]">
                      {drill.reps}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{drill.instructions}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Plan Tasks with Interactive Checkboxes (Required by prompt) */}
        {review && review.actionPlanTasks.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-[#00BFA6]" />
                  <span>Personalized Action Plan Tasks</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Check off tasks as you complete them in net sessions or home practice.
                </p>
              </div>

              {/* Progress counter */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-800">
                    {completedTasksCount} of {totalTasksCount} Completed
                  </div>
                  <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
                    <div
                      className="bg-[#00BFA6] h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${totalTasksCount ? (completedTasksCount / totalTasksCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {review.actionPlanTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleTaskCheck(task.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    task.isCompleted
                      ? 'bg-emerald-50/60 border-emerald-200 text-slate-600'
                      : 'bg-white border-slate-200 hover:border-[#00BFA6] text-slate-800 shadow-xs'
                  } ${isExpired ? 'cursor-not-allowed opacity-80' : ''}`}
                >
                  <button
                    type="button"
                    disabled={isExpired}
                    className="mt-0.5 text-[#00BFA6] shrink-0"
                  >
                    {task.isCompleted ? (
                      <CheckSquare className="w-5 h-5 text-[#00BFA6] fill-emerald-100" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  <div className="flex-1">
                    <div
                      className={`text-xs font-bold ${
                        task.isCompleted ? 'line-through text-slate-500' : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{task.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-2">
                      <span>Due: {task.dueDate}</span>
                      <span className="capitalize font-semibold text-amber-600">
                        Priority: {task.priority}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
