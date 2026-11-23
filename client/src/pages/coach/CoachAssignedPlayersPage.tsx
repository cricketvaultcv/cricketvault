import React from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { Users, Film, Target, ArrowRight, ShieldCheck, Award } from 'lucide-react';

export const CoachAssignedPlayersPage: React.FC = () => {
  const { users, coachRequests, videos, currentUser } = useApp();

  // Find accepted requests for this coach
  const acceptedRequests = coachRequests.filter(
    (r) => currentUser && r.coachId === currentUser.id && r.status === 'accepted'
  );

  const assignedPlayers = users.filter((u) =>
    acceptedRequests.some((r) => r.playerId === u.id)
  );

  return (
    <DashboardLayout role="coach">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Assigned Trainees</h1>
            <p className="text-xs text-slate-500 mt-1">
              Athletes currently enrolled under your personal guidance and development plan.
            </p>
          </div>

          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#00BFA6]/10 text-[#00BFA6] self-start sm:self-auto">
            {assignedPlayers.length} Active Trainees
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assignedPlayers.map((player) => {
            const playerVids = videos.filter((v) => v.playerId === player.id);
            const completedCount = playerVids.filter((v) => v.status === 'completed').length;

            return (
              <div
                key={player.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={player.avatar}
                    alt={player.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-[#00BFA6] shrink-0"
                  />
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">{player.name}</h3>
                    <div className="text-xs font-semibold text-[#00BFA6]">
                      {player.cricketProfile?.playingRole || 'Role not set'} &bull;{' '}
                      {player.cricketProfile?.experience || 'Experience not set'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{player.location}</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Batting Stance:</span>
                    <div className="font-bold text-slate-800">{player.cricketProfile?.battingStyle}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Bowling Style:</span>
                    <div className="font-bold text-slate-800">{player.cricketProfile?.bowlingStyle}</div>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200/60 flex justify-between">
                    <span className="text-slate-500">Video Submissions:</span>
                    <strong className="text-slate-800">{playerVids.length} clips ({completedCount} reviewed)</strong>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <Link
                    to={`/coach/players/${player.id}`}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs text-center transition-colors"
                  >
                    View Player Profile
                  </Link>
                  <Link
                    to="/coach/videos"
                    className="px-4 py-2.5 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-extrabold text-xs flex items-center gap-1 transition-colors"
                  >
                    <Film className="w-4 h-4" />
                    <span>Review Videos</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};
