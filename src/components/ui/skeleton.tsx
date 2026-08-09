import { clsx } from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={clsx("animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800", className)} />
  );
}
