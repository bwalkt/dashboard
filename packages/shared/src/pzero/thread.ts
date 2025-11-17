export type TabId = {
  id: string
  userId?: string
  deviceId?: string
  origin?: unknown // browser or device info
  firstCalledAt: number
  lastCalledAt: number
  callCount: number
}
export type Thread = {
  id: string
  endpointId: string
  threadId: string
  tabId?: string
  firstCalledAt: number
  lastCalledAt: number
  callCount: number
  nextFunction?: string
}
export type CallThread = {
  id: string
  threadId: string
  calledAt: number
  returnedAt?: number
  status?: string
  revoked?: boolean
  revokedReason?: string
  nextId?: string
}
