import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import {
  Film,
  Clock,
  CheckCircle2,
  Users,
  Award,
  ArrowRight,
  ClipboardList,
  Sparkles,
  PlayCircle,
  Eye,
} from 'lucide-react';

export const CoachDashboard: React.FC = () => {
  const { currentUser, coachRequests, videos, users } = useApp();
  const navigate = useNavigate();

  // Requests returned for the authenticated coach.
  const incomingRequests = coachRequests.filter(
    (r) => currentUser && r.coachId === currentUser.id
  );
  const pendingRequestsCount = incomingRequests.filter((r) => r.status === 'pending').length;

  // Videos assigned to this coach
  const coachVideos = videos.filter(
    (v) => currentUser && v.coachId === currentUser.id
  );
  const pendingVideosCount = coachVideos.filter((v) => v.status === 'pending').length;
  const inProgressVideosCount = coachVideos.filter((v) => v.status === 'in_progress').length;
  const completedVideosCount = coachVideos.filter((v) => v.status === 'completed').length;

  return (
    <DashboardLayout role="coach">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
              <span>Welcome, Coach {currentUser?.name.split(' ')[0] || 'Coach'}!</span>
              <span>🏏</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Ready to make an impact? Review player training clips, refine technical mechanics, and assign weekly action plans.
            </p>
          </div>

          <Link
            to="/coach/videos"
            className="px-4 py-2.5 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-extrabold text-xs flex items-center gap-2 self-start sm:self-auto shadow-sm transition-colors"
          >
            <Film className="w-4 h-4" />
            <span>Open Review Workspace</span>
          </Link>
        </div>

        {/* Coach Profile Card (Matches Reference 1 Screen 4) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={currentUser?.avatar}
              alt={currentUser?.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-[#00BFA6] shadow-sm shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900">{currentUser?.name}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00BFA6]/10 text-[#00BFA6]">
                  Coach
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {currentUser?.coachProfile?.specialization || 'Batting & Fielding Specialist'} &bull;{' '}
                {currentUser?.location}
              </p>
              <div className="text-[11px] text-slate-400 mt-1">
                Rate: <strong>₹{currentUser?.coachProfile?.pricePerReview ?? 0}</strong> / review &bull;{' '}
                Rating: <strong className="text-amber-500">★ {currentUser?.coachProfile?.rating ?? 0}</strong>
              </div>
            </div>
          </div>

          {/* Stats: Pending Reviews, In Progress, Completed (Matches Screen 4) */}
          <div className="w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-8">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="text-center">
                <span className="text-xs text-slate-400 font-medium">Pending Requests</span>
                <div className="text-2xl font-black text-amber-500 mt-0.5">
                  {pendingRequestsCount}
                </div>
              </div>
              <div className="text-center">
                <span className="text-xs text-slate-400 font-medium">In Progress</span>
                <div className="text-2xl font-black text-sky-500 mt-0.5">
                  {inProgressVideosCount}
                </div>
              </div>
              <div className="text-center">
                <span className="text-xs text-slate-400 font-medium">Completed</span>
                <div className="text-2xl font-black text-[#00BFA6] mt-0.5">
                  {completedVideosCount}
                </div>
              </div>
            </div>
            <Link
              to="/coach/profile"
              className="mt-4 flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 sm:ml-auto sm:w-auto sm:min-w-36"
            >
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Review Requests Section (Matches Reference 1 Screen 4) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#00BFA6]" />
              <h3 className="font-extrabold text-base text-slate-900">Review Requests</h3>
            </div>
            <Link
              to="/coach/requests"
              className="text-xs font-bold text-[#00BFA6] hover:underline flex items-center gap-1"
            >
              <span>View All &rarr;</span>
            </Link>
          </div>

          {/* Requests List */}
          <div className="divide-y divide-slate-100">
            {coachRequests.slice(0, 3).map((req) => (
              <div
                key={req.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 rounded-xl px-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={req.playerAvatar}
                    alt={req.playerName}
                    className="w-12 h-12 rounded-full object-cover border border-[#00BFA6] shrink-0"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{req.playerName}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {req.playerRole} Review &bull; Level: {req.playerLevel}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      Requested {new Date(req.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:justify-end">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      req.status === 'accepted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : req.status === 'withdrawn'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {req.status === 'accepted'
                      ? 'Accepted'
                      : req.status === 'rejected'
                        ? 'Declined'
                        : req.status === 'withdrawn'
                          ? 'Withdrawn'
                          : 'Pending'}
                  </span>

                  <Link
                    to="/coach/requests"
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 transition-colors"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions (Matches Reference 1 Screen 4: View Assigned Videos, Manage Profile) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
              Quick Actions
            </h3>
            <span className="text-xs text-slate-400">Shortcuts</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/coach/videos"
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#00BFA6]/40 hover:shadow-md transition-all flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#00BFA6] flex items-center justify-center shrink-0 group-hover:bg-[#00BFA6] group-hover:text-[#0F172A] transition-colors">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">View Assigned Videos</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspect frame-by-frame and post observations
                </p>
              </div>
            </Link>

            <Link
              to="/coach/profile"
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#00BFA6]/40 hover:shadow-md transition-all flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Manage Profile &amp; Pricing</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update specialties, bio, and hourly rates
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
