import validator from 'validator'

export const validateEmail = (email: string): boolean => {
  return validator.isEmail(email)
}
const PERSONAL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'aol.com',
  'protonmail.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'fastmail.com',
  'tutanota.com',
  'hey.com',
])
const EmailClassifications = {
  personal: 'personal',
  business: 'business',
  unknown: 'unknown',
}

export type EmailClassification = (typeof EmailClassifications)[keyof typeof EmailClassifications]

export function classifyEmail(email: string): EmailClassification {
  // Validate email format first
  if (!validator.isEmail(email)) {
    return EmailClassifications.unknown
  }

  const domain = email.toLowerCase().split('@')[1]
  if (!domain) {
    return EmailClassifications.unknown
  }

  return PERSONAL_DOMAINS.has(domain) ? EmailClassifications.personal : EmailClassifications.business
}
export function isPersonalEmail(email: string): boolean {
  return classifyEmail(email) === EmailClassifications.personal
}
export function isBusinessEmail(email: string): boolean {
  return classifyEmail(email) === EmailClassifications.business
}
