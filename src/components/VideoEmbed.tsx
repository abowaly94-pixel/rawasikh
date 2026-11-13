import { useEffect, useMemo, useRef, useState } from "react";
import { getVideoEmbed } from "@/lib/videoEmbed";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Captions,
  PlayCircle,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface CaptionTrack {
  url: string;
  lang: string;
  label: string;
}

interface VideoEmbedProps {
  url: string | null | undefined;
  title?: string;
  className?: string;
  forceVertical?: boolean;
  autoplay?: boolean;
  controls?: boolean;
  captionsUrl?: string | null;
  captionsLang?: string;
  captionsLabel?: string;
  captions?: CaptionTrack[] | null;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const fmt = (t: number) => {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const CustomVideoPlayer = ({
  src,
  title,
  aspect,
  className,
  autoplay,
  captions,
}: {
  src: string;
  title?: string;
  aspect: string;
  className: string;
  autoplay: boolean;
  captions: CaptionTrack[];
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(autoplay);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isFs, setIsFs] = useState(false);
  const [activeCaption, setActiveCaption] = useState<string | null>(null); // lang code or null
  const hasCaptions = captions.length > 0;
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrent(v.currentTime);
    const onMeta = () => setDuration(v.duration);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = speed;
  }, [speed]);

  // Sync selected caption to <track> modes
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tracks = v.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i];
      t.mode = activeCaption && t.language === activeCaption ? "showing" : "hidden";
    }
  }, [activeCaption, captions]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = Number(e.target.value);
    v.currentTime = val;
    setCurrent(val);
  };

  const scheduleHide = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setShowControls(true);
    hideTimer.current = window.setTimeout(() => {
      if (playing) setShowControls(false);
    }, 2500);
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black overflow-hidden rounded-lg group ${aspect} ${className}`}
      onMouseMove={scheduleHide}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "VIDEO") {
          togglePlay();
          scheduleHide();
        }
      }}
    >
      <video
        ref={videoRef}
        src={src}
        title={title}
        className="w-full h-full object-contain"
        autoPlay={autoplay}
        muted={autoplay}
        playsInline
        controlsList="nodownload noplaybackrate noremoteplayback"
        onContextMenu={(e) => e.preventDefault()}
        crossOrigin={hasCaptions ? "anonymous" : undefined}
      >
        {captions.map((c) => (
          <track
            key={c.lang + c.url}
            kind="subtitles"
            src={c.url}
            srcLang={c.lang}
            label={c.label}
          />
        ))}
      </video>

      {/* Center play overlay when paused */}
      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
          aria-label="تشغيل"
        >
          <span className="rounded-full bg-white/90 p-4 shadow-lg">
            <Play className="h-8 w-8 text-black fill-black" />
          </span>
        </button>
      )}

      {/* Bottom controls bar */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/60 to-transparent px-3 pt-6 pb-2 transition-opacity duration-200 ${
          showControls || !playing ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        dir="ltr"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={onSeek}
          className="w-full h-1 accent-primary cursor-pointer"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) ${progress}%, rgba(255,255,255,0.3) ${progress}%)`,
          }}
          aria-label="التقدم"
        />

        <div className="flex items-center justify-between gap-2 mt-1.5 text-white">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              aria-label={playing ? "إيقاف" : "تشغيل"}
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              aria-label={muted ? "تشغيل الصوت" : "كتم"}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <span className="text-xs tabular-nums opacity-90 ml-1">
              {fmt(current)} / {fmt(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Captions language menu — only when tracks exist */}
            {hasCaptions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={`p-1.5 rounded transition-colors ${
                      activeCaption ? "bg-white/20" : "hover:bg-white/10"
                    }`}
                    aria-label="الترجمة"
                    title="الترجمة"
                  >
                    <Captions className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="end" className="min-w-[180px] z-[9999]">
                  <DropdownMenuLabel>الترجمة</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setActiveCaption(null)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <span>إيقاف</span>
                    {!activeCaption && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                  {captions.map((c) => (
                    <DropdownMenuItem
                      key={c.lang}
                      onClick={() => setActiveCaption(c.lang)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <span>{c.label}</span>
                      {activeCaption === c.lang && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Settings (speed) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-1.5 hover:bg-white/10 rounded transition-colors"
                  aria-label="إعدادات"
                  title="إعدادات"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="min-w-[180px] z-[9999]">
                <DropdownMenuLabel>سرعة التشغيل</DropdownMenuLabel>
                {SPEEDS.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => setSpeed(s)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <span>{s === 1 ? "عادي" : `${s}x`}</span>
                    {speed === s && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>الجودة</DropdownMenuLabel>
                <DropdownMenuItem disabled className="flex items-center justify-between">
                  <span>تلقائي</span>
                  <Check className="h-4 w-4" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              aria-label={isFs ? "خروج من ملء الشاشة" : "ملء الشاشة"}
              title={isFs ? "خروج من ملء الشاشة" : "ملء الشاشة"}
            >
              {isFs ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Google Drive's embed serves a stripped-down mobile UI on narrow viewports.
 * To force the full desktop control bar on phones/tablets, we render the
 * iframe at a fixed desktop width and scale it down with CSS transform so it
 * fits the container. Drive sees a "desktop-sized" viewport and shows its
 * full player UI.
 */
const GDriveDesktopIframe = ({
  src,
  title,
  aspect,
  className,
}: {
  src: string;
  title?: string;
  aspect: string;
  className: string;
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const DESKTOP_WIDTH = 1280;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / DESKTOP_WIDTH);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`relative w-full bg-black overflow-hidden rounded-lg ${aspect} ${className}`}
    >
      <div
        style={{
          width: `${DESKTOP_WIDTH}px`,
          height: `${DESKTOP_WIDTH / scale ? "" : ""}`,
        }}
        className="absolute top-0 left-0 origin-top-left"
      >
        <div
          style={{
            width: `${DESKTOP_WIDTH}px`,
            height: `${(DESKTOP_WIDTH * 9) / 16}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <iframe
            src={src}
            title={title || "video"}
            width={DESKTOP_WIDTH}
            height={(DESKTOP_WIDTH * 9) / 16}
            className="border-0 block"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
};

const VideoEmbed = ({
  url,
  title,
  className = "",
  forceVertical = false,
  autoplay = false,
  controls = true,
  captionsUrl,
  captionsLang = "ar",
  captionsLabel = "العربية",
  captions,
}: VideoEmbedProps) => {
  const source = useMemo(() => getVideoEmbed(url), [url]);

  const captionTracks: CaptionTrack[] = useMemo(() => {
    if (captions && captions.length > 0) return captions;
    if (captionsUrl) return [{ url: captionsUrl, lang: captionsLang, label: captionsLabel }];
    return [];
  }, [captions, captionsUrl, captionsLang, captionsLabel]);

  if (!source) {
    return (
      <div
        className={`w-full aspect-video bg-muted flex items-center justify-center text-muted-foreground rounded-lg ${className}`}
      >
        <div className="text-center">
          <PlayCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">لا يوجد فيديو متاح</p>
        </div>
      </div>
    );
  }

  const vertical = forceVertical || source.isShort;
  const aspect = vertical ? "aspect-[9/16] max-w-[420px] mx-auto" : "aspect-video";

  const iframeSrc =
    autoplay && source.provider === "youtube" && source.type === "iframe"
      ? `${source.src}${source.src.includes("?") ? "&" : "?"}autoplay=1`
      : source.src;

  return (
    <div className="w-full">
      {source.type === "video" ? (
        <CustomVideoPlayer
          src={source.src}
          title={title}
          aspect={aspect}
          className={className}
          autoplay={autoplay}
          captions={captionTracks}
        />
      ) : source.provider === "gdrive" ? (
        <GDriveDesktopIframe src={source.src} title={title} aspect={aspect} className={className} />
      ) : (
        <div className={`relative w-full bg-black overflow-hidden rounded-lg ${aspect} ${className}`}>
          <iframe
            key={iframeSrc}
            src={iframeSrc}
            title={title || "video"}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; web-share"
            allowFullScreen
          />
        </div>
      )}
      {source.provider === "gdrive" && (
        <p className="mt-2 text-xs text-muted-foreground">
          إذا لم يعمل الفيديو، تأكد أن ملف Google Drive مشارك بخيار "Anyone with the link".
        </p>
      )}
    </div>
  );
};

export default VideoEmbed;
