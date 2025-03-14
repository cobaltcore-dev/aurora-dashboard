import { describe, it, expect } from "vitest" // Import test utilities from Vitest
import { authReducer, authInitialState, AuthAction } from "./authReducer" // Adjust the path to your reducer file

describe("authReducer", () => {
  it("should return initial state when an unknown action type is provided", () => {
    const initialState = authInitialState
    const action: AuthAction = { type: "LOGOUT" } // Use an unknown action type
    const newState = authReducer(initialState, action)

    expect(newState).toEqual(initialState) // Expect the state to remain unchanged
  })

  it("should handle LOGIN", () => {
    const action: AuthAction = {
      type: "LOGIN",
      payload: {
        user: {
          id: "12345",
          name: "John Doe",
          domain: { id: "test", name: "Test" },
          password_expires_at: new Date().toDateString(),
        }, // Mock user data
        sessionExpiresAt: new Date().toISOString(),
      },
    }

    const newState = authReducer(authInitialState, action)

    expect(newState).toEqual({
      isAuthenticated: true,
      user: action.payload.user,
      sessionExpiresAt: action.payload.sessionExpiresAt,
    })
  })

  it("should handle LOGOUT", () => {
    const state = {
      isAuthenticated: true,
      user: {
        id: "1",
        name: "John Doe",
        domain: { name: "test", id: "test" },
        password_expires_at: new Date().toDateString(),
      },
      sessionExpiresAt: new Date().toISOString(),
    }

    const action: AuthAction = { type: "LOGOUT" }
    const newState = authReducer(state, action)

    expect(newState).toEqual({
      isAuthenticated: false,
      user: undefined,
      sessionExpiresAt: undefined,
    })
  })
})
