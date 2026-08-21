export interface TransferableToolFile {
  blob: Blob
  fileName: string
}

export interface PendingToolTransfer {
  sourceToolKey: string
  targetToolKey: string
  files: File[]
}
