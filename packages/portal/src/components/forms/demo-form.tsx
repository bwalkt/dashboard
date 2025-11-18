'use client'

import { createValidator } from '@boardwalk/shared/validator/ajv'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createAjvResolver } from '@/lib/ajv-resolver'
import { FormCheckbox } from './form-checkbox'
import { type CheckboxGroupOption, FormCheckboxGroup } from './form-checkbox-group'
import { FormDatePicker } from './form-date-picker'
import { type FileUploadConfig, FormFileUpload } from './form-file-upload'
import { FormInput } from './form-input'
import { FormRadioGroup, type RadioGroupOption } from './form-radio-group'
import { type FormOption, FormSelect } from './form-select'
import { FormSlider } from './form-slider'
import { FormSwitch } from './form-switch'
import { FormTextarea } from './form-textarea'

// =============================================================================
// TypeScript Interface
// =============================================================================

interface DemoFormData {
  // Basic inputs
  name: string
  email: string
  age: number
  password: string
  // Textarea
  bio: string
  // Select
  country: string
  // Checkbox group
  interests: string[]
  // Radio group
  gender: string
  // Switch
  newsletter: boolean
  // Slider
  rating: number
  // Date picker
  birthDate?: Date
  // Single checkbox
  terms: boolean
  // File upload
  avatar?: any[]
}

// =============================================================================
// AJV Schema
// =============================================================================

const demoFormSchema = {
  type: 'object',
  properties: {
    // Basic inputs
    name: { type: 'string', minLength: 2 },
    email: { type: 'string', format: 'email' },
    age: { type: 'number', minimum: 18 },
    password: { type: 'string', minLength: 8 },
    // Textarea
    bio: { type: 'string', minLength: 10 },
    // Select
    country: { type: 'string', minLength: 1 },
    // Checkbox group
    interests: { type: 'array', items: { type: 'string' }, minItems: 1 },
    // Radio group
    gender: { type: 'string', minLength: 1 },
    // Switch
    newsletter: { type: 'boolean' },
    // Slider
    rating: { type: 'number', minimum: 0, maximum: 10 },
    // Date picker (optional)
    birthDate: { type: 'string', format: 'date' },
    // Single checkbox (must be true)
    terms: { type: 'boolean', const: true },
    // File upload (optional)
    avatar: { type: 'array', items: {} },
  },
  required: [
    'name',
    'email',
    'age',
    'password',
    'bio',
    'country',
    'interests',
    'gender',
    'newsletter',
    'rating',
    'terms',
  ],
  additionalProperties: false,
}

// =============================================================================
// Validator
// =============================================================================

const validateDemoForm = createValidator<DemoFormData>(demoFormSchema)

// Demo options
const countryOptions: FormOption[] = [
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'au', label: 'Australia' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
]

const interestOptions: CheckboxGroupOption[] = [
  { value: 'technology', label: 'Technology' },
  { value: 'sports', label: 'Sports' },
  { value: 'music', label: 'Music' },
  { value: 'travel', label: 'Travel' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'reading', label: 'Reading' },
]

const genderOptions: RadioGroupOption[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
]

const fileUploadConfig: FileUploadConfig = {
  maxSize: 5000000, // 5MB
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  multiple: false,
  maxFiles: 1,
}

/**
 * Demo form showcasing a collection of reusable form components with schema-driven validation and a live form data preview.
 *
 * Renders a composed form (inputs, textarea, select, checkbox/radio groups, switch, slider, date picker, file upload)
 * wired to react-hook-form with Zod validation, default values, submit/reset controls, and a JSON preview of current form state.
 *
 * @returns A React element that renders the demo form and its live form data preview.
 */
export default function DemoForm() {
  const form = useForm<DemoFormData>({
    resolver: createAjvResolver(validateDemoForm),
    defaultValues: {
      name: '',
      email: '',
      age: 18,
      password: '',
      bio: '',
      country: '',
      interests: [],
      gender: '',
      newsletter: false,
      rating: 5,
      birthDate: undefined,
      terms: false,
      avatar: [],
    },
  })

  const onSubmit = (data: DemoFormData) => {
    alert('Form submitted successfully! Check console for data.')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Reusable Form Components Demo</CardTitle>
          <p className="text-muted-foreground">
            See how these components reduce boilerplate from 15+ lines to just 5-8 lines per field
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Inputs */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput
                control={form.control}
                name="name"
                label="Full Name"
                placeholder="Enter your full name"
                required
              />

              <FormInput
                control={form.control}
                name="email"
                type="email"
                label="Email Address"
                placeholder="Enter your email"
                required
              />

              <FormInput control={form.control} name="age" type="number" label="Age" min={18} max={100} required />

              <FormInput
                control={form.control}
                name="password"
                type="password"
                label="Password"
                placeholder="Enter your password"
                required
              />
            </div>

            {/* Textarea */}
            <FormTextarea
              control={form.control}
              name="bio"
              label="Bio"
              placeholder="Tell us about yourself..."
              description="A brief description about yourself"
              config={{
                maxLength: 500,
                showCharCount: true,
                rows: 4,
              }}
              required
            />

            {/* Select */}
            <FormSelect
              control={form.control}
              name="country"
              label="Country"
              placeholder="Select your country"
              options={countryOptions}
              required
            />

            {/* Checkbox Group */}
            <FormCheckboxGroup
              control={form.control}
              name="interests"
              label="Interests"
              description="Select all that apply"
              options={interestOptions}
              columns={3}
              showBadges={true}
              required
            />

            {/* Radio Group */}
            <FormRadioGroup
              control={form.control}
              name="gender"
              label="Gender"
              options={genderOptions}
              orientation="horizontal"
              required
            />

            {/* Switch */}
            <FormSwitch
              control={form.control}
              name="newsletter"
              label="Subscribe to Newsletter"
              description="Receive updates about new features and products"
            />

            {/* Slider */}
            <FormSlider
              control={form.control}
              name="rating"
              label="Overall Rating"
              description="Rate your experience (0-10)"
              config={{
                min: 0,
                max: 10,
                step: 0.5,
                formatValue: value => `${value}/10`,
              }}
              showValue={true}
            />

            {/* Date Picker */}
            <FormDatePicker
              control={form.control}
              name="birthDate"
              label="Birth Date"
              description="Your date of birth (optional)"
              config={{
                maxDate: new Date(),
                placeholder: 'Select your birth date',
              }}
            />

            {/* Single Checkbox */}
            <FormCheckbox
              control={form.control}
              name="terms"
              checkboxLabel="I agree to the Terms and Conditions"
              description="Please read and accept our terms"
              required
            />

            {/* File Upload */}
            <FormFileUpload
              control={form.control}
              name="avatar"
              label="Profile Picture"
              description="Upload a profile picture (optional)"
              config={fileUploadConfig}
            />

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1">
                Submit Form
              </Button>
              <Button type="button" variant="outline" onClick={() => form.reset()} className="flex-1">
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Form Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Form Data Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted overflow-auto rounded-lg p-4 text-sm">{JSON.stringify(form.watch(), null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
