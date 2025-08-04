import { Suspense, use } from "react"
import { TrpcClient } from "@/client/trpcClient"
import { Flavor } from "@/server/Compute/types/flavor"

const FlavorListContainer = ({ getImagesPromise }: { getImagesPromise: Promise<Flavor[] | undefined> }) => {
  const flavors = use(getImagesPromise)
  if (!flavors || flavors.length === 0) {
    return <p>No flavors available.</p>
  }

  console.log(flavors)

  return <p>{flavors && "sdfs"}</p>
}

interface ImagesProps {
  client: TrpcClient
  project: string
}

export const Flavors = ({ client, project }: ImagesProps) => {
  const getFlavorsPromise = client.compute.getFlavorsByProjectId.query({ projectId: project })
  return (
    <Suspense fallback={<div>Loading images...</div>}>
      <FlavorListContainer getImagesPromise={getFlavorsPromise} />
    </Suspense>
  )
}
