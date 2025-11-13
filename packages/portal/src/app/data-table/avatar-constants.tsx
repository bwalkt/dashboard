import { getStatusOptions } from "@/components/data-table/data-table-status-cell";
import type { DataTableFilterField } from "@/components/data-table/types";
import type { UserData } from "./avatar-data";

export const avatarFilterFields: DataTableFilterField<UserData>[] = [
  {
    label: "Name",
    value: "name",
    type: "input",
  },
  {
    label: "Email", 
    value: "email",
    type: "input",
  },
  {
    label: "Role",
    value: "role",
    type: "input",
  },
  {
    label: "Department",
    value: "department", 
    type: "checkbox",
    options: [
      { label: "Engineering", value: "Engineering" },
      { label: "Product", value: "Product" },
      { label: "Design", value: "Design" },
      { label: "Analytics", value: "Analytics" },
      { label: "Marketing", value: "Marketing" },
      { label: "Human Resources", value: "Human Resources" },
      { label: "Sales", value: "Sales" },
      { label: "Finance", value: "Finance" },
    ],
  },
  {
    label: "Employee Status",
    value: "status",
    type: "checkbox", 
    options: [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
      { label: "Pending", value: "pending" },
    ],
  },
  {
    label: "Project Status",
    value: "projectStatus",
    type: "checkbox",
    options: getStatusOptions(),
  },
  {
    label: "Location",
    value: "location",
    type: "input",
  },
];