import { TokenData } from "../../../../server/Authentication/types/models"

// Define the state interface
export interface AuthState {
  isAuthenticated: boolean
  error: string | null
  user?: TokenData["user"] // Adjust based on your specific types
  sessionExpiresAt?: TokenData["expires_at"] // Adjust based on your specific types
}

// Define the action interface
export type AuthAction =
  | { type: "LOGIN_SUCCESS"; payload: { user: TokenData["user"]; sessionExpiresAt: TokenData["expires_at"] } }
  | { type: "LOGIN_FAILURE"; payload: { error: string } }
  | { type: "LOGOUT" }
  | { type: "CLEAR_ERROR" }

export const authInitialState: AuthState = {
  isAuthenticated: false,
  error: null,
  user: undefined,
  sessionExpiresAt: undefined,
}

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN_SUCCESS":
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        sessionExpiresAt: action.payload.sessionExpiresAt,
        error: null,
      }

    case "LOGIN_FAILURE":
      return {
        ...state,
        isAuthenticated: false,
        error: action.payload.error,
        user: undefined,
        sessionExpiresAt: undefined,
      }

    case "LOGOUT":
      return {
        ...state,
        isAuthenticated: false,
        user: undefined,
        sessionExpiresAt: undefined,
        error: null,
      }

    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      }

    default:
      return state
  }
}
