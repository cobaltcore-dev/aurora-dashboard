import { Breadcrumb, BreadcrumbItem, Button, Stack, Spinner } from "@cloudoperators/juno-ui-components/index"
import { createFileRoute, redirect, useNavigate, useParams } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { trpcReact } from "@/client/trpcClient"
import { ImageDetailsView } from "../-components/Images/-components/ImageDetailsView"
import { useEffect } from "react"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/compute/images/$imageId")({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const { accountId } = params

    const availableServices = (await trpcClient?.auth.getAvailableServices.query()) || []

    const serviceIndex = getServiceIndex(availableServices)

    // Redirect to the "Projects Overview" page if none of compute services available
    if (!serviceIndex["image"] && !serviceIndex["compute"]) {
      throw redirect({
        to: "/accounts/$accountId/projects",
        params: { accountId },
      })
    }

    if (!serviceIndex["image"]["glance"]) {
      // Redirect to the "Compute Services Overview" page if the "Glance" service is not available
      throw redirect({
        to: "/accounts/$accountId/projects/$projectId/compute/$",
        params: { ...params, _splat: undefined },
      })
    }
  },
})

function RouteComponent() {
  const { accountId, projectId, imageId } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/compute/images/$imageId",
  })

  const { setPageTitle } = Route.useRouteContext()
  const navigate = useNavigate()
  const { t } = useLingui()

  const { data: image, status, error } = trpcReact.compute.getImageById.useQuery({ imageId: imageId })

  useEffect(() => {
    // Type-safe: name kann string | undefined | null sein
    if (image?.name && typeof image.name === "string") {
      setPageTitle(image.name)
    } else if (image?.id) {
      setPageTitle(image.id)
    } else if (status === "error") {
      setPageTitle(t`Error - Image Details`)
    } else if (status === "pending") {
      setPageTitle(t`Loading Image...`)
    } else {
      setPageTitle(t`Image Details`)
    }
  }, [image?.name, image?.id, status, setPageTitle, t])

  const handleBack = () => {
    navigate({
      to: "/accounts/$accountId/projects/$projectId/compute/$",
      params: { accountId, projectId, _splat: "images" },
    })
  }

  // Handle loading state
  if (status === "pending") {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading Image Details...</Trans>
      </Stack>
    )
  }

  // Handle error state
  if (status === "error") {
    const errorMessage = error?.message || "Unknown error"

    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical" gap="5">
        <p className="text-theme-error font-semibold">
          <Trans>Error loading image</Trans>
        </p>
        <p className="text-theme-highest">{errorMessage}</p>
        <Button onClick={handleBack} variant="primary">
          <Trans>Back to Images</Trans>
        </Button>
      </Stack>
    )
  }

  // Handle no data state
  if (!image) {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical" gap="5">
        <p className="text-theme-highest">
          <Trans>Image not found</Trans>
        </p>
        <Button onClick={handleBack} variant="primary">
          <Trans>Back to Images</Trans>
        </Button>
      </Stack>
    )
  }

  // Type-safe label für Breadcrumb
  const displayLabel = (image.name && typeof image.name === "string" ? image.name : image.id) || t`Unknown Image`

  // Render success state
  return (
    <Stack direction="vertical">
      <Breadcrumb>
        <BreadcrumbItem
          onClick={() => {
            navigate({
              to: "/accounts/$accountId/projects/$projectId/compute/$",
              params: { accountId, projectId, _splat: undefined },
            })
          }}
          label={t`Overview`}
          icon="home"
        />
        <BreadcrumbItem onClick={handleBack} label={t`Images`} />
        <BreadcrumbItem active label={displayLabel} />
      </Breadcrumb>
      <ImageDetailsView image={image} />
    </Stack>
  )
}
