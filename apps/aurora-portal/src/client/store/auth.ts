import { StateCreator } from "zustand"
import { TokenData } from "../../server/Authentication/types/models"
import { trpcClient } from "../trpcClient"

export interface AuthSlice {
  auth: {
    isLoading: boolean
    isAuthenticated: boolean
    error: string | null
    user?: TokenData["user"]
    sessionExpiresAt?: TokenData["expires_at"]

    login: (props: { user: string; password: string; domainName: string }) => Promise<void>
    logout: () => Promise<void>
    syncAuthStatus: () => Promise<void>
  }
}

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (set) => ({
  auth: {
    isLoading: false,
    isAuthenticated: false,
    error: null,
    user: undefined,
    sessionExpiresAt: undefined,

    login: async (props) => {
      // initialize the login process
      set((state) => ({
        auth: {
          ...state.auth,
          isLoading: true,
          error: null,
          user: undefined,
          sessionExpiresAt: undefined,
        },
      }))
      try {
        const tokenData = await trpcClient.auth.login.mutate(props)
        // if we don't have a user, we throw an error
        set((state) => ({
          auth: {
            ...state.auth,
            isLoading: false,
            isAuthenticated: true,
            user: tokenData.user,
            sessionExpiresAt: tokenData.expires_at,
          },
        }))
      } catch (error) {
        // if we have an error, we set the error message
        let errorMessage = "An error occurred while trying to login"
        if (error instanceof Error) {
          errorMessage = error.message
        }
        set((state) => ({
          auth: { ...state.auth, isAuthenticated: false, isLoading: false, error: errorMessage },
        }))
      }
    },

    logout: async () => {
      set((state) => ({ ...state, isLoading: true, error: null }))
      try {
        await trpcClient.auth.logout.mutate()
        set((state) => ({
          auth: {
            ...state.auth,
            isLoading: false,
            isAuthenticated: false,
            user: undefined,
            sessionExpiresAt: undefined,
          },
        }))
      } catch (error) {
        let errorMessage = "An error occurred while trying to logout"
        if (error instanceof Error) {
          errorMessage = error.message
        }
        set((state) => ({ auth: { ...state.auth, isLoading: false, error: errorMessage } }))
      }
    },

    syncAuthStatus: async () => {
      set((state) => ({ auth: { ...state.auth, isLoading: true } }))
      try {
        const token = await trpcClient.auth.token.query()
        set((state) => ({
          auth: {
            ...state.auth,
            isAuthenticated: !!token?.user,
            isLoading: false,
            user: token?.user,
            sessionExpiresAt: token?.expires_at,
          },
        }))
      } catch (error) {
        let errorMessage = "An error occurred while trying to get the auth token"
        if (error instanceof Error) {
          errorMessage = error.message
        }
        set((state) => ({
          auth: {
            ...state.auth,
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
            user: undefined,
            sessionExpiresAt: undefined,
          },
        }))
      }
    },
  },
})
