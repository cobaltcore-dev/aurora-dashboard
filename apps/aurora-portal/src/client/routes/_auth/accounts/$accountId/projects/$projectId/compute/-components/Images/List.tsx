import { Suspense, use } from "react"
import { GlanceImage } from "@/server/Compute/types/image"
import { TrpcClient } from "@/client/trpcClient"
import { ImageListView } from "./-components/ImageListView"
import { Trans } from "@lingui/react/macro"
import { Spinner, Stack } from "@cloudoperators/juno-ui-components/index"

const ImageListContainer = ({
  getImagesPromise,
  getPermissionsPromise,
  client,
}: {
  getImagesPromise: Promise<GlanceImage[] | undefined>
  getPermissionsPromise: Promise<{
    canCreate: boolean
    canDelete: boolean
    canEdit: boolean
  }>
  client: TrpcClient
}) => {
  const permissions = use(getPermissionsPromise)
  const images = use(getImagesPromise)

  return <ImageListView images={images || []} permissions={permissions} client={client} />
}

interface ImagesProps {
  client: TrpcClient
}

export const Images = ({ client }: ImagesProps) => {
  const getImagesPromise = client.compute.listImages.query({})

  const getPermissionsPromise = Promise.all([
    client.compute.canUser.query("images:create"),
    client.compute.canUser.query("images:delete"),
    client.compute.canUser.query("images:update"),
  ]).then(([canCreate, canDelete, canEdit]) => ({ canCreate, canDelete, canEdit }))

  return (
    <Suspense
      fallback={
        <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
          <Spinner variant="primary" size="large" className="mb-2" />
          <Trans>Loading Images...</Trans>
        </Stack>
      }
    >
      <ImageListContainer
        getImagesPromise={getImagesPromise}
        getPermissionsPromise={getPermissionsPromise}
        client={client}
      />
    </Suspense>
  )
}
