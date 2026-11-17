import { describe, expect, it, vi } from "vitest"
import { restartSignIn } from "./restartSignIn"

describe("restartSignIn", () => {
  it("terminates the session before reloading sign-in and preserves path, search, and hash", async () => {
    let finish!: () => void
    const mutate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    const location = {
      pathname: "/projects/project-1/volumes",
      search: "?status=error",
      hash: "#attachments",
      replace: vi.fn(),
    }
    const promise = restartSignIn({ auth: { terminateUserSession: { mutate } } }, location)
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(location.replace).not.toHaveBeenCalled()
    finish()
    await promise
    expect(location.replace).toHaveBeenCalledWith(
      "/?redirect=%2Fprojects%2Fproject-1%2Fvolumes%3Fstatus%3Derror%23attachments"
    )
  })

  it("still reloads sign-in when the already-expired session rejects termination", async () => {
    const mutate = vi.fn().mockRejectedValue(new Error("expired"))
    const location = { pathname: "/projects/project-1/volumes", search: "", hash: "", replace: vi.fn() }
    await restartSignIn({ auth: { terminateUserSession: { mutate } } }, location)
    expect(location.replace).toHaveBeenCalledWith("/?redirect=%2Fprojects%2Fproject-1%2Fvolumes")
  })
})
