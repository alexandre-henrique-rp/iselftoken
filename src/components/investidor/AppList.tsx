"use client";

import { Card, CardContent } from "@/components/ui/card";
import { IconStarFilled, IconTag } from "@tabler/icons-react";
import { AppItem } from "./types";

/**
 * AppList
 * Lista ranqueada de apps/startups em grade 1x2.
 */
export function AppList({ items }: { items: AppItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {items.map((item) => (
        <AppListItem key={item.id} item={item} />
      ))}
    </div>
  );
}

/**
 * AppListItem
 * Item com ranking, ícone, nome, categorias e avaliação.
 */
function AppListItem({ item }: { item: AppItem }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <div className="text-muted-foreground w-6 shrink-0 text-sm font-semibold">
          {item.rank}
        </div>
        <div className="bg-muted flex size-12 items-center justify-center rounded-md">
          <IconTag className="text-muted-foreground size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{item.name}</div>
          <div className="text-muted-foreground truncate text-xs">
            {item.categories.join(" · ")}
          </div>
        </div>
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <IconStarFilled className="size-4 text-yellow-500" />
          <span>{item.rating.toFixed(1)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
