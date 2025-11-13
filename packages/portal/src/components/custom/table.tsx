import * as React from "react";

import { cn } from "@/lib/utils";

export type TablePadding = "xs" | "sm" | "md" | "lg" | "none";

const paddingClasses: Record<TablePadding, string> = {
  none: "p-0",
  xs: "p-1", 
  sm: "p-2",
  md: "p-3",
  lg: "p-4"
};

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
  padding?: TablePadding;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, containerClassName, onScroll, padding = "none", ...props }, ref) => (
    <div
      className={cn("w-full overflow-auto", containerClassName)}
      // REMINDER: we are not scrolling the table, but the container
      {...{ onScroll }}
    >
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("bg-primary text-primary-foreground font-medium", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  padding?: TablePadding;
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, padding = "none", ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors h-16",
        paddingClasses[padding],
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  padding?: TablePadding;
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, padding = "sm", ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "text-muted-foreground h-10 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        paddingClasses[padding],
        className
      )}
      {...props}
    />
  )
);
TableHead.displayName = "TableHead";

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  padding?: TablePadding;
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, padding = "none", ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        "align-middle h-16 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        paddingClasses[padding],
        className
      )}
      {...props}
    />
  )
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("text-muted-foreground mt-4 text-sm", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
