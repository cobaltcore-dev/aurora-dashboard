import { createContext, useContext, useState, ReactNode } from "react"
import { Project } from "../../server/Project/types/models"
import { createRoutePaths } from "../routes/AuroraRoutes"
import { AuroraRoutesSchema } from "../routes/AuroraRoutesSchema"
import { z } from "zod"

type Domain = {
  id: string
  name: string
}
type ScopeProject = {
  scope?: { project: Project; domain: Domain }
  error?: string
  isLoading?: boolean
}

export type AuroraContextType = {
  currentProject: ScopeProject | undefined
  setCurrentProject: (project: ScopeProject | undefined) => void
  domain: Domain
  auroraRoutes: z.infer<typeof AuroraRoutesSchema>
  setAuroraRoutes: (routes: z.infer<typeof AuroraRoutesSchema>) => void
  setDomain: (domain: Domain) => void
}

export const AuroraContext = createContext<AuroraContextType | undefined>(undefined)

export function AuroraProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<ScopeProject | undefined>(undefined)
  const [auroraRoutes, setAuroraRoutes] = useState<z.infer<typeof AuroraRoutesSchema>>(
    createRoutePaths().auroraRoutePaths()
  )

  const [domain, setDomain] = useState<Domain>({ id: "default", name: "Default" })

  return (
    <AuroraContext.Provider
      value={{
        currentProject,
        setCurrentProject,
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
