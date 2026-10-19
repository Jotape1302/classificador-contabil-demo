import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-[4px] border border-border bg-canvas px-3 text-xs text-title placeholder:text-muted/60 transition-all duration-150 hover:border-border/90 focus:border-copper focus:ring-1 focus:ring-copper/40 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
