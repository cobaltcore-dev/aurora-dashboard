export type Token = {
  audit_ids?: string[]
  catalog?: {
    endpoints: {
      id: string
      interface: "public" | "admin" | "internal"
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
    password_expires_at: string | null
  }
}

export type AuroraSession = {
  authToken?: string | null
  token?: Token | null
}

export interface AuroraContext {
  validateSession(): Promise<AuroraSession>
}
