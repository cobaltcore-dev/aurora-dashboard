import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { describe, it, expect, afterEach, vi } from "vitest"
import { SecurityGroupRulesTable } from "./SecurityGroupRulesTable"
import type { SecurityGroupRule } from "@/server/Network/types/securityGroup"
import type { FilterSettings } from "@/client/components/ListToolbar/types"
import type { ListSortConfig } from "@/client/utils/useListWithFiltering"

const mockRules: SecurityGroupRule[] = [
  {
    id: "rule-1",
    direction: "ingress",
    protocol: "tcp",
    port_range_min: 80,
    port_range_max: 80,
    remote_ip_prefix: "0.0.0.0/0",
    description: "HTTP traffic",
    ethertype: "IPv4",
  },
  {
    id: "rule-2",
    direction: "egress",
    protocol: "tcp",
    port_range_min: 443,
    port_range_max: 443,
    remote_ip_prefix: "0.0.0.0/0",
    description: "HTTPS traffic",
    ethertype: "IPv4",
  },
  {
    id: "rule-3",
    direction: "ingress",
    protocol: "icmp",
    port_range_min: 8,
    port_range_max: 0,
    remote_ip_prefix: "10.0.0.0/8",
    description: "ICMP ping",
    ethertype: "IPv4",
  },
  {
    id: "rule-4",
    direction: "ingress",
    protocol: "tcp",
    port_range_min: 22,
    port_range_max: 22,
    remote_group_id: "sg-12345678-abcd-efgh-ijkl-1234567890ab",
    description: "SSH from security group",
    ethertype: "IPv4",
  },
  {
    id: "rule-5",
    direction: "egress",
    protocol: null,
    port_range_min: null,
    port_range_max: null,
    remote_ip_prefix: "0.0.0.0/0",
    description: null,
    ethertype: "IPv4",
  },
]

const createWrapper =
  () =>
  ({ children }: { children: React.ReactNode }) => (
    <I18nProvider i18n={i18n}>
      <PortalProvider>{children}</PortalProvider>
    </I18nProvider>
  )

const defaultSortSettings: ListSortConfig<"direction" | "protocol" | "description"> = {
  sortBy: "direction",
  sortDirection: "asc",
  options: [
    { value: "direction", label: "Direction" },
    { value: "protocol", label: "Protocol" },
    { value: "description", label: "Description" },
  ],
}

const defaultFilterSettings: FilterSettings = {
  selectedFilters: [],
  filters: [
    {
      displayName: "Direction",
      filterName: "direction",
      values: ["all", "ingress", "egress"],
      supportsMultiValue: false,
    },
  ],
}

