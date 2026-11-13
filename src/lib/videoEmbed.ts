// Universal video URL → embeddable URL helper.
// Supports YouTube (incl. Shorts), TikTok, Instagram (Reels/Posts),
// Facebook (Reels/Videos/Watch), Vimeo, Twitter/X, and direct video files.

export type VideoSource = {
  type: "iframe" | "video";
  src: string;
  // True when the source is a vertical short-form video (reels/shorts/tiktok)
  isShort: boolean;
  provider:
    | "youtube"
    | "tiktok"
    | "instagram"
    | "facebook"
    | "vimeo"
    | "twitter"
    | "gdrive"
    | "file"
    | "unknown";
};


const trim = (u: string) => (u || "").trim();

export function getVideoEmbed(rawUrl: string | null | undefined): VideoSource | null {
  const url = trim(rawUrl || "");
  if (!url) return null;

  // Already an embed URL → keep as iframe
  if (/youtube\.com\/embed\//.test(url)) {
    return {
      type: "iframe",
      src: url,
      isShort: /\/shorts\//.test(url),
      provider: "youtube",
    };
  }

  // YouTube (watch, youtu.be, shorts)
  const yt =
    url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|v\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) {
    const id = yt[1];
    const isShort = /\/shorts\//.test(url);
    return {
      type: "iframe",
      src: `https://www.youtube.com/embed/${id}?rel=0&playsinline=1`,
      isShort,
      provider: "youtube",
    };
  }

  // TikTok (always vertical)
  const tt = url.match(/tiktok\.com\/(?:@[^/]+\/video\/|v\/)?(\d{6,})/);
  if (tt) {
    return {
      type: "iframe",
      src: `https://www.tiktok.com/embed/v2/${tt[1]}`,
      isShort: true,
      provider: "tiktok",
    };
  }

  // Instagram reels / posts
  const ig = url.match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
  if (ig) {
    return {
      type: "iframe",
      src: `https://www.instagram.com/p/${ig[1]}/embed`,
      isShort: /\/reel/.test(url),
      provider: "instagram",
    };
  }

  // Facebook reels / videos / watch
  if (/facebook\.com|fb\.watch/.test(url)) {
    const isShort = /\/reel\//.test(url);
    return {
      type: "iframe",
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        url
      )}&show_text=false&autoplay=false`,
      isShort,
      provider: "facebook",
    };
  }

  // Vimeo
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) {
    return {
      type: "iframe",
      src: `https://player.vimeo.com/video/${vm[1]}`,
      isShort: false,
      provider: "vimeo",
    };
  }

  // Twitter / X
  if (/(?:twitter\.com|x\.com)\/[^/]+\/status\/\d+/.test(url)) {
    return {
      type: "iframe",
      src: `https://twitframe.com/show?url=${encodeURIComponent(url)}`,
      isShort: true,
      provider: "twitter",
    };
  }

  // Google Drive file links → use the Drive preview iframe (direct media requires auth).
  const gdriveFile = url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
  const gdriveOpen = url.match(/drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)/);
  const gdriveUc = url.match(/drive\.google\.com\/uc\?[^"]*id=([A-Za-z0-9_-]+)/);
  const gdriveId = gdriveFile?.[1] || gdriveOpen?.[1] || gdriveUc?.[1];
  if (gdriveId) {
    // Google Drive requires their own preview iframe — the download endpoint
    // redirects and blocks CORS so <video> playback fails.
    // File must be shared with "Anyone with the link".
    return {
      type: "iframe",
      src: `https://drive.google.com/file/d/${gdriveId}/preview`,
      isShort: false,
      provider: "gdrive",
    };
  }

  // Google Docs / Sheets / Slides still require Google's preview embeds.
  const gdocs = url.match(/docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([A-Za-z0-9_-]+)/);
  if (gdocs) {
    const kind = gdocs[1];
    const id = gdocs[2];
    const src =
      kind === "spreadsheets"
        ? `https://docs.google.com/spreadsheets/d/${id}/preview`
        : kind === "presentation"
        ? `https://docs.google.com/presentation/d/${id}/embed`
        : `https://docs.google.com/document/d/${id}/preview`;
    return { type: "iframe", src, isShort: false, provider: "gdrive" };
  }

  // Direct video file
  if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url)) {
    return { type: "video", src: url, isShort: false, provider: "file" };
  }


  // Unknown — best effort iframe
  return { type: "iframe", src: url, isShort: false, provider: "unknown" };
}
