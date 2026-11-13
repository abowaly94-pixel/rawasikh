import type Lenis from "lenis";

let instance: Lenis | null = null;

export const setSmoothScroll = (lenis: Lenis | null) => {
  instance = lenis;
};

export const getSmoothScroll = () => instance;

/**
 * Route changes and "back to top" actions must reset both the native scroll
 * position and Lenis' internal target, otherwise inertia can pull the page
 * back to the previous offset.
 */
export const scrollToTop = (immediate = true) => {
  if (instance) {
    instance.scrollTo(0, { immediate, force: true });
    return;
  }

  window.scrollTo({
    top: 0,
    left: 0,
    behavior: immediate ? "auto" : "smooth",
  });
};
