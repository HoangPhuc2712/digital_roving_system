import type { AxiosError } from 'axios'
import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'
import type { MenuCategoryRow } from './menuCategories.types'

type ApiEnvelope<T> = {
  data: T
  success: boolean
  message: string
}

type ApiMenuCategoryView = {
  mcId: number
  mcCode: string
  mcName: string
  mcActive: boolean
  mcPriority: number
  createdAt?: string
  createdName?: string
  updatedAt?: string
  updatedName?: string
}

function nowIso() {
  return new Date().toISOString()
}

function ensureSuccess<T>(payload: any): ApiEnvelope<T> {
  const e = payload as ApiEnvelope<T>
  if (!e || typeof e !== 'object' || !('success' in e)) throw new Error('API_ERROR')
  if (!e.success) throw new Error(String(e.message ?? 'API_ERROR') || 'API_ERROR')
  return e
}

function mapViewToRow(v: ApiMenuCategoryView): MenuCategoryRow {
  return {
    mc_id: v.mcId,
    mc_code: v.mcCode,
    mc_name: v.mcName,
    mc_active: Boolean(v.mcActive),
    mc_priority: Number(v.mcPriority ?? 0),
    created_date: v.createdAt ?? nowIso(),
    updated_date: v.updatedAt ?? nowIso(),
    _q: String(`${v.mcCode ?? ''} ${v.mcName ?? ''}`)
      .trim()
      .toLowerCase(),
  }
}

export async function fetchMenuCategoryRows(): Promise<MenuCategoryRow[]> {
  const res = await http.post(endpoints.menuCategoryView.getList, {})
  const views = ensureSuccess<ApiMenuCategoryView[]>(res.data).data ?? []

  return views.map(mapViewToRow).sort((a, b) => {
    const priorityDiff = Number(a.mc_priority ?? 0) - Number(b.mc_priority ?? 0)
    if (priorityDiff !== 0) return priorityDiff
    return String(a.mc_name ?? '').localeCompare(String(b.mc_name ?? ''))
  })
}

export async function fetchMenuCategoryById(mc_id: number): Promise<MenuCategoryRow> {
  const res = await http.get(endpoints.menuCategoryView.getOne(mc_id))
  const view = ensureSuccess<ApiMenuCategoryView>(res.data).data
  return mapViewToRow(view)
}

export async function createMenuCategory(payload: {
  mc_name: string
  mc_active: boolean
  mc_priority: number
  actor_id: string
}) {
  const body = {
    mcName: payload.mc_name.trim(),
    mcActive: Boolean(payload.mc_active),
    mcPriority: Number(payload.mc_priority ?? 0),
    createdBy: payload.actor_id,
    updatedBy: payload.actor_id,
  }

  try {
    const res = await http.post(endpoints.menuCategory.create, body)
    const env = ensureSuccess<boolean>(res.data)
    return env.data === true
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}

export async function updateMenuCategory(payload: {
  mc_id: number
  mc_name: string
  mc_active: boolean
  mc_priority: number
  actor_id: string
}) {
  const body = {
    mcName: payload.mc_name.trim(),
    mcActive: Boolean(payload.mc_active),
    mcPriority: Number(payload.mc_priority ?? 0),
    updatedBy: payload.actor_id,
  }

  try {
    const res = await http.patch(endpoints.menuCategory.update(payload.mc_id), body)
    const env = ensureSuccess<boolean>(res.data)
    return env.data === true
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}

export async function deleteMenuCategory(payload: { mc_id: number; actor_id: string }) {
  const body = { updatedBy: payload.actor_id }

  try {
    const res = await http.delete(endpoints.menuCategory.delete(payload.mc_id), { data: body })
    const env = ensureSuccess<boolean>(res.data)
    return env.data === true
  } catch (e) {
    const err = e as AxiosError<any>
    const msg = String(err?.response?.data?.message ?? '')
    if (msg) throw new Error(msg)
    throw e
  }
}
