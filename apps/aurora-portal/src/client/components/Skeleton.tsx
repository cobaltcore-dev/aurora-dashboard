import React from "react"

interface SkeletonProps {
  /** Width of the skeleton, can be tailwind class, percentage or pixel value */
  width?: string
  /** Height of the skeleton, can be tailwind class, percentage or pixel value */
  height?: string
  /** Apply rounded corners */
  rounded?: "none" | "sm" | "md" | "lg" | "full"
  /** Add custom classes to the skeleton */
  className?: string
  /** Control the animation */
  animate?: boolean
  /** Optionally nest children for complex skeleton layouts */
  children?: React.ReactNode
}

/**
 * Skeleton component for creating loading placeholders
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = "1rem",
  rounded = "md",
  className = "",
  animate = true,
  children,
}) => {
  // Map the rounded props to Tailwind classes
  const roundedMap = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded",
    lg: "rounded-lg",
    full: "rounded-full",
  }

  // Determine width class based on input
  const widthClass = width.includes("w-")
    ? width
    : `${(typeof width === "string" && width.endsWith("%")) || width.endsWith("px") ? "" : "w-"}${width}`

  // Determine height class based on input
  const heightClass = height.includes("h-")
    ? height
    : `${(typeof height === "string" && height.endsWith("%")) || height.endsWith("px") ? "" : "h-"}${height}`

  // Compose the final classes
  const classes = `
    bg-aurora-gray-800 
    ${animate ? "animate-pulse" : ""} 
    ${roundedMap[rounded]} 
    ${widthClass} 
    ${heightClass} 
    ${className}
  `
    .trim()
    .replace(/\s+/g, " ")

  return <div className={classes}>{children}</div>
}

/**
 * Text skeleton component for creating placeholder text lines
 */
export const SkeletonText: React.FC<{
  lines?: number
  spacing?: "tight" | "normal" | "loose"
  width?: string | string[]
}> = ({ lines = 3, spacing = "normal", width = ["100%", "90%", "80%"] }) => {
  const spacingMap = {
    tight: "gap-1",
    normal: "gap-2",
    loose: "gap-3",
  }

  return (
    <div className={`flex flex-col ${spacingMap[spacing]}`}>
      {Array(lines)
        .fill(null)
        .map((_, index) => {
          // Handle width based on whether it's an array or single value
          const lineWidth = Array.isArray(width) ? width[index % width.length] : width

          return <Skeleton key={index} width={lineWidth} height="0.75rem" rounded="md" />
        })}
    </div>
  )
}

/**
 * Circular skeleton component, useful for avatars or icons
 */
export const SkeletonCircle: React.FC<{
  size?: string
  className?: string
}> = ({ size = "12", className = "" }) => {
  // Handle size to map to Tailwind classes
  const sizeClass = size.includes("w-") ? size : `w-${size} h-${size}`

  return <Skeleton rounded="full" className={`${sizeClass} ${className}`} />
}

/**
 * Button skeleton component
 */
export const SkeletonButton: React.FC<{
  width?: string
  height?: string
  className?: string
}> = ({ width = "24", height = "10", className = "" }) => {
  return <Skeleton width={width} height={height} rounded="md" className={className} />
}

/**
 * Badge/tag skeleton component
 */
export const SkeletonBadge: React.FC<{
  width?: string
  className?: string
}> = ({ width = "16", className = "" }) => {
  return <Skeleton width={width} height="6" rounded="full" className={className} />
}
