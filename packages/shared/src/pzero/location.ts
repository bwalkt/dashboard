export type Location = {
  lat: number
  long: number
  accuracy: number
  altitude: number | null
}
export const IPAddressTypes = {
  IPv4: 'IPv4',
  IPv6: 'IPv6',
} as const
export type IPAddressType = (typeof IPAddressTypes)[keyof typeof IPAddressTypes]
export type IPAddress = {
  address: string
  type?: IPAddressType
}
