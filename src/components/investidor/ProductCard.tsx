"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconShoppingCart, IconStarFilled, IconTag } from "@tabler/icons-react";
import { ProductItem } from "./types";

/**
 * ProductCard
 * Card de vitrine com thumb em gradiente, tag, nome, categorias, preço, rating e CTA.
 */
export function ProductCard({ item }: { item: ProductItem }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Thumb simulada com gradiente mantendo a paleta */}
        <div className="from-primary/15 via-primary/5 bg-gradient-to-br to-transparent">
          <div className="relative h-36 w-full md:h-40">
            <div className="absolute top-3 left-3 flex gap-2">
              {item.tag ? <Badge className="text-xs">{item.tag}</Badge> : null}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3">
          <div className="bg-muted flex size-12 items-center justify-center rounded-md">
            <IconTag className="text-muted-foreground size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{item.name}</div>
            <div className="text-muted-foreground truncate text-xs">
              {item.categories.join(" · ")}
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs">
              {item.price ? <span className="font-semibold">{item.price}</span> : null}
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground inline-flex items-center gap-1">
                <IconStarFilled className="size-4 text-yellow-500" />
                {item.rating.toFixed(1)}
              </span>
            </div>
          </div>
          <Button size="sm" className="gap-1">
            <IconShoppingCart className="size-4" />
            Investir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
