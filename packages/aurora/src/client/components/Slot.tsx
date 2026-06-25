import { useRef, useState, useEffect, type ReactNode, type FC } from "react"
import { createPortal } from "react-dom"
import { useRouteContext } from "@tanstack/react-router"
import type { SlotProps } from "../AuroraApp"

function SlotShadowRoot({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [root, setRoot] = useState<ShadowRoot | null>(null)

  useEffect(() => {
    if (!ref.current) return
    setRoot(ref.current.shadowRoot ?? ref.current.attachShadow({ mode: "open" }))
  }, [])

  return (
    <div ref={ref} style={{ display: "contents" }}>
      {root && createPortal(children, root)}
    </div>
  )
}

export function Slot({
  component: Component,
  useShadowDOM = true,
  currentService,
}: {
  component: FC<SlotProps>
  useShadowDOM?: boolean
  currentService?: string
}) {
  const { trpcClient } = useRouteContext({ strict: false })

  if (!trpcClient) return null

  const content = <Component auroraContext={{ client: trpcClient, currentService }} />

  if (!useShadowDOM) {
    return content
  }

  return <SlotShadowRoot>{content}</SlotShadowRoot>
}
