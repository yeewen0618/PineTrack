// Required by Next.js — ensures this component runs on the client side
"use client";

// Import Radix UI's AspectRatio primitive (for maintaining fixed width/height ratios)
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

function AspectRatio({
  ...props
}: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  // Wrap the Radix AspectRatio.Root component
  // Forward all props (e.g., ratio) to the underlying primitive
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

// Export the component for use across the app
export { AspectRatio };
