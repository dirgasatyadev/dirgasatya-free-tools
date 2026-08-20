export interface ZipEntryInfo {
  index: number
  name: string
  compressedSize: number
  uncompressedSize: number
  directory: boolean
  safetyIssue: string
}

export interface ExtractedZipFile extends ZipEntryInfo {
  blob: Blob
}

export const maxZipEntries = 2_000
export const maxZipSelectedEntries = 250
export const maxZipEntrySize = 256 * 1024 * 1024
export const maxZipSelectedSize = 512 * 1024 * 1024
export const maxZipCompressionRatio = 200
const maxZipDeclaredSize = 20 * 1024 * 1024 * 1024

export function getZipEntrySafetyIssue(entry: Pick<ZipEntryInfo, 'compressedSize' | 'uncompressedSize' | 'directory'>) {
  if (entry.directory) return ''
  if (entry.uncompressedSize > maxZipEntrySize) return 'Ukuran hasil entry melebihi 256 MB.'
  const ratio = entry.compressedSize > 0
    ? entry.uncompressedSize / entry.compressedSize
    : entry.uncompressedSize > 0 ? Number.POSITIVE_INFINITY : 1
  if (ratio > maxZipCompressionRatio) return `Rasio kompresi ${Math.round(ratio)}× melebihi batas ${maxZipCompressionRatio}×.`
  return ''
}

export function validateZipSelection(entries: ZipEntryInfo[], selectedIndices: number[]) {
  const selected = entries.filter((entry) => selectedIndices.includes(entry.index) && !entry.directory)
  if (!selected.length) throw new Error('Pilih minimal satu file yang aman untuk diekstrak.')
  if (selected.length > maxZipSelectedEntries) throw new Error(`Maksimal ${maxZipSelectedEntries} file per ekstraksi.`)
  const unsafe = selected.find((entry) => entry.safetyIssue)
  if (unsafe) throw new Error(`${unsafe.name}: ${unsafe.safetyIssue}`)
  const totalSize = selected.reduce((total, entry) => total + entry.uncompressedSize, 0)
  if (totalSize > maxZipSelectedSize) throw new Error('Total hasil terpilih melebihi batas memory 512 MB.')
  return { selected, totalSize }
}

export function uniqueArchiveNames(files: File[]) {
  const used = new Set<string>()
  return files.map((file) => {
    const original = file.name || 'file'
    const dot = original.lastIndexOf('.')
    const base = dot > 0 ? original.slice(0, dot) : original
    const extension = dot > 0 ? original.slice(dot) : ''
    let name = original
    let counter = 2
    while (used.has(name.toLocaleLowerCase())) name = `${base} (${counter++})${extension}`
    used.add(name.toLocaleLowerCase())
    return name
  })
}

export async function createZipArchive(files: File[], level = 6, onProgress?: (completed: number, total: number) => void) {
  if (!files.length) throw new Error('Pilih minimal satu file.')
  const { BlobReader, BlobWriter, ZipWriter } = await import('@zip.js/zip.js')
  const blobWriter = new BlobWriter('application/zip')
  const writer = new ZipWriter(blobWriter)
  const names = uniqueArchiveNames(files)
  try {
    for (let index = 0; index < files.length; index += 1) {
      await writer.add(names[index]!, new BlobReader(files[index]!), { level })
      onProgress?.(index + 1, files.length)
    }
    await writer.close()
    return blobWriter.getData()
  } catch (error) {
    await writer.close().catch(() => undefined)
    throw error
  }
}

export async function listZipEntries(file: Blob): Promise<ZipEntryInfo[]> {
  const { BlobReader, ZipReader } = await import('@zip.js/zip.js')
  const reader = new ZipReader(new BlobReader(file))
  try {
    const entries = await reader.getEntries()
    if (entries.length > maxZipEntries) throw new Error(`ZIP berisi lebih dari ${maxZipEntries.toLocaleString('id-ID')} entry.`)
    const declaredSize = entries.reduce((total, entry) => total + Number(entry.uncompressedSize ?? 0), 0)
    if (declaredSize > maxZipDeclaredSize) throw new Error('Total ukuran deklarasi ZIP melebihi batas keamanan 20 GB.')
    return entries.map((entry, index) => {
      const info: ZipEntryInfo = {
        index,
        name: entry.filename,
        compressedSize: Number(entry.compressedSize ?? 0),
        uncompressedSize: Number(entry.uncompressedSize ?? 0),
        directory: entry.directory,
        safetyIssue: '',
      }
      info.safetyIssue = getZipEntrySafetyIssue(info)
      return info
    })
  } finally {
    await reader.close()
  }
}

export async function extractZipFiles(file: Blob, selectedIndices: number[], onProgress?: (completed: number, total: number) => void): Promise<ExtractedZipFile[]> {
  const { BlobReader, BlobWriter, ZipReader } = await import('@zip.js/zip.js')
  const reader = new ZipReader(new BlobReader(file))
  try {
    const entries = await reader.getEntries()
    if (entries.length > maxZipEntries) throw new Error(`ZIP berisi lebih dari ${maxZipEntries.toLocaleString('id-ID')} entry.`)
    const metadata = entries.map((entry, index) => {
      const info: ZipEntryInfo = { index, name: entry.filename, compressedSize: Number(entry.compressedSize ?? 0), uncompressedSize: Number(entry.uncompressedSize ?? 0), directory: entry.directory, safetyIssue: '' }
      info.safetyIssue = getZipEntrySafetyIssue(info)
      return info
    })
    validateZipSelection(metadata, selectedIndices)
    const fileEntries = entries.filter((entry, index) => selectedIndices.includes(index) && !entry.directory)
    const extracted: ExtractedZipFile[] = []
    let extractedBytes = 0
    for (let index = 0; index < fileEntries.length; index += 1) {
      const entry = fileEntries[index]!
      if (!('getData' in entry)) continue
      const controller = new AbortController()
      const blob = await entry.getData(new BlobWriter(), {
        signal: controller.signal,
        onprogress: (entryBytes) => {
          if (entryBytes > maxZipEntrySize || extractedBytes + entryBytes > maxZipSelectedSize) {
            controller.abort('Batas aman ekstraksi ZIP terlampaui.')
            throw new Error('Ekstraksi dihentikan karena ukuran aktual melebihi batas memory.')
          }
        },
      })
      extractedBytes += blob.size
      extracted.push({
        index: entries.indexOf(entry),
        name: entry.filename,
        compressedSize: Number(entry.compressedSize ?? 0),
        uncompressedSize: Number(entry.uncompressedSize ?? blob.size),
        directory: false,
        safetyIssue: '',
        blob,
      })
      onProgress?.(index + 1, fileEntries.length)
    }
    return extracted
  } finally {
    await reader.close()
  }
}
