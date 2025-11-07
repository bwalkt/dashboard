import { uuid } from '../uuid.js'
import type { IPAddress, Location } from './location.js'
export const actorStatuses = {
  active: 'active',
  inactive: 'inactive',
  blocked: 'blocked',
  pending: 'pending',
  retired: 'retired',
} as const
export type ActorStatus = keyof typeof actorStatuses

export const ActorTypes = {
  service: 'service',
  server: 'server',
  api: 'api',
  user: 'user',
  bot: 'bot',
} as const
export type ActorType = keyof typeof ActorTypes

export const Relations = {
  parent: 'parent',
  child: 'child',
  peer: 'peer',
  friend: 'friend',
  businessAssociate: 'businessAssociate',
  acquaintance: 'acquaintance',
  manager: 'manager',
  employee: 'employee',
  contractor: 'contractor',
  owner: 'owner',
  transact: 'transact',
  fetch: 'fetch',
  me: 'me',
  unknown: 'unknown',
} as const
export type RelationType = keyof typeof Relations

export const PermissionLevels = {
  read: 'read',
  write: 'write',
  admin: 'admin',
  commentator: 'commentator',
  viewer: 'viewer',
  editor: 'editor',
  owner: 'owner',
} as const
export type PermissionLevel = keyof typeof PermissionLevels

export type Actor = {
  name: string
  nickName?: string
  id: string
  dateAdded: number
  dateUpdated: number
  type: ActorType
  tags?: string[]
  ipAddress?: IPAddress
  location?: Location
  status: ActorStatus
  relation: RelationType
  [key: string]: any
}

export const defaultActor: Actor = {
  name: '',
  id: uuid(),
  dateAdded: Date.now(),
  dateUpdated: Date.now(),
  type: ActorTypes.user,
  status: actorStatuses.pending,
  tags: [],
  relation: Relations.unknown,
}
