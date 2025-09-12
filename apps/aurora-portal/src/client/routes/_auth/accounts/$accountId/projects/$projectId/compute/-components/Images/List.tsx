import { Suspense, use } from "react"
import { GlanceImage } from "@/server/Compute/types/image"
import { TrpcClient } from "@/client/trpcClient"
import { ImageListView } from "./-components/ImageListView"

const ImageListContainer = ({ getImagesPromise }: { getImagesPromise: Promise<GlanceImage[] | undefined> }) => {
  const images = use(getImagesPromise)
  if (!images || images.length === 0) {
    return <p>No images available.</p>
  }

  return <ImageListView images={images} />
}

interface ImagesProps {
  client: TrpcClient
  project: string
}

export const Images = ({ client, project }: ImagesProps) => {
  const getImagesPromise = client.compute.getImagesByProjectId.query({ projectId: project })

  return (
    <Suspense fallback={<div className="p-4 text-center ">Loading images...</div>}>
      <ImageListContainer getImagesPromise={getImagesPromise} />
    </Suspense>
  )
}
