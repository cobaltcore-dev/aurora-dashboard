import { createContext, useContext, useState, ReactNode } from "react"
import { Project } from "../../server/Project/types/models"
import { createRoutePaths } from "../routes/AuroraRoutes"
import { AuroraRoutesSchema } from "../routes/AuroraRoutesSchema"
import { z } from "zod"
import { Domain } from "../../server/Authentication/types/models"

type CurrentScope = {
  scope?: { project?: Project; domain?: Domain }
  error?: string
  isLoading?: boolean
}

export type AuroraContextType = {
  currentScope: CurrentScope | undefined
  setCurrentScope: (scope: CurrentScope | undefined) => void
  auroraRoutes: z.infer<typeof AuroraRoutesSchema>
  setAuroraRoutes: (routes: z.infer<typeof AuroraRoutesSchema>) => void
}

export const AuroraContext = createContext<AuroraContextType | undefined>(undefined)

export function AuroraProvider({ children }: { children: ReactNode }) {
  const [currentScope, setCurrentScope] = useState<CurrentScope | undefined>(undefined)
  const [auroraRoutes, setAuroraRoutes] = useState<z.infer<typeof AuroraRoutesSchema>>(
    createRoutePaths().auroraRoutePaths()
  )

  return (
    <AuroraContext.Provider
      value={{
        currentScope,
        setCurrentScope,
        auroraRoutes,
        setAuroraRoutes,
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
