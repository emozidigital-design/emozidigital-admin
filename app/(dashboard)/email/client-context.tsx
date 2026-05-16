"use client"

import { createContext, useContext } from "react"

interface ClientCtx {
  clientId: string
  setClientId: (id: string) => void
  clients: { client_id: string; label: string }[]
}

export const ClientContext = createContext<ClientCtx>({
  clientId: "",
  setClientId: () => {},
  clients: [],
})

export const useClient = () => useContext(ClientContext)
