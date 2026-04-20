import { api } from './client'
import type { LegacySource, SimulatorResponseDto, WsdlOperation } from './types'

export interface SourceAssignedUser {
  userId: string; email: string; firstName: string; lastName: string
  planName: string; planId: string
}

export const sourcesApi = {
  getAll:       () => api.get<LegacySource[]>('/legacy-sources'),
  getAssignedUsers: (id: string) => api.get<SourceAssignedUser[]>(`/legacy-sources/${id}/users`),
  getAccessible: () => api.get<LegacySource[]>('/legacy-sources/accessible'),
  getById:      (id: string) => api.get<LegacySource>(`/legacy-sources/${id}`),
  getOperations:        (id: string) => api.get<WsdlOperation[]>(`/legacy-sources/${id}/operations`),
  getAllowedOperations: (id: string) => api.get<WsdlOperation[]>(`/legacy-sources/${id}/allowed-operations`),
  create: (body: { systemType: number; systemUrl: string; swaggerUrl?: string; customerId: string }) =>
    api.post<LegacySource>('/legacy-sources', body),
  update: (id: string, body: { systemType: number; systemUrl: string; swaggerUrl?: string }) =>
    api.put<LegacySource>(`/legacy-sources/${id}`, { id, ...body }),
  upsertAuth: (id: string, body: Record<string, unknown>) =>
    api.put<unknown>(`/legacy-sources/${id}/auth`, { sourceId: id, ...body }),
  delete: (id: string) => api.delete<null>(`/legacy-sources/${id}`),
  call: (sourceId: string, method: string, body: unknown) =>
    api.post<unknown>(`/legacy-sources/${sourceId}/${method}`, body),

  // Simulator
  toggleSimulation: (id: string, isSimulated: boolean) =>
    api.patch<{ isSimulated: boolean }>(`/legacy-sources/${id}/simulate`, { isSimulated }),
  getSimulatorResponses: (id: string) =>
    api.get<SimulatorResponseDto[]>(`/legacy-sources/${id}/simulator-responses`),
  upsertSimulatorResponse: (id: string, method: string, body: Omit<SimulatorResponseDto, 'id' | 'sourceId' | 'method' | 'createdAt' | 'updatedAt'>) =>
    api.put<SimulatorResponseDto>(`/legacy-sources/${id}/simulator-responses/${method}`, { sourceId: id, method, ...body }),
  deleteSimulatorResponse: (id: string, method: string) =>
    api.delete<null>(`/legacy-sources/${id}/simulator-responses/${method}`),
}

export const systemTypeLabels: Record<number, string> = {
  1: 'OpenEdge SOAP',
  2: 'Generic SOAP',
  3: 'ASMX .NET',
  4: 'Oracle SOAP',
}
