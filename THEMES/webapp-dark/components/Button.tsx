import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../utils"

const buttonVariants = cva(
  "webapp-button",
  {
    variants: {
      variant: {
        default: "border-primary text-primary hover:bg-primary hover:text-primary-foreground",
        outline: "border-input text-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "border-transparent hover:bg-accent hover:text-accent-foreground",
        destructive: "border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
      },
      size: {
        default: "px-4 py-3 text-sm",
        sm: "px-3 py-2 text-xs",
        lg: "px-6 py-4 text-base",
        icon: "p-3 w-auto"
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <div className="webapp-spinner" />
            {typeof children === 'string' ? 'Processing...' : children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }