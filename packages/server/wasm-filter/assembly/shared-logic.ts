// Shared validation logic that matches your server-side logic
export function validateAuthHeader(header: string): boolean {
  // Duplicate your server-side validation logic here
  // This runs in the Wasm environment
  
  // Example: Check against allowed values
  const allowedValues = [
    "secret-value-123",
    "another-valid-key"
  ];
  
  return allowedValues.includes(header);
}

export function validateJWTCookie(cookie: string): boolean {
  // Duplicate JWT validation logic
  // Note: Full JWT verification might be complex in Wasm
  // Consider using simpler checks or HTTP calls for complex validation
  
  return cookie.includes("accessToken=") || cookie.includes("refreshToken=");
}