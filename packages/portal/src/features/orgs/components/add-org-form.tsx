import { ALLOWED_COUNTRIES, DEFAULT_COUNTRY, validatePhoneNumber } from '@pzero/shared/phone'
import type { Org } from '@pzero/shared/pzero'
import { generateOrgHandle } from '@pzero/shared/utils/handles'
import { createValidator } from '@pzero/shared/validator/ajv'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import {
  MultiSelector,
  MultiSelectorContent,
  MultiSelectorInput,
  MultiSelectorItem,
  MultiSelectorList,
  MultiSelectorTrigger,
} from '@/components/form-builder/multi-select'
import { PhoneInput } from '@/components/form-builder/phone-input'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { createAjvResolver } from '@/lib/ajv-resolver'
import { toastUtils } from '@/lib/toast'
import { orgsService } from '@/services/api/orgs'
import { useAuthStore } from '@/stores/auth'
import { useOrgsStore } from '@/stores/orgs'

interface OrgFormValues extends Omit<Org, 'id' | 'c_by' | 'u_by'> {
  new_user: {
    name: string
    email: string
  }
  create_new_user: boolean
}

const orgFormSchema = {
  type: 'object',
  properties: {
    website: {
      type: 'string',
      minLength: 1,
      pattern:
        '^(https?:\\/\\/)?([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\\.)*[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\\.[a-zA-Z]{2,}\\/?$',
    },
    name: { type: 'string', minLength: 1 },
    handle: {
      type: 'string',
      minLength: 1,
      pattern: '^[a-z0-9-]+$',
    },
    dscr: { type: 'string' },
    contact_name: { type: 'string', minLength: 1 },
    status: {
      type: 'string',
      enum: ['active', 'inactive', 'suspended'],
    },
    plan: {
      type: 'string',
      enum: ['free', 'starter', 'pro', 'enterprise'],
    },
    email: {
      type: 'string',
      format: 'email',
    },
    phone: { type: 'string' },
    address: { type: 'string' },
    user_ids: {
      type: 'array',
      items: { type: 'string' },
      default: [],
    },
    new_user: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: {
          type: 'string',
          anyOf: [{ format: 'email' }, { maxLength: 0 }],
        },
      },
      default: { name: '', email: '' },
    },
    create_new_user: { type: 'boolean', default: false },
  },
  required: ['website', 'name', 'handle', 'contact_name', 'status', 'plan', 'email'],
  additionalProperties: false,
}

const validateOrgForm = createValidator<OrgFormValues>(orgFormSchema)

// Utility to derive name from email
const deriveNameFromEmail = (email: string): string => {
  if (!email || !email.includes('@')) {
    return ''
  }

  const localPart = email.split('@')[0]
  const nameParts = localPart
    .split(/[._+-]/)
    .filter(part => part.length > 0)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())

  return nameParts.join(' ')
}

interface AddOrgFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  asPage?: boolean
}

