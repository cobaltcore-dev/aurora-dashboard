import { createContext, useContext, useState, ReactNode } from "react"
import { Project } from "../../server/Project/types/models"
import { createRoutePaths } from "../routes/AuroraRoutes"
import { AuroraRoutesSchema } from "../routes/AuroraRoutesSchema"
import { z } from "zod"

type Domain = {
  id: string
  name: string
}

type AuroraContextType = {
  currentProject: Project | undefined
  setCurrentProject: (project: Project | undefined) => void
  domain: Domain
  auroraRoutes: z.infer<typeof AuroraRoutesSchema>
  setAuroraRoutes: (routes: z.infer<typeof AuroraRoutesSchema>) => void
  setDomain: (domain: Domain) => void
  projectSearchTerm: string
  setProjectSearchTerm: (searchTerm: string) => void
  serverSearchTerm: string
  setServerSearchTerm: (searchTerm: string) => void
}

const AuroraContext = createContext<AuroraContextType | undefined>(undefined)

export function AuroraProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | undefined>(undefined)
  const [projectSearchTerm, setProjectSearchTerm] = useState<string>("")
  const [serverSearchTerm, setServerSearchTerm] = useState<string>("")
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
        projectSearchTerm,
        setProjectSearchTerm,
        serverSearchTerm,
        setServerSearchTerm,
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
