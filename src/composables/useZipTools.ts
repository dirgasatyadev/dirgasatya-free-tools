export interface ZipEntryInfo {
  index: number
  name: string
  compressedSize: number
  uncompressedSize: number
  directory: boolean
}

export interface ExtractedZipFile extends ZipEntryInfo {
  blob: Blob
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
    return entries.map((entry, index) => ({
      index,
      name: entry.filename,
      compressedSize: Number(entry.compressedSize ?? 0),
      uncompressedSize: Number(entry.uncompressedSize ?? 0),
      directory: entry.directory,
    }))
  } finally {
    await reader.close()
  }
}

export async function extractZipFiles(file: Blob, onProgress?: (completed: number, total: number) => void): Promise<ExtractedZipFile[]> {
  const { BlobReader, BlobWriter, ZipReader } = await import('@zip.js/zip.js')
  const reader = new ZipReader(new BlobReader(file))
  try {
    const entries = await reader.getEntries()
    const fileEntries = entries.filter((entry) => !entry.directory)
    const extracted: ExtractedZipFile[] = []
    for (let index = 0; index < fileEntries.length; index += 1) {
      const entry = fileEntries[index]!
      if (!('getData' in entry)) continue
      const blob = await entry.getData(new BlobWriter())
      extracted.push({
        index: entries.indexOf(entry),
        name: entry.filename,
        compressedSize: Number(entry.compressedSize ?? 0),
        uncompressedSize: Number(entry.uncompressedSize ?? blob.size),
        directory: false,
        blob,
      })
      onProgress?.(index + 1, fileEntries.length)
    }
    return extracted
  } finally {
    await reader.close()
  }
}
