import { Product } from "@pzero/shared";
import { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Text, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/table/data-table-column-header";
import { CellAction } from "./cell-action";
import { CATEGORY_OPTIONS } from "./options";

export const columns: ColumnDef<Product>[] = [
  {
    id: "Id",
    accessorKey: "Id",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Product ID" />,
    cell: ({ cell }) => <div className="font-mono text-sm">{cell.getValue<Product["Id"]>()}</div>,
    meta: {
      label: "Product ID",
      placeholder: "Search by product ID...",
      variant: "text",
      icon: Text,
    },
    enableColumnFilter: true,
  },
  {
    id: "Name",
    accessorKey: "Name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Product Name" />,
    cell: ({ cell }) => <div className="font-medium">{cell.getValue<Product["Name"]>()}</div>,
    meta: {
      label: "Product Name",
      placeholder: "Search products...",
      variant: "text",
      icon: Text,
    },
    enableColumnFilter: true,
  },
  {
    id: "Product_Category__c",
    accessorKey: "Product_Category__c",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
    cell: ({ cell }) => {
      const category = cell.getValue<Product["Product_Category__c"]>();
      return (
        <Badge variant="outline" className="capitalize">
          {category}
        </Badge>
      );
    },
    enableColumnFilter: true,
    meta: {
      label: "categories",
      variant: "multiSelect",
      options: CATEGORY_OPTIONS,
    },
  },
  {
    id: "Unit_Price__c",
    accessorKey: "Unit_Price__c",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Unit Price" />,
    cell: ({ cell }) => {
      const price = cell.getValue<Product["Unit_Price__c"]>();
      if (!price) return <div>N/A</div>;
      return <div className="font-medium">${price.toLocaleString()}</div>;
    },
  },
  {
    id: "Cost_Per_Unit__c",
    accessorKey: "Cost_Per_Unit__c",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cost Per Unit" />,
    cell: ({ cell }) => {
      const cost = cell.getValue<Product["Cost_Per_Unit__c"]>();
      if (!cost) return <div>N/A</div>;
      return <div>${cost.toLocaleString()}</div>;
    },
  },
  {
    id: "IsActive",
    accessorKey: "IsActive",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ cell }) => {
      const isActive = cell.getValue<Product["IsActive"]>();
      const Icon = isActive ? CheckCircle2 : XCircle;
      return (
        <Badge variant={isActive ? "default" : "secondary"} className="capitalize">
          <Icon className="w-3 h-3 mr-1" />
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );
    },
    enableColumnFilter: true,
    meta: {
      label: "status",
      variant: "select",
      options: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ],
    },
  },
  {
    id: "CreatedDate",
    accessorKey: "CreatedDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created Date" />,
    cell: ({ cell }) => {
      const date = cell.getValue<Product["CreatedDate"]>();
      if (!date) return <div>N/A</div>;
      return <div>{new Date(date).toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "Description",
    header: "Description",
    cell: ({ cell }) => {
      const description = cell.getValue<Product["Description"]>();
      return (
        <div className="max-w-xs truncate" title={description ?? undefined}>
          {description}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
