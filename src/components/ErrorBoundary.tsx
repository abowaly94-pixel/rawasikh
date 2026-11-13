import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// A stale deploy is the #1 cause of "blank white page on first load, works
// after refresh": a lazy-loaded route chunk's filename changes on every
// build, and a browser holding an old cached index.html (or one loaded just
// before a new deploy went out) will try to fetch a JS chunk that no longer
// exists on the server. Without a boundary, React silently unmounts the
// whole tree — leaving nothing on screen and no way for the user to know
// what happened. We catch that specific case and force a single, automatic
// reload (which re-fetches the current index.html + current chunk hashes),
// so the visitor never sees a truly blank page or has to manually refresh.
const RELOAD_FLAG_KEY = "rw_chunk_reload_attempted";

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk .* failed/i.test(message) ||
    /dynamically imported module/i.test(message)
  );
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info);

    if (isChunkLoadError(error)) {
      // Only ever auto-reload once per browser tab session, so a genuinely
      // broken chunk doesn't trap the visitor in an infinite reload loop.
      const alreadyTried = sessionStorage.getItem(RELOAD_FLAG_KEY);
      if (!alreadyTried) {
        sessionStorage.setItem(RELOAD_FLAG_KEY, "1");
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "2rem",
            textAlign: "center",
            fontFamily: "inherit",
          }}
        >
          <p style={{ fontSize: "1.1rem", fontWeight: 600 }}>
            حصلت مشكلة أثناء تحميل الصفحة
          </p>
          <p style={{ color: "#666" }}>
            جاري إعادة التحميل تلقائيًا... لو الصفحة لسه فاضية، اضغط الزرار.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.6rem 1.5rem",
              borderRadius: "8px",
              border: "none",
              background: "#1d4ed8",
              color: "#fff",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
