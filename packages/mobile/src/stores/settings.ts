import { type SetItem, ZStorage } from './store'

export const STORE = 'settings-store'
export const settingsKeys = {
  email: 'email',
  emailVerified: 'emailVerified',
  phone: 'phone',
  phoneVerified: 'phoneVerified',
  nickName: 'nickName',
  classificationType: 'classificationType',
  isPrimary: 'isPrimary',
  pin: 'pin',
  termsAccepted: 'termsAccepted',
}

export const classificationTypes = {
  unknown: 'unknown',
  personal: 'personal',
  corp: 'corp',
} as const
export type ClassificationType = keyof typeof classificationTypes

export type SettingsKeys = keyof typeof settingsKeys
export const userSettingsSchema = {
  type: 'object',
  properties: {
    nickName: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email', minLength: 1 },
    phoneNumber: { type: 'string', pattern: '^[+]?[1-9]\\d{1,14}$', minLength: 1 },
    classificationType: { type: 'string', enum: [...Object.values(classificationTypes)] },
  },
  required: ['nickName', 'email', 'phoneNumber', 'classificationType'],
  additionalProperties: false,
}
const keys = [settingsKeys.email, settingsKeys.phone] as const
const verifiedKeys = [settingsKeys.emailVerified, settingsKeys.phoneVerified]

export class SettingsStoreClass extends ZStorage {
  isVerified: boolean = false

  constructor() {
    super(STORE)
    if (this.getItem(settingsKeys.emailVerified) === true && this.getItem(settingsKeys.phoneVerified) === true) {
      this.isVerified = true
    }
  }

  getItem(id: string): any {
    return super.getItem(id)
  }

  setItem({ key, data }: SetItem): boolean {
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i]
      if (key === k) {
        data = (data as string).toLowerCase()
        if (this.getItem(k) === data) {
          return true
        }
        const verifiedKey = verifiedKeys[i]
        if (key === k && this.getItem(verifiedKey) === true) {
          this.isVerified = false
          this.setItem({ key: verifiedKey, data: false })
        }
        break
      }
    }
    return super.setItem({ key, data })
  }
}

export const SettingsStore = new SettingsStoreClass()
