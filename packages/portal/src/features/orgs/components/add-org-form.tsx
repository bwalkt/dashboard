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
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { userData } from '@/features/users/data'
import { createAjvResolver } from '@/lib/ajv-resolver'
import { useOrgsStore } from '@/stores/orgs'

interface OrgFormValues {
  name: string
  slug: string
  description: string
  status: 'active' | 'inactive' | 'suspended'
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  email: string
  website: string
  phone: string
  address: string
  billing_email: string
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
    name: { type: 'string', minLength: 1 },
    slug: {
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
    website: { type: 'string', format: 'uri' },
    phone: { type: 'string' },
    address: { type: 'string' },
    billing_email: { type: 'string', format: 'email' },
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
  required: ['name', 'slug', 'status', 'plan', 'email'],
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
      name: '',
      slug: '',
      description: '',
      status: 'active' as const,
      plan: 'starter' as const,
      email: '',
      website: '',
      phone: '',
      address: '',
      billing_email: '',
      user_ids: [],
      new_user: {
        name: '',
        email: '',
      },
      create_new_user: false,
    },
  })

  // Auto-generate slug from name
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'name' && value.name) {
        const slug = value.name
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()
        form.setValue('slug', slug, { shouldValidate: true })
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  const onSubmit = async (data: OrgFormValues) => {
    try {
      // Validate new user data if creating a new user
      if (data.create_new_user) {
        if (!data.new_user?.name || !data.new_user?.email) {
          toast.error('User name and email are required when creating a new user')
          return
        }
      }

      // Prepare new user data if creating a new user
      let newUserId: string | undefined
      if (data.create_new_user && data.new_user?.name && data.new_user?.email) {
        newUserId = crypto.randomUUID()
        // TODO: Create user via API when backend is ready
        console.log('Would create new user:', {
          id: newUserId,
          name: data.new_user.name,
          email: data.new_user.email,
        })
      }

      // Combine existing user IDs with new user ID
      const associatedUserIds = [...(data.user_ids || []), ...(newUserId ? [newUserId] : [])]

      const newOrg = {
        id: crypto.randomUUID(),
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        status: data.status,
        plan: data.plan,
        email: data.email,
        website: data.website || null,
        phone: data.phone || null,
        address: data.address || null,
        billing_email: data.billing_email || data.email,
        logo_url: null,
        owner_id: 'current-user-id', // TODO: Get from auth context
        settings: {},
        metadata: {
          associated_users: associatedUserIds,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      }

      // TODO: Replace with actual API call
      await orgsStore.createOrganization(newOrg)

      const successMessage = data.create_new_user
        ? 'Organization created successfully with new user'
        : 'Organization created successfully'
      toast.success(successMessage)

      form.reset()
      onOpenChange(false)
    } catch (error) {
      toast.error('Failed to create organization')
      console.error('Create org error:', error)
    }
  }

  const FormContent = () => (
    <Form form={form} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Organization Name *</FormLabel>
            <FormControl>
              <Input placeholder="Acme Corporation" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="slug"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Slug *</FormLabel>
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
        name="website"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Website</FormLabel>
            <FormControl>
              <Input type="url" placeholder="https://acme.com" {...field} />
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
              <Input placeholder="+1-555-0123" {...field} />
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

      <FormField
        control={form.control}
        name="billing_email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Billing Email</FormLabel>
            <FormControl>
              <Input type="email" placeholder="billing@acme.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Separator className="my-6" />

      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">User Association</h4>
          <p className="text-xs text-muted-foreground">
            Associate existing users with this organization or create a new user.
          </p>
        </div>

        <FormField
          control={form.control}
          name="user_ids"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Existing Users</FormLabel>
              <FormControl>
                <MultiSelector values={field.value || []} onValuesChange={field.onChange} className="max-w-xs">
                  <MultiSelectorTrigger>
                    <MultiSelectorInput placeholder="Search users..." />
                  </MultiSelectorTrigger>
                  <MultiSelectorContent>
                    <MultiSelectorList>
                      {userData.map(user => (
                        <MultiSelectorItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            {user.avatar && <img src={user.avatar} alt={user.name} className="h-5 w-5 rounded-full" />}
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{user.name}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </div>
                        </MultiSelectorItem>
                      ))}
                    </MultiSelectorList>
                  </MultiSelectorContent>
                </MultiSelector>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="create_new_user"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Create New User</FormLabel>
                <div className="text-[0.8rem] text-muted-foreground">
                  Create and associate a new user with this organization
                </div>
              </div>
              <FormControl>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-input bg-background"
                  checked={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch('create_new_user') && (
          <div className="ml-4 space-y-4 border-l-2 border-muted pl-4">
            <FormField
              control={form.control}
              name="new_user.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="new_user.email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </div>

      <div className={asPage ? 'flex gap-4 pt-4' : 'pt-4'}>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className={asPage ? 'flex-1' : ''}>
          Cancel
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting} className={asPage ? 'flex-1' : ''}>
          {form.formState.isSubmitting ? 'Creating...' : 'Create Organization'}
        </Button>
      </div>
    </Form>
  )

  if (asPage) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Add New Organization</h1>
          <p className="text-muted-foreground mt-2">Create a new organization. Fill in the details below.</p>
        </div>
        <FormContent />
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Add New Organization</SheetTitle>
          <SheetDescription>Create a new organization. Fill in the details below.</SheetDescription>
        </SheetHeader>
        <FormContent />
      </SheetContent>
    </Sheet>
  )
}
