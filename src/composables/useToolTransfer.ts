import { onMounted, toValue, type MaybeRefOrGetter } from 'vue'
import { tools } from '@/data/tools'
import { useToolTransferStore } from '@/stores/toolTransfer'
import type { TransferableToolFile } from '@/type/toolTransfer'

export function acceptsTransferMimeType(acceptedMimeTypes: readonly string[], mimeType: string) {
  return acceptedMimeTypes.some((acceptedType) => {
    if (acceptedType === mimeType) return true
    if (!acceptedType.endsWith('/*')) return false
    return mimeType.startsWith(acceptedType.slice(0, -1))
  })
}

export function getCompatibleTransferTargets(
  sourceToolKey: string,
  files: readonly TransferableToolFile[],
) {
  if (files.length === 0) return []

  return tools.filter(
    (tool) =>
      tool.status === 'available' &&
      tool.toolKey !== sourceToolKey &&
      files.every((file) => acceptsTransferMimeType(tool.inputMimeTypes, file.blob.type)),
  )
}

export function useIncomingToolTransfer(
  targetToolKey: MaybeRefOrGetter<string>,
  receiveFiles: (files: File[]) => void | Promise<void>,
) {
  const transferStore = useToolTransferStore()

  onMounted(() => {
    const files = transferStore.consumeTransfer(toValue(targetToolKey))
    if (files.length > 0) void receiveFiles(files)
  })
}
