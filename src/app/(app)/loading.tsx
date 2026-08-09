import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-8 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 p-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <div className="flex flex-col gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}
