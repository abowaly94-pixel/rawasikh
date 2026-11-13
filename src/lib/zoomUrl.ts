// Zoom URL parsing + validation utilities.
// Returns a normalized web-client embed URL when the input is a valid Zoom meeting link.

export interface ParsedZoom {
  meetingId: string;
  pwd?: string;
  embedUrl: string;   // https://zoom.us/wc/join/{id}?pwd=...&un=... — best-effort embeddable URL
  joinUrl: string;    // original / normalized deep link (opens Zoom app or browser)
}

// Accepts:
//   https://zoom.us/j/1234567890?pwd=xxxx
//   https://us02web.zoom.us/j/1234567890?pwd=xxxx
//   https://zoom.us/wc/join/1234567890?pwd=xxxx
//   https://zoom.us/s/1234567890
export const parseZoomUrl = (raw: string | null | undefined): ParsedZoom | null => {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!/\.?zoom\.us$/i.test(url.hostname) && url.hostname !== "zoom.us") {
    return null;
  }
  // Extract meeting id from path segments: /j/<id>, /s/<id>, /wc/join/<id>, /wc/<id>/join
  const parts = url.pathname.split("/").filter(Boolean);
  let meetingId: string | undefined;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if ((p === "j" || p === "s") && parts[i + 1]) {
      meetingId = parts[i + 1];
      break;
    }
    if (p === "wc") {
      // /wc/join/<id> or /wc/<id>/join
      if (parts[i + 1] === "join" && parts[i + 2]) {
        meetingId = parts[i + 2];
      } else if (parts[i + 1] && parts[i + 2] === "join") {
        meetingId = parts[i + 1];
      }
      break;
    }
  }
  if (!meetingId || !/^\d{6,}$/.test(meetingId)) return null;

  const pwd = url.searchParams.get("pwd") || undefined;
  const embed = new URL(`https://zoom.us/wc/join/${meetingId}`);
  if (pwd) embed.searchParams.set("pwd", pwd);
  return {
    meetingId,
    pwd,
    embedUrl: embed.toString(),
    joinUrl: raw.trim(),
  };
};

export const isValidZoomUrl = (raw: string | null | undefined): boolean =>
  parseZoomUrl(raw) !== null;
