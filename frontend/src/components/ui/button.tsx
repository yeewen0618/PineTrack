import * as React from "react";
// Slot allows the Button to pass styles to another element when `asChild` is true
import { Slot } from "@radix-ui/react-slot";
// cva = utility for styling variants (default, destructive, outline, etc.)
import { cva, type VariantProps } from "class-variance-authority";

// cn = merges multiple class names safely
import { cn } from "./utils";

// Define the different style variants for the Button component
const buttonVariants = cva(
  // Base styles applied to ALL buttons
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Solid primary button
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        // Red destructive style button
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        // Border button with background
        outline:
          "border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        // Secondary button style
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        // Button with no background (only hover effect)
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        // Text-style button (like a link)
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // Default size
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        // Small button
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        // Large button
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        // Icon-only button (square)
        icon: "size-9 rounded-md",
      },
    },
    // Default styles if no variant/size is provided
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// Button component definition
const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };