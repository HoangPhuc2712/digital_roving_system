import { areas, checkPoints } from '@/mocks/db'
import type { AreaRow } from './areas.types'

function nowIso() {
  return new Date().toISOString()
}

function normalizeSearch(a: { area_code: string; area_name: string }) {
  return `${a.area_code} ${a.area_name}`.toLowerCase()
}

export async function fetchAreaRows(): Promise<AreaRow[]> {
  const rows: AreaRow[] = areas
    .filter((a) => a.area_status >= 0)
    .map((a) => ({
      area_id: a.area_id,
      area_code: a.area_code,
      area_name: a.area_name,
      area_status: a.area_status,
      created_date: a.created_date,
      updated_date: a.updated_date,
      _q: normalizeSearch({ area_code: a.area_code, area_name: a.area_name }),
    }))
    .sort((x, y) => x.area_code.localeCompare(y.area_code))

  return rows
}

export async function fetchAreaById(area_id: number) {
  const a = areas.find((x) => x.area_id === area_id && x.area_status >= 0)
  if (!a) return null

  return {
    area_id: a.area_id,
    area_code: a.area_code,
    area_name: a.area_name,
    area_status: a.area_status,
    created_date: a.created_date,
    updated_date: a.updated_date,
  }
}

export async function createAreaMock(payload: {
  area_code: string
  area_name: string
  actor_id: string
}) {
  const code = payload.area_code.trim()
  const name = payload.area_name.trim()

  const existed = areas.some(
    (a) => a.area_status >= 0 && a.area_code.toLowerCase() === code.toLowerCase(),
  )
  if (existed) throw new Error('AREA_CODE_EXISTS')

  const maxId = areas.reduce((m, x) => Math.max(m, x.area_id), 0)
  const id = maxId + 1
  const t = nowIso()

  areas.push({
    area_id: id,
    area_status: 1,
    area_code: code,
    area_name: name,
    created_date: t,
    created_by: payload.actor_id,
    updated_date: t,
    updated_by: payload.actor_id,
  })

  return true
}

export async function updateAreaMock(payload: {
  area_id: number
  area_code: string
  area_name: string
  area_status: number
  actor_id: string
}) {
  const a = areas.find((x) => x.area_id === payload.area_id)
  if (!a) throw new Error('AREA_NOT_FOUND')

  const code = payload.area_code.trim()
  const name = payload.area_name.trim()

  const existed = areas.some(
    (x) =>
      x.area_id !== payload.area_id &&
      x.area_status >= 0 &&
      x.area_code.toLowerCase() === code.toLowerCase(),
  )
  if (existed) throw new Error('AREA_CODE_EXISTS')

  a.area_code = code
  a.area_name = name
  a.area_status = payload.area_status

  a.updated_date = nowIso()
  a.updated_by = payload.actor_id

  return true
}

export async function deleteAreaMock(payload: { area_id: number; actor_id: string }) {
  const a = areas.find((x) => x.area_id === payload.area_id)
  if (!a) throw new Error('AREA_NOT_FOUND')

  const count = checkPoints.filter(
    (cp) => cp.cp_status >= 0 && cp.area_id === payload.area_id,
  ).length

  if (count > 0) {
    throw new Error(`AREA_HAS_SCAN_POINTS:${count}`)
  }

  a.area_status = -1
  a.updated_date = nowIso()
  a.updated_by = payload.actor_id

  return true
}
