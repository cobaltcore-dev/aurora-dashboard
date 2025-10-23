import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Stack,
  Spinner,
  ContentHeading,
} from "@cloudoperators/juno-ui-components/index"
import { createFileRoute, redirect, useNavigate, useParams } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { trpcReact } from "@/client/trpcClient"
import { ImageDetailsView } from "../-components/Images/-components/ImageDetailsView"

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
  const navigate = useNavigate()
  const { t } = useLingui()

  const { data: image, status, error } = trpcReact.compute.getImageById.useQuery({ imageId: imageId })

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
        <p className="text-theme-hight">{errorMessage}</p>
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
        <p className="text-theme-hight">
          <Trans>Image not found</Trans>
        </p>
        <Button onClick={handleBack} variant="primary">
          <Trans>Back to Images</Trans>
        </Button>
      </Stack>
    )
  }

  // Render success state
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <Stack direction="vertical">
          <Breadcrumb className="my-6">
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
            <BreadcrumbItem active label={image.id} />
          </Breadcrumb>

          <Stack direction="vertical" distribution="between">
            <ContentHeading className="text-2xl font-bold text-theme-highest">
              {image.name || t`Unnamed`}
            </ContentHeading>
          </Stack>

          <ImageDetailsView image={image} />
        </Stack>
      </div>
    </div>
  )
}
