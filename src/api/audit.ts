import { api } from './client'

export interface AuditLogDto {
  id:          string
  occurredAt:  string
  actorId:     string
  actorEmail:  string
  action:      string
  targetId:    string | null
  targetEmail: string | null
  details:     string | null
  customerId:  string
}

export interface AuditLogsResult {
  items: AuditLogDto[]
  total: number
}

export const auditApi = {
  get: (params: { page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams()
    if (params.page)     qs.set('page',     String(params.page))
    if (params.pageSize) qs.set('pageSize', String(params.pageSize))
    return api.get<AuditLogsResult>(`/audit?${qs}`)
  },
}
