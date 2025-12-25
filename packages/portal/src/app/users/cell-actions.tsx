"use client";

import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth";
import { DeleteUserModal } from "./delete-user-modal";
import { EditUserDialog } from "./edit-user-dialog";
import type { ColumnSchema } from "./types";

interface CellActionsProps {
  user: ColumnSchema;
}

export function CellActions({ user }: CellActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { user: currentUser } = useAuthStore();
  const isCurrentUser = user.id === currentUser?.id;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isCurrentUser} onClick={() => setDeleteOpen(true)} variant="destructive">
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditUserDialog user={user} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteUserModal user={user} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
