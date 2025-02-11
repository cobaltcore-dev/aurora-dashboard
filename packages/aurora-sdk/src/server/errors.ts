import { TRPCError } from "@trpc/server"
import { TRPC_ERROR_CODE_KEY } from "@trpc/server/unstable-core-do-not-import"

export class AuroraSDKTRPCError extends TRPCError {
  constructor({ code, message }: { code: TRPC_ERROR_CODE_KEY; message?: string }) {
    super({ code, message })
    this.name = "AuroraSDKTRPCError"
  }
}

export class AuroraSDKError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuroraSDKError"
  }
}
