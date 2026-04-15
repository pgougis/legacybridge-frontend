import { api } from './client'
import type { LegacySource, WsdlOperation } from './types'

export const sourcesApi = {
  getAll:       () => api.get<LegacySource[]>('/legacy-sources'),
  getAccessible: () => api.get<LegacySource[]>('/legacy-sources/accessible'),
  getById:      (id: string) => api.get<LegacySource>(`/legacy-sources/${id}`),
  getOperations: (id: string) => api.get<WsdlOperation[]>(`/legacy-sources/${id}/operations`),
  create: (body: { systemType: number; systemUrl: string; swaggerUrl?: string; customerId: string }) =>
    api.post<LegacySource>('/legacy-sources', body),
  update: (id: string, body: { systemType: number; systemUrl: string; swaggerUrl?: string }) =>
    api.put<LegacySource>(`/legacy-sources/${id}`, { id, ...body }),
  upsertAuth: (id: string, body: Record<string, unknown>) =>
    api.put<unknown>(`/legacy-sources/${id}/auth`, { sourceId: id, ...body }),
  delete: (id: string) => api.delete<null>(`/legacy-sources/${id}`),
  call: (sourceId: string, method: string, body: unknown) =>
    api.post<unknown>(`/legacy-sources/${sourceId}/${method}`, body),
}

export const systemTypeLabels: Record<number, string> = {
  1: 'OpenEdge SOAP',
  2: 'Generic SOAP',
  3: 'ASMX .NET',
  4: 'Oracle SOAP',
}
