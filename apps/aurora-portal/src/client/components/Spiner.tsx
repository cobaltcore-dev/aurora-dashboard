// Spinner.tsx

export interface SpinnerProps {
  show?: boolean
  wait?: `delay-${number}`
  size?: "sm" | "md" | "lg" | "xl"
  color?: "primary" | "secondary" | "white" | "dark"
  text?: string
  fullscreen?: boolean
}

export function Spinner({
  show = true,
  wait = "delay-300",
  size = "md",
  color = "primary",
  text,
  fullscreen = false,
}: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  }

  const colorClasses = {
    primary: "text-blue-600 border-blue-600",
    secondary: "text-purple-600 border-purple-600",
    white: "text-white border-white",
    dark: "text-gray-800 border-gray-800",
  }

  const spinnerElement = (
    <div
      className={cn(
        "inline-flex flex-col items-center justify-center gap-3 transition-all",
        show ? `opacity-100 ${wait}` : "opacity-0 pointer-events-none",
        "duration-300"
      )}
    >
      <div
        className={cn(
          "relative animate-spin rounded-full border-2",
          sizeClasses[size],
          colorClasses[color],
          "border-t-transparent"
        )}
      />

      {text && (
        <p
          className={cn(
            "text-sm font-medium",
            color === "white" ? "text-white" : color === "dark" ? "text-gray-800" : "text-gray-600"
          )}
        >
          {text}
        </p>
      )}
    </div>
  )

  if (fullscreen) {
    return (
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center transition-all",
          show ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        {/* Spinner container */}
        <div className="relative">{spinnerElement}</div>
      </div>
    )
  }

  return spinnerElement
}

// Utility function (if you don't have cn)
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
