import { use, Suspense, useState, startTransition } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { TrpcClient } from "@/client/trpcClient"
import { Flavor } from "@/server/Compute/types/flavor"
import { Message, Button, Stack, Spinner } from "@cloudoperators/juno-ui-components"
import FilterToolbar from "./-components/FilterToolbar"
import { FlavorListContainer } from "./-components/FlavorListContainer"
import { CreateFlavorModal } from "./-components/CreateFlavorModal"
import { ErrorBoundary } from "react-error-boundary"

interface FlavorsProps {
  client: TrpcClient
  project: string
}

const createFlavorsPromise = (
  client: TrpcClient,
  project: string,
  sortBy: string,
  sortDirection: string,
  searchTerm: string
) => {
  return client.compute.getFlavorsByProjectId.query({
    projectId: project,
    sortBy,
    sortDirection,
    searchTerm,
  })
}

const createPermissionsPromise = (client: TrpcClient) => {
  return Promise.all([
    client.compute.canUser.query("flavors:create"),
    client.compute.canUser.query("flavors:delete"),
  ]).then(([canCreate, canDelete]) => ({ canCreate, canDelete }))
}

function FlavorsContent({
  flavorsPromise,
  permissionsPromise,
  client,
  project,
  onFlavorDeleted,
  onFlavorCreated,
  searchTerm,
  setSearchTerm,
  sortBy,
  handleSortByChange,
  sortDirection,
  handleSortDirectionChange,
  createModalOpen,
  setCreateModalOpen,
}: {
  flavorsPromise: Promise<Flavor[]>
  permissionsPromise: Promise<{ canCreate: boolean; canDelete: boolean }>
  client: TrpcClient
  project: string
  onFlavorDeleted: (name: string) => void
  onFlavorCreated: (name: string) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  sortBy: string
  handleSortByChange: (value: string | number | string[] | undefined) => void
  sortDirection: string
  handleSortDirectionChange: (value: string | number | string[] | undefined) => void
  createModalOpen: boolean
  setCreateModalOpen: (open: boolean) => void
}) {
  const flavors = use(flavorsPromise)
  const permissions = use(permissionsPromise)

  return (
    <>
      <CreateFlavorModal
        client={client}
        isOpen={createModalOpen}
        project={project}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={onFlavorCreated}
      />

      <FilterToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        sortBy={sortBy}
        handleSortByChange={handleSortByChange}
        sortDirection={sortDirection}
        handleSortDirectionChange={handleSortDirectionChange}
        setCreateModalOpen={setCreateModalOpen}
        canCreateFlavor={permissions.canCreate}
      />

      <FlavorListContainer
        flavors={flavors}
        isLoading={false}
        client={client}
        project={project}
        onFlavorDeleted={onFlavorDeleted}
        canDeleteFlavor={permissions.canDelete}
      />
    </>
  )
}

export const Flavors = ({ client, project }: FlavorsProps) => {
  const { t } = useLingui()

  const [sortBy, setSortBy] = useState("name")
  const [sortDirection, setSortDirection] = useState("asc")
  const [searchTerm, setSearchTerm] = useState("")
  const [success, setSuccess] = useState<{ message: string; timestamp: number } | undefined>()
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const [flavorsPromise, setFlavorsPromise] = useState(() =>
    createFlavorsPromise(client, project, sortBy, sortDirection, searchTerm)
  )
  const [permissionsPromise] = useState(() => createPermissionsPromise(client))

  const refetchFlavors = () => {
    startTransition(() => {
      setFlavorsPromise(createFlavorsPromise(client, project, sortBy, sortDirection, searchTerm))
    })
  }

  const handleFlavorDeleted = (flavorName: string) => {
    setSuccess({
      message: t`Flavor "${flavorName}" has been successfully deleted.`,
      timestamp: Date.now(),
    })
    setTimeout(() => setSuccess(undefined), 5000)
    refetchFlavors()
  }

  const handleFlavorCreated = (flavorName: string) => {
    setSuccess({
      message: t`Flavor "${flavorName}" has been successfully created.`,
      timestamp: Date.now(),
    })
    setTimeout(() => setSuccess(undefined), 5000)
    refetchFlavors()
  }

  const handleSortByChange = (value: string | number | string[] | undefined) => {
    if (value && typeof value === "string") {
      setSortBy(value)
      startTransition(() => {
        setFlavorsPromise(createFlavorsPromise(client, project, value, sortDirection, searchTerm))
      })
    }
  }

  const handleSortDirectionChange = (value: string | number | string[] | undefined) => {
    if (value && typeof value === "string") {
      setSortDirection(value)
      startTransition(() => {
        setFlavorsPromise(createFlavorsPromise(client, project, sortBy, value, searchTerm))
      })
    }
  }

  const handleSearchChange = (term: string) => {
    setSearchTerm(term)
    startTransition(() => {
      setFlavorsPromise(createFlavorsPromise(client, project, sortBy, sortDirection, term))
    })
  }

  return (
    <div className="relative">
      {success && (
        <Message
          className="absolute -top-14 left-0 right-0 z-50"
          text={success.message}
          variant="success"
          onDismiss={() => setSuccess(undefined)}
          dismissible
        />
      )}

      <Suspense
        fallback={
          <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
            <Spinner variant="primary" size="large" className="mb-2" />
            <Trans>Loading Flavors...</Trans>
          </Stack>
        }
      >
        <ErrorBoundary fallback={<ErrorFallback onRetry={refetchFlavors} />}>
          <FlavorsContent
            flavorsPromise={flavorsPromise}
            permissionsPromise={permissionsPromise}
            client={client}
            project={project}
            onFlavorDeleted={handleFlavorDeleted}
            onFlavorCreated={handleFlavorCreated}
            searchTerm={searchTerm}
            setSearchTerm={handleSearchChange}
            sortBy={sortBy}
            handleSortByChange={handleSortByChange}
            sortDirection={sortDirection}
            handleSortDirectionChange={handleSortDirectionChange}
            createModalOpen={createModalOpen}
            setCreateModalOpen={setCreateModalOpen}
          />
        </ErrorBoundary>
      </Suspense>
    </div>
  )
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useLingui()

  return (
    <div className="error-container">
      <Message text={t`Failed to load flavors`} variant="error" />
      <Button onClick={onRetry} variant="primary" className="mt-4">
        {t`Retry`}
      </Button>
    </div>
  )
}
