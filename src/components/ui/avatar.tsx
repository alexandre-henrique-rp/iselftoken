import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type AvatarProps = React.HTMLAttributes<HTMLSpanElement>;

export function Avatar({ className, ...props }: AvatarProps) {
  return (
    <span
      data-slot="avatar"
      className={cn(
        "relative inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-zinc-800",
        className
      )}
      {...props}
    />
  );
}

export type AvatarImageProps = React.ComponentProps<typeof Image> & {
  className?: string;
};

export function AvatarImage({ className, alt = "Avatar", ...props }: AvatarImageProps) {
  return (
    <Image
      data-slot="avatar-image"
      className={cn("aspect-square h-full w-full object-cover", className)}
      alt={alt}
      {...props}
    />
  );
}

export type AvatarFallbackProps = React.HTMLAttributes<HTMLSpanElement>;

export function AvatarFallback({ className, ...props }: AvatarFallbackProps) {
  return (
    <span
      data-slot="avatar-fallback"
      className={cn(
        "flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-200",
        className
      )}
      {...props}
    />
  );
}
