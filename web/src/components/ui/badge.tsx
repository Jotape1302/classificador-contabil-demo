import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "warning" | "danger" | "copper";
};

const tones = {
  neutral: "border-border bg-sidebar text-muted",
  success: "border-success/30 bg-success/10 text-[#15803D] dark:text-success",
  warning: "border-warning/30 bg-warning/10 text-[#B45309] dark:text-warning",
  danger: "border-danger/30 bg-danger/10 text-[#B91C1C] dark:text-danger",
  copper: "border-copper/40 bg-copper/10 text-action",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
