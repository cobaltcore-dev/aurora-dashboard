import React from "react"
import { Icon } from "./Icon"
import type { IconName } from "./Icon"

interface ButtonProps {
  children?: React.ReactNode
  name?: string
  variant?: "default" | "subdued" | "primary-danger" | "success" | "cancel"
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
    rounded
    juno-font-bold 
    juno-inline-flex 
    juno-justify-center 
    juno-items-center 
    juno-rounded 
    juno-shadow-sm 
    px-1
    py-1
    juno-w-auto 
    focus:juno-outline-none 
    focus-visible:juno-ring-2 
    focus-visible:juno-ring-theme-focus 
    focus-visible:juno-ring-offset-1 
    focus-visible:juno-ring-offset-theme-focus 
    disabled:juno-opacity-50 
    disabled:juno-cursor-not-allowed 
    disabled:juno-pointer-events-none 
    juno-text-base 
    juno-leading-6 
    juno-py-[0.4375rem] 
    juno-px-[0.625rem] 
    w-full
  `

  const variantClasses = (() => {
    switch (variant) {
      case "subdued":
        return "juno-button-subdued"
      case "cancel":
        return "juno-button-cancel"
      case "primary-danger":
        return "juno-button-primary-danger"
      case "success":
        return "bg-sap-green text-sap-grey-2 ring-black/5"
      default:
        return "juno-button-default juno-button-default-size"
    }
  })()
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
