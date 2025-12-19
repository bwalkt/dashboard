/**
 * Utility functions for deriving names from email addresses
 */

/**
 * Derives a display name from an email address
 * @param email The email address to derive a name from
 * @returns A capitalized name derived from the email local part
 *
 * @example
 * deriveNameFromEmail('john.doe@example.com') // returns 'John Doe'
 * deriveNameFromEmail('jane_smith@company.org') // returns 'Jane Smith'
 * deriveNameFromEmail('contact@acme.com') // returns 'Contact'
 */
export function deriveNameFromEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return ''
  }

  // Get the part before the @ symbol
  const localPart = email.split('@')[0]

  // Split on common separators (dots, underscores, hyphens, plus signs)
  const nameParts = localPart
    .split(/[._+-]/)
    .filter(part => part.length > 0)
    .map(part => {
      // Capitalize first letter of each part
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    })

  return nameParts.join(' ')
}
