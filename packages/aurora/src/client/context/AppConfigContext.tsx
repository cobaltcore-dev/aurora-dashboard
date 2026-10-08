import React, { useContext, useEffect, useMemo, useRef } from "react"
import { trpcReact } from "../trpcClient"
import { useAuth } from "../store/AuthProvider"
import type { FeatureBag, ResolvedAppConfig, ServiceFeatureMap } from "@/types/appConfig"

type AppConfigContextValue = {
  /** Config resolved by the BFF for the current user's domain. Undefined until first load. */
  config: ResolvedAppConfig | undefined
  isLoading: boolean
  /** The error from the appConfig fetch, or null when it succeeded or is still loading. */
  error: unknown
  /** Refetch the config, e.g. from an error-state retry action. */
  retry: () => void
}

const AppConfigContext = React.createContext<AppConfigContextValue | null>(null)

/**
 * Fetches the resolved domain configuration from the BFF and provides it to the tree.
 *
 * The `appConfig.get` procedure is public: before login it returns the base layer,
 * and once authenticated it returns the base merged with any overrides matching the
 * user's home domain. Because login happens in place (no page reload), we invalidate the
 * query whenever the authenticated identity changes so the domain overrides are picked up.
 *
 * Must be rendered inside `AuthProvider` and the tRPC/React Query providers.
 */
export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const utils = trpcReact.useUtils()
  const query = trpcReact.appConfig.get.useQuery(undefined, { staleTime: 5 * 60 * 1000 })

  const domainId = auth.user?.domain?.id
  const prevDomainId = useRef(domainId)
  useEffect(() => {
    // Only reset when the identity actually changes. Initialising the ref to domainId at
    // mount makes this a no-op on first render and on React 18 Strict Mode's extra
    // unmount/remount. reset() (vs invalidate) clears cached data so isLoading returns to
    // true during the refetch — preventing stale config from the previous domain from rendering.
    if (prevDomainId.current === domainId) return
    prevDomainId.current = domainId
    utils.appConfig.get.reset()
  }, [domainId, utils])

  const value = useMemo<AppConfigContextValue>(
    () => ({
      config: query.data as ResolvedAppConfig | undefined,
      isLoading: query.isLoading,
      error: query.error,
      retry: () => query.refetch(),
    }),
    [query.data, query.isLoading, query.error, query.refetch]
  )

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>
}

function useAppConfigContext(): AppConfigContextValue {
  const ctx = useContext(AppConfigContext)
  if (!ctx) {
    throw new Error("useAppConfig must be used within a AppConfigProvider")
  }
  return ctx
}

/** Returns true while the initial appConfig fetch is in-flight. */
export function useIsAppConfigLoading(): boolean {
  return useAppConfigContext().isLoading
}

/**
 * Returns the appConfig fetch state for rendering a status screen: the error (or null) and
 * a `retry` to refetch. Use alongside {@link useIsAppConfigLoading} for the loading state.
 */
export function useAppConfigStatus(): { error: unknown; retry: () => void } {
  const { error, retry } = useAppConfigContext()
  return { error, retry }
}

/**
 * Returns the domain configuration resolved for the current user's domain.
 *
 * Return values after the initial fetch completes:
 * - Populated `ResolvedAppConfig` — domain config was supplied and resolved successfully.
 * - Empty object (`{}`) cast to `ResolvedAppConfig` — fetch succeeded but no domain config
 *   was configured; all fields will be absent. Test with `Object.keys(config).length === 0`
 *   if you need to distinguish this from a populated config.
 * - `undefined` — fetch is still in-flight or has not yet started.
 *
 * Supply the generic parameters to get typed access to your own service and feature shapes:
 * `useAppConfig<MyServices, MyFeatures>()`.
 */
export function useAppConfig<
  TServices extends ServiceFeatureMap = ServiceFeatureMap,
  TFeatures extends FeatureBag = FeatureBag,
>(): ResolvedAppConfig<TServices, TFeatures> | undefined {
  return useAppConfigContext().config as ResolvedAppConfig<TServices, TFeatures> | undefined
}

/**
 * Reads a single app-wide feature flag from the resolved domain config.
 * Returns undefined when the flag is unset or the config has not loaded yet.
 */
export function useFeature<T = boolean>(key: string): T | undefined {
  const config = useAppConfig()
  return config?.features?.[key] as T | undefined
}
