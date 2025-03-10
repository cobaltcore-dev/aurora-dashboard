import React from "react"

type PillProps = {
  pillKeyLabel: string
  pillValueLabel: string
  className?: string
}

export const Pill: React.FC<PillProps> = ({ pillKeyLabel, pillValueLabel, className = "" }) => {
  return (
    <div
      className={`jn-inline-flex jn-basis-auto jn-shrink jn-items-center jn-flex-nowrap jn-text-xs jn-p-px jn-border jn-rounded jn-border-theme-background-lvl-4 ${className}`.trim()}
    >
      <span className="jn-bg-theme-background-lvl-4 jn-text-theme-high jn-px-1 jn-py-0.5 jn-rounded-sm jn-inline-block">
        {pillKeyLabel}
      </span>
      <span className="jn-px-1 jn-py-0.5 jn-text-theme-high jn-inline-block">{pillValueLabel}</span>
    </div>
  )
}
