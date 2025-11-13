import type {
  ColumnDef,
  ColumnFiltersState,
  ColumnSizingState,
  ExpandedState,
  PaginationState,
  SortingState,
  Table as TTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useQueryStates } from "nuqs";
import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  type TablePadding,
  TableRow,
} from "@/components/custom/table";
import { DataTableFilterCommand } from "@/components/data-table/data-table-filter-command";
import { DataTableGroupBy, type GroupByOption } from "@/components/data-table/data-table-group-by";
import { DataTableGrouped } from "@/components/data-table/data-table-grouped";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableProvider } from "@/components/data-table/data-table-provider";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import type { DataTableFilterField, TreeData, TreeDataTableProps } from "@/components/data-table/types";
import { AppLayout } from "@/components/layout/app-layout";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { searchParamsParser } from "./search-params";
import "./data-table.css";

export interface DataTableProps<TData, TValue> extends TreeDataTableProps<TData & TreeData> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  defaultColumnFilters?: ColumnFiltersState;
  // TODO: add sortingColumnFilters
  filterFields?: DataTableFilterField<TData>[];
  groupByOptions?: GroupByOption<TData>[];
  title?: string;
  description?: string;
  cellPadding?: TablePadding;
  headerPadding?: TablePadding;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  defaultColumnFilters = [],
  filterFields = [],
  groupByOptions = [],
  title,
  description,
  enableExpanding = false,
  getSubRows,
  getRowCanExpand,
  initialExpanded = {},
  onExpandedChange,
  cellPadding = "none",
  headerPadding = "sm",
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>(defaultColumnFilters);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnVisibility, setColumnVisibility] =
    useLocalStorage<VisibilityState>("data-table-visibility", {});
  const [columnSizing, setColumnSizing] = 
    useLocalStorage<ColumnSizingState>("data-table-column-sizing", {});
  const [expanded, setExpanded] = React.useState<ExpandedState>(initialExpanded);
  const [groupBy, setGroupBy] = React.useState<keyof TData | null>(null);
  const [_, setSearch] = useQueryStates(searchParamsParser);

  // Reset groupBy when tree expansion is enabled
  React.useEffect(() => {
    if (enableExpanding && groupBy) {
      setGroupBy(null);
    }
  }, [enableExpanding, groupBy]);

  React.useEffect(() => {
    if (onExpandedChange) {
      onExpandedChange(expanded);
    }
  }, [expanded, onExpandedChange]);

  const table = useReactTable({
    data,
    columns,
    state: { 
      columnFilters, 
      sorting, 
      columnVisibility,
      columnSizing,
      pagination,
      ...(enableExpanding && { expanded })
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    ...(enableExpanding && { onExpandedChange: setExpanded }),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    getSortedRowModel: getSortedRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    ...(enableExpanding && { 
      getExpandedRowModel: getExpandedRowModel(),
      getSubRows: getSubRows || ((row: any) => row.subRows),
      getRowCanExpand: getRowCanExpand || ((row: any) => Boolean(row.subRows?.length)),
      filterFromLeafRows: true,
    }),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    // REMINDER: it doesn't support array of strings (WARNING: might not work for other types)
    getFacetedUniqueValues: (table: TTable<TData>, columnId: string) => () => {
      const facets = getFacetedUniqueValues<TData>()(table, columnId)();
      const customFacets = new Map();
      for (const [key, value] of facets as any) {
        if (Array.isArray(key)) {
          for (const k of key) {
            const prevValue = customFacets.get(k) || 0;
            customFacets.set(k, prevValue + value);
          }
        } else {
          const prevValue = customFacets.get(key) || 0;
          customFacets.set(key, prevValue + value);
        }
      }
      return customFacets;
    },
  });

  React.useEffect(() => {
    const columnFiltersWithNullable = filterFields.map((field) => {
      const filterValue = columnFilters.find(
        (filter) => filter.id === field.value,
      );
      if (!filterValue) return { id: field.value, value: null };
      return { id: field.value, value: filterValue.value };
    });

    const search = columnFiltersWithNullable.reduce(
      (prev, curr) => {
        prev[curr.id as string] = curr.value;
        return prev;
      },
      {} as Record<string, unknown>,
    );

    setSearch(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnFilters]);

  return (
    <DataTableProvider
      table={table}
      columns={columns}
      filterFields={filterFields}
      columnFilters={columnFilters}
      sorting={sorting}
      pagination={pagination}
      expanded={expanded}
      enableExpanding={enableExpanding}
    >
      <AppLayout hasFilters={filterFields.length > 0} title={title} description={description}>
        <div className="flex max-w-full flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <DataTableFilterCommand searchParamsParser={searchParamsParser} />
            </div>
          </div>
          <DataTableToolbar 
            groupByComponent={
              groupByOptions.length > 0 && !enableExpanding ? (
                <DataTableGroupBy
                  groupByOptions={groupByOptions}
                  groupBy={groupBy}
                  onGroupByChange={setGroupBy}
                />
              ) : null
            }
          />
          
          {/* Render grouped table or normal table */}
          {groupBy ? (
            <DataTableGrouped
              table={table}
              columns={columns}
              data={data}
              groupBy={groupBy}
              groupByOptions={groupByOptions}
              cellPadding={cellPadding}
              headerPadding={headerPadding}
            />
          ) : (
            <div className="rounded-md border">
                <Table 
                  style={{ 
                    width: table.getCenterTotalSize(),
                  }}
                  className={`table-fixed table-resizable ${
                    table.getState().columnSizingInfo.isResizingColumn ? 'table-resizing' : ''
                  }`}
                >
              <TableHeader className="bg-muted/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="hover:bg-transparent"
                  >
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead 
                          key={header.id}
                          padding={headerPadding}
                          style={{ 
                            width: header.getSize(),
                            position: 'relative'
                          }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                          {header.column.getCanResize() && (
                            <div
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className={`resize-handle ${
                                header.column.getIsResizing() ? 'resizing' : ''
                              }`}
                            />
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell 
                          key={cell.id}
                          padding={cellPadding}
                          style={{ 
                            width: cell.column.getSize() 
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      padding={cellPadding}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              </Table>
            </div>
          )}
          
          <DataTablePagination />
        </div>
      </AppLayout>
    </DataTableProvider>
  );
}
