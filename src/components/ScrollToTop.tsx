import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { scrollToTop } from "@/lib/smoothScroll";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    scrollToTop(true);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
};

export default ScrollToTop;
