import { AuroraSignal } from "./index"

describe("Aurora", () => {
  const auroraSignal = AuroraSignal("http://localhost/identity", {
    userName: "username",
    password: "password",
    userDomainName: "domain",
  })

  it("should create a service", async () => {
    expect(auroraSignal.service).toBeInstanceOf(Function)
  })

  it("should terminate session", async () => {
    expect(auroraSignal.terminate).toBeInstanceOf(Function)
  })

  it("should get token", async () => {
    expect(auroraSignal.token).toBeInstanceOf(Function)
  })

  it("should get authToken", async () => {
    expect(auroraSignal.authToken).toBeInstanceOf(Function)
  })
})
