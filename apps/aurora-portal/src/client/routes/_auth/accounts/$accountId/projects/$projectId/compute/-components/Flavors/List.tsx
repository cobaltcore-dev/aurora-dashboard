import { useState, useEffect } from "react"
import { useLingui } from "@lingui/react/macro"
import { TrpcClient } from "@/client/trpcClient"
import { Flavor } from "@/server/Compute/types/flavor"
import { Message, Button } from "@cloudoperators/juno-ui-components"
import { useErrorTranslation } from "@/client/utils/useErrorTranslation"
import FilterToolbar from "./-components/FilterToolbar"
import { FlavorListContainer } from "./-components/FlavorListContainer"
import { CreateFlavorModal } from "./-components/CreateFlavorModal"

interface FlavorsProps {
  client: TrpcClient
  project: string
}

interface ErrorState {
  message: string
  code: string
  isRetryable: boolean
}

interface SuccessState {
  message: string
  timestamp: number
}

export const Flavors = ({ client, project }: FlavorsProps) => {
  const { t } = useLingui()
  const { translateError, isRetryableError } = useErrorTranslation()

  const [sortBy, setSortBy] = useState("name")
  const [sortDirection, setSortDirection] = useState("asc")
  const [searchTerm, setSearchTerm] = useState("")
  const [flavors, setFlavors] = useState<Flavor[] | undefined>(undefined)
  const [error, setError] = useState<ErrorState | undefined>(undefined)
  const [success, setSuccess] = useState<SuccessState | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [refetchTrigger, setRefetchTrigger] = useState(0)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const handleError = (err: unknown) => {
    console.error(err)

    let errorCode = "UNKNOWN_ERROR"

    if (err && typeof err === "object" && "message" in err) {
      const errorMessage = err.message
      if (typeof errorMessage === "string" && errorMessage.startsWith("FLAVORS_")) {
        errorCode = errorMessage
      }
    }

    setError({
      message: translateError(errorCode),
      code: errorCode,
      isRetryable: isRetryableError(errorCode),
    })
  }

  const handleSuccess = (message: string) => {
    setSuccess({
      message,
      timestamp: Date.now(),
    })

    setTimeout(() => {
      setSuccess(undefined)
    }, 5000)
  }

  const refetchFlavors = () => {
    setError(undefined)
    setRefetchTrigger((prev) => prev + 1)
  }

  const handleFlavorDeleted = (flavorName: string) => {
    handleSuccess(t`Flavor "${flavorName}" has been successfully deleted.`)
    refetchFlavors()
  }

  const handleFlavorCreated = (flavorName: string) => {
    handleSuccess(t`Flavor "${flavorName}" has been successfully created.`)
    refetchFlavors()
  }

  useEffect(() => {
    const fetchFlavors = async () => {
      try {
        setIsLoading(true)
        setError(undefined)
        const data = await client.compute.getFlavorsByProjectId.query({
          projectId: project,
          sortBy,
          sortDirection,
          searchTerm,
        })
        setFlavors(data)
      } catch (err) {
        handleError(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFlavors()
  }, [client, project, sortBy, sortDirection, searchTerm, refetchTrigger])

  const handleSortByChange = (value: string | number | string[] | undefined) => {
    if (value && typeof value === "string") {
      setSortBy(value)
    }
  }

  const handleSortDirectionChange = (value: string | number | string[] | undefined) => {
    if (value && typeof value === "string") {
      setSortDirection(value)
    }
  }

  const dismissError = () => {
    setError(undefined)
  }

  const dismissSuccess = () => {
    setSuccess(undefined)
  }

  if (error && !isLoading) {
    return (
      <div className="error-container">
        <Message text={error.message} variant="error" onDismiss={dismissError} />
        {error.isRetryable && (
          <Button onClick={refetchFlavors} variant="primary" className="mt-4">
            {t`Retry`}
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <CreateFlavorModal
        client={client}
        isOpen={createModalOpen}
        project={project}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleFlavorCreated}
      />

      {success && <Message text={success.message} variant="success" onDismiss={dismissSuccess} dismissible />}

      {error && (
        <div className="mb-4">
          <Message text={error.message} variant="error" onDismiss={dismissError} />
          {error.isRetryable && (
            <Button onClick={refetchFlavors} variant="primary" size="small" className="mt-2">
              {t`Retry`}
            </Button>
          )}
        </div>
      )}

      <FilterToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        sortBy={sortBy}
        handleSortByChange={handleSortByChange}
        sortDirection={sortDirection}
        handleSortDirectionChange={handleSortDirectionChange}
        setCreateModalOpen={setCreateModalOpen}
      />

      <FlavorListContainer
        flavors={flavors}
        isLoading={isLoading}
        client={client}
        project={project}
        onFlavorDeleted={handleFlavorDeleted}
      />
    </>
  )
}
