type ValueOf<T> = T[keyof T]
export type { ValueOf }
export interface Section {
  title: string
  content: string
}
export interface SectionResponse {
  sections: Section[]
}
export interface BaseTable {
  name: string
  handle: string
  dscr?: string
  id: string
  c_at: string
  u_at?: string
  address?: string
  is_del?: boolean
  is_act?: boolean
  data?: {
    meta?: {
      uid: string
    }
    [key: string]: any
  }
  tags?: Record<string, any> | string[] | null
}

export interface BaseLocTable extends BaseTable {
  address?: string
  lat?: number | null
  lng?: number | null
}
