import type { SVGProps } from "react";

/**
 * The current X (formerly Twitter) logo. Lucide still ships the retired bird
 * icon, so the up-to-date mark lives here and is shared by the share menus
 * and the social links around the site.
 */
const XLogo = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    className={className}
    {...props}
  >
    <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.5l-5.09-6.65L5.8 22H2.66l7.24-8.28L2 2h6.66l4.6 6.08L18.9 2Zm-1.13 18h1.72L7.4 3.9H5.56L17.77 20Z" />
  </svg>
);

export default XLogo;
