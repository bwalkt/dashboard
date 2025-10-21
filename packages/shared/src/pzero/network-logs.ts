import type { Location } from './location'
export type NetworkLog = {
  id?: string
  url?: string
  method: string
  status: number
  headers?: Record<string, string>[]
  params?: Record<string, string>[]
  responseHeaders: Record<string, string>[]
  responseStatus: string
  startTime: number
  endTime?: number
  duration?: number
  error?: string
  location?: Location
}
