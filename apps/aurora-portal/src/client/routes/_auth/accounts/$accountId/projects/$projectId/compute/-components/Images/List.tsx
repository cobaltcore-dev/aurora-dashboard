import { trpcReact } from "@/client/trpcClient"
import { ImageListView } from "./-components/ImageListView"
import { Trans } from "@lingui/react/macro"
import { Spinner, Stack } from "@cloudoperators/juno-ui-components/index"

export const Images = () => {
  const { data: images, isLoading: imagesLoading } = trpcReact.compute.listImages.useQuery({})

  const { data: canCreate, isLoading: canCreateLoading } = trpcReact.compute.canUser.useQuery("images:create")
  const { data: canDelete, isLoading: canDeleteLoading } = trpcReact.compute.canUser.useQuery("images:delete")
  const { data: canEdit, isLoading: canEditLoading } = trpcReact.compute.canUser.useQuery("images:update")

  const isLoading = imagesLoading || canCreateLoading || canDeleteLoading || canEditLoading

  if (isLoading) {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading Images...</Trans>
      </Stack>
    )
  }

  const permissions = {
    canCreate: canCreate ?? false,
    canDelete: canDelete ?? false,
    canEdit: canEdit ?? false,
  }

  return <ImageListView images={images || []} permissions={permissions} />
}
