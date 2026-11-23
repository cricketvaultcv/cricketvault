import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { notify } from '../../services/toast';
import { VideoPlayer } from '../../components/common/VideoPlayer';
import { ActionPlanTask, RecommendedDrill, VideoSubmission } from '../../types';
import {
  Film,
  Play,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  Target,
  Sparkles,
  Award,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export const CoachVideoReviewWorkspace: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const { videos, submitCoachReview, currentUser } = useApp();
  const navigate = useNavigate();

  // Find targeted video or fallback to first video awaiting review
  const activeVideo =
    videos.find((v) => v.id === videoId) ||
    videos.find((v) => v.status === 'pending') ||
    videos[0];

  const [selectedVideoId, setSelectedVideoId] = useState<string>(activeVideo?.id || '');

  const currentSelectedVideo =
    videos.find((v) => v.id === selectedVideoId) || activeVideo;

  // Form states for review
  const [technicalObservations, setTechnicalObservations] = useState(
    currentSelectedVideo?.review?.technicalObservations || ''
  );

  const [strengths, setStrengths] = useState<string[]>(
    currentSelectedVideo?.review?.strengths || []
  );
  const [newStrengthInput, setNewStrengthInput] = useState('');

  const [areasToImprove, setAreasToImprove] = useState<string[]>(
    currentSelectedVideo?.review?.areasToImprove || []
  );
  const [newAreaInput, setNewAreaInput] = useState('');

  const [drills, setDrills] = useState<RecommendedDrill[]>(
    currentSelectedVideo?.review?.recommendedDrills || []
  );
  const [newDrillTitle, setNewDrillTitle] = useState('');
  const [newDrillReps, setNewDrillReps] = useState('');
  const [newDrillInstructions, setNewDrillInstructions] = useState('');

  const [tasks, setTasks] = useState<ActionPlanTask[]>(
    currentSelectedVideo?.review?.actionPlanTasks || []
  );
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('high');

  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    setTechnicalObservations(currentSelectedVideo?.review?.technicalObservations || '');
    setStrengths(currentSelectedVideo?.review?.strengths || []);
    setAreasToImprove(currentSelectedVideo?.review?.areasToImprove || []);
    setDrills(currentSelectedVideo?.review?.recommendedDrills || []);
    setTasks(currentSelectedVideo?.review?.actionPlanTasks || []);
  }, [currentSelectedVideo?.id]);

  const handleAddStrength = () => {
    if (newStrengthInput.trim()) {
      setStrengths([...strengths, newStrengthInput.trim()]);
      setNewStrengthInput('');
    }
  };

  const handleAddArea = () => {
    if (newAreaInput.trim()) {
      setAreasToImprove([...areasToImprove, newAreaInput.trim()]);
      setNewAreaInput('');
    }
  };

  const handleAddDrill = () => {
    if (newDrillTitle.trim()) {
      setDrills([
        ...drills,
        {
          id: `drill-${Date.now()}`,
          title: newDrillTitle.trim(),
          reps: newDrillReps.trim() || '3 sets of 20 reps',
          category: currentSelectedVideo?.category || 'Batting',
          instructions: newDrillInstructions.trim() || 'Perform drill focusing on technical balance.',
        },
      ]);
      setNewDrillTitle('');
      setNewDrillReps('');
      setNewDrillInstructions('');
    }
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      setTasks([
        ...tasks,
        {
          id: `task-${Date.now()}`,
          title: newTaskTitle.trim(),
          description: 'Prescribed homework for your upcoming net practice session.',
          isCompleted: false,
          dueDate: newTaskDue,
          priority: newTaskPriority,
        },
      ]);
      setNewTaskTitle('');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelectedVideo) return;

    const res = await submitCoachReview(currentSelectedVideo.id, {
      technicalObservations,
      strengths,
      areasToImprove,
      drills,
      tasks,
    });

    if (res.success) {
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } else {
      notify.error(res.message || 'Unable to submit the review.');
    }
  };

  if (!currentSelectedVideo) {
    return (
      <DashboardLayout role="coach">
        <div className="max-w-6xl mx-auto rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          No player videos are available for review.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="coach">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Video Review Workspace
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Provide frame-by-frame analysis, technical critiques, recommended drills, and action plans.
            </p>
          </div>

          {/* Video Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Select Video:</span>
            <select
              value={currentSelectedVideo?.id}
              onChange={(e) => setSelectedVideoId(e.target.value)}
              className="px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00BFA6]"
            >
              {videos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.playerName}: {v.title} ({v.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {submitSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Review successfully submitted! The player has been notified and their action plan is live.
            </span>
          </div>
        )}

        {currentSelectedVideo && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Video Preview and Trainee Specs */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-lg border border-slate-800">
                <VideoPlayer
                  video={currentSelectedVideo}
                  className="w-full aspect-video object-contain bg-black"
                />
                <div className="p-4 bg-slate-800 text-white flex items-center justify-between text-xs">
                  <div>
                    <h3 className="font-bold text-sm">{currentSelectedVideo.title}</h3>
                    <p className="text-[11px] text-slate-400">
                      Trainee: {currentSelectedVideo.playerName} &bull; Category: {currentSelectedVideo.category}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00BFA6] text-[#0F172A]">
                    {currentSelectedVideo.status}
                  </span>
                </div>
              </div>

              {/* Trainee Details Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">
                  Trainee Context &amp; Notes
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  {currentSelectedVideo.notes || 'No specific notes submitted by player.'}
                </div>
                <div className="text-[11px] text-slate-400">
                  Uploaded: {currentSelectedVideo.uploadedAt}
                </div>
              </div>
            </div>

            {/* Right Column: Coach Feedback Form Editor */}
            <div className="lg:col-span-7">
              <form
                onSubmit={handleSubmitReview}
                className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6"
              >
                {/* Section 1: Technical Observations */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Frame Observations &amp; Biomechanics Diagnosis
                  </label>
                  <textarea
                    rows={4}
                    value={technicalObservations}
                    onChange={(e) => setTechnicalObservations(e.target.value)}
                    placeholder="Enter frame notes (e.g. Weight transfer is smooth, but front shoulder opens up 2 frames before impact...)"
                    className="w-full p-3.5 rounded-2xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#00BFA6]"
                  />
                </div>

                {/* Section 2: Strengths Identified */}
                <div>
                  <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                    Key Strengths
                  </label>
                  <div className="space-y-1.5 mb-2">
                    {strengths.map((s, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 text-emerald-900 text-xs border border-emerald-100"
                      >
                        <span>✓ {s}</span>
                        <button
                          type="button"
                          onClick={() => setStrengths(strengths.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newStrengthInput}
                      onChange={(e) => setNewStrengthInput(e.target.value)}
                      placeholder="Add strength (e.g. Excellent wrist cock at top of backlift)"
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-[#00BFA6]"
                    />
                    <button
                      type="button"
                      onClick={handleAddStrength}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Section 3: Areas to Improve */}
                <div>
                  <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
                    Areas for Technical Improvement
                  </label>
                  <div className="space-y-1.5 mb-2">
                    {areasToImprove.map((a, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-amber-50 text-amber-900 text-xs border border-amber-100"
                      >
                        <span>⚡ {a}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setAreasToImprove(areasToImprove.filter((_, i) => i !== idx))
                          }
                          className="text-rose-500 hover:text-rose-700 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAreaInput}
                      onChange={(e) => setNewAreaInput(e.target.value)}
                      placeholder="Add improvement point (e.g. Prevent chin dropping to chest)"
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-[#00BFA6]"
                    />
                    <button
                      type="button"
                      onClick={handleAddArea}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Section 4: Prescribe Drills */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Prescribe Drills
                  </label>
                  <div className="space-y-2 mb-3">
                    {drills.map((drill, idx) => (
                      <div
                        key={drill.id || idx}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                      >
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>{drill.title} ({drill.reps})</span>
                          <button
                            type="button"
                            onClick={() => setDrills(drills.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500">{drill.instructions}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      value={newDrillTitle}
                      onChange={(e) => setNewDrillTitle(e.target.value)}
                      placeholder="Drill name (e.g. Towel Swing Release)"
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                    />
                    <input
                      type="text"
                      value={newDrillReps}
                      onChange={(e) => setNewDrillReps(e.target.value)}
                      placeholder="Reps (e.g. 3 sets of 25 reps)"
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDrillInstructions}
                      onChange={(e) => setNewDrillInstructions(e.target.value)}
                      placeholder="Drill execution instructions..."
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddDrill}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold"
                    >
                      Add Drill
                    </button>
                  </div>
                </div>

                {/* Section 5: Generate Action Plan Tasks */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Generate Action-Plan Tasks
                  </label>
                  <div className="space-y-1.5 mb-2">
                    {tasks.map((t, idx) => (
                      <div
                        key={t.id || idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{t.title}</div>
                          <div className="text-[10px] text-slate-400">Due: {t.dueDate} &bull; Priority: {t.priority}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTasks(tasks.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Task item (e.g. Practice 50 front-foot shadow drives)"
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                    />
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as any)}
                      className="px-2 py-1.5 rounded-xl border border-slate-300 text-xs"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddTask}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold"
                    >
                      Add Task
                    </button>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Publishing updates trainee status to Completed
                  </span>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-extrabold text-xs shadow-md flex items-center gap-2 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    <span>Submit Completed Feedback</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
