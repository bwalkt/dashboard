export const sliderFilterValues = ['latency', 'ttfb', 'duration'] as const

export function filterData(data: any[], filters: any): any[] {
  if (!filters) return data

  return data.filter(item => {
    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined) continue

      if (key === 'date' && Array.isArray(value) && value.length === 2) {
        const itemDate = new Date(item.date)
        const [startDate, endDate] = value.map(d => new Date(d))
        if (startDate && endDate && (itemDate < startDate || itemDate > endDate)) return false
      } else if (sliderFilterValues.includes(key as any)) {
        const [min, max] = value as [number, number]
        if (item[key] < min || item[key] > max) return false
      } else if (Array.isArray(value)) {
        if (!value.includes(item[key])) return false
      } else if (typeof value === 'string') {
        if (!item[key]?.toString().toLowerCase().includes(value.toLowerCase())) {
          return false
        }
      } else if (item[key] !== value) {
        return false
      }
    }
    return true
  })
}

export function getFacetsFromData(data: any[]): Record<string, any> {
  const facets: Record<string, any> = {}

  if (!data.length) return facets

  const keys = Object.keys(data[0])

  for (const key of keys) {
    if (sliderFilterValues.includes(key as any)) {
      const values = data.map(item => item[key]).filter(v => v != null)
      facets[key] = {
        min: Math.min(...values),
        max: Math.max(...values),
      }
    } else {
      const uniqueValues = [...new Set(data.map(item => item[key]))]
      facets[key] = uniqueValues.map(value => ({
        value,
        count: data.filter(item => item[key] === value).length,
      }))
    }
  }

  return facets
}

interface GroupData {
  date: Date
  count: number
  latencySum: number
  errorCount: number
}

export function groupChartData(data: any[], dateRange?: Date[]): any[] {
  if (!data.length) return []

  const grouped = data.reduce(
    (acc, item) => {
      const date = new Date(item.date)
      const hour = new Date(date)
      hour.setMinutes(0)
      hour.setSeconds(0)
      hour.setMilliseconds(0)
      const key = hour.toISOString()

      if (!acc[key]) {
        acc[key] = {
          date: hour,
          count: 0,
          latencySum: 0,
          errorCount: 0,
        }
      }

      acc[key].count++
      acc[key].latencySum += item.latency || 0
      if (item.status >= 400) acc[key].errorCount++

      return acc
    },
    {} as Record<string, GroupData>,
  )

  return Object.values(grouped).map(group => {
    const g = group as GroupData
    return {
      ...g,
      avgLatency: g.latencySum / g.count,
      errorRate: (g.errorCount / g.count) * 100,
    }
  })
}

export function percentileData(data: any[]): any[] {
  return data.map(item => ({
    ...item,
    percentile: item.latency ? Math.floor((item.latency / 1000) * 100) : 0,
  }))
}

export function sortData(data: any[], sort?: Array<{ id: string; desc: boolean }>): any[] {
  if (!sort || !sort.length) return data

  return [...data].sort((a, b) => {
    for (const { id, desc } of sort) {
      if (a[id] === b[id]) continue

      if (a[id] == null) return desc ? -1 : 1
      if (b[id] == null) return desc ? 1 : -1

      const comparison = a[id] > b[id] ? 1 : -1
      return desc ? -comparison : comparison
    }
    return 0
  })
}

export function splitData(data: any[], params: { page?: number; perPage?: number }): any[] {
  const page = params.page || 1
  const perPage = params.perPage || 50
  const start = (page - 1) * perPage
  const end = start + perPage

  return data.slice(start, end)
}
