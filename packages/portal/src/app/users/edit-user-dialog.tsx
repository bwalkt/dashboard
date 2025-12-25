"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { FormInput } from "@/components/forms/form-input";
import { useUpdateUser } from "./hooks";
import type { ColumnSchema } from "./types";

interface EditUserDialogProps {
  user: ColumnSchema;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EditUserFormData {
  name: string;
  email: string;
  handle: string;
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
}: EditUserDialogProps) {
  const updateUser = useUpdateUser();

  const form = useForm<EditUserFormData>({
    defaultValues: {
      name: user.name,
      email: user.email,
      handle: user.handle,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: user.name,
        email: user.email,
        handle: user.handle,
      });
    }
  }, [open, user, form]);

  const onSubmit = async (data: EditUserFormData) => {
    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: {
          name: data.name,
          email: data.email,
          handle: data.handle,
        },
      });
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <FormInput
              control={form.control}
              name="name"
              label="Name"
              required
              placeholder="Enter user name"
            />
            <FormInput
              control={form.control}
              name="email"
              type="email"
              label="Email"
              required
              placeholder="Enter user email"
            />
            <FormInput
              control={form.control}
              name="handle"
              label="Handle"
              placeholder="Enter user handle"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateUser.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

