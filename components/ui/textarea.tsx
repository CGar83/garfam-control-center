import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-24 min-w-0 w-full rounded-xl border border-input bg-muted/60 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground transition-[color,background-color,box-shadow,transform,opacity] focus:border-primary/40 focus:bg-card focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.16)] focus-ring disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
