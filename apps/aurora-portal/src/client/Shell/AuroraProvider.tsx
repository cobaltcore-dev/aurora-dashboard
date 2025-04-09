import { createContext, useContext, useState, ReactNode } from "react"
import { Project } from "../../server/Project/types/models"
import { Domain } from "../../server/Authentication/types/models"

type CurrentScope = {
  scope?: { project?: Project; domain?: Domain }
  error?: string
  isLoading?: boolean
}

export type AuroraContextType = {
  currentScope: CurrentScope | undefined
  setCurrentScope: (scope: CurrentScope | undefined) => void
}

export const AuroraContext = createContext<AuroraContextType | undefined>(undefined)

export function AuroraProvider({ children }: { children: ReactNode }) {
  const [currentScope, setCurrentScope] = useState<CurrentScope | undefined>(undefined)

  return (
    <AuroraContext.Provider
      value={{
        currentScope,
        setCurrentScope,
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
