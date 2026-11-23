import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import {
  Film,
  Link2,
  PlayCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  ArrowRight,
} from 'lucide-react';

export const PlayerVideosPage: React.FC = () => {
  const { currentUser, videos, activeSubscription } = useApp();
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const playerVideos = videos.filter((v) => currentUser && v.playerId === currentUser.id);

  const filtered = playerVideos.filter((vid) => {
    const matchesCat = filterCategory === 'All' || vid.category === filterCategory;
    const matchesStatus = filterStatus === 'All' || vid.status === filterStatus;
    const matchesSearch =
      vid.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vid.notes && vid.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesStatus && matchesSearch;
  });

  return (
    <DashboardLayout role="player">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">My Video Submissions</h1>
            <p className="text-xs text-slate-500 mt-1">
              View your shared cricket training clips, coach reviews, and frame observations.
            </p>
          </div>

          <Link
            to="/player/videos/upload"
            className="px-4 py-2.5 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-bold text-xs flex items-center gap-2 self-start sm:self-auto shadow-sm transition-colors"
          >
            <Link2 className="w-4 h-4" />
            <span>Submit Video Link</span>
          </Link>
        </div>

        {/* Filter bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos by title..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00BFA6]"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto sm:justify-end">
            <div className="flex items-center justify-between gap-1.5 w-full sm:w-auto">
              <span className="text-slate-500">Category:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="min-w-0 max-w-full px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00BFA6]"
              >
                <option value="All">All Categories</option>
                <option value="Batting">Batting</option>
                <option value="Bowling">Bowling</option>
                <option value="Fielding">Fielding</option>
                <option value="Wicketkeeping">Wicketkeeping</option>
                <option value="Fitness">Fitness</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-1.5 w-full sm:w-auto">
              <span className="text-slate-500">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="min-w-0 max-w-full px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00BFA6]"
              >
                <option value="All">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Videos Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((vid) => (
              <div
                key={vid.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Thumbnail */}
                  <div className="relative h-44 bg-slate-900 overflow-hidden">
                    <img
                      src={vid.thumbnailUrl}
                      alt={vid.title}
                      className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <PlayCircle className="w-10 h-10 text-white/90 group-hover:text-[#00BFA6] transition-colors" />
                    </div>

                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-900/80 text-white">
                        {vid.category} · {vid.videoSource === 'file' ? 'File' : vid.videoSource === 'youtube' ? 'YouTube' : 'Drive'}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          vid.status === 'completed'
                            ? 'bg-emerald-500 text-white'
                            : vid.status === 'in_progress'
                            ? 'bg-sky-500 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {vid.status === 'completed'
                          ? 'Review Ready'
                          : vid.status === 'in_progress'
                          ? 'In Review'
                          : 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 group-hover:text-[#00BFA6] transition-colors line-clamp-1">
                      {vid.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {vid.notes || 'No specific notes entered with this submission.'}
                    </p>
                    <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span>Uploaded {vid.uploadedAt}</span>
                      <span>Coach: {vid.coachName || 'Assigned Mentor'}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-5 pt-0">
                  <Link
                    to={`/player/videos/${vid.id}`}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-[#00BFA6] text-slate-800 hover:text-[#0F172A] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>{vid.review ? 'View Coach Review & Action Plan' : 'View Submission Details'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
            <Film className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No videos match your filters</h3>
            <p className="text-xs text-slate-500">
              Try clearing your search query or sharing a new practice video link.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
