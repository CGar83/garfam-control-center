import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-[var(--app-control-height)] min-w-0 w-full rounded-xl border border-input bg-muted/60 px-3 py-2 text-sm ring-offset-background transition-[color,background-color,box-shadow,transform,opacity] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:border-primary/40 focus:bg-card focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.16)] focus-ring disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
