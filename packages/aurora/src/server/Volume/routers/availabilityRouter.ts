import { projectScopedProcedure, projectScopedInputSchema } from "../../trpc"
import { resolveVolumeService } from "../helpers/request"

/** Endpoint metadata only: scope first, honor region/interface, and never expose endpoint URLs. */
export const volumeAvailabilityRouter = {
  getAvailability: projectScopedProcedure.input(projectScopedInputSchema).query(({ ctx }) => ({
    available: Boolean(resolveVolumeService(ctx)),
  })),
}
