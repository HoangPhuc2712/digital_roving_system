import { checkPoints, areas } from '@/mocks/db'
import type { CheckpointRow, AreaOption } from './checkpoints.types'

function nowIso() {
  return new Date().toISOString()
}

function normalizeSearch(x: {
  cp_code: string
  cp_name: string
  cp_description: string
  area_code: string
  area_name: string
}) {
  return `${x.cp_code} ${x.cp_name} ${x.cp_description} ${x.area_code} ${x.area_name}`.toLowerCase()
}

export async function fetchAreaOptions(): Promise<AreaOption[]> {
  return areas
    .filter((a) => a.area_status >= 0)
    .sort((a, b) => a.area_code.localeCompare(b.area_code))
    .map((a) => ({ label: `${a.area_code} - ${a.area_name}`, value: a.area_id }))
}

export async function fetchCheckpointRows(): Promise<CheckpointRow[]> {
  const areaMap = new Map<number, (typeof areas)[number]>()
  for (const a of areas) areaMap.set(a.area_id, a)

  const rows: CheckpointRow[] = checkPoints
    .filter((cp) => cp.cp_status >= 0)
    .map((cp) => {
      const a = areaMap.get(cp.area_id)
      const areaCode = a?.area_code ?? ''
      const areaName = a?.area_name ?? ''

      return {
        cp_id: cp.cp_id,
        cp_code: cp.cp_code,
        cp_name: cp.cp_name,
        cp_qr: cp.cp_qr,
        cp_description: cp.cp_description,
        cp_priority: cp.cp_priority,
        cp_status: cp.cp_status,
        area_id: cp.area_id,
        area_code: areaCode,
        area_name: areaName,
        created_at: cp.created_at,
        updated_at: cp.updated_at,
        _q: normalizeSearch({
          cp_code: cp.cp_code,
          cp_name: cp.cp_name,
          cp_description: cp.cp_description,
          area_code: areaCode,
          area_name: areaName,
        }),
      }
    })
    .sort((a, b) => {
      const c = a.area_code.localeCompare(b.area_code)
      if (c !== 0) return c
      const p = (a.cp_priority ?? 0) - (b.cp_priority ?? 0)
      if (p !== 0) return p
      return a.cp_code.localeCompare(b.cp_code)
    })

  return rows
}

export async function fetchCheckpointById(cp_id: number) {
  const cp = checkPoints.find((x) => x.cp_id === cp_id && x.cp_status >= 0)
  if (!cp) return null

  return {
    cp_id: cp.cp_id,
    cp_code: cp.cp_code,
    cp_name: cp.cp_name,
    cp_qr: cp.cp_qr,
    cp_description: cp.cp_description,
    cp_priority: cp.cp_priority,
    cp_status: cp.cp_status,
    area_id: cp.area_id,
    created_at: cp.created_at,
    updated_at: cp.updated_at,
  }
}

export async function createCheckpointMock(payload: {
  cp_code: string
  cp_name: string
  cp_qr: string
  cp_description: string
  cp_priority: number
  area_id: number
  actor_id: string
}) {
  const code = payload.cp_code.trim()
  const existed = checkPoints.some(
    (x) =>
      x.cp_status >= 0 &&
      x.area_id === payload.area_id &&
      x.cp_code.toLowerCase() === code.toLowerCase(),
  )
  if (existed) throw new Error('CHECKPOINT_CODE_EXISTS_IN_AREA')

  const maxId = checkPoints.reduce((m, x) => Math.max(m, x.cp_id), 0)
  const id = maxId + 1
  const t = nowIso()

  checkPoints.push({
    cp_id: id,
    cp_status: 1,
    cp_code: code,
    cp_name: payload.cp_name.trim(),
    cp_qr: payload.cp_qr,
    cp_description: payload.cp_description.trim(),
    cp_priority: payload.cp_priority,
    area_id: payload.area_id,
    created_at: t,
    created_by: payload.actor_id,
    updated_at: t,
    updated_by: payload.actor_id,
  })

  return true
}

export async function updateCheckpointMock(payload: {
  cp_id: number
  cp_code: string
  cp_name: string
  cp_qr: string
  cp_description: string
  cp_priority: number
  area_id: number
  cp_status: number
  actor_id: string
}) {
  const cp = checkPoints.find((x) => x.cp_id === payload.cp_id)
  if (!cp) throw new Error('CHECKPOINT_NOT_FOUND')

  const code = payload.cp_code.trim()
  const existed = checkPoints.some(
    (x) =>
      x.cp_id !== payload.cp_id &&
      x.cp_status >= 0 &&
      x.area_id === payload.area_id &&
      x.cp_code.toLowerCase() === code.toLowerCase(),
  )
  if (existed) throw new Error('CHECKPOINT_CODE_EXISTS_IN_AREA')

  cp.cp_code = code
  cp.cp_name = payload.cp_name.trim()
  cp.cp_qr = payload.cp_qr
  cp.cp_description = payload.cp_description.trim()
  cp.cp_priority = payload.cp_priority
  cp.area_id = payload.area_id
  cp.cp_status = payload.cp_status

  cp.updated_at = nowIso()
  cp.updated_by = payload.actor_id

  return true
}

export async function deleteCheckpointMock(payload: { cp_id: number; actor_id: string }) {
  const cp = checkPoints.find((x) => x.cp_id === payload.cp_id)
  if (!cp) throw new Error('CHECKPOINT_NOT_FOUND')

  cp.cp_status = -1
  cp.updated_at = nowIso()
  cp.updated_by = payload.actor_id

  return true
}
