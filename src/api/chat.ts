import { api } from './client'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export const chatApi = {
  sendMessage: (history: ChatMessage[], message: string) =>
    api.post<{ response: string }>('/chat/message', { history, message }),
}
