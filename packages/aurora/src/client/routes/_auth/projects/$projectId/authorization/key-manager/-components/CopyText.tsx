import { useState } from "react"
import { Icon, Tooltip, TooltipContent, TooltipTrigger } from "@cloudoperators/juno-ui-components"

interface CopyTextProps {
  text: string
}

export function CopyText({ text }: CopyTextProps) {
  const [copied, setCopied] = useState(false)
  const [hovering, setHovering] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setHovering(false)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback silently
    }
  }

  return (
    <Tooltip open={copied || hovering ? true : false}>
      <TooltipTrigger
        asChild
        onClick={handleCopy}
        onMouseEnter={() => !copied && setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <button
          type="button"
          className="group flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-inherit hover:underline"
        >
          <span className="select-none">{text}</span>
          <Icon icon={copied ? "check" : "contentCopy"} size="14" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied!" : "Copy"}</TooltipContent>
    </Tooltip>
  )
}
