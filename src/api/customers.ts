import { api } from './client'
import type { Customer } from './types'

export const customersApi = {
  getAll: () => api.get<Customer[]>('/customers'),
  getById: (id: string) => api.get<Customer>(`/customers/${id}`),
  create: (body: { name: string; email: string; [k: string]: unknown }) =>
    api.post<Customer>('/customers', body),
  update: (id: string, body: { name: string; email: string; [k: string]: unknown }) =>
    api.put<Customer>(`/customers/${id}`, { id, ...body }),
  delete: (id: string) => api.delete<null>(`/customers/${id}`),
  register: (body: {
    companyName: string; managerEmail: string;
    managerFirstName: string; managerLastName: string;
    managerPassword: string; planName: string;
  }) => api.post<{ customerId: string; customerName: string; managerId: string; managerEmail: string; planId: string; planName: string }>(
    '/customers/register', body
  ),
}
