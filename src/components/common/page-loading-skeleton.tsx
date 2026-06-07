import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface PageLoadingSkeletonProps {
  /** Number of stat cards to show (default: 4) */
  statCards?: number;
  /** Show a chart area (default: true) */
  showChart?: boolean;
  /** Show a table area (default: true) */
  showTable?: boolean;
  /** Show a sidebar/detail panel (default: false) */
  showSidebar?: boolean;
  /** Number of table rows to show (default: 5) */
  tableRows?: number;
}

/**
 * Reusable page-level loading skeleton for Suspense fallbacks.
 * Matches the common layout pattern: header + stat cards + chart + table.
 */
export function PageLoadingSkeleton({
  statCards = 4,
  showChart = true,
  showTable = true,
  showSidebar = false,
  tableRows = 5,
}: PageLoadingSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: statCards }).map((_, i) => (
          <Card key={i} className="rounded-xl border-slate-200 dark:border-slate-700/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      <div className={`grid grid-cols-1 gap-4 ${showSidebar ? "lg:grid-cols-3" : ""}`}>
        <div className={showSidebar ? "lg:col-span-2 space-y-4" : "space-y-4"}>
          {/* Chart */}
          {showChart && (
            <Card className="rounded-xl border-slate-200 dark:border-slate-700/50">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          )}

          {/* Table */}
          {showTable && (
            <Card className="rounded-xl border-slate-200 dark:border-slate-700/50">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: tableRows }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-6 w-14 rounded-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <Card className="rounded-xl border-slate-200 dark:border-slate-700/50 h-fit">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/**
 * Compact inline skeleton for widget-sized Suspense fallbacks.
 */
export function WidgetSkeleton() {
  return (
    <Card className="rounded-xl border-slate-200 dark:border-slate-700/50">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-[200px] w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}
