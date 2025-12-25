export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'DELETED' | 'PENDING' | 'BLOCKED'
export type UserOnlineStatus = 'ONLINE' | 'OOO' | 'AWAY' | 'BUSY' | 'INACTIVE'

export type Location = {
  address?: {
    street?: string | null
    city?: string | null
    state?: string | null
    zipcode?: string | null
    country?: string | null
  } | null
  lat?: number | null
  lon?: number | null
  alt?: number | null
} | null

export type UserDataMeta = {
  meta?: {
    c_by?: string
  }
} | null

export type ColumnSchema = {
  // From uuid_base_table
  id: string // uuid
  // From base_table
  name: string
  is_del: boolean
  is_act: boolean
  dscr: string | null
  data: UserDataMeta // jsonb
  tags: string[] | null
  handle: string
  // From base_loc_table
  loc: Location
  // From base_part
  part: string // default 'pzero'
  org_id: string | null // uuid
  // Direct columns from all_users
  avatar: string | null
  status: UserStatus
  online_status: UserOnlineStatus
  last_seen: string // ISO timestamptz string
  // From JOIN with all_auth (API route line 140-142)
  email: string
  email_verified: boolean
  // Generated from UUID
  c_at: string // ISO timestamptz string
}
