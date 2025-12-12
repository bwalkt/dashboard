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
  id: string
  c_at: string
  is_del?: boolean
  is_act?: boolean
  data?: {
    meta?: {
      uid: string
    }
    [key: string]: any
  }
}

export interface BaseLocTable extends BaseTable {
  address?: string
  lat?: number | null
  lng?: number | null
}
