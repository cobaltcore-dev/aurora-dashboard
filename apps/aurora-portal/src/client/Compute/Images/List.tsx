import { TrpcClient } from "../../trpcClient"
import ImagesPage from "./components/ImagesPage"

export const Images = ({ client }: { client: TrpcClient }) => {
  return (
    <div>
      <ImagesPage client={client} />
    </div>
  )
}
