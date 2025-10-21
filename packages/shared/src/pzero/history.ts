export type HistoryAudit = {
  attr: string
  old: any
  new: any
}
export type History = {
  id: string
  audits: {
    createDate: number
    audits: HistoryAudit[]
  }
}
export const ignoreFields = ['dateUpdated'] as const
