import { cn } from "@/client/utils/cn"
import { Button as HeadlessButton } from "@headlessui/react"
import { ReactNode } from "react"
const buttonStyles = cn(
  "px-6 py-3 rounded-md text-base font-medium",
  "min-w-[120px] flex-1 max-w-[200px]",
  "transition-colors duration-200"
)
export function Button({
  className,
  onClick,
  children,
  type = "button",
}: {
  className?: string
  children: ReactNode
  type?: "button" | "submit" | "reset"
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <HeadlessButton type={type} onClick={onClick} className={cn(buttonStyles, className)}>
      {children}
    </HeadlessButton>
  )
}
