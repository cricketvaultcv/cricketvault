import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import {
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Video,
  Sparkles,
} from 'lucide-react';

export const PlayerCoachAssignmentPage: React.FC = () => {
  const {
    currentUser,
    coachRequests,
    activeSubscription,
    assignedCoach,
    respondToCoachRequest,
    reassignCoach,
  } = useApp();
  const navigate = useNavigate();

  // Find requests made by this player
  const playerRequests = coachRequests.filter(
    (r) => currentUser && r.playerId === currentUser.id
  );
  const latestRequest = playerRequests[0];

  return (
    <DashboardLayout role="player">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Coach Assignment Status</h1>
            <p className="text-xs text-slate-500 mt-1">
              Track your coach assignment request and start your video feedback drills.
            </p>
          </div>

          <Link
            to="/player/coaches"
            className="px-4 py-2.5 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-bold text-xs flex items-center gap-2 self-start sm:self-auto"
          >
            <span>Browse All Coaches</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* State 1: Active Coach Assigned */}
        {latestRequest && latestRequest.status === 'accepted' && (
          <div className="bg-white rounded-3xl border border-emerald-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-2xl border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="text-xs font-bold">
                Coach Assignment Confirmed &bull; Active Mentorship
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <img
                  src={latestRequest.coachAvatar}
                  alt={latestRequest.coachName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-[#00BFA6]"
                />
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {latestRequest.coachName}
                  </h3>
                  <div className="text-xs font-semibold text-[#00BFA6]">
                    Your Personal Cricket Mentor
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Accepted on{' '}
                    {latestRequest.respondedAt
                      ? new Date(latestRequest.respondedAt).toLocaleDateString()
                      : 'Recently'}
                  </div>
                </div>
              </div>

              <Link
                to="/player/videos/upload"
                className="px-5 py-3 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-extrabold text-xs flex items-center gap-2 shadow-sm transition-colors"
              >
                <Video className="w-4 h-4" />
                <span>Share Video Link with Coach {latestRequest.coachName.split(' ')[0]}</span>
              </Link>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-1">
              <strong>What happens next?</strong>
              <p>
                Record your practice session from front or side-on angles and share its YouTube or Google Drive link. Coach {latestRequest.coachName} will provide frame-by-frame analysis and a weekly action plan within your guaranteed turnaround window.
              </p>
            </div>
          </div>
        )}

        {/* State 2: Pending Request */}
        {latestRequest && latestRequest.status === 'pending' && (
          <div className="bg-white rounded-3xl border border-amber-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3 text-amber-800 bg-amber-50 px-4 py-2.5 rounded-2xl border border-amber-200">
              <Clock className="w-5 h-5 shrink-0 text-amber-600" />
              <span className="text-xs font-bold">
                Assignment Request Pending Coach Acceptance
              </span>
            </div>

            <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
              <img
                src={latestRequest.coachAvatar}
                alt={latestRequest.coachName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400"
              />
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {latestRequest.coachName}
                </h3>
                <div className="text-xs text-slate-500">
                  Requested on {new Date(latestRequest.requestedAt).toLocaleDateString()}
                </div>
                <div className="text-xs text-amber-700 font-semibold mt-1">
                  Awaiting confirmation from coach
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-bold text-slate-800">Coaching Policy:</div>
              <p>
                Your coaching period officially begins when Coach {latestRequest.coachName} accepts this request. If they cannot take new trainees this week, your full subscription entitlement is guaranteed and you can pick another coach with zero extra charges.
              </p>
            </div>

          </div>
        )}

        {/* State 3: Rejected with Zero-Cost Reassignment (Required by prompt) */}
        {latestRequest && latestRequest.status === 'rejected' && (
          <div className="bg-white rounded-3xl border border-rose-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3 text-rose-800 bg-rose-50 px-4 py-2.5 rounded-2xl border border-rose-200">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <span className="text-xs font-bold">
                Coach Was Unavailable &bull; Reassignment Available At No Cost
              </span>
            </div>

            <div className="space-y-3 pb-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                Coach {latestRequest.coachName} could not accept your request
              </h3>
              <p className="text-xs text-slate-600">
                Reason given: "{latestRequest.rejectionReason || 'No reason was provided.'}"
              </p>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                <strong>✓ Subscription Protected:</strong> Your payment remains fully valid. You can reassign to any other accredited coach without paying again!
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/player/coaches"
                className="px-6 py-3 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-extrabold text-xs flex items-center gap-2 shadow-md transition-colors"
              >
                <span>Select Another Eligible Coach</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* State 4: No Request Made Yet */}
        {!latestRequest && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4">
            <UserCheck className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">No Coach Selected Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven't requested a coach yet. Explore our directory of BCCI and State certified coaches and select one to start your training.
            </p>
            <Link
              to="/player/coaches"
              className="inline-block px-6 py-2.5 rounded-xl bg-[#00BFA6] text-[#0F172A] font-bold text-xs"
            >
              Browse Coaches &amp; Submit Request
            </Link>
          </div>
        )}

        {/* Past Requests History Table */}
        {playerRequests.length > 1 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">Request History</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {playerRequests.map((req) => (
                <div key={req.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={req.coachAvatar} alt={req.coachName} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <div className="font-bold text-slate-800">{req.coachName}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(req.requestedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                      req.status === 'accepted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : req.status === 'withdrawn'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
