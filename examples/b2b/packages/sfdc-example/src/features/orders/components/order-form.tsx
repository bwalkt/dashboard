import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FormDatePicker } from '@/components/forms/form-date-picker'
import { FormInput } from '@/components/forms/form-input'
import { FormSelect } from '@/components/forms/form-select'
import { FormTextarea } from '@/components/forms/form-textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { createAjvResolver } from '@/lib/ajv-resolver'
import { api } from '@/lib/api'
import { Order, OrderCreateRequest, OrderUpdateRequest, validateOrderCreateRequest } from '@/types'

interface OrderFormProps {
  initialData?: Order | null
  pageTitle: string
}

export default function OrderForm({ initialData, pageTitle }: OrderFormProps) {
  const defaultValues: OrderCreateRequest = initialData
    ? {
        Name: initialData.Name || '',
        Description: initialData.Description,
        Status: initialData.Status || 'Draft',
        Customer_Name__c: initialData.Customer_Name__c,
        Customer_Email__c: initialData.Customer_Email__c,
        Payment__c: initialData.Payment__c || undefined,
        EffectiveDate: initialData.EffectiveDate || new Date().toISOString().split('T')[0],
        Total_Amount__c: initialData.Total_Amount__c || undefined,
        Quantity__c: initialData.Quantity__c || undefined,
        Unit_Price__c: initialData.Unit_Price__c || undefined,
        OwnerId: initialData.OwnerId,
        AccountId: initialData.AccountId || '',
      }
    : {
        Name: '',
        Status: 'Draft',
        EffectiveDate: new Date().toISOString().split('T')[0],
        OwnerId: '005ak00000LOPNlAAP',
        AccountId: '001ak00001NjbGzAAJ', // Required field - user must select an account
      }

  const form = useForm<OrderCreateRequest>({
    resolver: createAjvResolver(validateOrderCreateRequest),
    defaultValues: defaultValues,
  })

  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { mutate: createOrder, isPending: isSubmitting } = useMutation({
    mutationFn: async (values: OrderCreateRequest) => {
      return api.post('/salesforce/records/Order', values)
    },
    onSuccess: () => {
      navigate('/dashboard/orders')
      toast.success('Order created successfully')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: error => {
      console.error(error)
    },
  })

  const { mutate: updateOrder, isPending: isUpdating } = useMutation({
    mutationFn: async (values: OrderUpdateRequest) => {
      return api.put(`/salesforce/records/Order/${initialData?.Id}`, values)
    },
    onSuccess: () => {
      navigate('/dashboard/orders')
      toast.success('Order updated successfully')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: error => {
      console.error(error)
    },
  })

  function onSubmit(values: OrderCreateRequest) {
    if (initialData) {
      updateOrder(values)
    } else {
      createOrder(values)
    }
  }

  return (
    <Card className="mx-auto w-full">
      <CardHeader>
        <CardTitle className="text-left text-2xl font-bold">{pageTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form form={form} onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormInput control={form.control} name="Name" label="Order Name" placeholder="Enter order name" />

            <FormInput
              control={form.control}
              name="AccountId"
              label="Account ID"
              placeholder="Enter Salesforce Account ID (e.g., 001000000000000)"
              required
            />

            <FormSelect
              control={form.control}
              name="Status"
              label="Status"
              placeholder="Select status"
              options={[
                { label: 'Draft', value: 'Draft' },
                { label: 'Activated', value: 'Activated' },
                { label: 'Processing', value: 'Processing' },
                { label: 'Completed', value: 'Completed' },
                { label: 'Shipped', value: 'Shipped' },
              ]}
            />

            <FormInput
              control={form.control}
              name="Customer_Name__c"
              label="Customer Name"
              placeholder="Enter customer name"
            />

            <FormInput
              control={form.control}
              name="Customer_Email__c"
              label="Customer Email"
              placeholder="Enter customer email"
              type="email"
            />

            <FormSelect
              control={form.control}
              name="Payment__c"
              label="Payment Method"
              placeholder="Select payment method"
              options={[
                { label: 'Credit Card', value: 'Credit Card' },
                { label: 'Wire Transfer', value: 'Wire Transfer' },
                { label: 'Purchase Order', value: 'Purchase Order' },
              ]}
            />

            <FormDatePicker
              control={form.control}
              name="EffectiveDate"
              label="Effective Date"
              config={{ placeholder: 'Select effective date' }}
            />

            <FormInput
              control={form.control}
              name="Quantity__c"
              label="Quantity"
              placeholder="Enter quantity"
              type="number"
              min={0}
            />

            <FormInput
              control={form.control}
              name="Unit_Price__c"
              label="Unit Price"
              placeholder="Enter unit price"
              type="number"
              min={0}
              step="0.01"
            />

            <FormInput
              control={form.control}
              name="Total_Amount__c"
              label="Total Amount"
              placeholder="Enter total amount"
              type="number"
              min={0}
              step="0.01"
            />
          </div>

          <FormTextarea
            control={form.control}
            name="Description"
            label="Description"
            placeholder="Enter order description"
            config={{
              maxLength: 500,
              showCharCount: true,
              rows: 4,
            }}
          />

          <Button type="submit">
            {isSubmitting || isUpdating ? 'Saving...' : initialData ? 'Update Order' : 'Create Order'}
          </Button>
        </Form>
      </CardContent>
    </Card>
  )
}
