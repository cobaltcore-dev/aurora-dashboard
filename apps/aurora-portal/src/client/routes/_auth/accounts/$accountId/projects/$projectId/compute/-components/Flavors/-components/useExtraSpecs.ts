import { useState, useCallback } from "react"
import { TrpcClient } from "@/client/trpcClient"

export const useExtraSpecs = (client: TrpcClient, project: string, flavorId?: string) => {
  const [extraSpecs, setExtraSpecs] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchExtraSpecs = useCallback(async () => {
    if (!flavorId) return

    try {
      setIsLoading(true)
      setError(null)
      const specs = await client.compute.getExtraSpecs.query({
        projectId: project,
        flavorId,
      })
      setExtraSpecs(specs)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch extra specs")
    } finally {
      setIsLoading(false)
    }
  }, [client, project, flavorId])

  const addExtraSpec = useCallback(
    async (key: string, value: string) => {
      if (!flavorId) throw new Error("Flavor ID is missing")

      await client.compute.createExtraSpecs.mutate({
        projectId: project,
        flavorId,
        extra_specs: { [key]: value },
      })

      setExtraSpecs((prev) => ({ [key]: value, ...prev }))
    },
    [client, project, flavorId]
  )

  const deleteExtraSpec = useCallback(
    async (key: string) => {
      if (!flavorId) throw new Error("Flavor ID is missing")

      await client.compute.deleteExtraSpec.mutate({
        projectId: project,
        flavorId,
        key,
      })

      setExtraSpecs((prev) => {
        const newSpecs = { ...prev }
        delete newSpecs[key]
        return newSpecs
      })
    },
    [client, project, flavorId]
  )

  return {
    extraSpecs,
    isLoading,
    error,
    fetchExtraSpecs,
    addExtraSpec,
    deleteExtraSpec,
  }
}
