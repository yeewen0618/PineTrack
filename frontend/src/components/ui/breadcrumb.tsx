import * as React from "react";
// Slot allows the link component to become any element (a, button, etc.)
import { Slot } from "@radix-ui/react-slot";
// ChevronRight = ">" icon for separators
// MoreHorizontal = "..." icon for collapsed breadcrumbs
import { ChevronRight, MoreHorizontal } from "lucide-react";
// Utility to merge class names
import { cn } from "./utils";

// Breadcrumb Container
function Breadcrumb({ ...props }: React.ComponentProps<"nav">) {
  // Wrapper nav element with accessibility label
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />;
}

// Breadcrumb List (holds all breadcrumb items)
function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5",
        className,
      )}
      {...props}
    />
  );
}

// Individual Breadcrumb Item
function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

// Breadcrumb Link (clickable breadcrumb)
function BreadcrumbLink({
  asChild,
  className,
  ...props
}: React.ComponentProps<"a"> & {
  asChild?: boolean;
}) {
  // If asChild = true, render Slot (inherit parent element type)
  // Else render a standard <a>
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn("hover:text-foreground transition-colors", className)}
      {...props}
    />
  );
}

// Current Page Breadcrumb (non-clickable)
function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("text-foreground font-normal", className)}
      {...props}
    />
  );
}

// Breadcrumb Separator (e.g., ">")
function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  );
}

// Breadcrumb Ellipsis (for collapsed items)
function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
