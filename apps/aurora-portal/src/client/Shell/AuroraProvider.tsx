import { createContext, useContext, useState, ReactNode } from "react"
import { Project } from "../../server/Project/types/models"

import { Domain } from "./AuthProvider"

type AuroraContextType = {
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void
  domain: Domain
  setDomain: (domain: Domain) => void
}

const AuroraContext = createContext<AuroraContextType | undefined>(undefined)

export function AuroraProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [domain, setDomain] = useState<Domain>({ id: "deafult", name: "Default" })

  return (
    <AuroraContext.Provider
      value={{
        currentProject,
        setCurrentProject,
        domain,
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
