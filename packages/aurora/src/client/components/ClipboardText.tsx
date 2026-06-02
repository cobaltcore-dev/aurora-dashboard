import React, { useState } from "react"
import { Tooltip, TooltipTrigger, TooltipContent, Icon, Stack } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"

export interface ClipboardTextProps extends React.HTMLAttributes<HTMLDivElement> {
  tooltipContent?: string
  text: string
  className?: string
  truncateAt?: number
  showTooltip?: boolean
}

const ClipboardText: React.FC<ClipboardTextProps> = ({
  text,
  tooltipContent,
  className,
  truncateAt,
  showTooltip = true,
  ...props
}) => {
  const { t } = useLingui()
  const [copied, setCopied] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const combinedClassName = `copyableTooltip  inline-flex items-center ${className || ""}`

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
          <div className="group">
            <Stack direction="horizontal" gap="1" className="items-center hover:underline">
              <span className="select-none">{displayText}</span>
              <Icon icon={copied ? "check" : "contentCopy"} size="18" />
            </Stack>
          </div>
        </TooltipTrigger>
        <TooltipContent>{getTooltipContent()}</TooltipContent>
      </Tooltip>
    </div>
  )
}

export default ClipboardText
