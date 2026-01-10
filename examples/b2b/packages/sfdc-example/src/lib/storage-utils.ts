/**
 * Clears accessible client-side storage (cookies, localStorage, sessionStorage) and reloads the page.
 *
 * Note: This cannot clear httpOnly cookies or cookies from other domains.
 * For a complete sign-out, use the proper sign-out flow which handles server-side session invalidation.
 */
export function clearClientStorage(): void {
  // Clear accessible cookies (non-httpOnly cookies on current path)
  document.cookie.split(';').forEach(cookie => {
    const name = cookie.split('=')[0].trim()
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
  })

  localStorage.clear()
  sessionStorage.clear()
  location.reload()
}
