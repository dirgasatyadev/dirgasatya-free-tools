import type { FreeTool, ToolCategory } from '@/type/tool'

export const toolCategories: ToolCategory[] = [
  'Developer',
  'Text',
  'Image',
  'PDF',
  'Converter',
  'File',
  'Design',
  'Productivity',
  'Calculator',
  'Security & Privacy',
  'Web',
  'Data',
]

export const tools: FreeTool[] = [
  {
    id: 1,
    toolKey: 'png-to-avif',
    name: 'PNG to AVIF',
    description: 'Konversikan gambar PNG ke AVIF langsung di browser tanpa mengunggah file.',
    category: 'Image',
    icon: 'mdi:image-sync-outline',
    path: '/tools/png-to-avif',
    inputMimeTypes: ['image/png'],
    status: 'available',
  },
  {
    id: 2,
    toolKey: 'green-screen-remover',
    name: 'Green Screen Remover',
    description: 'Hapus background hijau dan hasilkan PNG transparan langsung di browser.',
    category: 'Image',
    icon: 'mdi:account-box-outline',
    path: '/tools/green-screen-remover',
    inputMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/avif'],
    status: 'available',
  },
]
