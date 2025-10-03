import { Suspense, use } from "react"
import { GlanceImage } from "@/server/Compute/types/image"
import { TrpcClient } from "@/client/trpcClient"
import { ImageListView } from "./-components/ImageListView"
import { Trans } from "@lingui/react/macro"
import { Spinner, Stack } from "@cloudoperators/juno-ui-components/index"

const ImageListContainer = ({ getImagesPromise }: { getImagesPromise: Promise<GlanceImage[] | undefined> }) => {
  const images = use(getImagesPromise)
  if (!images || images.length === 0) {
    return <p>No images available.</p>
  }

  return <ImageListView images={images} />
}

interface ImagesProps {
  client: TrpcClient
}

export const Images = ({ client }: ImagesProps) => {
  const getImagesPromise = client.compute.listImages.query({})

  return (
    <Suspense
      fallback={
        <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
          <Spinner variant="primary" size="large" className="m-2" />
          <Trans>Loading Images...</Trans>
        </Stack>
      }
    >
      <ImageListContainer getImagesPromise={getImagesPromise} />
    </Suspense>
  )
}
