import { type Actor, actorStatuses, defaultActor, Relations, type RelationType } from '@pzero/shared/pzero'
import { uuid } from '@pzero/shared/uuid'
import { HistoryStore, Keys } from './history'
import { ZStorage } from './store'

const STORE = 'ActorStore'

export class ActorStore extends ZStorage {
  public me: Actor | null = null
  public relations: Map<string, Actor> = new Map()

  constructor() {
    super(STORE)
    this.me = this.getItem('me')

    // Initialize relations Map - exclude 'me' key and only include Actor objects with valid relations
    const allItems = this.getAll() || {}
    this.relations = new Map()

    Object.entries(allItems).forEach(([key, value]) => {
      // Skip 'me' key and only add valid Actor relations
      if (key !== 'me' && key !== Relations.me && value && typeof value === 'object') {
        const actor = value as Actor
        // Only add if it has a relation property and it's not 'me'
        if (actor.relation && actor.relation !== Relations.me) {
          this.relations.set(key, actor)
        }
      }
    })
  }

  getMe() {
    return this.me
  }
  putMe(me: Actor) {
    if (!this.me) {
      me.id = uuid()
    }
    me.relation = Relations.me
    if (!me.nickName) {
      me.nickName = me.name ?? me.id
    }
    me.dateUpdated = Date.now()
    this.setItem({ key: Relations.me, data: me })
    this.me = me
    return me
  }
  removeMe() {
    this.me = null
    this.clearAll()
  }
  async getRelations(type?: RelationType): Promise<Actor[]> {
    const relations: Actor[] = []
    this.relations.forEach((actor, _key) => {
      if (actor.status === actorStatuses.inactive || actor.relation === Relations.me) {
        return
      }
      if (type) {
        if (actor.relation === type) {
          relations.push(actor)
        }
      } else {
        relations.push(actor)
      }
    })
    return relations
  }
  addRelation(actor: Partial<Actor>) {
    const next: Actor = { ...defaultActor, ...actor } as Actor
    next.relation = actor.relation ?? Relations.unknown
    actor = { ...defaultActor, ...actor } as Actor
    next.id = uuid()
    if (!actor.nickName) {
      actor.nickName = actor.name ?? next.id
    }
    if (!actor.nickName) {
      throw 'Actor name cannot be empty'
    }
    next.dateUpdated = Date.now()
    next.status = actor.status ?? actorStatuses.pending
    const nickName: string = actor.nickName ?? (actor.name as string)
    if (!nickName) {
      throw 'Actor name cannot be empty'
    }
    if (next.relation === Relations.me) {
      throw 'You cannot add me as relation'
    } else {
      const idActor = this.relations.get(next.id)
      if (idActor) {
        throw `Actor with id ${actor.id} already exists`
      }
      this.setItem({ key: next.id, data: next })
      this.relations.set(next.id, next)
    }
  }
  removeRelation(id: string) {
    const actor = this.relations.get(id)
    if (!actor) {
      throw new Error(`Actor with id ${id} does not exist`)
    }
    if (actor.status === actorStatuses.inactive) {
      throw new Error(`Actor with id ${id} is already deleted`)
    }
    if (actor.relation === Relations.me) {
      throw new Error(`You cannot delete me`)
    }
    actor.status = actorStatuses.inactive
    HistoryStore.putHistory({
      id: id,
      key: 'actor',
      original: Keys.actor,
      updates: { status: actorStatuses.inactive },
    })
    this.relations.delete(id)
    return true
  }
  setRelation(actor: Partial<Actor>) {
    if (!actor.id) {
      throw new Error('Actor id is required')
    }
    if (!actor.nickName) {
      actor.nickName = actor.name ?? actor.id
    }
    const nickName: string = actor.nickName as string
    const existingActor = this.relations.get(actor.id as string)
    if (!existingActor) {
      throw new Error(`Actor with nickName ${nickName} does not exist`)
    }
    actor.dateUpdated = Date.now()
    if (actor.id !== existingActor.id) {
      throw new Error(`Actor with nickName ${nickName} already exists with different id`)
    }

    if (existingActor) {
      existingActor.relation = actor.relation ?? Relations.unknown
      this.setItem({ key: existingActor.id, data: JSON.stringify(existingActor) })
    }
  }
  clearAll() {
    super.clearAll()
    this.me = null
    this.relations.clear()
  }
}
