import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function CampanhaStatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, index) => (
        <Card key={index} className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="bg-muted h-4 w-24 animate-pulse rounded" />
            <div className="bg-muted h-9 w-9 animate-pulse rounded-lg" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="bg-muted h-8 w-16 animate-pulse rounded" />
              <div className="bg-muted h-3 w-full animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
