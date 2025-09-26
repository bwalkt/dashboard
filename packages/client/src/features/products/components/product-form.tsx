import { FormInput } from "@/components/forms/form-input";
import { FormSelect } from "@/components/forms/form-select";
import { FormTextarea } from "@/components/forms/form-textarea";
import { FormCheckbox } from "@/components/forms/form-checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Product, ProductCreateRequest, ProductCreateRequestSchema } from "@dashboard/shared-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function ProductForm({ initialData, pageTitle }: { initialData: Product | null; pageTitle: string }) {
  const defaultValues: ProductCreateRequest = initialData
    ? {
        Name: initialData.Name || "",
        IsActive: initialData.IsActive || false,
        ProductCode: initialData.ProductCode,
        Description: initialData.Description,
        Family: initialData.Family || "None",
        Type: initialData.Type || "Base",
        StockKeepingUnit: initialData.StockKeepingUnit,
        QuantityUnitOfMeasure: initialData.QuantityUnitOfMeasure,
        DisplayUrl: initialData.DisplayUrl,
        ExternalDataSourceId: initialData.ExternalDataSourceId,
        ExternalId: initialData.ExternalId,
        Product_Category__c: initialData.Product_Category__c || "Services",
        Unit_Price__c: initialData.Unit_Price__c,
        Cost_Per_Unit__c: initialData.Cost_Per_Unit__c,
        External_Id__c: initialData.External_Id__c,
      }
    : {
        Name: "",
        IsActive: true,
        Family: "None",
        Type: "Base",
        Product_Category__c: "Services",
      };

  const form = useForm<ProductCreateRequest>({
    resolver: zodResolver(ProductCreateRequestSchema),
    defaultValues: defaultValues,
  });

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const { mutate: createProduct, isPending: isSubmitting } = useMutation({
    mutationFn: async (values: ProductCreateRequest) => {
      return api.post("/salesforce/records/Product2", values);
    },
    onSuccess: () => {
      navigate("/dashboard/products");
      toast.success("Product created successfully");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      console.error(error);
    },
  });

  function onSubmit(values: ProductCreateRequest) {
    // Form submission logic would be implemented here
    console.log(values);
    createProduct(values);
  }

  return (
    <Card className="mx-auto w-full">
      <CardHeader>
        <CardTitle className="text-left text-2xl font-bold">{pageTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form form={form} onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormInput control={form.control} name="Name" label="Product Name" placeholder="Enter product name" required />

            <FormInput control={form.control} name="ProductCode" label="Product Code" placeholder="Enter product code" />

            <FormSelect
              control={form.control}
              name="Product_Category__c"
              label="Product Category"
              placeholder="Select category"
              options={[
                {
                  label: "Software",
                  value: "Software",
                },
                {
                  label: "Services",
                  value: "Services",
                },
              ]}
            />

            <FormSelect
              control={form.control}
              name="Type"
              label="Product Type"
              placeholder="Select type"
              options={[
                {
                  label: "Base",
                  value: "Base",
                },
                {
                  label: "Bundle",
                  value: "Bundle",
                },
                {
                  label: "Set",
                  value: "Set",
                },
              ]}
            />

            <FormInput control={form.control} name="Unit_Price__c" label="Unit Price" placeholder="Enter unit price" type="number" min={0} step="0.01" />

            <FormInput
              control={form.control}
              name="Cost_Per_Unit__c"
              label="Cost Per Unit"
              placeholder="Enter cost per unit"
              type="number"
              min={0}
              step="0.01"
            />

            <FormInput control={form.control} name="StockKeepingUnit" label="SKU" placeholder="Enter SKU" />

            <FormInput control={form.control} name="QuantityUnitOfMeasure" label="Unit of Measure" placeholder="Enter unit of measure" />

            <FormInput control={form.control} name="DisplayUrl" label="Display URL" placeholder="Enter display URL" type="url" />

            <FormInput control={form.control} name="ExternalId" label="External ID" placeholder="Enter external ID" />

            <FormInput control={form.control} name="External_Id__c" label="Custom External ID" placeholder="Enter custom external ID" />
          </div>

          <FormTextarea
            control={form.control}
            name="Description"
            label="Description"
            placeholder="Enter product description"
            config={{
              maxLength: 500,
              showCharCount: true,
              rows: 4,
            }}
          />

          <FormCheckbox control={form.control} name="IsActive" label="Active Product" description="Check this box to make the product active" />

          <Button type="submit">{isSubmitting ? "Saving..." : initialData ? "Update Product" : "Create Product"}</Button>
        </Form>
      </CardContent>
    </Card>
  );
}
