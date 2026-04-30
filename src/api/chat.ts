import { api } from './client'

export interface ContactDto {
  userId: string
  firstName: string
  lastName: string
  email: string
  role: string
  unreadCount: number
}

export interface MessageDto {
  id: string
  senderId: string
  content: string
  sentAt: string
  isRead: boolean
}

export const chatApi = {
  getContacts: () =>
    api.get<ContactDto[]>('/chat/contacts'),

  getMessages: (withUserId: string) =>
    api.get<MessageDto[]>(`/chat/messages/${withUserId}`),

  sendMessage: (receiverId: string, content: string) =>
    api.post<MessageDto>('/chat/messages', { receiverId, content }),

  markRead: (fromUserId: string) =>
    api.post<null>(`/chat/messages/read/${fromUserId}`, {}),
}
