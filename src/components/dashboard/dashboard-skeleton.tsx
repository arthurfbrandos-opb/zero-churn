'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Hero + KPIs + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Hero skeleton */}
        <div className="lg:col-span-4">
          <Skeleton className="h-[320px] rounded-2xl" />
        </div>

        {/* KPIs + Actions skeleton */}
        <div className="lg:col-span-8 space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[100px] rounded-xl" />
            ))}
          </div>
          {/* Action queue */}
          <Skeleton className="h-[180px] rounded-xl" />
        </div>
      </div>

      {/* Client list skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-7 w-56 rounded-full" />
          <Skeleton className="h-7 w-40 rounded-lg ml-auto" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-xl" />
        ))}
      </div>
    </div>
  )
}
