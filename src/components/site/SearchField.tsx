import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  /** Rendered inside the field on the trailing edge. */
  action?: React.ReactNode;
  size?: "md" | "lg";
  id?: string;
}

const SearchField = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  ariaLabel,
  className,
  action,
  size = "md",
  id,
}: SearchFieldProps) => {
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(value);
      }}
      className={cn(
        "group relative flex w-full items-center gap-2 rounded-full border border-border bg-card",
        "shadow-xs transition-all duration-300",
        "focus-within:border-primary/50 focus-within:shadow-md focus-within:ring-4 focus-within:ring-primary/10",
        size === "lg" ? "h-14 ps-5 pe-2" : "h-11 ps-4 pe-1.5",
        className,
      )}
    >
      <Search
        className={cn(
          "shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary",
          size === "lg" ? "h-5 w-5" : "h-4 w-4",
        )}
        aria-hidden
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        className={cn(
          "min-w-0 flex-1 border-none bg-transparent text-foreground outline-none placeholder:text-muted-foreground/80",
          "focus:border-transparent focus:outline-none focus-visible:border-transparent focus-visible:outline-none",
          "focus-visible:!border-transparent focus-visible:!outline-none",
          "[&::-webkit-search-cancel-button]:hidden",
          size === "lg" ? "text-[15px]" : "text-sm",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="مسح البحث"
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
      {action}
    </form>
  );
};

export default SearchField;
