import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

interface LoadingStateProps {
  rows?: number;
  className?: string;
  label?: string;
}

export function LoadingState({ rows = 3, className, label = "جارٍ التحميل…" }: LoadingStateProps) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}
