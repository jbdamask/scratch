import * as React from "react"
import { cn } from "../utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "search"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "default", ...props }, ref) => {
    const baseClass = variant === "search" ? "volino-search" : "volino-input"

    return (
      <input
        type={type}
        className={cn(baseClass, className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }