"use client";

import { AlertModal } from "@/components/modal/alert-modal";
import { useDeleteUser } from "./hooks";
import type { ColumnSchema } from "./types";

interface DeleteUserModalProps {
  user: ColumnSchema;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteUserModal({
  user,
  open,
  onOpenChange,
}: DeleteUserModalProps) {
  const deleteUser = useDeleteUser();

  const onConfirm = async () => {
    try {
      await deleteUser.mutateAsync(user.id);
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <AlertModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      onConfirm={onConfirm}
      loading={deleteUser.isPending}
    />
  );
}

