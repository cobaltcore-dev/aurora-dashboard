import { createRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"
import { usePushBreadcrumbs } from "@cobaltcore-dev/aurora/client"
import { rootRoute } from "../__root"
import { ContainersList } from "./ContainersList"
import { uuidFromRef } from "../../utils"
import type { Container } from "../../../server/types"

const containersSearchSchema = z.object({
  search: z.string().optional(),
  page: z.number().optional(),
})

export const containersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/containers",
  validateSearch: (s) => containersSearchSchema.catch({}).parse(s),
  component: ContainersListPage,
})

function ContainersListPage() {
  const { projectId } = containersRoute.useRouteContext()
  const { search = "", page = 1 } = containersRoute.useSearch()
  const navigate = useNavigate()

  usePushBreadcrumbs([
    { label: "Key Manager", onClick: () => navigate({ to: "/secrets" }) },
    { label: "Containers", active: true },
  ])

  const handleSearch = (value: string) => {
    void navigate({ to: "/containers", search: { search: value || undefined, page: undefined } })
  }
  const handlePageChange = (newPage: number) => {
    void navigate({
      to: "/containers",
      search: { search: search || undefined, page: newPage === 1 ? undefined : newPage },
    })
  }
  const handleShowDetail = (container: Container) => {
    void navigate({
      to: "/containers/$containerId",
      params: { containerId: uuidFromRef(container.container_ref) },
    })
  }

  return (
    <ContainersList
      projectId={projectId}
      search={search}
      page={page}
      onSearchChange={handleSearch}
      onPageChange={handlePageChange}
      onShowDetail={handleShowDetail}
    />
  )
}
