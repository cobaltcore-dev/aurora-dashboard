import { describe, test, expect, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ContainerLimitsTooltip } from "./ContainerLimitsTooltip"
import type { ServiceInfo, AccountInfo } from "@/server/Storage/types/swift"

const renderTooltip = (serviceInfo?: ServiceInfo, accountInfo?: AccountInfo) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ContainerLimitsTooltip serviceInfo={serviceInfo} accountInfo={accountInfo} />
      </PortalProvider>
    </I18nProvider>
  )

const renderOpenTooltip = (serviceInfo?: ServiceInfo, accountInfo?: AccountInfo) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ContainerLimitsTooltip serviceInfo={serviceInfo} accountInfo={accountInfo} open />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockAccountInfo: AccountInfo = {
  containerCount: 12,
  objectCount: 340,
  bytesUsed: 1073741824, // 1 GiB
  quotaBytes: 10737418240, // 10 GiB
}

const mockAccountInfoNoQuota: AccountInfo = {
  containerCount: 5,
  objectCount: 100,
  bytesUsed: 524288000, // 500 MiB
}

const mockSwiftBase = {
  max_file_size: 5368709120, // 5 GiB
  max_container_name_length: 256,
  max_object_name_length: 1024,
  container_listing_limit: 10000,
  account_listing_limit: 10000,
  max_header_size: 8192,
  max_meta_count: 90,
  max_meta_name_length: 128,
  max_meta_value_length: 256,
  max_meta_overall_size: 4096,
}

const mockServiceInfo: ServiceInfo = {
  swift: {
    ...mockSwiftBase,
    account_quotas: true,
    container_quotas: true,
    bulk_delete: { max_deletes_per_request: 10000, max_failed_deletes: 1000 },
    bulk_upload: { max_containers_per_extraction: 1000, max_failed_extractions: 10 },
    slo: { max_manifest_segments: 1000, max_manifest_size: 8388608, min_segment_size: 1048576 },
    container_sync: true,
    tempurl: { methods: ["GET", "HEAD", "PUT", "POST", "DELETE"] },
    symlink: true,
    versioned_writes: true,
  },
}

