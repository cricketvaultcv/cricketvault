import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import {
  Film,
  Clock,
  CheckCircle2,
  Link2,
  CreditCard,
  BookOpen,
  ArrowRight,
  UserCheck,
  AlertTriangle,
  PlayCircle,
  Calendar,
  Sparkles,
} from 'lucide-react';

export const PlayerDashboard: React.FC = () => {
  const { currentUser, videos, activeSubscription, assignedCoach } = useApp();
  const navigate = useNavigate();

  // Metrics (Matches Reference 1 Screen 3)
  const playerVideos = videos.filter((v) => currentUser && v.playerId === currentUser.id);
  const totalVideosCount = playerVideos.length;
  const pendingReviewsCount = playerVideos.filter((v) => v.status === 'pending').length;
  const completedReviewsCount = playerVideos.filter((v) => v.status === 'completed').length;
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
            In Progress
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            Revision Needed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Pending
          </span>
        );
    }
  };

  return (
    <DashboardLayout role="player">
      <div className="space-y-6">
        {/* Welcome Header (Matches Reference 1 Screen 3: "Welcome, Rahul! 👋 Keep improving, one step at a time.") */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
              <span>Welcome, {currentUser?.name || 'Player'}!</span>
              <span>👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Keep improving, one step at a time. Your coach feedback and Net drill milestones are below.
            </p>
          </div>

          {/* Quick upload CTA */}
          <Link
            to="/player/videos/upload"
            className="px-4 py-2.5 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-extrabold text-xs flex items-center gap-2 shadow-sm transition-colors"
          >
            <Link2 className="w-4 h-4" />
            <span>Share Video Link</span>
          </Link>
        </div>

        {/* Subscription Expiry Warning if expired or near expiry */}
        {activeSubscription && activeSubscription.status === 'expired' && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">Subscription Expired</h4>
                <p className="text-[11px] text-amber-700">
                  New video link submissions and task edits are disabled. Existing videos and feedback remain viewable.
                </p>
              </div>
            </div>
            <Link
              to="/pricing"
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs shrink-0"
            >
              Renew Plan
            </Link>
          </div>
        )}

        {/* Player Profile Summary Card (Matches Reference 1 Screen 3) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <img
                src={currentUser?.avatar}
                alt={currentUser?.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#00BFA6] shadow-sm shrink-0"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words text-lg font-extrabold text-slate-900">{currentUser?.name}</h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00BFA6]/10 text-[#00BFA6]">
                    {currentUser?.cricketProfile?.experience || 'Profile incomplete'}
                  </span>
                </div>
                <p className="mt-0.5 break-words text-xs text-slate-500">
                  {currentUser?.cricketProfile?.playingRole || 'Role not set'} &bull;{' '}
                  {currentUser?.location || 'Location not set'}
                </p>
                <div className="mt-1 break-words text-[11px] text-slate-400">
                  Batting: <strong>{currentUser?.cricketProfile?.battingStyle}</strong> | Bowling:{' '}
                  <strong>{currentUser?.cricketProfile?.bowlingStyle}</strong>
                </div>
              </div>
            </div>
            <Link
              to="/player/profile"
              className="flex min-h-11 w-full shrink-0 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
            >
              Edit Profile
            </Link>
          </div>

          {/* Stats Counters */}
          <div className="grid w-full grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3 sm:gap-4">
            <div className="text-center">
              <span className="text-xs text-slate-400 font-medium">Total Videos</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{totalVideosCount}</div>
            </div>
            <div className="text-center">
              <span className="text-xs text-slate-400 font-medium">Pending Reviews</span>
              <div className="text-2xl font-black text-amber-500 mt-0.5">{pendingReviewsCount}</div>
            </div>
            <div className="text-center">
              <span className="text-xs text-slate-400 font-medium">Completed Reviews</span>
              <div className="text-2xl font-black text-[#00BFA6] mt-0.5">{completedReviewsCount}</div>
            </div>
          </div>
        </div>

        {/* Assigned Coach & Subscription Status Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Plan Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#00BFA6]">
                  Active Subscription
                </span>
                <h3 className="font-extrabold text-base text-slate-900 mt-0.5">
                  {activeSubscription ? activeSubscription.planName : 'No Active Subscription'}
                </h3>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  activeSubscription?.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : activeSubscription?.status === 'pending_coach'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {activeSubscription?.status === 'active'
                  ? 'Coaching Active'
                  : activeSubscription?.status === 'pending_coach'
                  ? 'Pending Coach Acceptance'
                  : 'Inactive'}
              </span>
            </div>

            {activeSubscription ? (
              <div className="mt-4 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Remaining Duration:</span>
                  <strong className="text-slate-900">{activeSubscription.daysRemaining} Days</strong>
                </div>
                <div className="flex justify-between">
                  <span>Order ID:</span>
                  <span className="font-mono text-slate-500">{activeSubscription.paymentDetails.orderId}</span>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500">
                Purchase a video review or monthly mentorship plan to get assigned to an expert coach.
              </p>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <Link
                to="/player/subscription"
                className="text-xs font-bold text-[#00BFA6] hover:underline"
              >
                Subscription Details &rarr;
              </Link>
              {!activeSubscription && (
                <Link
                  to="/pricing"
                  className="px-3 py-1.5 rounded-lg bg-[#00BFA6] text-[#0F172A] font-bold text-xs"
                >
                  Buy Review
                </Link>
              )}
            </div>
          </div>

          {/* Assigned Coach Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#00BFA6]">
                  Assigned Mentor
                </span>
                <h3 className="font-extrabold text-base text-slate-900 mt-0.5">
                  {assignedCoach ? assignedCoach.name : 'No Coach Assigned'}
                </h3>
              </div>
              {assignedCoach && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  Assigned
                </span>
              )}
            </div>

            {assignedCoach ? (
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={assignedCoach.avatar}
                  alt={assignedCoach.name}
                  className="w-12 h-12 rounded-xl object-cover border border-[#00BFA6]"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {assignedCoach.coachProfile?.specialization}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {assignedCoach.coachProfile?.experienceYears}+ Years &bull; {assignedCoach.location}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-semibold">
                    ★ {assignedCoach.coachProfile?.rating} Rating
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500">
                Select an accredited coach to review your batting stance, bowling action, or fielding drills.
              </p>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <Link
                to="/player/assignment"
                className="text-xs font-bold text-[#00BFA6] hover:underline"
              >
                Track Assignment Status &rarr;
              </Link>
              <Link
                to="/player/coaches"
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Browse Coaches
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Videos Section (Matches Reference 1 Screen 3) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-[#00BFA6]" />
              <h3 className="font-extrabold text-base text-slate-900">Recent Videos</h3>
            </div>
            <Link
              to="/player/videos"
              className="text-xs font-bold text-[#00BFA6] hover:underline flex items-center gap-1"
            >
              <span>View All &rarr;</span>
            </Link>
          </div>

          {/* Video List (Matches Reference 1 Screen 3) */}
          <div className="divide-y divide-slate-100">
            {playerVideos.slice(0, 3).map((vid) => (
              <div
                key={vid.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 rounded-xl px-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-20 h-14 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                    <img
                      src={vid.thumbnailUrl}
                      alt={vid.title}
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-white/90">
                      <PlayCircle className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{vid.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Uploaded {vid.uploadedAt} &bull; Category: {vid.category}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:justify-end">
                  {getStatusBadge(vid.status)}
                  <Link
                    to={`/player/videos/${vid.id}`}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 transition-colors"
                  >
                    {vid.review ? 'View Feedback' : 'Details'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
              Quick Actions
            </h3>
            <span className="text-xs text-slate-400">Shortcuts</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to="/player/videos/upload"
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#00BFA6]/40 hover:shadow-md transition-all flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#00BFA6] flex items-center justify-center shrink-0 group-hover:bg-[#00BFA6] group-hover:text-[#0F172A] transition-colors">
                <Link2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Share Video Link</h4>
                <p className="text-xs text-slate-500 mt-0.5">Send a training clip for review</p>
              </div>
            </Link>

            <Link
              to="/pricing"
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#00BFA6]/40 hover:shadow-md transition-all flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Buy Review</h4>
                <p className="text-xs text-slate-500 mt-0.5">Explore coaching packages</p>
              </div>
            </Link>

            <Link
              to="/resources"
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#00BFA6]/40 hover:shadow-md transition-all flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Browse Resources</h4>
                <p className="text-xs text-slate-500 mt-0.5">Guides, drills & e-books</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
