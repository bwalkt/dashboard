export const timingPhases = [
  'timing.dns',
  'timing.connection',
  'timing.tls',
  'timing.ttfb',
  'timing.transfer',
  'timing.stalling',
  'timing.envoy_total',
] as const

export type TimingPhase = (typeof timingPhases)[number]

export function getTimingColor(timing: TimingPhase) {
  switch (timing) {
    case 'timing.dns':
      return 'bg-emerald-500'
    case 'timing.connection':
      return 'bg-cyan-500'
    case 'timing.tls':
      return 'bg-blue-500'
    case 'timing.ttfb':
      return 'bg-violet-500'
    case 'timing.transfer':
      return 'bg-purple-500'
    case 'timing.stalling':
      return 'bg-gray-500'
    case 'timing.envoy_total':
      return 'bg-orange-500'
    default:
      return 'bg-gray-500'
  }
}

export function getTimingLabel(timing: TimingPhase) {
  switch (timing) {
    case 'timing.dns':
      return 'DNS'
    case 'timing.connection':
      return 'Connection'
    case 'timing.tls':
      return 'TLS'
    case 'timing.ttfb':
      return 'TTFB'
    case 'timing.transfer':
      return 'Transfer'
    case 'timing.stalling':
      return 'Waiting'
    case 'timing.envoy_total':
      return 'Envoy'
    default:
      return 'Unknown'
  }
}

export function getTimingPercentage(
  timing: Partial<Record<TimingPhase, number>>,
  latency: number,
): Record<TimingPhase, number | string> {
  const percentage: Record<TimingPhase, number | string> = {} as Record<TimingPhase, number | string>
  timingPhases.forEach(phase => {
    const value = timing[phase]
    if (value !== undefined && typeof value === 'number' && !isNaN(value) && latency > 0) {
      const pValue = Math.round((value / latency) * 1000) / 1000
      percentage[phase] = /^0\.00[0-9]+/.test(pValue.toString()) ? '<1%' : `${(pValue * 100).toFixed(1)}%`
    } else {
      percentage[phase] = '-'
    }
  })
  return percentage
}
