import { Skeleton } from "~/components/ui/skeleton";

/**
 * @name LoadingList
 * @description Renderiza skeletons durante carregamento da listagem.
 */
export function LoadingList() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`startup-loading-${index}`}
          className="rounded-xl border border-stone-800 bg-stone-900 p-5"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <Skeleton className="h-14 w-64 bg-stone-800" />
            <Skeleton className="h-8 w-28 bg-stone-800" />
            <Skeleton className="h-24 flex-1 bg-stone-800" />
            <Skeleton className="h-10 w-44 bg-stone-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
