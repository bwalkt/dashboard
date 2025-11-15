// utils.ts - Your own AssemblyScript utilities
export function isValidEmail(email: string): boolean {
  return email.includes("@") && email.includes(".") && email.length > 5;
}

export function hashString(str: string): string {
  let hash: u32 = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash.toString(16);
}

export class SimpleValidator {
  static validateToken(token: string): boolean {
    return token.length > 10 && token.startsWith("valid-");
  }
  
  static createTimestamp(): i64 {
    return Date.now();
  }
}

export const VALID_DOMAINS = [
  "example.com",
  "trusted-domain.net",
  "secure-site.org"
];