export function AddOrgForm({ open, onOpenChange, asPage = false }: AddOrgFormProps) {
  const { user } = useAuthStore()
  const orgsStore = useOrgsStore()

  const form = useForm<OrgFormValues>({
    resolver: createAjvResolver(validateOrgForm),
    mode: 'onBlur',
    defaultValues: {
      website: '',
      name: '',
      handle: '',
      dscr: '',
      contact_name: '',
      status: 'active' as const,
      plan: 'starter' as const,
      email: '',
      phone: '',
      address: '',
      user_ids: [],
      new_user: {
        name: '',
        email: '',
      },
      create_new_user: true,
    },
  })

  // Auto-generate name and handle from website domain
  React.useEffect(() => {
    const subscription = form.watch((value, { name: fieldName }) => {
      if (fieldName === 'website' && value.website) {
        // Simple domain extraction
        let website = value.website.trim()

        // Auto-add https:// if no protocol provided
        if (website && !website.match(/^https?:\/\//)) {
          website = `https://${website}`
          // Update the form value immediately to avoid validation issues
          setTimeout(() => {
            form.setValue('website', website, { shouldValidate: true })
          }, 0)
        }

        // Remove protocol and www for parsing
        let cleanDomain = website
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/\/$/, '')

        // Extract company name and full domain
        const parts = cleanDomain.split('.')

        if (parts.length >= 2) {
          const companyName = parts[0]
          const domain = cleanDomain // This should be the full domain like "arasva.com"

          // Auto-fill name if empty
          if ((!value.name || value.name.trim() === '') && companyName) {
            const capitalizedName = companyName.charAt(0).toUpperCase() + companyName.slice(1)
            form.setValue('name', capitalizedName, { shouldValidate: false })
          }

          // Auto-fill handle if empty
          if ((!value.handle || value.handle.trim() === '') && companyName) {
            const handle = generateOrgHandle(companyName)
            form.setValue('handle', handle, { shouldValidate: false })
          }

          // Auto-fill email (always update if it starts with "contact@" or is empty)
          const shouldUpdateEmail = !value.email || value.email.trim() === '' || value.email.startsWith('contact@')

          if (shouldUpdateEmail && cleanDomain) {
            const email = `contact@${cleanDomain}`
            form.setValue('email', email, { shouldValidate: false })
          }
        }
      }

      // Auto-generate contact name from email when email changes
      if (fieldName === 'email' && value.email) {
        const shouldUpdateContactName = !value.contact_name || value.contact_name.trim() === ''

        if (shouldUpdateContactName) {
          const derivedName = deriveNameFromEmail(value.email)
          if (derivedName) {
            form.setValue('contact_name', derivedName, { shouldValidate: false })
          }
        }
      }

      // Also allow manual name -> handle generation
      if (fieldName === 'name' && value.name && !value.handle) {
        const handle = generateOrgHandle(value.name)
        form.setValue('handle', handle, { shouldValidate: false })
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  const onSubmit = async (data: OrgFormValues) => {
    console.log('Form submission started with data:', data)
    console.log('Form validation errors:', form.formState.errors)
    console.log('Form validation state:', form.formState.isValid)

    try {
      // Validate email and website domain match
      // Temporarily disabled for testing
      // if (data.email && data.website) {
      //   try {
      //     const emailDomain = data.email.split('@')[1]?.toLowerCase()
      //     const websiteUrl = new URL(data.website)
      //     const websiteDomain = websiteUrl.hostname.replace('www.', '').toLowerCase()

      //     if (emailDomain !== websiteDomain) {
      //       toast.error(`Email domain (${emailDomain}) must match website domain (${websiteDomain})`)
      //       return
      //     }
      //   } catch (error) {
      //     toast.error('Invalid website URL format')
      //     return
      //   }
      // }

      // Validate phone number if provided
      if (data.phone) {
        const phoneValidation = validatePhoneNumber(data.phone, DEFAULT_COUNTRY)
        if (!phoneValidation.isValid) {
          toastUtils.error(phoneValidation.error || 'Invalid phone number')
          return
        }
        // Check if the phone is from an allowed country
        const isAllowed = ALLOWED_COUNTRIES.some(c => c.code === phoneValidation.country)
        if (!isAllowed) {
          toastUtils.error(`Phone numbers from ${phoneValidation.country} are not supported`)
          return
        }
      }

      // Validate user data if creating a new user
      if (data.create_new_user) {
        if (!data.contact_name || !data.email) {
          toastUtils.error('Contact name and email are required when creating a new user')
          return
        }
      }

      // Ensure user is authenticated
      if (!user?.id) {
        toastUtils.error('You must be logged in to create an organization')
        return
      }

      // Create organization with user data
      const orgData = {
        name: data.name,
        handle: data.handle,
        dscr: data.dscr,
        status: data.status,
        plan: data.plan,
        email: data.email,
        website: data.website,
        phone: data.phone,
        address: data.address,
        create_user: data.create_new_user
          ? {
              name: data.contact_name,
              email: data.email,
              email_verified: true, // Auto-verify email for admin-created users
            }
          : undefined,
      }

      console.log('🚀 CLIENT: Sending org creation request with payload:', JSON.stringify(orgData, null, 2))
      console.log('🚀 CLIENT: Form data validation state:', {
        isValid: form.formState.isValid,
        errors: form.formState.errors,
        isDirty: form.formState.isDirty,
        isSubmitting: form.formState.isSubmitting,
      })

      const result = await orgsService.createOrgWithUser(orgData)
      console.log('✅ CLIENT: Received successful response from server:', JSON.stringify(result, null, 2))

      // Update local store with the created organization
      await orgsStore.createOrg(result.organization)

      const successMessage = data.create_new_user
        ? `Org created successfully with new user`
        : 'Org created successfully'
      toastUtils.successTemp(successMessage)

      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('❌ CLIENT: Error creating organization:', error)
      console.error('❌ CLIENT: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        type: typeof error,
        stringified: JSON.stringify(error, null, 2),
      })

      if (error instanceof Error && error.message.includes('Authentication required')) {
        toastUtils.error('Please log in first to create an organization')
      } else {
        toastUtils.error('Failed to create organization')
      }
    }
  }

  const FormFields = () => (
    <>
      <FormField
        control={form.control}
        name="website"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Website *</FormLabel>
            <FormControl>
              <Input type="text" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Org Name *</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="handle"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Handle *</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="dscr"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea placeholder="Brief description of the organization" className="min-h-[60px]" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="plan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plan *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email *</FormLabel>
            <FormControl>
              <Input type="email" placeholder="contact@acme.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="contact_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Contact Name *</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone</FormLabel>
            <FormControl>
              <PhoneInput
                placeholder="Enter phone number"
                countries={ALLOWED_COUNTRIES.map(c => c.code)}
                defaultCountry={DEFAULT_COUNTRY}
                value={field.value}
                onChange={value => field.onChange(value || '')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Address</FormLabel>
            <FormControl>
              <Textarea placeholder="123 Main Street, City, State, ZIP" className="min-h-[60px]" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )

  const FormContent = () => (
    <Form form={form} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full" id="org-form">
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-4">
          <FormFields />
        </div>
      </div>
    </Form>
  )

  if (asPage) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Add New Org</h1>
          <p className="text-muted-foreground mt-2">Create a new organization. Fill in the details below.</p>
        </div>
        <Form form={form} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormFields />
          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting} className="flex-1">
              {form.formState.isSubmitting ? 'Creating...' : 'Create Org'}
            </Button>
          </div>
        </Form>
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-[500px] sm:!w-[700px] lg:!w-[800px] sm:!max-w-[800px] max-w-[90vw] flex flex-col h-full"
        style={{ width: '800px', maxWidth: '90vw' }}
      >
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>Add New Org</SheetTitle>
          <SheetDescription>Create a new org. Fill in the details below.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-hidden min-h-0">
          <FormContent />
        </div>
        <SheetFooter className="flex gap-4 px-6 pb-6 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            form="org-form"
            disabled={form.formState.isSubmitting}
            className="flex-1"
            onClick={() => {
              console.log('Create Org button clicked')
              console.log('Form errors:', form.formState.errors)
              console.log('Form is valid:', form.formState.isValid)
              console.log('Form values:', form.getValues())
            }}
          >
            {form.formState.isSubmitting ? 'Creating...' : 'Create Org'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
