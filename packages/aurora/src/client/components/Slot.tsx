import { useRef, useState, useEffect, type ReactNode, type FC } from "react"
import ReactDOM from "react-dom"
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
      {root && ReactDOM.createPortal(children, root)}
    </div>
  )
}

export function Slot({ component: Component }: { component: FC<SlotProps> }) {
  const { trpcClient } = useRouteContext({ strict: false })

  return (
    <SlotShadowRoot>
      <Component auroraContext={{ client: trpcClient! }} />
    </SlotShadowRoot>
  )
}
