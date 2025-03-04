import { create } from "zustand"
import { createAuthSlice, AuthSlice } from "./auth"

export const useAuroraStore = create<AuthSlice>()((...store) => ({
  ...createAuthSlice(...store),
}))
