import React, { useState } from "react"
import { Tooltip, TooltipTrigger, TooltipContent, Icon } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"

export interface ClipboardTextProps extends React.HTMLAttributes<HTMLDivElement> {
  tooltipContent?: string
  text: string
  className?: string
  /** Truncate the displayed text to this many characters (optional). The full text is always copied. */
  truncateAt?: number
  showTooltip?: boolean
  /** Render only the copy icon (no text), e.g. as a copy affordance beside a link. */
  iconOnly?: boolean
  /** Whether the copy icon is always visible or only revealed on hover. Defaults to "always". */
  iconVisible?: "always" | "hover"
}

const ClipboardText: React.FC<ClipboardTextProps> = ({
  text,
  tooltipContent,
  className,
  truncateAt,
  showTooltip = true,
  iconOnly = false,
  iconVisible = "always",
  ...props
}) => {
  const { t } = useLingui()
  const [copied, setCopied] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const combinedClassName = `copyableTooltip group inline-flex items-center gap-1 ${className || ""}`

  // The copy icon is always visible when explicitly configured, when there is no
  // text (iconOnly), or right after copying (check icon). Otherwise it is only
  // revealed when hovering the wrapper.
  const iconAlwaysVisible = iconVisible === "always" || iconOnly || copied

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setIsHovering(false)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text:", err)
    }
  }

  const displayText = truncateAt && text.length > truncateAt ? `${text.slice(0, truncateAt)}...` : text

  // Determine tooltip content based on state
  const getTooltipContent = () => {
    if (copied) {
      return tooltipContent || t`Copied to clipboard!`
    }
    return t`Copy`
  }

  const tooltipIsOpen = (copied && showTooltip) || (isHovering && showTooltip)

  return (
    <div {...props} className={combinedClassName}>
      {!iconOnly && <span className="select-none">{displayText}</span>}
      <Tooltip open={tooltipIsOpen}>
        <TooltipTrigger
          onClick={handleCopy}
          onMouseEnter={() => !copied && setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          aria-label={t`Copy ${text} to clipboard`}
          className="cursor-pointer"
          asChild
          data-testid="clipboard-copy-trigger"
        >
          <button
            type="button"
            className={`inline-flex items-center border-none bg-transparent p-0 text-inherit transition-opacity ${
              iconAlwaysVisible ? "opacity-100" : "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
            } `}
          >
            <Icon icon={copied ? "check" : "contentCopy"} size="18" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{getTooltipContent()}</TooltipContent>
      </Tooltip>
    </div>
  )
}

export default ClipboardText
