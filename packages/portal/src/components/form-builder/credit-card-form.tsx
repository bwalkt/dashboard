'use client'

import { createValidator, type ValidationResult } from '@boardwalk/shared/validator/ajv'
import React, { useState } from 'react'
import { FieldErrors, FieldValues, ResolverOptions, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { CreditCard, type CreditCardValue } from '@/components/ui/credit-card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

// =============================================================================
// TypeScript Interface
// =============================================================================

interface CreditCardFormData {
  cardholderName: string
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  cvv: string
}

// =============================================================================
// AJV Schema
// =============================================================================

const FormSchema = {
  type: 'object',
  properties: {
    cardholderName: {
      type: 'string',
      minLength: 2,
      maxLength: 50,
    },
    cardNumber: {
      type: 'string',
      minLength: 1,
      pattern: '^[0-9\\s]{13,23}$', // Allow spaces, validate length
    },
    expiryMonth: {
      type: 'string',
      minLength: 1,
      pattern: '^(0?[1-9]|1[0-2])$', // 1-12
    },
    expiryYear: {
      type: 'string',
      minLength: 1,
      pattern: '^[0-9]{4}$', // 4 digits
    },
    cvv: {
      type: 'string',
      minLength: 3,
      maxLength: 4,
      pattern: '^[0-9]{3,4}$',
    },
  },
  required: ['cardholderName', 'cardNumber', 'expiryMonth', 'expiryYear', 'cvv'],
  additionalProperties: false,
}

// =============================================================================
// Custom Validator with Cross-field Validation
// =============================================================================

const validateCreditCardForm = createValidator<CreditCardFormData>(FormSchema)

const creditCardResolver = async (values: FieldValues, context: any, options: ResolverOptions<FieldValues>) => {
  // First run basic AJV validation
  const result = validateCreditCardForm.validate(values)

  if (!result.success) {
    // Convert AJV errors to react-hook-form format
    const errors: FieldErrors = {}

    if (result.errors) {
      for (const error of result.errors) {
        const fieldPath = error.field.replace(/^\//g, '').replace(/\//g, '.')

        let message = error.message || 'Invalid value'

        // Custom error messages
        if (fieldPath === 'cardholderName') {
          if (error.code === 'minLength') {
            message = 'Cardholder name must be at least 2 characters'
          } else if (error.code === 'maxLength') {
            message = 'Cardholder name must be less than 50 characters'
          }
        } else if (fieldPath === 'cardNumber') {
          if (error.code === 'pattern') {
            message = 'Invalid card number format'
          } else if (error.code === 'minLength') {
            message = 'Card number is required'
          }
        } else if (fieldPath === 'expiryMonth') {
          if (error.code === 'pattern') {
            message = 'Invalid month'
          } else if (error.code === 'minLength') {
            message = 'Expiry month is required'
          }
        } else if (fieldPath === 'expiryYear') {
          if (error.code === 'pattern') {
            message = 'Invalid year'
          } else if (error.code === 'minLength') {
            message = 'Expiry year is required'
          }
        } else if (fieldPath === 'cvv') {
          if (error.code === 'pattern') {
            message = 'CVV must contain only digits'
          } else if (error.code === 'minLength') {
            message = 'CVV must be at least 3 digits'
          } else if (error.code === 'maxLength') {
            message = 'CVV must be at most 4 digits'
          }
        }

        errors[fieldPath] = {
          type: error.code || 'validation',
          message,
        }
      }
    }

    return {
      values: {},
      errors,
    }
  }

  // Custom cross-field validations
  const errors: FieldErrors = {}
  const data = values as CreditCardFormData

  // Validate card number format (remove spaces and check digits)
  if (data.cardNumber) {
    const cleanNumber = data.cardNumber.replace(/\s/g, '')
    if (!/^\d{13,19}$/.test(cleanNumber)) {
      errors.cardNumber = {
        type: 'custom',
        message: 'Invalid card number format',
      }
    }
  }

  // Validate expiry date
  if (data.expiryMonth && data.expiryYear) {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1
    const expiryYear = parseInt(data.expiryYear)
    const expiryMonth = parseInt(data.expiryMonth)

    // Check if year is valid range
    if (expiryYear < currentYear || expiryYear > currentYear + 20) {
      errors.expiryYear = {
        type: 'custom',
        message: 'Invalid year',
      }
    }

    // Check if card has expired
    if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
      errors.expiryYear = {
        type: 'custom',
        message: 'Card has expired',
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      values: {},
      errors,
    }
  }

  return {
    values,
    errors: {},
  }
}

export function CreditCardForm() {
  const [creditCard, setCreditCard] = useState<CreditCardValue>({
    cardholderName: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  })

  const [isCardValid, setIsCardValid] = useState(false)

  const form = useForm<CreditCardFormData>({
    resolver: creditCardResolver,
    defaultValues: {
      cardholderName: '',
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
    },
    mode: 'onChange', // Enable real-time validation
  })

  const handleCreditCardChange = (value: CreditCardValue) => {
    setCreditCard(value)

    // Update form values
    form.setValue('cardholderName', value.cardholderName, {
      shouldValidate: true,
    })
    form.setValue('cardNumber', value.cardNumber, { shouldValidate: true })
    form.setValue('expiryMonth', value.expiryMonth, { shouldValidate: true })
    form.setValue('expiryYear', value.expiryYear, { shouldValidate: true })
    form.setValue('cvv', value.cvv, { shouldValidate: true })
  }

  const handleValidationChange = (isValid: boolean, errors: any) => {
    setIsCardValid(isValid)
  }

  const onSubmit = (data: CreditCardFormData) => {
    const maskedNumber = data.cardNumber
      .replace(/\s/g, '')
      .slice(-4)
      .padStart(data.cardNumber.replace(/\s/g, '').length, '•')

    toast.success(
      <div className="space-y-2">
        <p className="font-semibold">Payment Information Submitted</p>
        <p className="text-sm text-muted-foreground">Card ending in {maskedNumber.slice(-4)}</p>
        <p className="text-sm text-muted-foreground">Cardholder: {data.cardholderName}</p>
        <p className="text-sm text-muted-foreground">
          Expires: {data.expiryMonth}/{data.expiryYear.slice(-2)}
        </p>
      </div>,
    )
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Payment Information</h2>
        <p className="text-muted-foreground">Enter your credit card details</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="cardholderName"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Credit Card Information</FormLabel>
                <FormControl>
                  <CreditCard
                    value={creditCard}
                    onChange={handleCreditCardChange}
                    onValidationChange={handleValidationChange}
                    cvvLabel="CVC"
                    cardStyle="shiny-silver"
                    showVendor={true}
                    className="w-full"
                  />
                </FormControl>
                <FormDescription>All fields are required. Your information is secure and encrypted.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Hidden fields to capture validation errors */}
          <div className="hidden">
            <FormField control={form.control} name="cardNumber" render={() => <FormMessage />} />
            <FormField control={form.control} name="expiryMonth" render={() => <FormMessage />} />
            <FormField control={form.control} name="expiryYear" render={() => <FormMessage />} />
            <FormField control={form.control} name="cvv" render={() => <FormMessage />} />
          </div>

          <div className="space-y-4">
            <Button type="submit" className="w-full" disabled={!form.formState.isValid || !isCardValid}>
              {form.formState.isSubmitting ? 'Processing...' : 'Process Payment'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
