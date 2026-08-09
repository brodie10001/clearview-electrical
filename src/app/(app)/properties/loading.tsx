import { Skeleton } from "@/components/ui/skeleton";

export default function PropertiesLoading() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>

      <div className="flex gap-1.5">
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>

      <ul className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 bg-white px-4 py-3.5 dark:bg-neutral-900">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
