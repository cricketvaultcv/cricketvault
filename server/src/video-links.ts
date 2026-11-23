export type ExternalVideoSource = "YOUTUBE" | "GOOGLE_DRIVE";

export function validateExternalVideoUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw Object.assign(new Error("Enter a valid YouTube or Google Drive link"), {
      status: 400,
    });
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw Object.assign(
      new Error("Video links must use a secure HTTPS address"),
      { status: 400 },
    );
  }

  const hostname = url.hostname.toLowerCase();
  const youtubeHosts = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
  ]);
  if (youtubeHosts.has(hostname)) {
    const videoId =
      hostname === "youtu.be"
        ? url.pathname.split("/").filter(Boolean)[0]
        : url.searchParams.get("v") ||
          url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
    if (!videoId || !/^[\w-]{11}$/.test(videoId)) {
      throw Object.assign(new Error("This YouTube link does not contain a valid video"), {
        status: 400,
      });
    }
    return {
      sourceType: "YOUTUBE" as const,
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  }

  if (hostname === "drive.google.com") {
    const fileId =
      url.pathname.match(/^\/file\/d\/([\w-]+)(?:\/|$)/)?.[1] ||
      url.searchParams.get("id");
    if (!fileId || !/^[\w-]{10,}$/.test(fileId)) {
      throw Object.assign(new Error("This Google Drive link does not contain a valid file"), {
        status: 400,
      });
    }
    return {
      sourceType: "GOOGLE_DRIVE" as const,
      sourceUrl: `https://drive.google.com/file/d/${fileId}/view`,
    };
  }

  throw Object.assign(
    new Error("Only YouTube and Google Drive video links are supported"),
    { status: 400 },
  );
}
