// GardenerSpinner.tsx

export interface GardenerSpinnerProps {
  show?: boolean
  text?: string
  fullscreen?: boolean
  variant?: "default" | "transparent"
}

export function GardenerSpinner({ show = true, text, fullscreen = false, variant = "default" }: GardenerSpinnerProps) {
  const spinnerElement = (
    <div
      className={cn(
        "inline-flex flex-col items-center justify-center gap-3 transition-all duration-300",
        show ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div
        className={cn(
          "relative animate-spin rounded-full border-2 w-12 h-12",
          "text-aurora-blue-600 border-aurora-blue-600 border-t-transparent"
        )}
      />

      {text && <p className="text-sm font-medium text-aurora-gray-300">{text}</p>}
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
        <div
          className={cn(
            "absolute inset-0",
            variant === "transparent" ? "bg-transparent" : "bg-aurora-black/50 backdrop-blur-sm"
          )}
        />

        {/* Spinner container */}
        <div className="relative">{spinnerElement}</div>
      </div>
    )
  }

  return spinnerElement
}

// Utility function
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
