import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/table/data-table-column-header";
import { Product } from "@/constants/data";
import { Column, ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Text, XCircle } from "lucide-react";
// Removed Next.js Image import - using regular img tag
import { CellAction } from "./cell-action";
import { CATEGORY_OPTIONS } from "./options";

export const columns: ColumnDef<Product>[] = [
  {
    id: "Product_Id",
    accessorKey: "Product_Id",
    header: ({ column }: { column: Column<Product, unknown> }) => <DataTableColumnHeader column={column} title="Product ID" />,
    cell: ({ cell }) => <div className="font-mono text-sm">{cell.getValue<Product["Product_Id"]>()}</div>,
    meta: {
      label: "Product ID",
      placeholder: "Search by product ID...",
      variant: "text",
      icon: Text,
    },
    enableColumnFilter: true,
  },
  {
    id: "Product_Name",
    accessorKey: "Product_Name",
    header: ({ column }: { column: Column<Product, unknown> }) => <DataTableColumnHeader column={column} title="Product Name" />,
    cell: ({ cell }) => <div className="font-medium">{cell.getValue<Product["Product_Name"]>()}</div>,
    meta: {
      label: "Product Name",
      placeholder: "Search products...",
      variant: "text",
      icon: Text,
    },
    enableColumnFilter: true,
  },
  {
    id: "Product_Category",
    accessorKey: "Product_Category",
    header: ({ column }: { column: Column<Product, unknown> }) => <DataTableColumnHeader column={column} title="Category" />,
    cell: ({ cell }) => {
      const category = cell.getValue<Product["Product_Category"]>();
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
    id: "Unit_Price",
    accessorKey: "Unit_Price",
    header: ({ column }: { column: Column<Product, unknown> }) => <DataTableColumnHeader column={column} title="Unit Price" />,
    cell: ({ cell }) => {
      const price = cell.getValue<Product["Unit_Price"]>();
      return <div className="font-medium">${price.toLocaleString()}</div>;
    },
  },
  {
    id: "Cost_Per_Unit",
    accessorKey: "Cost_Per_Unit",
    header: ({ column }: { column: Column<Product, unknown> }) => <DataTableColumnHeader column={column} title="Cost Per Unit" />,
    cell: ({ cell }) => {
      const cost = cell.getValue<Product["Cost_Per_Unit"]>();
      return <div>${cost.toLocaleString()}</div>;
    },
  },
  {
    id: "Is_Active",
    accessorKey: "Is_Active",
    header: ({ column }: { column: Column<Product, unknown> }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ cell }) => {
      const isActive = cell.getValue<Product["Is_Active"]>();
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
    id: "Created_Date",
    accessorKey: "Created_Date",
    header: ({ column }: { column: Column<Product, unknown> }) => <DataTableColumnHeader column={column} title="Created Date" />,
    cell: ({ cell }) => {
      const date = cell.getValue<Product["Created_Date"]>();
      return <div>{new Date(date).toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "Description",
    header: "Description",
    cell: ({ cell }) => {
      const description = cell.getValue<Product["Description"]>();
      return (
        <div className="max-w-xs truncate" title={description}>
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
