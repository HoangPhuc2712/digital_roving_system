import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'
import type { DashboardTotalAppItem } from './dashboard.types'

type ApiEnvelope<T> = { data: T; success: boolean; message: string }

type ApiDashboardTotalAppItem = {
  stt?: number
  name?: string
  color?: string
  totalItem?: number
}

function ensureSuccess<T>(payload: any): ApiEnvelope<T> {
  const e = payload as ApiEnvelope<T>
  if (!e || typeof e !== 'object' || !('success' in e)) throw new Error('API_ERROR')
  if (!e.success) throw new Error(String(e.message ?? 'API_ERROR') || 'API_ERROR')
  return e
}

function normalizeItem(item: ApiDashboardTotalAppItem): DashboardTotalAppItem {
  return {
    stt: Number(item.stt ?? 0),
    name: String(item.name ?? '').trim(),
    color: String(item.color ?? '').trim() || '#ffffff',
    totalItem: Number(item.totalItem ?? 0),
  }
}

export async function fetchDashboardCards(): Promise<DashboardTotalAppItem[]> {
  const res = await http.get(endpoints.report.totalAppData)
  const list = ensureSuccess<ApiDashboardTotalAppItem[]>(res.data).data ?? []
  return Array.isArray(list) ? list.map(normalizeItem) : []
}
