import { api } from './client'
import type { AccessPlan, AccessPlanSummary, AccessRule } from './types'

export const plansApi = {
  getAll:   () => api.get<AccessPlanSummary[]>('/access-plans'),
  getById:  (id: string) => api.get<AccessPlan>(`/access-plans/${id}`),
  create: (body: { name: string; description?: string; customerId: string; isActive: boolean }) =>
    api.post<AccessPlan>('/access-plans', body),
  update: (id: string, body: { name: string; description?: string; isActive: boolean }) =>
    api.put<AccessPlan>(`/access-plans/${id}`, { id, ...body }),
  delete: (id: string) => api.delete<null>(`/access-plans/${id}`),

  addRule: (planId: string, body: { methodPattern: string; legacySourceId?: string; effect: number }) =>
    api.post<AccessRule>(`/access-plans/${planId}/rules`, { accessPlanId: planId, ...body }),
  deleteRule: (planId: string, ruleId: string) =>
    api.delete<null>(`/access-plans/${planId}/rules/${ruleId}`),

  assignUser:  (planId: string, userId: string) =>
    api.post<null>(`/access-plans/${planId}/users/${userId}`, {}),
  revokeUser:  (planId: string, userId: string) =>
    api.delete<null>(`/access-plans/${planId}/users/${userId}`),
}
