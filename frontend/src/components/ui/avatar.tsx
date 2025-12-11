// Required by Next.js so that this interactive component runs on the client
"use client";

// Import Radix Avatar components: Root, Image, Fallback
import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

// Helper to merge Tailwind class names
import { cn } from "./utils";

//Avatar Container
function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-10 shrink-0 overflow-hidden rounded-full",
        className,
      )}
      {...props}
    />
  );
}

//Avatar Image
function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  );
}

//Avatar Fallback (shown if no image)
function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className,
      )}
      {...props}
    />
  );
}

// Export components for use in your app
export { Avatar, AvatarImage, AvatarFallback };
