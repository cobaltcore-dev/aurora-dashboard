import { AuroraSignalService } from "./service"
import { AuroraSignalToken, AuroraSignalTokenType } from "./token"

const TestToken = {
  expires_at: "2021-01-01T00:00:00Z",
  catalog: [
    {
      endpoints: [
        {
          id: "id",
          interface: "public",
          region: "region",
          region_id: "region_id",
          url: "http://localhost/service1",
        },
      ],
      type: "type",
      id: "id",
      name: "service1",
    },
  ],
  issued_at: "2021-01-01T00:00:00Z",
  methods: ["method"],
  roles: [
    {
      id: "id",
      name: "name",
    },
  ],
  system: {
    all: true,
  },
  user: {
    domain: {
      id: "id",
      name: "name",
    },
    id: "id",
    name: "name",
    password_expires_at: "2021-01-01T00:00:00Z",
  },
}

describe("service", () => {
  let token: AuroraSignalTokenType
  beforeAll(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-Subject-Token": "token" }),
      json: () => ({ token: TestToken }),
    })
    token = AuroraSignalToken({ tokenData: TestToken, authToken: "token" })
  })

  it("should create a service", () => {
    const service = AuroraSignalService("name", token, {})
    expect(service).toBeInstanceOf(Object)
  })

  it("should respond to head", async () => {
    const service = AuroraSignalService("name", token, {})
    expect(service.head).toBeInstanceOf(Function)
  })

  it("should respond to get", async () => {
    const service = AuroraSignalService("name", token, {})
    expect(service.get).toBeInstanceOf(Function)
  })

  it("should respond to post", async () => {
    const service = AuroraSignalService("name", token, {})
    expect(service.post).toBeInstanceOf(Function)
  })

  it("should respond to put", async () => {
    const service = AuroraSignalService("name", token, {})
    expect(service.put).toBeInstanceOf(Function)
  })

  it("should respond to patch", async () => {
    const service = AuroraSignalService("name", token, {})
    expect(service.patch).toBeInstanceOf(Function)
  })

  it("should respond to del", async () => {
    const service = AuroraSignalService("name", token, {})
    expect(service.del).toBeInstanceOf(Function)
  })

  describe("serviceOptions", () => {
    it("should respond to head with options", async () => {
      const service = AuroraSignalService("service1", token, {})
      expect(service.head("path", {})).toBeInstanceOf(Promise)
    })

    it("should respond to get with options: region", async () => {
      const service = AuroraSignalService("service1", token, { region: "region" })
      expect(service.get("path", {})).toBeInstanceOf(Promise)
    })

    it("should throw error for unknown region", async () => {
      const service = AuroraSignalService("service1", token, { region: "region1" })
      await expect(service.get("path", {})).rejects.toThrow(
        "AuroraSignalError: Service service1 (region: region1, interface: public) not found."
      )
    })

    it("should respond to get with options: interface", async () => {
      const service = AuroraSignalService("service1", token, { region: "region", interfaceName: "public" })
      expect(service.get("path", {})).toBeInstanceOf(Promise)
    })

    it("should throw error for unknown interface", async () => {
      const service = AuroraSignalService("service1", token, { region: "region", interfaceName: "unknown" })
      await expect(service.get("path", {})).rejects.toThrow(
        "AuroraSignalError: Service service1 (region: region, interface: unknown) not found."
      )
    })

    it("should respond to get with options", async () => {
      const service = AuroraSignalService("service1", token, { region: "region", interfaceName: "public" })
      await service.get("path", {})
      expect(globalThis.fetch).toHaveBeenCalledWith("http://localhost/service1/path", {
        method: "GET",
        headers: { "X-Auth-Token": "token" },
      })
    })

    it("should overwrite options", async () => {
      const service = AuroraSignalService("service1", token, { region: "unknown", interfaceName: "unknown" })
      await service.get("test", { region: "region", interfaceName: "public" })
      expect(globalThis.fetch).toHaveBeenLastCalledWith("http://localhost/service1/test", {
        method: "GET",
        headers: { "X-Auth-Token": "token" },
      })
    })
  })
})