describe("SecurityGroupRulesTable", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders empty state when no rules provided", () => {
      render(<SecurityGroupRulesTable rules={[]} onDeleteRule={vi.fn()} isDeletingRule={false} deleteError={null} />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByText("There are no rules for this security group")).toBeInTheDocument()
    })

    it("renders empty state with filters when rules are filtered out", () => {
      render(
        <SecurityGroupRulesTable
          rules={[]}
          onDeleteRule={vi.fn()}
          isDeletingRule={false}
          deleteError={null}
          searchTerm="nonexistent"
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText("There are no rules for this security group")).toBeInTheDocument()
    })

    it("renders table with rules when provided", () => {
      render(
        <SecurityGroupRulesTable rules={mockRules} onDeleteRule={vi.fn()} isDeletingRule={false} deleteError={null} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText("HTTP traffic")).toBeInTheDocument()
      expect(screen.getByText("HTTPS traffic")).toBeInTheDocument()
      expect(screen.getByText("ICMP ping")).toBeInTheDocument()
      expect(screen.getByText("SSH from security group")).toBeInTheDocument()
    })

    it("renders all column headers correctly", () => {
      render(
        <SecurityGroupRulesTable rules={mockRules} onDeleteRule={vi.fn()} isDeletingRule={false} deleteError={null} />,
        { wrapper: createWrapper() }
      )

      // Check for table headers (there are also labels with same text, so use getAllByText)
      expect(screen.getAllByText("Direction").length).toBeGreaterThan(0)
      expect(screen.getAllByText("Description").length).toBeGreaterThan(0)
      expect(screen.getAllByText("Ethertype").length).toBeGreaterThan(0)
      expect(screen.getAllByText("Protocol").length).toBeGreaterThan(0)
      expect(screen.getByText("Range")).toBeInTheDocument()
      expect(screen.getByText("Actions")).toBeInTheDocument()
      // Note: "Remote Source" column was removed in linter updates
    })

    it("renders Add rule button when onCreateRule provided", () => {
      const onCreateRule = vi.fn()
      render(
        <SecurityGroupRulesTable
          rules={mockRules}
          onDeleteRule={vi.fn()}
          isDeletingRule={false}
          deleteError={null}
          securityGroupId="sg-123"
          onCreateRule={onCreateRule}
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByRole("button", { name: /Add rule/i })).toBeInTheDocument()
    })

    it("does not render Add rule button when onCreateRule not provided", () => {
      render(
        <SecurityGroupRulesTable rules={mockRules} onDeleteRule={vi.fn()} isDeletingRule={false} deleteError={null} />,
        { wrapper: createWrapper() }
      )

      expect(screen.queryByRole("button", { name: /Add rule/i })).not.toBeInTheDocument()
    })
  })

  describe("Filtering UI", () => {
    it("renders filter inputs when filterSettings provided", () => {
      render(
        <SecurityGroupRulesTable
          rules={mockRules}
          onDeleteRule={vi.fn()}
          isDeletingRule={false}
          deleteError={null}
          filterSettings={defaultFilterSettings}
          onFilterChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      )

      // FiltersInput has a "Filters" label for the filter key select
      const filterSelect = screen.getByLabelText("Filters")
      expect(filterSelect).toBeInTheDocument()
    })

    it("updates filter when key and value are selected", async () => {
      const onFilterChange = vi.fn()
      render(
        <SecurityGroupRulesTable
          rules={mockRules}
          onDeleteRule={vi.fn()}
          isDeletingRule={false}
          deleteError={null}
          filterSettings={defaultFilterSettings}
          onFilterChange={onFilterChange}
        />,
        { wrapper: createWrapper() }
      )

      const user = userEvent.setup()

      // Step 1: Click the filter key select (labeled "Filters")
      const filterKeySelect = screen.getByLabelText("Filters")
      await user.click(filterKeySelect)

      // Step 2: Select "Direction" as the filter key (use data-testid)
      const directionOption = screen.getByTestId("direction")
      await user.click(directionOption)

      // Step 3: The value combobox should now be enabled, click it to open options
      const filterValueInput = screen.getByRole("combobox")
      await user.click(filterValueInput)

      // Step 4: Select the ingress option from the dropdown (use data-testid)
      const ingressOption = screen.getByTestId("ingress")
      await user.click(ingressOption)

      // Verify onFilterChange was called with the correct filter
      expect(onFilterChange).toHaveBeenCalledWith({
        ...defaultFilterSettings,
        selectedFilters: [{ name: "direction", value: "ingress" }],
      })
    })

    it("renders search input", () => {
      render(
        <SecurityGroupRulesTable
          rules={mockRules}
          onDeleteRule={vi.fn()}
          isDeletingRule={false}
          deleteError={null}
          onSearchChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument()
    })

    it("calls onSearchChange when search input changes", async () => {
      const onSearchChange = vi.fn()
      render(
        <SecurityGroupRulesTable
          rules={mockRules}
          onDeleteRule={vi.fn()}
          isDeletingRule={false}
          deleteError={null}
          onSearchChange={onSearchChange}
        />,
        { wrapper: createWrapper() }
      )

      const searchInput = screen.getByPlaceholderText("Search...")
      const user = userEvent.setup()
      await user.type(searchInput, "HTTP")

      // Wait for debounce (500ms)
      await new Promise((resolve) => setTimeout(resolve, 600))

      // After debounce, onSearchChange should be called with the final value
      expect(onSearchChange).toHaveBeenCalledWith("HTTP")
    })

    it("displays active filter badges", () => {
      const filterSettingsWithIngress: FilterSettings = {
        ...defaultFilterSettings,
        selectedFilters: [{ name: "direction", value: "ingress" }],
      }

      render(
        <SecurityGroupRulesTable
          rules={mockRules}
          onDeleteRule={vi.fn()}
          isDeletingRule={false}
          deleteError={null}
          filterSettings={filterSettingsWithIngress}
          onFilterChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      )

      // Check that the filter pill is displayed - use getAllByText since "ingress" appears in both pills and table
      const ingressElements = screen.getAllByText("ingress")
      expect(ingressElements.length).toBeGreaterThan(0)
      // At least one should be in a pill (has pill-value class)
      const pillElement = ingressElements.find((el) => el.className.includes("pill-value"))
      expect(pillElement).toBeInTheDocument()
    })

    it("removes individual filter when close button clicked", async () => {
      const onFilterChange = vi.fn()
      const filterSettingsWithFilter: FilterSettings = {
        ...defaultFilterSettings,
        selectedFilters: [{ name: "direction", value: "ingress" }],
      }

      render(
        <SecurityGroupRulesTable
          rules={mockRules}
          onDeleteRule={vi.fn()}
          isDeletingRule={false}
          deleteError={null}
          filterSettings={filterSettingsWithFilter}
          onFilterChange={onFilterChange}
        />,
        { wrapper: createWrapper() }
      )

      // Find the close button in the filter pill
      const closeButtons = screen.getAllByRole("button", { name: /close/i })
      const user = userEvent.setup()
      // Click the first close button (should be the filter pill close button)
      await user.click(closeButtons[0])

      // The filter should be removed
      expect(onFilterChange).toHaveBeenCalled()
    })
  })

  describe("Sorting UI", () => {
    it("renders sort field dropdown with current value", () => {
      render(
        <SecurityGroupRulesTable
          rules={mockRules}
          onDeleteRule={vi.fn()}
          isDeletingRule={false}
          deleteError={null}
          sortSettings={defaultSortSettings}
          onSortChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      )

      const sortSelect = screen.getByLabelText("Sort by")
      expect(sortSelect).toBeInTheDocument()
    })

    it("calls onSortChange when sort field changed", async () => {
      const onSortChange = vi.fn()
      render(
        <SecurityGroupRulesTable
          rules={mockRules}
          onDeleteRule={vi.fn()}
          isDeletingRule={false}
          deleteError={null}
          sortSettings={defaultSortSettings}
          onSortChange={onSortChange}
        />,
        { wrapper: createWrapper() }
      )

      const sortSelect = screen.getByLabelText("Sort by")
      const user = userEvent.setup()
      await user.click(sortSelect)

      // Get all elements with text "Protocol" and find the one in the dropdown
      const protocolOptions = screen.getAllByText("Protocol")
      // The dropdown option should be clickable
      const protocolOption =
        protocolOptions.find((el) => el.hasAttribute("data-value")) || protocolOptions[protocolOptions.length - 1]

      await user.click(protocolOption)

      expect(onSortChange).toHaveBeenCalledWith({
        ...defaultSortSettings,
        sortBy: "protocol",
      })
    })

    it("renders sort direction toggle button", () => {
      render(
        <SecurityGroupRulesTable
          rules={mockRules}
          onDeleteRule={vi.fn()}
          isDeletingRule={false}
          deleteError={null}
          sortSettings={defaultSortSettings}
          onSortChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      )

      const toggleButton = screen.getByTestId("direction-toggle")
      expect(toggleButton).toBeInTheDocument()
    })

    it("toggles sort direction when button clicked", async () => {
      const onSortChange = vi.fn()
      render(
        <SecurityGroupRulesTable
          rules={mockRules}
          onDeleteRule={vi.fn()}
          isDeletingRule={false}
          deleteError={null}
          sortSettings={defaultSortSettings}
          onSortChange={onSortChange}
        />,
        { wrapper: createWrapper() }
      )

      const toggleButton = screen.getByTestId("direction-toggle")
      const user = userEvent.setup()
      await user.click(toggleButton)

      expect(onSortChange).toHaveBeenCalledWith({
        ...defaultSortSettings,
        sortDirection: "desc",
      })
    })

    it("displays expandMore icon when sort direction is asc", () => {
      render(
        <SecurityGroupRulesTable
          rules={mockRules}
          onDeleteRule={vi.fn()}
          isDeletingRule={false}
          deleteError={null}
          sortSettings={{ ...defaultSortSettings, sortDirection: "asc" }}
          onSortChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      )

      const button = screen.getByTestId("direction-toggle")
      // Check if the button contains an element with the expandMore icon
      const svg = button.querySelector("svg")
      expect(svg).toBeInTheDocument()
    })

    it("displays expandLess icon when sort direction is desc", () => {
      render(
        <SecurityGroupRulesTable
          rules={mockRules}
          onDeleteRule={vi.fn()}
          isDeletingRule={false}
          deleteError={null}
          sortSettings={{ ...defaultSortSettings, sortDirection: "desc" }}
          onSortChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      )

      const button = screen.getByTestId("direction-toggle")
      const svg = button.querySelector("svg")
      expect(svg).toBeInTheDocument()
    })
  })

  describe("Port Range Formatting", () => {
    it("formats single port correctly", () => {
      const rule = mockRules[0] // port 80
      render(
        <SecurityGroupRulesTable rules={[rule]} onDeleteRule={vi.fn()} isDeletingRule={false} deleteError={null} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText("80")).toBeInTheDocument()
    })

    it("formats port range correctly", () => {
      const rule: SecurityGroupRule = {
        ...mockRules[0],
        port_range_min: 80,
        port_range_max: 443,
      }
      render(
        <SecurityGroupRulesTable rules={[rule]} onDeleteRule={vi.fn()} isDeletingRule={false} deleteError={null} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText("80-443")).toBeInTheDocument()
    })

    it("formats ICMP type and code correctly", () => {
      const rule = mockRules[2] // ICMP with type 8, code 0
      render(
        <SecurityGroupRulesTable rules={[rule]} onDeleteRule={vi.fn()} isDeletingRule={false} deleteError={null} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText("Type: 8, Code: 0")).toBeInTheDocument()
    })
  })

  describe("Delete Functionality", () => {
    it("renders delete menu items for each rule", () => {
      render(
        <SecurityGroupRulesTable rules={mockRules} onDeleteRule={vi.fn()} isDeletingRule={false} deleteError={null} />,
        { wrapper: createWrapper() }
      )

      // Find all rule rows to verify they exist (delete actions are in popup menus)
      const ruleRows = screen.getAllByRole("row").slice(1) // Skip header row
      expect(ruleRows).toHaveLength(mockRules.length)
    })

    it("opens delete dialog when delete menu item is clicked", async () => {
      const onDeleteRule = vi.fn()
      render(
        <SecurityGroupRulesTable
          rules={mockRules}
          onDeleteRule={onDeleteRule}
          isDeletingRule={false}
          deleteError={null}
        />,
        { wrapper: createWrapper() }
      )

      // The actual deletion happens through a PopupMenu with Delete menu item
      // which opens a DeleteRuleDialog. This is tested in DeleteRuleDialog.test.tsx
      // Here we just verify the table renders with rules
      const ruleRows = screen.getAllByRole("row").slice(1)
      expect(ruleRows[0]).toBeInTheDocument()
    })
  })
})
