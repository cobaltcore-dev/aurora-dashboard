import { Trans } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import { ObjectSummary } from "@/server/Storage/types/swift"
import { Route } from "../../$provider/containers/$containerName/objects"

export const SwiftObjects = () => {
  const { containerName } = Route.useParams()

  const {
    data: objects,
    isLoading,
    error,
  } = trpcReact.storage.swift.listObjects.useQuery({
    container: containerName,
    format: "json",
  })

  if (isLoading) {
    return (
      <div className="p-4">
        <Trans>Loading objects...</Trans>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <Trans>Error loading objects: {error.message}</Trans>
      </div>
    )
  }

  const objectList = (objects ?? []) as ObjectSummary[]

  return (
    <div className="p-4">
      <h2 className="mb-4 text-lg font-semibold">
        <Trans>Objects in "{containerName}"</Trans>
      </h2>

      {objectList.length === 0 ? (
        <p>
          <Trans>No objects found in this container.</Trans>
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pr-4 pb-2">
                <Trans>Name</Trans>
              </th>
              <th className="pr-4 pb-2">
                <Trans>Size</Trans>
              </th>
              <th className="pr-4 pb-2">
                <Trans>Last Modified</Trans>
              </th>
              <th className="pb-2">
                <Trans>Content Type</Trans>
              </th>
            </tr>
          </thead>
          <tbody>
            {objectList.map((obj) => (
              <tr key={obj.name} className="border-b">
                <td className="py-2 pr-4">{obj.name}</td>
                <td className="py-2 pr-4">{formatBytesBinary(obj.bytes)}</td>
                <td className="py-2 pr-4">{obj.last_modified ? new Date(obj.last_modified).toLocaleString() : "—"}</td>
                <td className="py-2">{obj.content_type ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-4 text-sm">
        <Trans>{objectList.length} objects</Trans>
      </p>
    </div>
  )
}
