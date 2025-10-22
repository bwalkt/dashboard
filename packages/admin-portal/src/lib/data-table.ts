import type { Column } from '@tanstack/react-table'
import { dataTableConfig } from '@/config/data-table'
import type { ExtendedColumnFilter, FilterOperator, FilterVariant } from '@/types/data-table'

/**
 * Compute inline CSS properties for a table column based on its pinning state.
 *
 * @param column - The table column whose pinning/positioning state is used to compute styles.
 * @param withBorder - If `true`, include an inset edge shadow for the outer pinned column to simulate a border.
 * @returns A React.CSSProperties object containing positioning offsets (`left`/`right`), `position`, `opacity`, `background`, `width`, `zIndex`, and an optional `boxShadow` when `withBorder` is enabled for pinned edge columns.
 */
export function getCommonPinningStyles<TData>({
  column,
  withBorder = false,
}: {
  column: Column<TData>
  withBorder?: boolean
}): React.CSSProperties {
  const isPinned = column.getIsPinned()
  const isLastLeftPinnedColumn = isPinned === 'left' && column.getIsLastColumn('left')
  const isFirstRightPinnedColumn = isPinned === 'right' && column.getIsFirstColumn('right')

  return {
    boxShadow: withBorder
      ? isLastLeftPinnedColumn
        ? '-4px 0 4px -4px hsl(var(--border)) inset'
        : isFirstRightPinnedColumn
          ? '4px 0 4px -4px hsl(var(--border)) inset'
          : undefined
      : undefined,
    left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
    right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    opacity: isPinned ? 0.97 : 1,
    position: isPinned ? 'sticky' : 'relative',
    background: isPinned ? 'hsl(var(--background))' : 'hsl(var(--background))',
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
  }
}

/**
 * Get the filter operators appropriate for a filter variant.
 *
 * @param filterVariant - The filter variant to retrieve operators for
 * @returns An array of operator objects with `label` and `value` properties; falls back to text operators when the variant has no specific mapping
 */
export function getFilterOperators(filterVariant: FilterVariant) {
  const operatorMap: Record<FilterVariant, { label: string; value: FilterOperator }[]> = {
    text: dataTableConfig.textOperators,
    number: dataTableConfig.numericOperators,
    range: dataTableConfig.numericOperators,
    date: dataTableConfig.dateOperators,
    dateRange: dataTableConfig.dateOperators,
    boolean: dataTableConfig.booleanOperators,
    select: dataTableConfig.selectOperators,
    multiSelect: dataTableConfig.multiSelectOperators,
  }

  return operatorMap[filterVariant] ?? dataTableConfig.textOperators
}

/**
 * Selects the default filter operator for a given filter variant.
 *
 * @param filterVariant - The filter variant (for example, `'text'`, `'number'`, etc.) used to determine available operators
 * @returns The default `FilterOperator` for `filterVariant`; uses the first configured operator when available, otherwise returns `'iLike'` for `'text'` and `'eq'` for other variants
 */
export function getDefaultFilterOperator(filterVariant: FilterVariant) {
  const operators = getFilterOperators(filterVariant)

  return operators[0]?.value ?? (filterVariant === 'text' ? 'iLike' : 'eq')
}

/**
 * Filter an array of ExtendedColumnFilter to include only entries that represent meaningful filtering criteria.
 *
 * A filter is considered valid if its `operator` is `isEmpty` or `isNotEmpty`, if its `value` is a non-empty array,
 * or if its `value` is not `''`, `null`, or `undefined`.
 *
 * @param filters - The list of column filters to validate.
 * @returns An array containing only filters that are empty-check operators or have non-empty values.
 */
export function getValidFilters<TData>(filters: ExtendedColumnFilter<TData>[]): ExtendedColumnFilter<TData>[] {
  return filters.filter(
    filter =>
      filter.operator === 'isEmpty' ||
      filter.operator === 'isNotEmpty' ||
      (Array.isArray(filter.value)
        ? filter.value.length > 0
        : filter.value !== '' && filter.value !== null && filter.value !== undefined),
  )
}
