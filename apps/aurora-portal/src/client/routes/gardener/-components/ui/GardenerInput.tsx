import * as React from "react"
import { Input as HeadlessInput } from "@headlessui/react"
import { cn } from "../../-utils/cn"
export type GardenerInputProps = React.InputHTMLAttributes<HTMLInputElement>

const GardenerInput = React.forwardRef<HTMLInputElement, GardenerInputProps>(({ className, type, ...props }, ref) => {
  return (
    <HeadlessInput
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-aurora-gray-700 bg-aurora-gray-800 px-3 py-2 text-sm text-aurora-white ring-offset-aurora-gray-900 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-aurora-gray-300 placeholder:text-aurora-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora-green-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-aurora-gray-800/50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
GardenerInput.displayName = "Input"

export { GardenerInput }
