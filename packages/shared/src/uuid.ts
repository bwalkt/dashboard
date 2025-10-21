import { encodeTime, monotonicFactory } from 'ulid'

const uuid = monotonicFactory()

export { encodeTime, uuid }
