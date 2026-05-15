import { use, Suspense, useState, startTransition, useEffect, useCallback } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { useSearch, useNavigate } from "@tanstack/react-router"
import { TrpcClient } from "@/client/trpcClient"
import { Flavor } from "@/server/Compute/types/flavor"
import { Message, Button, Stack, Spinner } from "@cloudoperators/juno-ui-components"
import { ListToolbar } from "@/client/components/ListToolbar"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { FlavorListContainer } from "./-components/FlavorListContainer"
import { CreateFlavorModal } from "./-components/CreateFlavorModal"
import type { FlavorsSearchParams } from "@/client/routes/_auth/projects/$projectId/compute/flavors"

const PAGE_SIZE = 50

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
    project_id: project,
    sortBy,
    sortDirection,
    searchTerm,
  })
}

const createPermissionsPromise = (client: TrpcClient, project: string) => {
  return client.compute.canUser
    .query({
      project_id: project,
      permission: ["flavors:create", "flavors:delete", "flavors:list_projects"],
    })
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
  currentPage,
  onPageChange,
}: {
  flavorsPromise: Promise<{ flavors: Flavor[]; privateFlavorError?: string }>
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
  currentPage: number
  onPageChange: (page: number) => void
}) {
  const { t } = useLingui()
  const { flavors, privateFlavorError } = use(flavorsPromise)
  const permissions = use(permissionsPromise)

  const totalPages = Math.max(1, Math.ceil(flavors.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedFlavors = flavors.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    if (currentPage > totalPages) onPageChange(1)
  }, [totalPages, currentPage, onPageChange])

  return (
    <>
      <CreateFlavorModal
        client={client}
        isOpen={createModalOpen}
        project={project}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={onFlavorCreated}
      />

      {privateFlavorError && (
        <Message
          className="mb-4"
          text={t`Private flavors could not be loaded. You may be seeing an incomplete list.`}
          variant="warning"
        />
      )}

      <ListToolbar
        sortSettings={sortSettings}
        searchTerm={searchTerm}
        onSort={handleSortChange}
        onSearch={setSearchTerm}
        actions={
          permissions.canCreate ? (
            <Button variant="primary" label={t`Create Flavor`} onClick={() => setCreateModalOpen(true)} />
          ) : null
        }
      />

      <FlavorListContainer
        flavors={paginatedFlavors}
        isLoading={false}
        client={client}
        project={project}
        onFlavorDeleted={onFlavorDeleted}
        canDeleteFlavor={permissions.canDelete}
        canMangageAccess={permissions.canManageAccess}
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  )
}
export const Flavors = ({ client, project }: FlavorsProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const searchParams = useSearch({ strict: false }) as FlavorsSearchParams

  const [sortSettings, setSortSettings] = useState<RequiredSortSettings>({
    options: [
      { label: t`Name`, value: "name" },
      { label: t`VCPUs`, value: "vcpus" },
      { label: t`RAM`, value: "ram" },
      { label: t`Root Disk`, value: "disk" },
      { label: t`Swap`, value: "swap" },
    ],
    sortBy: searchParams.sortBy || "name",
    sortDirection: searchParams.sortDirection || "asc",
  })

  const [searchTerm, setSearchTerm] = useState(searchParams.search || "")
  const [currentPage, setCurrentPage] = useState(searchParams.page || 1)
  const [success, setSuccess] = useState<{ message: string; timestamp: number } | undefined>()
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const [flavorsPromise, setFlavorsPromise] = useState(() =>
    createFlavorsPromise(client, project, sortSettings.sortBy, sortSettings.sortDirection, searchTerm)
  )
  const [permissionsPromise] = useState(() => createPermissionsPromise(client, project))

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
    setCurrentPage(1)
    navigate({
      search: ((prev: FlavorsSearchParams) => ({
        ...prev,
        sortBy: settings.sortBy,
        sortDirection: settings.sortDirection,
        page: undefined,
      })) as unknown as true,
      replace: true,
    })
    startTransition(() => {
      setFlavorsPromise(createFlavorsPromise(client, project, settings.sortBy, settings.sortDirection, searchTerm))
    })
  }

  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const searchValue = typeof term === "string" ? term : ""
    setSearchTerm(searchValue)
    setCurrentPage(1)

    navigate({
      search: ((prev: FlavorsSearchParams) => ({
        ...prev,
        search: searchValue || undefined,
        page: undefined,
      })) as unknown as true,
      replace: true,
    })
    startTransition(() => {
      setFlavorsPromise(
        createFlavorsPromise(client, project, sortSettings.sortBy, sortSettings.sortDirection, searchValue)
      )
    })
  }

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page)
      navigate({
        search: ((prev: FlavorsSearchParams) => ({
          ...prev,
          page: page === 1 ? undefined : page,
        })) as unknown as true,
      })
    },
    [navigate]
  )

  return (
    <div className="relative">
      {success && (
        <Message
          className="absolute -top-14 right-0 left-0 z-50"
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
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />
      </Suspense>
    </div>
  )
}
