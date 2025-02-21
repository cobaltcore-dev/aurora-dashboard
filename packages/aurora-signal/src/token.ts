export interface ResponseToken {
  application_credential?: {
    id: string
    name: string
    restricted: boolean
  }
  audit_ids?: string[]
  catalog?: {
    endpoints: {
      id: string
      interface: string
      region: string
      region_id: string
      url: string
    }[]
    type: string
    id: string
    name: string
  }[]
  expires_at: string
  issued_at: string
  methods: string[]
  roles: {
    id: string
    name: string
  }[]
  system: {
    all: boolean
  }
  user: {
    domain: {
      id: string
      name: string
    }
    id: string
    name: string
    password_expires_at: string
  }
}

export class AuroraSignalToken {
  private expiresAt: number
  authToken: string
  availableRegions: string[]
  tokenData: ResponseToken

  constructor(token: ResponseToken, authToken: string) {
    this.tokenData = token
    this.authToken = authToken
    this.expiresAt = new Date(token.expires_at).getTime()

    this.availableRegions = []
    if (token.catalog !== undefined) {
      for (const service of token.catalog) {
        if (service.type === "identity") continue
        const endpoints = service.endpoints || []
        for (const endpoint of endpoints) {
          this.availableRegions.push(endpoint.region)
        }
      }
      this.availableRegions = this.availableRegions.filter((value, index, self) => self.indexOf(value) === index)
    }
  }

  get isExpired(): boolean {
    return this.expiresAt <= Date.now()
  }

  hasService(name: string): boolean {
    return !!this.tokenData.catalog?.find((service) => service.type === name || service.name === name)
  }

  hasRole(name: string): boolean {
    return this.tokenData.roles.some((role) => role.name === name)
  }

  serviceEndpoint(type: string, options: { region?: string; interfaceName: string }): string | null {
    const region = options.region || (this.availableRegions.length > 0 && this.availableRegions[0])
    const interfaceName = options.interfaceName

    if (this.tokenData.catalog === undefined) return null

    const service = this.tokenData.catalog.find((s) => s.type === type || s.name === type)
    if (!service) return null

    const endpoint = service.endpoints.find(
      (e) => (e.region_id === region || e.region === region) && e.interface === interfaceName
    )

    if (!endpoint) return null

    return endpoint.url
  }
}

export type AuroraSignalTokenType = InstanceType<typeof AuroraSignalToken>
