import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface DataTableSkeletonProps extends React.ComponentProps<'div'> {
  columnCount: number
  rowCount?: number
  filterCount?: number
  cellWidths?: string[]
  withViewOptions?: boolean
  withPagination?: boolean
  shrinkZero?: boolean
}

/**
 * Renders a skeleton placeholder for a data table with optional filter controls, view options, and pagination.
 *
 * @param columnCount - Number of columns to render skeleton cells for.
 * @param rowCount - Number of body rows to render (defaults to 10).
 * @param filterCount - Number of filter skeletons to show in the top bar (hidden if 0).
 * @param cellWidths - Per-column widths; values are cycled to assign a width to each column.
 * @param withViewOptions - When true, shows a view-options skeleton in the top bar.
 * @param withPagination - When true, shows a pagination skeleton bar below the table.
 * @param shrinkZero - When true, sets each cell's `min-width` to its assigned width; otherwise `min-width` is `auto`.
 * @param className - Additional class names applied to the outer container.
 * @returns A JSX element representing the table skeleton layout.
 */
export function DataTableSkeleton({
  columnCount,
  rowCount = 10,
  filterCount = 0,
  cellWidths = ['auto'],
  withViewOptions = true,
  withPagination = true,
  shrinkZero = false,
  className,
  ...props
}: DataTableSkeletonProps) {
  const cozyCellWidths = Array.from(
    { length: columnCount },
    (_, index) => cellWidths[index % cellWidths.length] ?? 'auto',
  )

  return (
    <div className={cn('flex flex-1 flex-col space-y-4', className)} {...props}>
      <div className="flex w-full items-center justify-between gap-2 overflow-auto p-1">
        <div className="flex flex-1 items-center gap-2">
          {filterCount > 0
            ? Array.from({ length: filterCount }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-[4.5rem] border-dashed" />
              ))
            : null}
        </div>
        {withViewOptions ? <Skeleton className="ml-auto hidden h-7 w-[4.5rem] lg:flex" /> : null}
      </div>

      <div className="flex-1 rounded-md border">
        <Table>
          <TableHeader>
            {Array.from({ length: 1 }).map((_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                {Array.from({ length: columnCount }).map((_, j) => (
                  <TableHead
                    key={j}
                    style={{
                      width: cozyCellWidths[j],
                      minWidth: shrinkZero ? cozyCellWidths[j] : 'auto',
                    }}
                  >
                    <Skeleton className="h-6 w-full" />
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                {Array.from({ length: columnCount }).map((_, j) => (
                  <TableCell
                    key={j}
                    style={{
                      width: cozyCellWidths[j],
                      minWidth: shrinkZero ? cozyCellWidths[j] : 'auto',
                    }}
                  >
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {withPagination ? (
        <div className="flex w-full items-center justify-between gap-4 overflow-auto p-1 sm:gap-8">
          <Skeleton className="h-7 w-40 shrink-0" />
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-7 w-[4.5rem]" />
            </div>
            <div className="flex items-center justify-center text-sm font-medium">
              <Skeleton className="h-7 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="hidden size-7 lg:block" />
              <Skeleton className="size-7" />
              <Skeleton className="size-7" />
              <Skeleton className="hidden size-7 lg:block" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
