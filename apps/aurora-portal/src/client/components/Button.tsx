import React from "react"
import { Icon } from "./Icon"
import type { IconName } from "./Icon"

interface ButtonProps {
  children?: React.ReactNode
  name?: string
  variant?: "default" | "subdued" | "primary-danger"
  className?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  icon?: IconName
  "data-testid"?: string
  disabled?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children,
  name,
  variant = "default",
  className = "",
  onClick,
  icon,
  disabled = false,
  ...props
}) => {
  const baseClasses = `
    juno-button 
    jn-font-bold 
    jn-inline-flex 
    jn-justify-center 
    jn-items-center 
    jn-rounded 
    jn-shadow-sm 
    jn-w-auto 
    focus:jn-outline-none 
    focus-visible:jn-ring-2 
    focus-visible:jn-ring-theme-focus 
    focus-visible:jn-ring-offset-1 
    focus-visible:jn-ring-offset-theme-focus 
    disabled:jn-opacity-50 
    disabled:jn-cursor-not-allowed 
    disabled:jn-pointer-events-none 
    jn-text-base 
    jn-leading-6 
    jn-py-[0.4375rem] 
    jn-px-[0.625rem] 
    w-full
  `

  const variantClasses =
    variant === "subdued"
      ? "juno-button-subdued"
      : variant === "primary-danger"
        ? "juno-button-primary-danger"
        : "juno-button-default juno-button-default-size"

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${className}`.trim()}
      type="button"
      title={name}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {icon && <Icon name={icon} />}
      {children || name}
    </button>
  )
}
