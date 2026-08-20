export type ChangeType = 'Baru' | 'Peningkatan' | 'Infrastruktur'
export type ChangelogScope = 'Platform' | 'PNG to AVIF' | 'Green Screen Remover'

export interface ChangeItem {
  type: ChangeType
  text: string
}

export interface ChangelogEntry {
  version: string
  date: string
  title: string
  description: string
  scope: ChangelogScope
  icon: string
  latest?: boolean
  changes: ChangeItem[]
}
