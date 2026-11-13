import { useEffect, type RefObject } from "react";

/**
 * Forward mouse-wheel events that land on a container's non-scrollable
 * chrome (e.g. the sidebar header/footer) to its scrollable region (the
 * nav), so the wheel scrolls the sidebar from anywhere on it — not just
 * over the list itself.
 *
 * Contract (why this exists):
 * - Lenis hijacks the wheel globally. Elements marked `data-lenis-prevent`
 *   are left alone by Lenis and scroll natively — but only the *scrollable*
 *   element itself qualifies. Wheel events over the fixed header/footer
 *   have no scrollable ancestor, so the browser would scroll the page
 *   behind the fixed sidebar instead of the nav.
 * - This hook bridges that gap without fighting the browser:
 *   1. Events already inside the scroller are ignored (native scroll).
 *   2. Ctrl/Cmd+wheel is browser zoom — never intercepted.
 *   3. `deltaMode` is normalized (lines/pages → px) so Firefox and
 *      trackpads behave like Chrome.
 *   4. When the scroller is already at the end in the wheel direction,
 *      the event is NOT prevented, so scrolling chains back to the page.
 *   5. A non-passive native listener is used so `preventDefault()` can
 *      actually stop the page scroll while the nav is being scrolled.
 */
export function useForwardWheelToScrollable(
  containerRef: RefObject<HTMLElement | null>,
  scrollerRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const container = containerRef.current;
    const scroller = scrollerRef.current;
    if (!container || !scroller) return;

    const onWheel = (event: WheelEvent) => {
      // Pinch-zoom (ctrl/cmd + wheel) must reach the browser untouched.
      if (event.ctrlKey || event.metaKey) return;

      // Already over the scrollable region: native scrolling handles it.
      if (scroller.contains(event.target as Node)) return;

      // Horizontal trackpad gestures have nothing to scroll here.
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

      // Normalize to pixels: 0 = px, 1 = lines (Firefox), 2 = pages.
      let deltaY = event.deltaY;
      if (event.deltaMode === 1) deltaY *= 16;
      else if (event.deltaMode === 2) deltaY *= scroller.clientHeight;

      const maxScroll = scroller.scrollHeight - scroller.clientHeight;
      if (maxScroll <= 0) return;

      const canScroll = deltaY > 0
        ? scroller.scrollTop < maxScroll
        : scroller.scrollTop > 0;
      // At the boundary, let the wheel chain to the page behind.
      if (!canScroll) return;

      event.preventDefault();
      scroller.scrollTop += deltaY;
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [containerRef, scrollerRef]);
}
