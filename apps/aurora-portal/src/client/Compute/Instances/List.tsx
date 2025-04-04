import { Server } from "../../../server/Compute/types/models"
import ServerCardView from "../components/ServerCardView"
import ServerListView from "../components/ServerListView"

export const Instances = ({ viewMode, data }: { viewMode: "list" | "card"; data: Server[] }) => {
  return viewMode === "list" ? <ServerListView servers={data} /> : <ServerCardView servers={data} />
}
