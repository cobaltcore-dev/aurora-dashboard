import { TokenData } from "../../../server/Authentication/types/models"

// Define the state interface
export interface AuthState {
  isAuthenticated: boolean
  user?: TokenData["user"] // Adjust based on your specific types
  sessionExpiresAt?: TokenData["expires_at"] // Adjust based on your specific types
}

// Define the action interface
export type AuthAction =
  | { type: "LOGIN"; payload: { user: TokenData["user"]; sessionExpiresAt: TokenData["expires_at"] } }
  | { type: "LOGOUT" }

export const authInitialState: AuthState = {
  isAuthenticated: false,
  user: undefined,
  sessionExpiresAt: undefined,
}

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN":
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        sessionExpiresAt: action.payload.sessionExpiresAt,
      }

    case "LOGOUT":
      return {
        ...state,
        isAuthenticated: false,
        user: undefined,
        sessionExpiresAt: undefined,
      }

    default:
      return state
  }
}
