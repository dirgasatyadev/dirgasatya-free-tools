export type ToolCategory =
  | 'Developer'
  | 'Text'
  | 'Image'
  | 'PDF'
  | 'Converter'
  | 'File'
  | 'Design'
  | 'Productivity'
  | 'Calculator'
  | 'Security & Privacy'
  | 'Web'
  | 'Data'
export type ToolFilterCategory = 'Semua' | ToolCategory
export type ToolViewMode = 'list' | 'grid' | 'table'

export interface FreeTool {
  id: number
  toolKey: string
  name: string
  description: string
  category: ToolCategory
  icon: string
  path: string
  inputMimeTypes: string[]
  status: 'available' | 'coming-soon'
}
