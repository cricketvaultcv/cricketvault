import React from 'react';
import { VideoSubmission } from '../../types';

const externalEmbedUrl = (video: VideoSubmission) => {
  let url: URL;
  try {
    url = new URL(video.videoUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;

  if (video.videoSource === 'youtube') {
    const host = url.hostname.toLowerCase();
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id)
        ? `https://www.youtube-nocookie.com/embed/${id}`
        : null;
    }
    if (host !== 'youtube.com' && host !== 'www.youtube.com') return null;
    const id =
      url.searchParams.get('v') ||
      url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
    return id && /^[\w-]{11}$/.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}`
      : null;
  }

  if (video.videoSource === 'drive' && url.hostname.toLowerCase() === 'drive.google.com') {
    const id =
      url.pathname.match(/^\/file\/d\/([\w-]+)(?:\/|$)/)?.[1] ||
      url.searchParams.get('id');
    return id && /^[\w-]{10,}$/.test(id)
      ? `https://drive.google.com/file/d/${id}/preview`
      : null;
  }

  return null;
};

export const VideoPlayer: React.FC<{
  video: VideoSubmission;
  className?: string;
}> = ({ video, className = '' }) => {
  if (video.videoSource === 'file') {
    if (!video.videoUrl) {
      return (
        <div className={`flex aspect-video items-center justify-center bg-slate-950 p-4 text-center text-sm text-white ${className}`}>
          This older file submission is no longer available. Ask the player to share a YouTube or Google Drive link.
        </div>
      );
    }
    return (
      <video
        src={video.videoUrl}
        poster={video.thumbnailUrl}
        controls
        className={className}
      />
    );
  }

  const embedUrl = externalEmbedUrl(video);
  if (!embedUrl) {
    return (
      <div className={`flex aspect-video items-center justify-center bg-slate-950 p-4 text-center text-sm text-white ${className}`}>
        This video link is invalid or unsupported.
      </div>
    );
  }

  return (
    <iframe
      src={embedUrl}
      title={`Video: ${video.title}`}
      className={className}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  );
};
