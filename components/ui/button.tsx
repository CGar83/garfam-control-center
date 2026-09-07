import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium tracking-normal transition-[color,background-color,box-shadow,transform,opacity] duration-200 focus-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "primary-surface text-primary-foreground hover:brightness-95",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "control-surface text-foreground hover:brightness-95",
        secondary: "control-surface text-secondary-foreground hover:brightness-95",
        ghost: "text-foreground/85 hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-[38px] rounded-lg px-3 text-xs",
        lg: "h-11 rounded-2xl px-6 text-base",
        icon: "h-11 w-11 rounded-full"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp data-ui-button="" className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
