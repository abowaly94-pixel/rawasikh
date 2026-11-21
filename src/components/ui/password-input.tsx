import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  /** Extra classes for the wrapper around the input + toggle. */
  containerClassName?: string;
  /** Accessible label when the password is hidden. */
  showLabel?: string;
  /** Accessible label when the password is visible. */
  hideLabel?: string;
};

/**
 * Password field with a built-in show/hide toggle.
 *
 * The toggle sits on the physical left (matching the auth screens) and the
 * input gets matching start padding, so it works the same in RTL and LTR
 * layouts regardless of the input's own `dir`.
 */
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      containerClassName,
      disabled,
      showLabel = "إظهار كلمة المرور",
      hideLabel = "إخفاء كلمة المرور",
      ...props
    },
    ref,
  ) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className={cn("relative", containerClassName)}>
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          disabled={disabled}
          className={cn("pl-12", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          onMouseDown={(event) => event.preventDefault()}
          disabled={disabled}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          title={visible ? hideLabel : showLabel}
          className="absolute left-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50"
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
