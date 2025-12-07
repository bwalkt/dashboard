import { ALLOWED_COUNTRIES, DEFAULT_COUNTRY, validatePhoneNumber } from '@pzero/shared/phone'
import { createValidator } from '@pzero/shared/validator/ajv'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
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
import { userData } from '@/features/users/data'
import { createAjvResolver } from '@/lib/ajv-resolver'
import { orgsService } from '@/services/api/orgs'
import { usersService } from '@/services/api/users'
import { useOrgsStore } from '@/stores/orgs'

interface OrgFormValues {
  website: string
  name: string
  handle: string
  description: string
  status: 'active' | 'inactive' | 'suspended'
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  email: string
  phone: string
  address: string
  user_ids: string[]
  new_user: {
    name: string
    email: string
  }
  create_new_user: boolean
}

const orgFormSchema = {
  type: 'object',
  properties: {
    website: { type: 'string', format: 'uri' },
    name: { type: 'string', minLength: 1 },
    handle: {
      type: 'string',
      minLength: 1,
      pattern: '^[a-z0-9-]+$',
    },
    description: { type: 'string' },
    status: {
      type: 'string',
      enum: ['active', 'inactive', 'suspended'],
    },
    plan: {
      type: 'string',
      enum: ['free', 'starter', 'pro', 'enterprise'],
    },
    email: { type: 'string', format: 'email' },
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
        email: { type: 'string', format: 'email' },
      },
      default: { name: '', email: '' },
    },
    create_new_user: { type: 'boolean', default: false },
  },
  required: ['website', 'name', 'handle', 'status', 'plan', 'email'],
  additionalProperties: false,
}

const validateOrgForm = createValidator<OrgFormValues>(orgFormSchema)

interface AddOrgFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  asPage?: boolean
}

export function AddOrgForm({ open, onOpenChange, asPage = false }: AddOrgFormProps) {
  const orgsStore = useOrgsStore()

  const form = useForm<OrgFormValues>({
    resolver: createAjvResolver(validateOrgForm),
    defaultValues: {
      website: '',
      name: '',
      handle: '',
      description: '',
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
        try {
          const url = new URL(value.website.startsWith('http') ? value.website : `https://${value.website}`)
          const domain = url.hostname.replace('www.', '')
          const domainParts = domain.split('.')
          const companyName = domainParts[0]

          // Auto-fill name if empty
          if (!value.name) {
            const capitalizedName = companyName.charAt(0).toUpperCase() + companyName.slice(1)
            form.setValue('name', capitalizedName, { shouldValidate: true })
          }

          // Auto-fill handle if empty
          if (!value.handle) {
            const handle = companyName
              .toLowerCase()
              .replace(/[^\w-]/g, '')
              .trim()
            form.setValue('handle', handle, { shouldValidate: true })
          }

          // Auto-fill email if empty
          if (!value.email) {
            form.setValue('email', `contact@${domain}`, { shouldValidate: true })
          }
        } catch (error) {
          // Invalid URL, ignore
        }
      }

      // Also allow manual name -> handle generation
      if (fieldName === 'name' && value.name && !value.handle) {
        const handle = value.name
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()
        form.setValue('handle', handle, { shouldValidate: true })
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  const onSubmit = async (data: OrgFormValues) => {
    try {
      // Validate email and website domain match
      if (data.email && data.website) {
        try {
          const emailDomain = data.email.split('@')[1]?.toLowerCase()
          const websiteUrl = new URL(data.website)
          const websiteDomain = websiteUrl.hostname.replace('www.', '').toLowerCase()

          if (emailDomain !== websiteDomain) {
            toast.error(`Email domain (${emailDomain}) must match website domain (${websiteDomain})`)
            return
          }
        } catch (error) {
          toast.error('Invalid website URL format')
          return
        }
      }

      // Validate phone number if provided
      if (data.phone) {
        const phoneValidation = validatePhoneNumber(data.phone, DEFAULT_COUNTRY)
        if (!phoneValidation.isValid) {
          toast.error(phoneValidation.error || 'Invalid phone number')
          return
        }
        // Check if the phone is from an allowed country
        const isAllowed = ALLOWED_COUNTRIES.some(c => c.code === phoneValidation.country)
        if (!isAllowed) {
          toast.error(`Phone numbers from ${phoneValidation.country} are not supported`)
          return
        }
      }

      // Validate new user data if creating a new user
      if (data.create_new_user) {
        if (!data.new_user?.name || !data.new_user?.email) {
          toast.error('User name and email are required when creating a new user')
          return
        }
      }

      // Get current user ID - TODO: Get from auth context
      const currentUserId = 'current-user-id'

      // Create organization with user data
      const orgData = {
        name: data.name,
        handle: data.handle,
        description: data.description,
        status: data.status,
        plan: data.plan,
        email: data.email,
        website: data.website,
        phone: data.phone,
        address: data.address,
        owner_id: currentUserId,
        settings: {},
        metadata: {},
        create_user: data.create_new_user
          ? {
              name: data.new_user.name,
              email: data.new_user.email,
              email_verified: true, // Auto-verify email for admin-created users
            }
          : undefined,
        associate_users: data.user_ids || [],
      }

      const result = await orgsService.createOrgWithUser(orgData)

      // Update local store with the created organization
      await orgsStore.createOrg(result.organization)

      const successMessage = data.create_new_user
        ? `Org created successfully with new user (${result.user?.email})`
        : 'Org created successfully'
      toast.success(successMessage)

      form.reset()
      onOpenChange(false)
    } catch (error) {
      toast.error('Failed to create organization')
      console.error('Create org error:', error)
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
              <Input type="url" placeholder="https://acme.com" {...field} />
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
              <Input placeholder="Acme Corporation" {...field} />
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
              <Input placeholder="acme-corporation" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
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
    <Form form={form} onSubmit={form.handleSubmit(onSubmit)} id="org-form" className="flex flex-col h-full">
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
          <Button type="submit" form="org-form" disabled={form.formState.isSubmitting} className="flex-1">
            {form.formState.isSubmitting ? 'Creating...' : 'Create Org'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
