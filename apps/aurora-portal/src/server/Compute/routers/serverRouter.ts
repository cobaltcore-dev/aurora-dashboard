import { z } from "zod"
import { protectedProcedure } from "../../trpc"
import type { Server } from "../../../shared/types/models"

const sampleServers: Server[] = [
  {
    id: "1",
    name: "Web Server",
    accessIPv4: "192.168.1.10",
    accessIPv6: "fe80::1",
    addresses: {
      private: [{ addr: "10.0.0.1", mac_addr: "00:1A:2B:3C:4D:5E", type: "fixed", version: 4 }],
    },
    created: "2025-01-01T10:00:00Z",
    updated: "2025-01-02T12:00:00Z",
    status: "ACTIVE",
    flavor: { disk: 50, ram: 8192, vcpus: 4 },
    image: { id: "image-101" },
    metadata: { "Server Role": "Web Hosting" },
  },
  {
    id: "2",
    name: "Database Server",
    accessIPv4: "192.168.1.20",
    accessIPv6: "fe80::2",
    addresses: {
      private: [{ addr: "10.0.0.2", mac_addr: "00:1B:2C:3D:4E:5F", type: "fixed", version: 4 }],
    },
    created: "2025-01-05T11:30:00Z",
    updated: "2025-01-06T14:20:00Z",
    status: "SHUTOFF",
    flavor: { disk: 100, ram: 16384, vcpus: 8 },
    image: { id: "image-102" },
    metadata: { "Server Role": "Database" },
  },
  {
    id: "3",
    name: "Proxy Server",
    accessIPv4: "192.168.1.30",
    accessIPv6: "fe80::3",
    addresses: {
      private: [{ addr: "10.0.0.3", mac_addr: "00:1C:2D:3E:4F:6A", type: "fixed", version: 4 }],
    },
    created: "2025-01-10T08:45:00Z",
    updated: "2025-01-11T09:15:00Z",
    status: "ACTIVE",
    flavor: { disk: 20, ram: 4096, vcpus: 2 },
    image: { id: "image-103" },
    metadata: { "Server Role": "Proxy" },
  },
  {
    id: "4",
    name: "Backup Server",
    accessIPv4: "192.168.1.40",
    accessIPv6: "fe80::4",
    addresses: {
      private: [{ addr: "10.0.0.4", mac_addr: "00:1D:2E:3F:5A:6B", type: "fixed", version: 4 }],
    },
    created: "2025-01-15T13:20:00Z",
    updated: "2025-01-16T15:45:00Z",
    status: "ACTIVE",
    flavor: { disk: 200, ram: 32768, vcpus: 16 },
    image: { id: "image-104" },
    metadata: { "Server Role": "Backup" },
  },
  {
    id: "5",
    name: "Load Balancer",
    accessIPv4: "192.168.1.50",
    accessIPv6: "fe80::5",
    addresses: {
      private: [{ addr: "10.0.0.5", mac_addr: "00:1E:2F:3G:5B:6C", type: "fixed", version: 4 }],
    },
    created: "2025-01-20T09:50:00Z",
    updated: "2025-01-21T12:10:00Z",
    status: "SHUTOFF",
    flavor: { disk: 30, ram: 8192, vcpus: 4 },
    image: { id: "image-105" },
    metadata: { "Server Role": "Load Balancer" },
  },
  {
    id: "6",
    name: "Monitoring Server",
    accessIPv4: "192.168.1.60",
    accessIPv6: "fe80::6",
    addresses: {
      private: [{ addr: "10.0.0.6", mac_addr: "00:1F:2G:3H:5C:6D", type: "fixed", version: 4 }],
    },
    created: "2025-01-25T07:15:00Z",
    updated: "2025-01-26T08:30:00Z",
    status: "ACTIVE",
    flavor: { disk: 10, ram: 2048, vcpus: 1 },
    image: { id: "image-106" },
    metadata: { "Server Role": "Monitoring" },
  },
  {
    id: "7",
    name: "Kubernetes Node",
    accessIPv4: "192.168.1.70",
    accessIPv6: "fe80::7",
    addresses: {
      private: [{ addr: "10.0.0.7", mac_addr: "00:2A:3B:4C:6D:7E", type: "fixed", version: 4 }],
    },
    created: "2025-02-01T06:10:00Z",
    updated: "2025-02-02T07:45:00Z",
    status: "ACTIVE",
    flavor: { disk: 40, ram: 16384, vcpus: 8 },
    image: { id: "image-107" },
    metadata: { "Server Role": "Kubernetes Node" },
  },
  {
    id: "8",
    name: "CI/CD Runner",
    accessIPv4: "192.168.1.80",
    accessIPv6: "fe80::8",
    addresses: {
      private: [{ addr: "10.0.0.8", mac_addr: "00:2B:3C:4D:6E:7F", type: "fixed", version: 4 }],
    },
    created: "2025-02-05T05:30:00Z",
    updated: "2025-02-06T06:20:00Z",
    status: "SHUTOFF",
    flavor: { disk: 25, ram: 4096, vcpus: 2 },
    image: { id: "image-108" },
    metadata: { "Server Role": "CI/CD Runner" },
  },
  {
    id: "9",
    name: "Cache Server",
    accessIPv4: "192.168.1.90",
    accessIPv6: "fe80::9",
    addresses: {
      private: [{ addr: "10.0.0.9", mac_addr: "00:2C:3D:4E:6F:8A", type: "fixed", version: 4 }],
    },
    created: "2025-02-10T04:40:00Z",
    updated: "2025-02-11T05:55:00Z",
    status: "ACTIVE",
    flavor: { disk: 15, ram: 8192, vcpus: 4 },
    image: { id: "image-109" },
    metadata: { "Server Role": "Cache" },
  },
  {
    id: "10",
    name: "Development Server",
    accessIPv4: "192.168.1.100",
    accessIPv6: "fe80::A",
    addresses: {
      private: [{ addr: "10.0.0.10", mac_addr: "00:2D:3E:4F:7A:8B", type: "fixed", version: 4 }],
    },
    created: "2025-02-15T03:25:00Z",
    updated: "2025-02-16T04:40:00Z",
    status: "ACTIVE",
    flavor: { disk: 60, ram: 32768, vcpus: 16 },
    image: { id: "image-110" },
    metadata: { "Server Role": "Development" },
  },
]
export const serverRouter = {
  getServer: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }): Server => {
    return sampleServers[input.id]
  }),

  getServers: protectedProcedure.query((): Server[] => {
    return sampleServers
  }),
}
