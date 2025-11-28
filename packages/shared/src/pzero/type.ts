type ValueOf<T> = T[keyof T]
export type { ValueOf }
export interface Section {
  title: string
  content: string
}
export interface SectionResponse {
  sections: Section[]
}
