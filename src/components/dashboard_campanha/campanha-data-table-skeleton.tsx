import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function CampanhaDataTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="bg-muted h-6 w-48 animate-pulse rounded" />
          <div className="bg-muted h-9 w-32 animate-pulse rounded" />
        </div>
        <div className="flex gap-2">
          <div className="bg-muted h-10 flex-1 animate-pulse rounded" />
          <div className="bg-muted h-10 w-[180px] animate-pulse rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex gap-4 border-b pb-3">
            {[...Array(7)].map((_, index) => (
              <div
                key={index}
                className="bg-muted h-4 w-24 animate-pulse rounded"
              />
            ))}
          </div>

          {/* Rows */}
          {[...Array(5)].map((_, rowIndex) => (
            <div key={rowIndex} className="flex gap-4 border-b py-3">
              {[...Array(7)].map((_, colIndex) => (
                <div
                  key={colIndex}
                  className="bg-muted h-4 w-24 animate-pulse rounded"
                />
              ))}
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4">
          <div className="bg-muted h-4 w-48 animate-pulse rounded" />
          <div className="flex gap-2">
            <div className="bg-muted h-8 w-20 animate-pulse rounded" />
            <div className="bg-muted h-8 w-16 animate-pulse rounded" />
            <div className="bg-muted h-8 w-20 animate-pulse rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
