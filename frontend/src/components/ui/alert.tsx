import * as React from "react";
// cva = utility for defining styled variants (default, destructive, etc.)
// VariantProps = TypeScript helper to allow using variant props
import { cva, type VariantProps } from "class-variance-authority";

// cn = merges multiple class names (e.g. from default + user overrides)
import { cn } from "./utils";

const alertVariants = cva(
  // Base styles for all alerts (grid layout, padding, rounded, typography)
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    // Define each variant (default styles, destructive styles, etc.)
    variants: {
      variant: {
        // Normal alert
        default: "bg-card text-card-foreground",
        // Error-style alert
        destructive:
          "text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90",
      },
    },

    // Default variant if none provided
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  // Combines variant styles + any passed className overrides
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

//ALERT TITLE (bold headline inside alert)
function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

//ALERT DESCRIPTION (detailed text inside alert)
function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

//EXPORT COMPONENTS
export { Alert, AlertTitle, AlertDescription };
