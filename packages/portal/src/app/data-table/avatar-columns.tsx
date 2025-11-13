"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Check, Clock, Minus, UserCheck, UserX } from "lucide-react";
import { AvatarCell } from "@/components/data-table/data-table-avatar-cell";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { StatusCell } from "@/components/data-table/data-table-status-cell";
import { Badge } from "@/components/ui/badge";
import type { UserData } from "./avatar-data";

const statusConfig = {
  active: {
    icon: UserCheck,
    label: "Active",
    className: "text-green-700 bg-green-100 border-green-200 hover:bg-green-100"
  },
  inactive: {
    icon: UserX,
    label: "Inactive", 
    className: "text-red-700 bg-red-100 border-red-200 hover:bg-red-100"
  },
  pending: {
    icon: Clock,
    label: "Pending",
    className: "text-yellow-700 bg-yellow-100 border-yellow-200 hover:bg-yellow-100"
  }
};

const departmentColors: Record<string, string> = {
  "Engineering": "text-blue-700 bg-blue-100 border-blue-200 hover:bg-blue-100",
  "Product": "text-purple-700 bg-purple-100 border-purple-200 hover:bg-purple-100", 
  "Design": "text-pink-700 bg-pink-100 border-pink-200 hover:bg-pink-100",
  "Analytics": "text-emerald-700 bg-emerald-100 border-emerald-200 hover:bg-emerald-100",
  "Marketing": "text-orange-700 bg-orange-100 border-orange-200 hover:bg-orange-100",
  "Human Resources": "text-cyan-700 bg-cyan-100 border-cyan-200 hover:bg-cyan-100",
  "Sales": "text-violet-700 bg-violet-100 border-violet-200 hover:bg-violet-100",
  "Finance": "text-indigo-700 bg-indigo-100 border-indigo-200 hover:bg-indigo-100"
};

export const avatarColumns: ColumnDef<UserData>[] = [
  {
    id: "avatar",
    header: "",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="p-2 flex items-center justify-center h-full">
          <AvatarCell 
            name={user.name}
            email={user.email}
            avatarUrl={user.avatarUrl}
            size="md"
          />
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    size: 60,
    minSize: 60,
    maxSize: 60,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="p-2 flex flex-col justify-center min-w-0 h-full">
          <span className="font-medium text-sm truncate">{user.name}</span>
          <span className="text-xs text-muted-foreground truncate">{user.email}</span>
        </div>
      );
    },
    enableHiding: false,
    size: 200,
    minSize: 150,
    maxSize: 400,
  },
  {
    accessorKey: "role",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Role" />
    ),
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      return (
        <div className="p-2 flex items-center h-full">
          <span className="font-medium">{role}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "department", 
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Department" />
    ),
    cell: ({ row }) => {
      const department = row.getValue("department") as string;
      const colorClass = departmentColors[department] || "text-gray-700 bg-gray-100 border-gray-200 hover:bg-gray-100";
      
      return (
        <div className="p-2 flex items-center h-full">
          <Badge className={colorClass}>
            {department}
          </Badge>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      const rowValue = row.getValue(id) as string;
      if (typeof value === "string") return rowValue.toLowerCase().includes(value.toLowerCase());
      if (Array.isArray(value)) return value.includes(rowValue);
      return false;
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Employee Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as keyof typeof statusConfig;
      const config = statusConfig[status];
      const Icon = config.icon;
      
      return (
        <div className="p-2 flex items-center h-full">
          <Badge className={config.className}>
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      const rowValue = row.getValue(id);
      if (typeof value === "string") return value === String(rowValue);
      if (Array.isArray(value)) return value.includes(rowValue);
      return false;
    },
  },
  {
    accessorKey: "projectStatus",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Project Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("projectStatus") as UserData["projectStatus"];
      return <StatusCell status={status} showIcon={true} fullCell={true} />;
    },
    filterFn: (row, id, value) => {
      const rowValue = row.getValue(id);
      if (typeof value === "string") return value === String(rowValue);
      if (Array.isArray(value)) return value.includes(rowValue);
      return false;
    },
    size: 120,
    minSize: 100,
    maxSize: 200,
  },
  {
    accessorKey: "location",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Location" />
    ),
    cell: ({ row }) => {
      const location = row.getValue("location") as string;
      return (
        <div className="p-2 flex items-center h-full">
          <span className="text-muted-foreground">{location}</span>
        </div>
      );
    },
  },
];