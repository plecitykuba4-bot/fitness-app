import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Výšky vycházejí z design contractu a NESMÍ se zmenšovat:
 * lg = 56px primární akce, xl = 64px hlavní akce obrazovky, default = 48px.
 * Ikona nikdy nestojí sama — vždy ji doprovází český text.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 rounded-[var(--radius-button)] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_0_0_1px_rgb(183_255_34_/_0.12)]",
        secondary:
          "bg-surface text-foreground border border-border hover:border-primary/60 hover:bg-surface-muted",
        success:
          "bg-success text-success-foreground hover:opacity-90 shadow-sm",
        danger: "bg-danger text-danger-foreground hover:opacity-90 shadow-sm",
        ghost: "text-foreground hover:bg-surface-muted",
      },
      size: {
        default: "min-h-touch px-5 text-base [&_svg]:size-5",
        lg: "min-h-touch px-5 text-base [&_svg]:size-5",
        xl: "min-h-touch-lg w-full px-5 text-lg [&_svg]:size-6",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: { variant: "primary", size: "default", block: false },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
