import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium transition-colors", {
  variants: {
    variant: {
      default: "border-transparent bg-primary text-primary-foreground",
      secondary: "border-transparent bg-secondary/85 text-secondary-foreground",
      destructive: "border-transparent bg-destructive text-destructive-foreground",
      outline: "border-border bg-white/55 text-foreground dark:bg-white/5",
      success: "border-emerald-200/70 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300",
      warning: "border-amber-200/70 bg-amber-50/80 text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300",
      info: "border-[#ACE1AF] bg-[#ACE1AF]/35 text-[#235226] dark:border-[#ACE1AF]/45 dark:bg-[#ACE1AF]/15 dark:text-[#D7F2D9]"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
