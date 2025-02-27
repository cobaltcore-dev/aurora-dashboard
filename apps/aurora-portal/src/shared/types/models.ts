export interface User {
  id: number
  name: string
}

export interface Server {
  id: string
  name: string
  accessIPv4: string
  accessIPv6: string
  addresses: {
    private: {
      addr: string
      mac_addr?: string
      type?: string
      version?: number
    }[]
  }
  created: string
  updated: string
  status: "ACTIVE" | "SHUTOFF"
  flavor: {
    disk: number
    ram: number
    vcpus: number
  }
  image: {
    id: string
  }
  metadata: Record<string, string>
}

export type Project = {
  domain_id: string
  enabled: boolean
  id: string
  links: {
    self: string
  }
  name: string
  description: string
}

export type ProjectsResponse = {
  projects: Project[]
  links: {
    self: string
    previous: string | null
    next: string | null
  }
}
