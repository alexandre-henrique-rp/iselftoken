import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  defaultChecked?: boolean;
}

export function Switch({ className, checked, defaultChecked, ...props }: SwitchProps) {
  const isOn = checked ?? defaultChecked ?? false;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      className={cn(
        "inline-flex h-6 w-11 items-center rounded-full border border-zinc-700",
        isOn ? "bg-primary" : "bg-zinc-800",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white transition",
          isOn ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  );
}
