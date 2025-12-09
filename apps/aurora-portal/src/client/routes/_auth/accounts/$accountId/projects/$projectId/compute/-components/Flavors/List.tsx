import { use, Suspense, useState, startTransition } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { TrpcClient } from "@/client/trpcClient"
import { Flavor } from "@/server/Compute/types/flavor"
import { Message, Button, Stack, Spinner } from "@cloudoperators/juno-ui-components"
import { ListToolbar } from "@/client/components/ListToolbar"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { FlavorListContainer } from "./-components/FlavorListContainer"
import { CreateFlavorModal } from "./-components/CreateFlavorModal"

interface FlavorsProps {
  client: TrpcClient
  project: string
}

type RequiredSortSettings = {
  options: SortSettings["options"]
  sortBy: string
  sortDirection: "asc" | "desc"
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
  return client.compute.canUserBulk
    .query(["flavors:create", "flavors:delete", "flavors:list_projects"])
    .then(([canCreate, canDelete, canManageAccess]) => ({ canCreate, canDelete, canManageAccess }))
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
  sortSettings,
  handleSortChange,
  createModalOpen,
  setCreateModalOpen,
}: {
  flavorsPromise: Promise<Flavor[]>
  permissionsPromise: Promise<{ canCreate: boolean; canDelete: boolean; canManageAccess: boolean }>
  client: TrpcClient
  project: string
  onFlavorDeleted: (name: string) => void
  onFlavorCreated: (name: string) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  sortSettings: SortSettings
  handleSortChange: (settings: SortSettings) => void
  createModalOpen: boolean
  setCreateModalOpen: (open: boolean) => void
}) {
  const { t } = useLingui()
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

      <ListToolbar
        sortSettings={sortSettings}
        searchTerm={searchTerm}
        onSort={handleSortChange}
        onSearch={setSearchTerm}
        actions={
          permissions.canCreate ? <Button label={t`Create Flavor`} onClick={() => setCreateModalOpen(true)} /> : null
        }
      />

      <FlavorListContainer
        flavors={flavors}
        isLoading={false}
        client={client}
        project={project}
        onFlavorDeleted={onFlavorDeleted}
        canDeleteFlavor={permissions.canDelete}
        canMangageAccess={permissions.canManageAccess}
      />
    </>
  )
}
export const Flavors = ({ client, project }: FlavorsProps) => {
  const { t } = useLingui()

  const [sortSettings, setSortSettings] = useState<RequiredSortSettings>({
    options: [
      { label: t`Name`, value: "name" },
      { label: t`VCPUs`, value: "vcpus" },
      { label: t`RAM`, value: "ram" },
      { label: t`Root Disk`, value: "disk" },
      { label: t`Swap`, value: "swap" },
    ],
    sortBy: "name",
    sortDirection: "asc",
  })

  const [searchTerm, setSearchTerm] = useState("")
  const [success, setSuccess] = useState<{ message: string; timestamp: number } | undefined>()
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const [flavorsPromise, setFlavorsPromise] = useState(() =>
    createFlavorsPromise(client, project, sortSettings.sortBy, sortSettings.sortDirection, searchTerm)
  )
  const [permissionsPromise] = useState(() => createPermissionsPromise(client))

  const refetchFlavors = () => {
    startTransition(() => {
      setFlavorsPromise(
        createFlavorsPromise(client, project, sortSettings.sortBy, sortSettings.sortDirection, searchTerm)
      )
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

  const handleSortChange = (newSortSettings: SortSettings) => {
    const settings: RequiredSortSettings = {
      options: newSortSettings.options,
      sortBy: newSortSettings.sortBy?.toString() || "name",
      sortDirection: newSortSettings.sortDirection || "asc",
    }

    setSortSettings(settings)
    startTransition(() => {
      setFlavorsPromise(createFlavorsPromise(client, project, settings.sortBy, settings.sortDirection, searchTerm))
    })
  }

  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const searchValue = typeof term === "string" ? term : ""
    setSearchTerm(searchValue)

    startTransition(() => {
      setFlavorsPromise(
        createFlavorsPromise(client, project, sortSettings.sortBy, sortSettings.sortDirection, searchValue)
      )
    })
  }

  return (
    <div className="relative">
      {success && (
        <Message
          className="absolute -top-14 left-0 right-0 z-50"
          text={success.message}
          variant="info"
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
        <FlavorsContent
          flavorsPromise={flavorsPromise}
          permissionsPromise={permissionsPromise}
          client={client}
          project={project}
          onFlavorDeleted={handleFlavorDeleted}
          onFlavorCreated={handleFlavorCreated}
          searchTerm={searchTerm}
          setSearchTerm={handleSearchChange}
          sortSettings={sortSettings}
          handleSortChange={handleSortChange}
          createModalOpen={createModalOpen}
          setCreateModalOpen={setCreateModalOpen}
        />
      </Suspense>
    </div>
  )
}
