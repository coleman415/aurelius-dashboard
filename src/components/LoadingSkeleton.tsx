"use client";

export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Treasury skeleton */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-32 mb-4"></div>
        <div className="grid grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-20 mb-2"></div>
              <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-28"></div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
          ))}
        </div>
      </div>

      {/* Price and Staking skeletons */}
      <div className="grid md:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24 mb-4"></div>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, j) => (
                <div key={j}>
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-16 mb-2"></div>
                  <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-20"></div>
                </div>
              ))}
            </div>
            <div className="h-48 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
          </div>
        ))}
      </div>

      {/* Burn rate skeleton */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-32 mb-4"></div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-20 mb-2"></div>
              <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
      <p className="text-red-700 dark:text-red-300 font-medium">Error loading dashboard</p>
      <p className="text-red-600 dark:text-red-400 text-sm mt-1">{message}</p>
    </div>
  );
}