const mockServiceInfoMinimal: ServiceInfo = {
  swift: { ...mockSwiftBase },
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ContainerLimitsTooltip", () => {
  beforeEach(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Trigger icon", () => {
    test("renders the info icon", () => {
      renderTooltip()
      expect(screen.getByRole("img", { name: /info/i })).toBeInTheDocument()
    })

    test("renders without crashing when no props are provided", () => {
      expect(() => renderTooltip()).not.toThrow()
    })

    test("tooltip content is initially not visible", () => {
      renderTooltip(mockServiceInfo, mockAccountInfo)
      expect(screen.queryByText("Account")).not.toBeInTheDocument()
    })

    test("icon has correct data-state when closed", () => {
      renderTooltip()
      expect(screen.getByRole("img", { name: /info/i })).toHaveAttribute("data-state", "closed")
    })

    test("tooltip content is visible when open", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText("Limits")).toBeInTheDocument()
    })
  })

  describe("Account section", () => {
    test("renders Account section when accountInfo is provided", () => {
      renderOpenTooltip(undefined, mockAccountInfo)
      expect(screen.getByText("Account")).toBeInTheDocument()
    })

    test("does not render Account section when accountInfo is not provided", () => {
      renderTooltip(mockServiceInfo, undefined)
      expect(screen.queryByText("Account")).not.toBeInTheDocument()
    })

    test("displays container count", () => {
      renderOpenTooltip(undefined, mockAccountInfo)
      expect(screen.getByText("Containers:")).toBeInTheDocument()
      expect(screen.getByText("12")).toBeInTheDocument()
    })

    test("displays object count", () => {
      renderOpenTooltip(undefined, mockAccountInfo)
      expect(screen.getByText("Objects:")).toBeInTheDocument()
      expect(screen.getByText("340")).toBeInTheDocument()
    })

    test("displays bytes used formatted", () => {
      renderOpenTooltip(undefined, mockAccountInfo)
      expect(screen.getByText("Used:")).toBeInTheDocument()
      expect(screen.getByText("1 GiB")).toBeInTheDocument()
    })

    test("displays quota when quotaBytes is provided", () => {
      renderOpenTooltip(undefined, mockAccountInfo)
      expect(screen.getByText("Quota:")).toBeInTheDocument()
      expect(screen.getByText("10 GiB")).toBeInTheDocument()
    })

    test("does not display quota when quotaBytes is not provided", () => {
      renderOpenTooltip(undefined, mockAccountInfoNoQuota)
      expect(screen.getByText("Account")).toBeInTheDocument()
      expect(screen.queryByText("Quota:")).not.toBeInTheDocument()
    })
  })

  describe("Limits section", () => {
    test("renders Limits section when serviceInfo is provided", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText("Limits")).toBeInTheDocument()
    })

    test("does not render Limits section when serviceInfo is not provided", () => {
      renderTooltip(undefined, mockAccountInfo)
      expect(screen.queryByText("Limits")).not.toBeInTheDocument()
    })

    test("displays max file size formatted", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText("Max file size:")).toBeInTheDocument()
      expect(screen.getByText("5 GiB")).toBeInTheDocument()
    })

    test("does not display max file size when undefined", () => {
      const serviceInfo: ServiceInfo = { swift: { ...mockSwiftBase, max_file_size: undefined } }
      renderOpenTooltip(serviceInfo)
      expect(screen.getByText("Limits")).toBeInTheDocument()
      expect(screen.queryByText("Max file size:")).not.toBeInTheDocument()
    })

    test("displays max container name length", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText(/Max container name length/i)).toBeInTheDocument()
    })

    test("displays max object name length", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText(/Max object name length/i)).toBeInTheDocument()
      expect(screen.getByText("1024")).toBeInTheDocument()
    })

    test("displays container listing limit", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText("Container listing limit:")).toBeInTheDocument()
    })

    test("displays account listing limit", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText("Account listing limit:")).toBeInTheDocument()
    })

    test("displays max header size", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText("Max header size:")).toBeInTheDocument()
      expect(screen.getByText("8192")).toBeInTheDocument()
    })

    test("displays max meta count", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText("Max meta count:")).toBeInTheDocument()
      expect(screen.getByText("90")).toBeInTheDocument()
    })

    test("displays bulk_delete max deletes per request when present", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText(/Max deletes per request/i)).toBeInTheDocument()
    })

    test("does not display bulk_delete limit when bulk_delete is absent", () => {
      renderOpenTooltip(mockServiceInfoMinimal)
      expect(screen.getByText("Limits")).toBeInTheDocument()
      expect(screen.queryByText("Max deletes per request:")).not.toBeInTheDocument()
    })

    test("displays bulk_upload max containers per extraction when present", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText(/Max containers per extraction/i)).toBeInTheDocument()
    })

    test("does not display bulk_upload limit when bulk_upload is absent", () => {
      renderOpenTooltip(mockServiceInfoMinimal)
      expect(screen.getByText("Limits")).toBeInTheDocument()
      expect(screen.queryByText("Max containers per extraction:")).not.toBeInTheDocument()
    })

    test("displays SLO max manifest segments when present", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText("Max SLO segments:")).toBeInTheDocument()
    })

    test("does not display SLO limit when slo is absent", () => {
      renderOpenTooltip(mockServiceInfoMinimal)
      expect(screen.getByText("Limits")).toBeInTheDocument()
      expect(screen.queryByText("Max SLO segments:")).not.toBeInTheDocument()
    })
  })

  describe("Capabilities section", () => {
    test("renders Capabilities section when capabilities are present", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText("Capabilities")).toBeInTheDocument()
    })

    test("does not render Capabilities section when no capabilities are enabled", () => {
      renderOpenTooltip(mockServiceInfoMinimal)
      expect(screen.getByText("Limits")).toBeInTheDocument()
      expect(screen.queryByText("Capabilities")).not.toBeInTheDocument()
    })

    test("displays Account quotas capability", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText("Account quotas")).toBeInTheDocument()
    })

    test("displays Container quotas capability", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText("Container quotas")).toBeInTheDocument()
    })

    test("displays Efficient bulk deletion capability", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText("Efficient bulk deletion")).toBeInTheDocument()
    })

    test("displays Bulk upload of archive files capability", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText("Bulk upload of archive files")).toBeInTheDocument()
    })

    test("displays Static large object support capability", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText("Static large object support")).toBeInTheDocument()
    })

    test("displays Container syncing capability", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText("Container syncing")).toBeInTheDocument()
    })

    test("displays Temporary URLs capability", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText("Temporary URLs")).toBeInTheDocument()
    })

    test("displays Symlinks capability", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText("Symlinks")).toBeInTheDocument()
    })

    test("displays Versioned writes capability", () => {
      renderOpenTooltip(mockServiceInfo)
      expect(screen.getByText("Versioned writes")).toBeInTheDocument()
    })

    test("only shows capabilities that are enabled", () => {
      const serviceInfo: ServiceInfo = {
        swift: {
          ...mockSwiftBase,
          account_quotas: true,
          tempurl: { methods: ["GET", "HEAD", "PUT", "POST", "DELETE"] },
        },
      }
      renderOpenTooltip(serviceInfo)
      expect(screen.getByText("Account quotas")).toBeInTheDocument()
      expect(screen.getByText("Temporary URLs")).toBeInTheDocument()
      expect(screen.queryByText("Container quotas")).not.toBeInTheDocument()
      expect(screen.queryByText("Symlinks")).not.toBeInTheDocument()
    })
  })

  describe("Combined props", () => {
    test("renders all sections when both serviceInfo and accountInfo are provided", () => {
      renderOpenTooltip(mockServiceInfo, mockAccountInfo)
      expect(screen.getByText("Account")).toBeInTheDocument()
      expect(screen.getByText("Limits")).toBeInTheDocument()
      expect(screen.getByText("Capabilities")).toBeInTheDocument()
    })

    test("renders nothing beyond the icon when both props are absent", () => {
      renderTooltip()
      expect(screen.queryByText("Account")).not.toBeInTheDocument()
      expect(screen.queryByText("Limits")).not.toBeInTheDocument()
      expect(screen.queryByText("Capabilities")).not.toBeInTheDocument()
    })
  })
})
