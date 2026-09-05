import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-24 min-w-0 w-full rounded-md border border-input bg-white/70 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground transition-all focus:border-primary/40 focus:bg-white focus:shadow-[0_0_0_4px_rgba(204,85,0,0.1)] focus-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:focus:bg-white/10",
      className
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
