import { createContext, useCallback, useState } from "react"
import type { ReactNode } from "react"
import type { Crumb } from "@/client/routes/routeInfo"

export const DynamicBreadcrumbContext = createContext<{
  crumbs: Map<string, Crumb>
  setCrumb: (routeId: string, crumb: Crumb | null) => void
}>({ crumbs: new Map(), setCrumb: () => {} })

export function DynamicBreadcrumbProvider({ children }: { children: ReactNode }) {
  const [crumbs, setCrumbs] = useState(() => new Map<string, Crumb>())

  const setCrumb = useCallback((routeId: string, crumb: Crumb | null) => {
    setCrumbs((prev) => {
      const next = new Map(prev)
      if (crumb === null) {
        next.delete(routeId)
      } else {
        next.set(routeId, crumb)
      }
      return next
    })
  }, [])

  return <DynamicBreadcrumbContext.Provider value={{ crumbs, setCrumb }}>{children}</DynamicBreadcrumbContext.Provider>
}
