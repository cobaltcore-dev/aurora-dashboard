import React, { createContext, ReactNode, useContext, useReducer } from "react"
import { AuthAction, authReducer, AuthState, authInitialState } from "./reducers/authReducer"

const AuthContext = createContext<AuthState | null>(null)
const AuthDispatchContext = createContext<React.Dispatch<AuthAction> | null>(null)

const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [authState, dispatch] = useReducer(authReducer, authInitialState)

  return (
    <AuthContext.Provider value={authState}>
      <AuthDispatchContext.Provider value={dispatch}>{children}</AuthDispatchContext.Provider>
    </AuthContext.Provider>
  )
}

const useAuth = (): AuthState => {
  const authState = useContext(AuthContext)

  if (!authState) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return authState
}

const useAuthDispatch = (): React.Dispatch<AuthAction> => {
  const dispatch = useContext(AuthDispatchContext)

  if (!dispatch) {
    throw new Error("useAuthDispatch must be used within an AuthProvider")
  }

  return dispatch
}

export { StoreProvider, useAuth, useAuthDispatch }
