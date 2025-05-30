import * as React from "react"
import { Label as HeadlessLabel } from "@headlessui/react"
import { cn } from "../../-utils/cn"
export type GardenerLabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

const GardenerLabel = React.forwardRef<HTMLLabelElement, GardenerLabelProps>(({ className, ...props }, ref) => (
  <HeadlessLabel
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none text-aurora-gray-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
))
GardenerLabel.displayName = "GardenerLabel"

export { GardenerLabel }
