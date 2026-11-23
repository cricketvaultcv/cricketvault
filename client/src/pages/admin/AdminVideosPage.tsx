import React from 'react';
import { ExternalLink, Film } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { VideoPlayer } from '../../components/common/VideoPlayer';
import { useApp } from '../../context/AppContext';

export const AdminVideosPage: React.FC = () => {
  const { videos } = useApp();

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Player Video Submissions</h1>
          <p className="mt-1 text-xs text-slate-500">
            View player-shared YouTube and Google Drive submissions.
          </p>
        </div>

        {videos.length ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {videos.map((video) => (
              <article
                key={video.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs"
              >
                <VideoPlayer
                  video={video}
                  className="aspect-video w-full bg-black object-contain"
                />
                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-extrabold text-slate-900">{video.title}</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Player: {video.playerName} · {video.category}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold capitalize text-slate-700">
                      {video.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-slate-600">
                    {video.notes || 'No submission notes provided.'}
                  </p>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                    <span>
                      {video.videoSource === 'file'
                        ? 'Legacy file submission'
                        : video.videoSource === 'youtube'
                          ? 'YouTube link'
                          : 'Google Drive link'}
                      {' · '}
                      {video.uploadedAt}
                    </span>
                    {video.videoSource !== 'file' && (
                      <a
                        href={video.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-[#0F766E] hover:underline"
                      >
                        Open original <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
            <Film className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">No player videos submitted yet.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
