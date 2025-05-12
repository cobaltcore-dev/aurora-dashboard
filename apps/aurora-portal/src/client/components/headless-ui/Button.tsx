import { cn } from "@/client/utils/cn"
import { Button as HeadlessButton } from "@headlessui/react"
import { ReactNode } from "react"

// Define different button sizes
const buttonSizes = {
  sm: "px-3 py-1 text-sm rounded",
  md: "px-4 py-2 text-sm rounded-md",
  lg: "px-5 py-2.5 text-base rounded-md",
}

// Define different button variants
const buttonVariants = {
  primary: "bg-aurora-green-700 hover:bg-aurora-green-600 text-aurora-white border border-aurora-green-600",
  secondary: "bg-aurora-gray-800 hover:bg-aurora-gray-700 text-aurora-gray-300 border border-aurora-gray-700",
  danger: "bg-aurora-red-700 hover:bg-aurora-red-600 text-aurora-white border border-aurora-red-600",
  ghost: "bg-transparent hover:bg-aurora-gray-800 text-aurora-gray-300 border border-transparent",
}

// Base button styles
const baseButtonStyles = cn(
  "font-medium inline-flex items-center justify-center transition-colors duration-200",
  "focus:outline-none focus:ring-2 focus:ring-aurora-green-500 focus:ring-opacity-50"
)

export function Button({
  className,
  onClick,
  children,
  type = "button",
  disabled = false,
  size = "md",
  variant = "primary",
  fullWidth = false,
}: {
  className?: string
  children: ReactNode
  disabled?: boolean
  type?: "button" | "submit" | "reset"
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  size?: "sm" | "md" | "lg"
  variant?: "primary" | "secondary" | "danger" | "ghost"
  fullWidth?: boolean
}) {
  return (
    <HeadlessButton
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(baseButtonStyles, buttonSizes[size], buttonVariants[variant], fullWidth ? "w-full" : "", className)}
    >
      {children}
    </HeadlessButton>
  )
}

// Export a specialized icon button variant
export function IconButton({
  className,
  onClick,
  children,
  disabled = false,
  type = "button",
  size = "md",
  variant = "ghost",
}: {
  className?: string
  disabled?: boolean
  children: ReactNode
  type?: "button" | "submit" | "reset"
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  size?: "sm" | "md" | "lg"
  variant?: "primary" | "secondary" | "danger" | "ghost"
}) {
  const iconSizes = {
    sm: "p-1 rounded",
    md: "p-2 rounded-md",
    lg: "p-3 rounded-md",
  }

  return (
    <HeadlessButton
      disabled={disabled}
      type={type}
      onClick={onClick}
      className={cn(baseButtonStyles, iconSizes[size], buttonVariants[variant], "aspect-square", className)}
    >
      {children}
    </HeadlessButton>
  )
}
