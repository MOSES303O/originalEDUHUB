export function CoursesSkeleton() {
    return (
      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="space-y-2">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-6 w-6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-6 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse ml-auto" />
                </div>
              ))}
          </div>
        </div>
      </div>
    )
  }
  