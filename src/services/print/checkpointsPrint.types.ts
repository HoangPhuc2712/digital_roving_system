export type CheckpointPrintItem = {
  areaLabel: string
  cpName: string
  cpCode: string
  cpPriority: number | string
  qrSrc: string
}

export type CheckpointQrLayout = '1x2' | '2x2' | '3x2'

export type PrintCheckpointQrSheetsOptions = {
  cpPerPage?: boolean
}

export const DEFAULT_CHECKPOINT_QR_LAYOUT: CheckpointQrLayout = '3x2'
