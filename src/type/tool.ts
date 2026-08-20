export type ToolCategory = 'Developer' | 'Teks' | 'Gambar' | 'Produktivitas'
export type ToolFilterCategory = 'Semua' | ToolCategory

export interface FreeTool {
  id: number
  name: string
  description: string
  category: ToolCategory
  icon: string
  path: string
  status: 'available' | 'coming-soon'
}
