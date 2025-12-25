"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Check, Minus } from "lucide-react";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { CellActions } from "./cell-actions";
import type { ColumnSchema, UserOnlineStatus, UserStatus } from "./types";

const statusColors: Record<UserStatus, string> = {
  ACTIVE: "text-green-700 bg-green-100 border-green-200 hover:bg-green-100",
  INACTIVE: "text-gray-700 bg-gray-100 border-gray-200 hover:bg-gray-100",
  BANNED: "text-red-700 bg-red-100 border-red-200 hover:bg-red-100",
  DELETED: "text-gray-500 bg-gray-50 border-gray-200 hover:bg-gray-50",
  PENDING: "text-yellow-700 bg-yellow-100 border-yellow-200 hover:bg-yellow-100",
  BLOCKED: "text-orange-700 bg-orange-100 border-orange-200 hover:bg-orange-100",
};

const onlineStatusColors: Record<UserOnlineStatus, string> = {
  ONLINE: "text-green-700 bg-green-100 border-green-200 hover:bg-green-100",
  OOO: "text-purple-700 bg-purple-100 border-purple-200 hover:bg-purple-100",
  AWAY: "text-yellow-700 bg-yellow-100 border-yellow-200 hover:bg-yellow-100",
  BUSY: "text-red-700 bg-red-100 border-red-200 hover:bg-red-100",
  INACTIVE: "text-gray-700 bg-gray-100 border-gray-200 hover:bg-gray-100",
};

export const columns: ColumnDef<ColumnSchema>[] = [
  // {
  //   accessorKey: "avatar",
  //   header: "",
  //   cell: ({ row }) => {
  //     return <AvatarCell name={row.original.name} email={row.original.email} avatarUrl={row.original.avatar || undefined} size="md" />;
  //   },
  //   enableHiding: false,
  // },
  {
    accessorKey: "name",
    header: "Name",
    enableHiding: false,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const email = row.getValue("email") as string;
      const verified = row.original.email_verified;
      return (
        <div className="flex items-center gap-2">
          <span>{email}</span>
          {verified && <Check className="h-4 w-4 text-green-600" />}
        </div>
      );
    },
    filterFn: (row, id, value) => {
      const email = row.getValue(id) as string;
      if (typeof value === "string") {
        return email.toLowerCase().includes(value.toLowerCase());
      }
      return false;
    },
  },
  {
    accessorKey: "handle",
    header: "Handle",
    filterFn: (row, id, value) => {
      const handle = row.getValue(id) as string;
      if (typeof value === "string") {
        return handle.toLowerCase().includes(value.toLowerCase());
      }
      return false;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as UserStatus;
      return <Badge className={statusColors[status]}>{status}</Badge>;
    },
    filterFn: (row, id, value) => {
      const rowValue = row.getValue(id) as UserStatus;
      if (typeof value === "string") return value === rowValue;
      if (Array.isArray(value)) return value.includes(rowValue);
      return false;
    },
  },
  {
    accessorKey: "online_status",
    header: "Online Status",
    cell: ({ row }) => {
      const onlineStatus = row.getValue("online_status") as UserOnlineStatus;
      return <Badge className={onlineStatusColors[onlineStatus]}>{onlineStatus}</Badge>;
    },
    filterFn: (row, id, value) => {
      const rowValue = row.getValue(id) as UserOnlineStatus;
      if (typeof value === "string") return value === rowValue;
      if (Array.isArray(value)) return value.includes(rowValue);
      return false;
    },
  },
  {
    accessorKey: "last_seen",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Last Seen" />,
    cell: ({ row }) => {
      const value = row.getValue("last_seen") as string;
      if (!value) return <Minus className="h-4 w-4 text-muted-foreground/50" />;
      return (
        <div className="text-xs text-muted-foreground" suppressHydrationWarning>
          {format(new Date(value), "LLL dd, y HH:mm")}
        </div>
      );
    },
  },
  {
    accessorKey: "email_verified",
    header: "Verified",
    cell: ({ row }) => {
      const value = row.getValue("email_verified") as boolean;
      if (value) return <Check className="h-4 w-4 text-green-600" />;
      return <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    filterFn: (row, id, value) => {
      const rowValue = row.getValue(id) as boolean;
      if (typeof value === "string") return value === String(rowValue);
      if (typeof value === "boolean") return value === rowValue;
      if (Array.isArray(value)) return value.includes(rowValue);
      return false;
    },
  },
  {
    accessorKey: "c_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created At" />,
    cell: ({ row }) => {
      const value = row.getValue("c_at") as string;
      if (!value) return <Minus className="h-4 w-4 text-muted-foreground/50" />;
      return (
        <div className="text-xs text-muted-foreground" suppressHydrationWarning>
          {format(new Date(value), "LLL dd, y HH:mm")}
        </div>
      );
    },
  },
  {
    accessorKey: "is_act",
    header: "Active",
    cell: ({ row }) => {
      const value = row.getValue("is_act") as boolean;
      if (value) return <Check className="h-4 w-4" />;
      return <Minus className="h-4 w-4 text-muted-foreground/50" />;
    },
    filterFn: (row, id, value) => {
      const rowValue = row.getValue(id) as boolean;
      if (typeof value === "string") return value === String(rowValue);
      if (typeof value === "boolean") return value === rowValue;
      if (Array.isArray(value)) return value.includes(rowValue);
      return false;
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <CellActions user={row.original} />,
    enableHiding: false,
  },
];
