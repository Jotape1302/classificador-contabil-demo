import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[4px] text-xs font-semibold uppercase tracking-wide transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 select-none group overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-copper text-white border border-copper/50 shadow-sm hover:bg-action hover:border-action/80 active:translate-y-[0.5px]",
        secondary:
          "border border-border bg-elevated text-title hover:border-copper/70 hover:bg-sidebar hover:text-action active:translate-y-[0.5px]",
        ghost:
          "text-muted hover:bg-elevated/80 hover:text-title border border-transparent active:bg-elevated",
        danger:
          "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 hover:border-danger/50 active:bg-danger/25",
        outline:
          "border border-border bg-transparent text-title hover:border-copper hover:text-action",
      },
      size: {
        default: "h-9 px-4 py-2 text-xs",
        sm: "h-7 px-3 text-[11px]",
        lg: "h-10 px-5 text-sm",
        icon: "size-8 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {/* Subtle metallic reflection beam on hover */}
      {variant === "default" && (
        <span
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
          aria-hidden="true"
        />
      )}
      {/* Structural bottom trace accent */}
      {variant === "secondary" && (
        <span
          className="pointer-events-none absolute bottom-0 left-0 h-[1.5px] w-0 bg-copper transition-all duration-250 ease-out group-hover:w-full"
          aria-hidden="true"
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1.5 transition-transform duration-150 group-hover:translate-x-0.5">
        {children}
      </span>
    </button>
  ),
);
Button.displayName = "Button";
