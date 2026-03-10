import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'
import type {
  DashboardTotalAppItem,
  DashboardTotalCheckpointByAreaItem,
  DashboardTotalUserByAreaDetailItem,
  DashboardTotalUserByAreaItem,
  DashboardTotalUserByRoleItem,
} from './dashboard.types'

type ApiEnvelope<T> = { data: T; success: boolean; message: string }

type ApiDashboardTotalAppItem = {
  stt?: number
  name?: string
  color?: string
  totalItem?: number
}

type ApiDashboardTotalUserByRoleItem = {
  roleId?: number
  roleCode?: string
  roleName?: string
  totalUser?: number
}

type ApiDashboardTotalUserByAreaDetailItem = {
  roleId?: number
  roleCode?: string
  roleName?: string
  totalUser?: number
}

type ApiDashboardTotalUserByAreaItem = {
  areaId?: number
  areaCode?: string
  areaName?: string
  totalUser?: number
  details?: ApiDashboardTotalUserByAreaDetailItem[]
}

type ApiDashboardTotalCheckpointByAreaItem = {
  areaId?: number
  areaCode?: string
  areaName?: string
  totalCheckPoint?: number
}

function ensureSuccess<T>(payload: any): ApiEnvelope<T> {
  const e = payload as ApiEnvelope<T>
  if (!e || typeof e !== 'object' || !('success' in e)) throw new Error('API_ERROR')
  if (!e.success) throw new Error(String(e.message ?? 'API_ERROR') || 'API_ERROR')
  return e
}

function normalizeAppItem(item: ApiDashboardTotalAppItem): DashboardTotalAppItem {
  return {
    stt: Number(item.stt ?? 0),
    name: String(item.name ?? '').trim(),
    color: String(item.color ?? '').trim() || '#ffffff',
    totalItem: Number(item.totalItem ?? 0),
  }
}

function normalizeUserByRoleItem(
  item: ApiDashboardTotalUserByRoleItem,
): DashboardTotalUserByRoleItem {
  return {
    role_id: Number(item.roleId ?? 0),
    role_code: String(item.roleCode ?? '').trim(),
    role_name: String(item.roleName ?? '').trim(),
    total_user: Number(item.totalUser ?? 0),
  }
}

function normalizeUserByAreaDetail(
  item: ApiDashboardTotalUserByAreaDetailItem,
): DashboardTotalUserByAreaDetailItem {
  return {
    role_id: Number(item.roleId ?? 0),
    role_code: String(item.roleCode ?? '').trim(),
    role_name: String(item.roleName ?? '').trim(),
    total_user: Number(item.totalUser ?? 0),
  }
}

function normalizeUserByAreaItem(
  item: ApiDashboardTotalUserByAreaItem,
): DashboardTotalUserByAreaItem {
  return {
    area_id: Number(item.areaId ?? 0),
    area_code: String(item.areaCode ?? '').trim(),
    area_name: String(item.areaName ?? '').trim(),
    total_user: Number(item.totalUser ?? 0),
    details: Array.isArray(item.details) ? item.details.map(normalizeUserByAreaDetail) : [],
  }
}

function normalizeCheckpointByAreaItem(
  item: ApiDashboardTotalCheckpointByAreaItem,
): DashboardTotalCheckpointByAreaItem {
  return {
    area_id: Number(item.areaId ?? 0),
    area_code: String(item.areaCode ?? '').trim(),
    area_name: String(item.areaName ?? '').trim(),
    total_check_point: Number(item.totalCheckPoint ?? 0),
  }
}

export async function fetchDashboardCards(): Promise<DashboardTotalAppItem[]> {
  const res = await http.get(endpoints.report.totalAppData)
  const list = ensureSuccess<ApiDashboardTotalAppItem[]>(res.data).data ?? []
  return Array.isArray(list) ? list.map(normalizeAppItem) : []
}

export async function fetchDashboardTotalUserByRole(): Promise<DashboardTotalUserByRoleItem[]> {
  const res = await http.get(endpoints.report.totalUserByRole)
  const list = ensureSuccess<ApiDashboardTotalUserByRoleItem[]>(res.data).data ?? []
  return Array.isArray(list) ? list.map(normalizeUserByRoleItem) : []
}

export async function fetchDashboardTotalUserByArea(): Promise<DashboardTotalUserByAreaItem[]> {
  const res = await http.get(endpoints.report.totalUserByArea)
  const list = ensureSuccess<ApiDashboardTotalUserByAreaItem[]>(res.data).data ?? []
  return Array.isArray(list) ? list.map(normalizeUserByAreaItem) : []
}

export async function fetchDashboardTotalCheckpointByArea(): Promise<
  DashboardTotalCheckpointByAreaItem[]
> {
  const res = await http.get(endpoints.report.totalCheckpointByArea)
  const list = ensureSuccess<ApiDashboardTotalCheckpointByAreaItem[]>(res.data).data ?? []
  return Array.isArray(list) ? list.map(normalizeCheckpointByAreaItem) : []
}
