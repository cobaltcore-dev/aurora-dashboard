import { createFileRoute, ErrorComponent, redirect, useParams } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { TrpcClient } from "@/client/trpcClient"
import { ErrorBoundary } from "react-error-boundary"
import { Overview } from "./-components/Overview"
import { Instances } from "./-components/Instances/List"
import { Images } from "./-components/Images/List"
import { KeyPairs } from "./-components/KeyPairs/List"
import { ServerGroups } from "./-components/ServerGroups/List"
import { Flavors } from "./-components/Flavors/List"
import { z } from "zod"

const checkServiceAvailability = (
  availableServices: {
    type: string
    name: string
  }[],
  params: {
    accountId: string
    projectId: string
    _splat?: string | undefined
  }
) => {
  const { _splat: splat = "", accountId } = params

  let shouldNavigateToOverview = false

  const serviceIndex = getServiceIndex(availableServices)

  // Redirect to the "Projects Overview" page if none of compute/network services available
  if (!serviceIndex["image"] && !serviceIndex["compute"] && !serviceIndex["network"]) {
    throw redirect({
      to: "/accounts/$accountId/projects",
      params: { accountId },
    })
  }

  if (splat === "images" && !serviceIndex["image"]?.["glance"]) {
    shouldNavigateToOverview = true
  }

  if (["instances", "keypairs", "servergroups", "flavors"].includes(splat) && !serviceIndex["compute"]?.["nova"]) {
    shouldNavigateToOverview = true
  }

  if (shouldNavigateToOverview) {
    // Redirect to the "Compute Services Overview" page if a specific compute service is not available
    throw redirect({
      to: "/accounts/$accountId/projects/$projectId/compute/$",
      params: { ...params, _splat: undefined },
    })
  }
}

// Helper to validate multi-value filters like "value" or "in:value1,value2,..."
const multiValueEnum = (allowedValues: string[]) => {
  return z.string().refine((val) => {
    const values = val.startsWith("in:") ? val.replace("in:", "").split(",") : [val]
    return values.every((v) => allowedValues.includes(v))
  })
}

// Search params schema for the images page (for deep linking)
// Uses .passthrough() to allow other tabs' search params to coexist
const imagesSearchSchema = z.object({
  // Filters - can be single value or "in:value1,value2,..." for multi-value
  status: multiValueEnum([
    "queued",
    "saving",
    "active",
    "deactivated",
    "killed",
    "deleted",
    "pending_delete",
  ]).optional(),
  visibility: z.enum(["public", "private", "shared", "community", "all"]).optional(),
  disk_format: multiValueEnum([
    "ami",
    "ari",
    "aki",
    "vhd",
    "vhdx",
    "vmdk",
    "raw",
    "qcow2",
    "vdi",
    "iso",
    "ploop",
  ]).optional(),
  container_format: multiValueEnum(["ami", "ari", "aki", "bare", "ovf", "ova", "docker"]).optional(),
  protected: z.enum(["true", "false"]).optional(),

  // Search
  search: z.string().optional(),

  // Sort
  sortBy: z.enum(["created_at", "updated_at", "name", "size", "status"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
}).passthrough()

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/compute/$")({
  component: RouteComponent,
  errorComponent: ({ error }) => {
    if (error instanceof Error) {
      return <div>{error.message}</div>
    }
    return <ErrorComponent error={error} />
  },
  notFoundComponent: () => {
    return <p>Compute service not found</p>
  },
  validateSearch: (search) => imagesSearchSchema.parse(search),
  loader: async ({ context }) => {
    const { trpcClient } = context
    const availableServices = await trpcClient?.auth.getAvailableServices.query()

    return {
      client: trpcClient,
      availableServices,
    }
  },
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const availableServices = await trpcClient?.auth.getAvailableServices.query()
    checkServiceAvailability(availableServices!, params)
  },
})

function RouteComponent() {
  const { client } = Route.useLoaderData()
  return <ComputeDashboard client={client!} />
}

function ComputeDashboard({ client }: { client: TrpcClient }) {
  const { project, splat } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/compute/$",
    select: (params) => {
      return { project: params.projectId, splat: params._splat }
    },
  })

  const { setPageTitle } = Route.useRouteContext()
  const { t } = useLingui()

  switch (splat) {
    case "instances":
      setPageTitle(t`Instances`)
      break
    case "images":
      setPageTitle(t`Images`)
      break
    case "keypairs":
      setPageTitle(t`Key Pairs`)
      break
    case "servergroups":
      setPageTitle(t`Server Groups`)
      break
    case "flavors":
      setPageTitle(t`Flavors`)
      break
    default:
      setPageTitle(t`Compute Overview`)
  }

  return (
    <div>
      {project ? (
        <ErrorBoundary
          fallback={
            <div className="p-4 text-center">
              <Trans>Error loading component</Trans>
            </div>
          }
        >
          {(() => {
            switch (splat) {
              case "instances":
                return <Instances client={client} project={project} viewMode="list" />
              case "images":
                return <Images client={client} />
              case "keypairs":
                return <KeyPairs project={project} client={client} />
              case "servergroups":
                return <ServerGroups project={project} client={client} />
              case "flavors":
                return <Flavors project={project} client={client} />
              default:
                return <Overview project={project} client={client} />
            }
          })()}
        </ErrorBoundary>
      ) : (
        <div className="p-4 text-center">
          <Trans>No project selected</Trans>
        </div>
      )}
    </div>
  )
}
