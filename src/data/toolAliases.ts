import type { CodeLanguage } from '@/composables/useCodeFormatter'

export interface ToolAliasRoute {
  path: string
  name: string
  title: string
  description: string
  language: CodeLanguage
}

export const codeFormatterAliases: ToolAliasRoute[] = [
  { path: '/tools/html-formatter', name: 'html-formatter', title: 'HTML Formatter & Minifier', description: 'Beautify dan minify HTML secara lokal dengan ukuran serta savings output.', language: 'html' },
  { path: '/tools/css-formatter', name: 'css-formatter', title: 'CSS Formatter & Minifier', description: 'Format dan minify CSS menggunakan satu shared code engine di browser.', language: 'css' },
  { path: '/tools/javascript-formatter', name: 'javascript-formatter', title: 'JavaScript Formatter & Minifier', description: 'Beautify dan minify JavaScript tanpa mengunggah source code.', language: 'javascript' },
  { path: '/tools/typescript-formatter', name: 'typescript-formatter', title: 'TypeScript Formatter & Minifier', description: 'Format TypeScript atau transpile dan minify menjadi JavaScript.', language: 'typescript' },
  { path: '/tools/sql-formatter', name: 'sql-formatter', title: 'SQL Formatter', description: 'Beautify SQL sesuai dialect tanpa mengubah literal query.', language: 'sql' },
]
