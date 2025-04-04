import { createContext, useContext, useState, ReactNode } from "react"
import { Project } from "../../server/Project/types/models"
import { createRoutePaths } from "../routes/AuroraRoutes"
import { AuroraRoutesSchema } from "../routes/AuroraRoutesSchema"
import { z } from "zod"
import { Domain } from "../../server/Authentication/types/models"

type ScopeProject = {
  scope?: { project: Project; domain: Domain }
  error?: string
  isLoading?: boolean
}

export type AuroraContextType = {
  currentScope: ScopeProject | undefined
  setCurrentScope: (project: ScopeProject | undefined) => void
  domain: Domain
  auroraRoutes: z.infer<typeof AuroraRoutesSchema>
  setAuroraRoutes: (routes: z.infer<typeof AuroraRoutesSchema>) => void
  setDomain: (domain: Domain) => void
}

export const AuroraContext = createContext<AuroraContextType | undefined>(undefined)

export function AuroraProvider({ children }: { children: ReactNode }) {
  const [currentScope, setCurrentScope] = useState<ScopeProject | undefined>(undefined)
  const [auroraRoutes, setAuroraRoutes] = useState<z.infer<typeof AuroraRoutesSchema>>(
    createRoutePaths().auroraRoutePaths()
  )

  const [domain, setDomain] = useState<Domain>({}) //({ id: "default", name: "Default" })

  return (
    <AuroraContext.Provider
      value={{
        currentScope,
        setCurrentScope,
        domain,
        auroraRoutes,
        setAuroraRoutes,
        setDomain,
      }}
    >
      {children}
    </AuroraContext.Provider>
  )
}

export function useAuroraContext() {
  const context = useContext(AuroraContext)
  if (!context) {
    throw new Error("useAuroraContext must be used within an AuroraProvider")
  }
  return context
}
