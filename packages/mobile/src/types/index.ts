export const appearances = ['light', 'dark', 'system'] as const
export const Appearances = appearances.reduce(
  (acc, appearance) => {
    acc[appearance] = appearance
    return acc
  },
  {} as Record<string, string>,
)
export type Appearance = keyof typeof Appearances
export type PVoid = Promise<void>
