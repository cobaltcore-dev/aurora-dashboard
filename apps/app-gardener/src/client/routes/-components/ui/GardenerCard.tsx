import * as React from "react"
import { cn } from "../../-utils/cn"

const GardenerCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-aurora-gray-700 bg-aurora-gray-800 text-aurora-white shadow-sm",
        className
      )}
      {...props}
    />
  )
)
GardenerCard.displayName = "GardenerCard"

const GardenerCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
)
GardenerCardHeader.displayName = "GardenerCardHeader"

const GardenerCardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-2xl font-semibold leading-none tracking-tight text-aurora-white", className)}
      {...props}
    />
  )
)
GardenerCardTitle.displayName = "GardenerCardTitle"

const GardenerCardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn("text-sm text-aurora-gray-400", className)} {...props} />
)
GardenerCardDescription.displayName = "GardenerCardDescription"

const GardenerCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
)
GardenerCardContent.displayName = "GardenerCardContent"

const GardenerCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
)
GardenerCardFooter.displayName = "GardenerCardFooter"

export {
  GardenerCard,
  GardenerCardHeader,
  GardenerCardFooter,
  GardenerCardTitle,
  GardenerCardDescription,
  GardenerCardContent,
}
