import { createContext, useState } from "react"
import type { Dispatch, ReactNode, SetStateAction } from "react"
import type { BreadcrumbItem } from "@/client/hooks/useBreadcrumbs"

export const BreadcrumbExtensionContext = createContext<{
  breadcrumbs: BreadcrumbItem[]
  setBreadcrumbs: Dispatch<SetStateAction<BreadcrumbItem[]>>
}>({ breadcrumbs: [], setBreadcrumbs: () => {} })

export function BreadcrumbExtensionProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  return (
    <BreadcrumbExtensionContext.Provider value={{ breadcrumbs, setBreadcrumbs }}>
      {children}
    </BreadcrumbExtensionContext.Provider>
  )
}
