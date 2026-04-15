import { api } from './client'

export type UsagePeriod = 'today' | 'week' | 'month' | 'year' | '3years'

export interface UsagePoint {
  bucket: string   // ISO datetime
  count: number
}

export const usageApi = {
  get: (userId: string, period: UsagePeriod) =>
    api.get<UsagePoint[]>(`/users/${userId}/usage?period=${period}`),
}
