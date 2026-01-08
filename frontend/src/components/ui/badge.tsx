import * as React from "react";
// Slot allows Badge to pass styles to a child element (e.g., <a> or <button>)
import { Slot } from "@radix-ui/react-slot";
// cva = utility for building class variants (default, secondary, destructive, etc.)
import { cva, type VariantProps } from "class-variance-authority";
// cn merges multiple Tailwind class names safely
import { cn } from "./utils";

// Define the different style variants for the Badge component
const badgeVariants = cva(
  // Base styles applied to all badges
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        // Default badge styling
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        // Secondary badge styling
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        // Destructive (error) badge styling
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        // Outline style badge
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    // Default variant when none is specified
    defaultVariants: {
      variant: "default",
    },
  },
);

// Badge component definition
function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  // If asChild is true → render Slot (inherits parent component type)
  // Else → render a regular <span>
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

// Export Badge + its variant definitions
export { Badge, badgeVariants };
