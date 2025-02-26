export interface OpenstackIdentityTokenData {
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

export function SignalOpenstackToken({
  authToken,
  tokenData,
}: {
  authToken: string
  tokenData: OpenstackIdentityTokenData
}) {
  // Create a shallow copy to avoid direct mutation
  const immutableTokenData = { ...tokenData }
  const expiresAtDate = new Date(immutableTokenData?.expires_at)

  const availableRegions: string[] =
    immutableTokenData.catalog
      ?.map((service) => service.endpoints.map((endpoint) => endpoint.region))
      .flat()
      .filter((value, index, self) => self.indexOf(value) === index) || []

  /**
   * Find the endpoint for a service in a specific region
   * @param nameOrType service name or type
   * @param options contains region (optional) and interfaceName (required)
   * @returns string or null
   */
  function serviceEndpoint(
    nameOrType: string,
    { region, interfaceName }: { region?: string; interfaceName: string }
  ): string | null {
    if (!immutableTokenData.catalog) return null

    const resolvedRegion = region || availableRegions[0]
    const service = immutableTokenData.catalog.find((s) => s.type === nameOrType || s.name === nameOrType)
    const endpoint = service?.endpoints.find(
      (e) => (e.region_id === resolvedRegion || e.region === resolvedRegion) && e.interface === interfaceName
    )

    return endpoint?.url || null
  }

  /**
   * Check if the token has a specific service
   * @param nameOrType service name or type
   * @returns true or false
   */
  function hasService(nameOrType: string) {
    return !!immutableTokenData.catalog?.find((service) => service.type === nameOrType || service.name === nameOrType)
  }

  /**
   * Check if the token has a specific role
   * @param name role name
   * @returns true or false
   */
  function hasRole(name: string) {
    return immutableTokenData.roles.some((role) => role.name === name)
  }

  /**
   * Check if the token is expired
   * @returns true or false
   */
  function isExpired() {
    return expiresAtDate.getTime() <= Date.now()
  }

  // expose public methods and properties
  return {
    authToken,
    tokenData: immutableTokenData,
    isExpired,
    expiresAtDate,
    availableRegions,
    serviceEndpoint,
    hasService,
    hasRole,
  }
}

export type SignalOpenstackTokenType = ReturnType<typeof SignalOpenstackToken>
