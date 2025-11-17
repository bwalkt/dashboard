import { addDays } from 'date-fns'
import SuperJSON from 'superjson'
import {
  filterData,
  getFacetsFromData,
  groupChartData,
  percentileData,
  sliderFilterValues,
  sortData,
  splitData,
} from '@/app/infinite/api/helpers'
import { mock, mockLive } from '@/app/infinite/api/mock'
import type { InfiniteQueryResponse, LogsMeta } from '@/app/infinite/query-options'
import type { ColumnSchema } from '@/app/infinite/schema'
import { searchParamsCache } from '@/app/infinite/search-params'
import { calculateSpecificPercentile } from '@/lib/request/percentile'

/**
 * Client-side data table API that replaces the Next.js API route
 * This function processes the same data locally without needing a server endpoint
 */
export async function fetchDataTableData(
  searchParams: URLSearchParams,
): Promise<InfiniteQueryResponse<ColumnSchema[], LogsMeta>> {
  // Convert URLSearchParams to Map for processing
  const _search: Map<string, string> = new Map()
  searchParams.forEach((value, key) => _search.set(key, value))

  const search = searchParamsCache.parse(Object.fromEntries(_search))
  const totalData = [...mockLive, ...mock]

  const _date =
    search.date?.length === 1
      ? [search.date[0], addDays(search.date[0], 1)]
      : search.date || [addDays(new Date(), -30), new Date()] // Default to last 30 days

  // Filter out the slider values because they are not part of the search params
  const _rest = Object.fromEntries(Object.entries(search).filter(([key]) => !sliderFilterValues.includes(key as any)))

  const rangedData = filterData(totalData, { date: _date })
  const withoutSliderData = filterData(rangedData, { ..._rest, date: null })

  const filteredData = filterData(withoutSliderData, { ...search, date: null })
  const chartData = groupChartData(rangedData, _date)
  const sortedData = sortData(filteredData, search.sort)
  const withoutSliderFacets = getFacetsFromData(withoutSliderData)
  const facets = getFacetsFromData(filteredData)
  const withPercentileData = percentileData(sortedData)
  const data = splitData(withPercentileData, search)

  const latencies = withPercentileData.map(({ latency }) => latency)
  const currentPercentiles = {
    50: calculateSpecificPercentile(latencies, 50),
    75: calculateSpecificPercentile(latencies, 75),
    90: calculateSpecificPercentile(latencies, 90),
    95: calculateSpecificPercentile(latencies, 95),
    99: calculateSpecificPercentile(latencies, 99),
  }

  const nextCursor = data.length > 0 ? data[data.length - 1].date.getTime() : null
  const prevCursor = data.length > 0 ? data[0].date.getTime() : new Date().getTime()

  return {
    data,
    meta: {
      totalRowCount: totalData.length,
      filterRowCount: filteredData.length,
      chartData,
      // Separate the slider for keeping the min/max facets of the slider fields
      facets: {
        ...withoutSliderFacets,
        ...Object.fromEntries(Object.entries(facets).filter(([key]) => !sliderFilterValues.includes(key as any))),
      },
      metadata: { currentPercentiles },
    },
    prevCursor,
    nextCursor,
  }
}
