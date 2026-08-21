import { shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { PendingToolTransfer, TransferableToolFile } from '@/types/toolTransfer'

export const useToolTransferStore = defineStore('tool-transfer', () => {
  const pendingTransfer = shallowRef<PendingToolTransfer | null>(null)

  function queueTransfer(
    sourceToolKey: string,
    targetToolKey: string,
    transferableFiles: readonly TransferableToolFile[],
  ) {
    if (sourceToolKey === targetToolKey || transferableFiles.length === 0) return false

    const files = transferableFiles.map(
      ({ blob, fileName }) =>
        new File([blob], fileName, {
          type: blob.type,
          lastModified: Date.now(),
        }),
    )

    pendingTransfer.value = { sourceToolKey, targetToolKey, files }
    return true
  }

  function consumeTransfer(targetToolKey: string) {
    if (pendingTransfer.value?.targetToolKey !== targetToolKey) return []

    const files = pendingTransfer.value.files
    pendingTransfer.value = null
    return files
  }

  function clearTransfer() {
    pendingTransfer.value = null
  }

  return { pendingTransfer, queueTransfer, consumeTransfer, clearTransfer }
})
