import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, Target, Award, Film, PlayCircle, CheckCircle2 } from 'lucide-react';

export const CoachPlayerDetailPage: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const { users, videos } = useApp();

  const player = users.find((u) => u.id === playerId);
  if (!player) {
    return (
      <DashboardLayout role="coach">
        <div className="mx-auto max-w-4xl space-y-4">
          <Link
            to="/coach/players"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#00BFA6]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Assigned Players</span>
          </Link>
          <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xs">
            <h1 className="text-lg font-extrabold text-slate-900">Player not found</h1>
            <p className="mt-2 text-sm text-slate-500">
              This player may no longer be assigned to your account.
            </p>
          </section>
        </div>
      </DashboardLayout>
    );
  }
  const playerVideos = videos.filter((v) => v.playerId === player.id);

  return (
    <DashboardLayout role="coach">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          to="/coach/players"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#00BFA6]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assigned Players</span>
        </Link>

        {/* Player Profile Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={player.avatar}
              alt={player.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-[#00BFA6]"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">{player.name}</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00BFA6]/10 text-[#00BFA6]">
                  {player.cricketProfile?.experience}
                </span>
              </div>
              <p className="text-xs text-slate-500">{player.location}</p>
              <div className="text-[11px] text-slate-400 mt-1">
                Role: <strong>{player.cricketProfile?.playingRole}</strong> &bull; Stance:{' '}
                <strong>{player.cricketProfile?.battingStyle}</strong>
              </div>
            </div>
          </div>

          <Link
            to="/coach/videos"
            className="px-5 py-2.5 rounded-xl bg-[#00BFA6] text-[#0F172A] font-extrabold text-xs shadow-sm"
          >
            Review Videos ({playerVideos.length})
          </Link>
        </div>

        {/* Goals & Focus */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-[#00BFA6]" />
            <span>Target Development Goals</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {player.cricketProfile?.trainingGoals.map((g, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
              >
                🎯 {g}
              </span>
            ))}
          </div>
        </div>

        {/* Video Submissions by this player */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900">Training Video Library</h3>
          <div className="divide-y divide-slate-100">
            {playerVideos.map((vid) => (
              <div key={vid.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PlayCircle className="w-8 h-8 text-slate-400" />
                  <div>
                    <div className="font-bold text-xs text-slate-900">{vid.title}</div>
                    <div className="text-[10px] text-slate-400">
                      {vid.category} &bull; Uploaded {vid.uploadedAt}
                    </div>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                  {vid.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
