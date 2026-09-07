import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "min-w-0 rounded-[var(--app-card-radius)] bg-card text-card-foreground shadow-[var(--shadow-subtle)]",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex min-w-0 flex-col gap-2 p-[var(--app-card-padding)] pb-3", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-wrap-safe text-[19px] font-semibold leading-6 tracking-[-0.7px] text-foreground", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-wrap-safe text-sm leading-6 text-muted-foreground", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("min-w-0 p-[var(--app-card-padding)] pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex min-w-0 flex-wrap items-center gap-2 p-[var(--app-card-padding)] pt-0", className)} {...props} />
));
CardFooter.displayName = "CardFooter";

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
