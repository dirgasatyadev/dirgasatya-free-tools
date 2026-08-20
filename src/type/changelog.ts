export type ChangeType = 'Baru' | 'Peningkatan' | 'Infrastruktur' | 'Keamanan'
export type ChangelogScope =
  | 'Platform'
  | 'PNG to AVIF'
  | 'Green Screen Remover'
  | 'PNG to WebP'
  | 'Compress Image'
  | 'SVG Maker'
  | 'Favicon Generator'
  | 'Developer, Text & Data Tools'
  | 'Security & Developer'
  | 'Calculator, Cron & Checksum Tools'
  | 'File, Data & Text Tools'
  | 'Security & Performance'
  | 'Correctness & Platform'
  | 'Reliability & Browser Testing'
  | 'Routing & Security'

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
