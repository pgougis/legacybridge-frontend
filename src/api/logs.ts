import { api } from './client'

export interface ApiCallLogDto {
  id:          string
  userId:      string
  userEmail:   string
  path:        string
  httpMethod:  string
  statusCode:  number
  errorReason: string | null
  occurredAt:  string
}

export interface ApiLogsResult {
  items: ApiCallLogDto[]
  total: number
}

export const logsApi = {
  get: (params: { userId?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams()
    if (params.userId)   qs.set('userId',   params.userId)
    if (params.page)     qs.set('page',     String(params.page))
    if (params.pageSize) qs.set('pageSize', String(params.pageSize))
    return api.get<ApiLogsResult>(`/api-logs?${qs}`)
  },

  downloadTxt: async (userId?: string, scope?: string): Promise<void> => {
    try {
      const qs = new URLSearchParams({ pageSize: '10000' })
      if (userId) qs.set('userId', userId)
      const { items } = await api.get<ApiLogsResult>(`/api-logs?${qs}`)

      const lines = [
        `LegacyBridge — API Error Logs`,
        `Exported: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`,
        userId ? `User filter: ${userId}` : (scope ?? 'All users'),
        `Entries: ${items.length}`,
        '='.repeat(100),
        '',
        ...items.map(l =>
          [
            l.occurredAt.replace('T', ' ').slice(0, 19),
            l.httpMethod.padEnd(6),
            l.statusCode,
            (l.errorReason ?? '').padEnd(30),
            l.userEmail.padEnd(36),
            l.path,
          ].join('  ')
        ),
      ]

      const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `legacybridge-logs-${new Date().toISOString().slice(0, 10)}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Log download failed:', e)
      alert('Téléchargement échoué — voir la console pour le détail.')
    }
  },
}
