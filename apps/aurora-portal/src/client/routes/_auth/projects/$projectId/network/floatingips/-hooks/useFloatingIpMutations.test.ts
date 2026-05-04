import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useFloatingIpMutations } from "./useFloatingIpMutations"

const { mockUseUtils, mockUpdateUseMutation, mockDeleteUseMutation } = vi.hoisted(() => ({
  mockUseUtils: vi.fn(),
  mockUpdateUseMutation: vi.fn(),
  mockDeleteUseMutation: vi.fn(),
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: mockUseUtils,
    network: {
      floatingIp: {
        update: {
          useMutation: mockUpdateUseMutation,
        },
        delete: {
          useMutation: mockDeleteUseMutation,
        },
      },
    },
  },
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: vi.fn(() => "proj-1"),
}))

describe("useFloatingIpMutations", () => {
  const listCancelMock = vi.fn(async () => undefined)
  const listInvalidateMock = vi.fn()
  const getByIdCancelMock = vi.fn(async () => undefined)
  const getByIdGetDataMock = vi.fn()
  const getByIdSetDataMock = vi.fn()
  const getByIdInvalidateMock = vi.fn()

  const updateMutateAsyncMock = vi.fn(async () => undefined)
  const deleteMutateAsyncMock = vi.fn(async () => undefined)

  let updateOptions:
    | {
        onMutate?: (variables: Record<string, unknown>) => Promise<unknown>
        onError?: (err: unknown, variables: Record<string, unknown>, context: Record<string, unknown>) => void
        onSettled?: (data: unknown, error: unknown, variables: Record<string, unknown>) => void
      }
    | undefined

  let deleteOptions:
    | {
        onMutate?: () => Promise<unknown>
        onSettled?: () => void
      }
    | undefined

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseUtils.mockReturnValue({
      network: {
        floatingIp: {
          list: {
            cancel: listCancelMock,
            invalidate: listInvalidateMock,
          },
          getById: {
            cancel: getByIdCancelMock,
            getData: getByIdGetDataMock,
            setData: getByIdSetDataMock,
            invalidate: getByIdInvalidateMock,
          },
        },
      },
    })

    mockUpdateUseMutation.mockImplementation((options) => {
      updateOptions = options

      return {
        mutateAsync: updateMutateAsyncMock,
        isPending: false,
        error: null,
      }
    })

    mockDeleteUseMutation.mockImplementation((options) => {
      deleteOptions = options

      return {
        mutateAsync: deleteMutateAsyncMock,
        isPending: false,
        error: null,
      }
    })
  })

  it("calls update mutation with floatingip_id and provided fields", async () => {
    const { result } = renderHook(() => useFloatingIpMutations())

    await act(async () => {
      await result.current.handleUpdate("fip-123", {
        project_id: "proj-1",
        port_id: "port-1",
        description: "Updated description",
      })
    })

    expect(updateMutateAsyncMock).toHaveBeenCalledWith({
      project_id: "proj-1",
      floatingip_id: "fip-123",
      port_id: "port-1",
      description: "Updated description",
    })
  })

  it("calls delete mutation with floatingip_id", async () => {
    const { result } = renderHook(() => useFloatingIpMutations())

    await act(async () => {
      await result.current.handleDelete("fip-123")
    })

    expect(deleteMutateAsyncMock).toHaveBeenCalledWith({
      project_id: "proj-1",
      floatingip_id: "fip-123",
    })
  })

  it("cancels queries and applies optimistic update on update onMutate", async () => {
    const existingItem = {
      id: "fip-123",
      port_id: "port-old",
      fixed_ip_address: "10.0.0.2",
      description: "Old description",
    }

    getByIdGetDataMock.mockReturnValue(existingItem)

    renderHook(() => useFloatingIpMutations())

    const mutationContext = await updateOptions?.onMutate?.({
      floatingip_id: "fip-123",
      port_id: "port-new",
      description: "New description",
    })

    expect(listCancelMock).toHaveBeenCalledTimes(1)
    expect(getByIdCancelMock).toHaveBeenCalledWith({ project_id: "proj-1", floatingip_id: "fip-123" })
    expect(getByIdGetDataMock).toHaveBeenCalledWith({ project_id: "proj-1", floatingip_id: "fip-123" })
    expect(mutationContext).toEqual({ previousItem: existingItem })

    expect(getByIdSetDataMock).toHaveBeenCalledTimes(1)
    const updater = getByIdSetDataMock.mock.calls[0]?.[1] as (old: typeof existingItem) => typeof existingItem
    expect(updater(existingItem)).toEqual({
      ...existingItem,
      port_id: "port-new",
      description: "New description",
    })
  })

  it("rolls back detail cache on update onError when previousItem exists", () => {
    renderHook(() => useFloatingIpMutations())

    const previousItem = {
      id: "fip-123",
      port_id: "port-old",
      description: "Previous description",
    }

    updateOptions?.onError?.(new Error("update failed"), { floatingip_id: "fip-123" }, { previousItem })

    expect(getByIdSetDataMock).toHaveBeenCalledWith({ project_id: "proj-1", floatingip_id: "fip-123" }, previousItem)
  })

  it("invalidates detail and list queries on update onSettled", () => {
    renderHook(() => useFloatingIpMutations())

    updateOptions?.onSettled?.(undefined, null, { floatingip_id: "fip-123" })

    expect(getByIdInvalidateMock).toHaveBeenCalledWith({ project_id: "proj-1", floatingip_id: "fip-123" })
    expect(listInvalidateMock).toHaveBeenCalledTimes(1)
  })

  it("cancels list query on delete onMutate and invalidates list on settle", async () => {
    renderHook(() => useFloatingIpMutations())

    await deleteOptions?.onMutate?.()
    deleteOptions?.onSettled?.()

    expect(listCancelMock).toHaveBeenCalledTimes(1)
    expect(listInvalidateMock).toHaveBeenCalledTimes(1)
  })

  it("maps pending and error states from both mutations", () => {
    mockUpdateUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
      error: { message: "Update failed" },
    })

    mockDeleteUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
      error: { message: "Delete failed" },
    })

    const { result } = renderHook(() => useFloatingIpMutations())

    expect(result.current.isUpdatePending).toBe(true)
    expect(result.current.updateError).toBe("Update failed")
    expect(result.current.isDeletePending).toBe(true)
    expect(result.current.deleteError).toBe("Delete failed")
  })
})
