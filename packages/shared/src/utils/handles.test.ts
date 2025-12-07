import {
  extractCompanyInfoFromDomain,
  generateContactEmail,
  generateDeviceNicknameFromName,
  generateEmailHandle,
  generateHandle,
  generateNameFromEmail,
  generateOrgHandle,
  generateUserHandle,
  isValidHandle,
  suggestAlternativeHandles,
} from './handles'

describe('Handle Generation Utilities', () => {
  describe('generateHandle', () => {
    it('should generate basic handles correctly', () => {
      expect(generateHandle('My Company Name')).toBe('my-company-name')
      expect(generateHandle('Special Characters!@#')).toBe('special-characters')
      expect(generateHandle('  Multiple   Spaces  ')).toBe('multiple-spaces')
    })

    it('should respect maxLength option', () => {
      expect(generateHandle('Very Long Company Name', { maxLength: 10 })).toBe('very-long')
      expect(generateHandle('Short', { maxLength: 20 })).toBe('short')
    })

    it('should handle preserveDots option', () => {
      expect(generateHandle('john.doe@company.com', { preserveDots: true })).toBe('john.doe@company.com')
      expect(generateHandle('user.name', { preserveDots: true })).toBe('user.name')
      expect(generateHandle('user.name', { preserveDots: false })).toBe('user-name')
    })

    it('should handle custom separator', () => {
      expect(generateHandle('My Company', { separator: '_' })).toBe('my_company')
      expect(generateHandle('Multiple  Spaces', { separator: '.' })).toBe('multiple.spaces')
    })
  })

  describe('generateOrgHandle', () => {
    it('should generate organization handles', () => {
      expect(generateOrgHandle('Acme Corporation')).toBe('acme-corporation')
      expect(generateOrgHandle('Beta Systems Inc.')).toBe('beta-systems-inc')
      expect(generateOrgHandle('Gamma-Innovations')).toBe('gamma-innovations')
    })

    it('should truncate long names', () => {
      const longName = 'Very Long Organization Name That Exceeds Maximum Length'
      const handle = generateOrgHandle(longName)
      expect(handle.length).toBeLessThanOrEqual(50)
      expect(handle).toBe('very-long-organization-name-that-exceeds-maximum')
    })
  })

  describe('generateUserHandle', () => {
    it('should generate user handles', () => {
      expect(generateUserHandle('John Doe')).toBe('john-doe')
      expect(generateUserHandle('Jane Smith-Wilson')).toBe('jane-smith-wilson')
    })

    it('should respect user handle length limits', () => {
      const longName = 'Very Long Full Name That Should Be Truncated'
      const handle = generateUserHandle(longName)
      expect(handle.length).toBeLessThanOrEqual(30)
    })
  })

  describe('generateEmailHandle', () => {
    it('should generate handles from email addresses', () => {
      expect(generateEmailHandle('john.doe@company.com')).toBe('john.doe')
      expect(generateEmailHandle('user_name@example.org')).toBe('user_name')
      expect(generateEmailHandle('test123@domain.co.uk')).toBe('test123')
    })

    it('should handle invalid emails', () => {
      expect(generateEmailHandle('notanemail')).toBe('')
      expect(generateEmailHandle('invalid@')).toBe('invalid')
      expect(generateEmailHandle('')).toBe('')
    })
  })

  describe('generateDeviceNicknameFromName', () => {
    it('should generate device nicknames', () => {
      expect(generateDeviceNicknameFromName('John Doe')).toBe("John's Device")
      expect(generateDeviceNicknameFromName('Jane Smith', 'iPhone')).toBe("Jane's iPhone")
      expect(generateDeviceNicknameFromName('Bob Wilson-Brown', 'MacBook Pro')).toBe("Bob's MacBook Pro")
    })

    it('should handle single names', () => {
      expect(generateDeviceNicknameFromName('John')).toBe("John's Device")
    })

    it('should handle empty names', () => {
      expect(generateDeviceNicknameFromName('')).toBe('')
      expect(generateDeviceNicknameFromName('   ')).toBe('')
    })
  })

  describe('generateNameFromEmail', () => {
    it('should generate names from email addresses', () => {
      expect(generateNameFromEmail('john.doe@company.com')).toBe('John Doe')
      expect(generateNameFromEmail('jane.smith.wilson@example.org')).toBe('Jane Smith Wilson')
      expect(generateNameFromEmail('user123@domain.com')).toBe('User123')
    })

    it('should handle emails without dots', () => {
      expect(generateNameFromEmail('username@domain.com')).toBe('Username')
    })

    it('should handle invalid emails', () => {
      expect(generateNameFromEmail('notanemail')).toBe('')
      expect(generateNameFromEmail('')).toBe('')
    })
  })

  describe('extractCompanyInfoFromDomain', () => {
    it('should extract company info from domains', () => {
      const result = extractCompanyInfoFromDomain('https://acme.com')
      expect(result).toEqual({
        domain: 'acme.com',
        companyName: 'Acme',
        handle: 'acme',
      })
    })

    it('should handle domains without protocol', () => {
      const result = extractCompanyInfoFromDomain('beta-systems.io')
      expect(result).toEqual({
        domain: 'beta-systems.io',
        companyName: 'Beta-systems',
        handle: 'beta-systems',
      })
    })

    it('should remove www subdomain', () => {
      const result = extractCompanyInfoFromDomain('https://www.company.com')
      expect(result.domain).toBe('company.com')
      expect(result.companyName).toBe('Company')
    })

    it('should throw for invalid URLs', () => {
      expect(() => extractCompanyInfoFromDomain('not-a-url')).toThrow('Invalid website URL')
      expect(() => extractCompanyInfoFromDomain('')).toThrow('Invalid website URL')
    })
  })

  describe('generateContactEmail', () => {
    it('should generate contact emails', () => {
      expect(generateContactEmail('company.com')).toBe('contact@company.com')
      expect(generateContactEmail('example.org')).toBe('contact@example.org')
    })
  })

  describe('isValidHandle', () => {
    it('should validate correct handles', () => {
      expect(isValidHandle('valid-handle')).toBe(true)
      expect(isValidHandle('user123')).toBe(true)
      expect(isValidHandle('company_name')).toBe(true)
      expect(isValidHandle('user.name')).toBe(true)
    })

    it('should reject invalid handles', () => {
      expect(isValidHandle('')).toBe(false)
      expect(isValidHandle('-starts-with-dash')).toBe(false)
      expect(isValidHandle('ends-with-dash-')).toBe(false)
      expect(isValidHandle('has--double-dash')).toBe(false)
      expect(isValidHandle('has spaces')).toBe(false)
      expect(isValidHandle('UPPERCASE')).toBe(false)
      expect(isValidHandle('special!chars')).toBe(false)
    })
  })

  describe('suggestAlternativeHandles', () => {
    it('should suggest alternative handles', () => {
      const suggestions = suggestAlternativeHandles('myhandle', 3)
      expect(suggestions).toHaveLength(3)
      expect(suggestions).toContain('myhandle1')
      expect(suggestions).toContain('myhandle-1')

      // Should include year-based suggestion
      const currentYear = new Date().getFullYear()
      expect(suggestions).toContain(`myhandle${currentYear}`)
    })

    it('should respect count parameter', () => {
      const suggestions = suggestAlternativeHandles('test', 5)
      expect(suggestions).toHaveLength(5)
    })
  })
})
