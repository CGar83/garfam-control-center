import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex min-h-10 max-w-full flex-wrap items-center justify-start gap-1 rounded-[14px] bg-muted p-1 text-muted-foreground shadow-[0_1px_1px_rgba(0,0,0,0.03)_inset]",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium ring-offset-background transition-[color,background-color,box-shadow,transform,opacity] focus-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-[var(--shadow-subtle)]",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-4 ring-offset-background focus-ring", className)} {...props} />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
