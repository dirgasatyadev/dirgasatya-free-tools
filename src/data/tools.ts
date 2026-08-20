import type { FreeTool, ToolCategory } from '@/type/tool'

export const toolCategories: ToolCategory[] = ['Developer', 'Teks', 'Gambar', 'Produktivitas']

export const tools: FreeTool[] = [
  {
    id: 1,
    name: 'JSON Formatter',
    description: 'Rapikan, validasi, dan baca data JSON dengan lebih mudah.',
    category: 'Developer',
    icon: 'mdi:code-json',
    path: '#',
    status: 'available',
  },
  {
    id: 2,
    name: 'Penghitung Kata',
    description: 'Hitung jumlah kata, karakter, kalimat, dan waktu baca.',
    category: 'Teks',
    icon: 'mdi:format-letter-case',
    path: '#',
    status: 'available',
  },
  {
    id: 3,
    name: 'Kompres Gambar',
    description: 'Perkecil ukuran gambar tanpa mengorbankan kualitas penting.',
    category: 'Gambar',
    icon: 'mdi:image-size-select-small',
    path: '#',
    status: 'coming-soon',
  },
  {
    id: 4,
    name: 'Generator UUID',
    description: 'Buat UUID v4 secara cepat untuk kebutuhan pengembangan.',
    category: 'Developer',
    icon: 'mdi:identifier',
    path: '#',
    status: 'available',
  },
  {
    id: 5,
    name: 'Pomodoro Timer',
    description: 'Atur sesi fokus dan istirahat agar kerja tetap terarah.',
    category: 'Produktivitas',
    icon: 'mdi:timer-outline',
    path: '#',
    status: 'coming-soon',
  },
  {
    id: 6,
    name: 'Base64 Encoder',
    description: 'Encode atau decode teks Base64 langsung dari browser.',
    category: 'Developer',
    icon: 'mdi:swap-horizontal-bold',
    path: '#',
    status: 'available',
  },
]
