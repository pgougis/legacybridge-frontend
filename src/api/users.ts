import { api } from './client'
import type { UserDto, UserRole } from './types'

interface CreateUser  { email: string; password: string; firstName: string; lastName: string; role: UserRole; customerId: string }
interface InviteUser  { email: string; firstName: string; lastName: string; role: UserRole; customerId: string }
interface UpdateUser { email: string; firstName: string; lastName: string; role: UserRole; apiCallDailyLimit?: number }

const roleToNum: Record<UserRole, number> = { Admin: 1, Member: 2, Viewer: 3, Manager: 4 }
export const roleNum = (r: UserRole) => roleToNum[r]

export const usersApi = {
  getAll: () => api.get<UserDto[]>('/users'),
  getById: (id: string) => api.get<UserDto>(`/users/${id}`),
  getPlans: (id: string) => api.get<unknown[]>(`/users/${id}/access-plans`),
  create: (body: CreateUser) => api.post<UserDto>('/users', body),
  invite: (body: InviteUser) => api.post<UserDto>('/users/invite', body),
  update: (id: string, body: UpdateUser) => api.put<UserDto>(`/users/${id}`, { id, ...body }),
  changePassword: (id: string, newPassword: string) =>
    api.put<null>(`/users/${id}/password`, { id, newPassword }),
  delete: (id: string) => api.delete<null>(`/users/${id}`),
  resetUsage: (id: string) => api.post<null>(`/users/${id}/usage/reset`, {}),
}
