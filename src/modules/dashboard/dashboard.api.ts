import { http } from '@/services/http/axios'
import { endpoints } from '@/services/http/endpoints'
import type { DashboardStats } from './dashboard.types'

type ApiEnvelope<T> = { data: T; success: boolean; message: string }

function ensureSuccess<T>(payload: any): ApiEnvelope<T> {
  const e = payload as ApiEnvelope<T>
  if (!e || typeof e !== 'object' || !('success' in e)) throw new Error('API_ERROR')
  if (!e.success) throw new Error(String(e.message ?? 'API_ERROR') || 'API_ERROR')
  return e
}

type ApiPointReportView = { prHasProblem?: boolean; prStatus?: number }

async function safeCountPost(url: string, body: any = {}) {
  const res = await http.post(url, body)
  const list = ensureSuccess<any[]>(res.data).data ?? []
  return Array.isArray(list) ? list.length : 0
}

export async function fetchDashboardStats(opts: {
  includeReports: boolean
  includeRoles: boolean
  includeUsers: boolean
  includeScanPoints: boolean
  includeRoutes: boolean
}): Promise<DashboardStats> {
  const stats: DashboardStats = {
    totalReports: 0,
    issuedReports: 0,
    pendingReports: 0,
    roles: 0,
    users: 0,
    scanPoints: 0,
    routes: 0,
  }

  const tasks: Promise<void>[] = []

  if (opts.includeReports) {
    tasks.push(
      (async () => {
        const res = await http.post(endpoints.pointReportView.getList, {})
        const rows = ensureSuccess<ApiPointReportView[]>(res.data).data ?? []

        stats.totalReports = rows.length
        stats.issuedReports = rows.filter((x) => x.prHasProblem === true).length
        // pending: issue nhưng chưa xử lý xong => prStatus !== 2
        stats.pendingReports = rows.filter(
          (x) => x.prHasProblem === true && Number(x.prStatus ?? 0) !== 2,
        ).length
      })(),
    )
  }

  if (opts.includeRoles) {
    tasks.push(
      (async () => {
        stats.roles = await safeCountPost(endpoints.roleView.getList, {})
      })(),
    )
  }

  if (opts.includeUsers) {
    tasks.push(
      (async () => {
        stats.users = await safeCountPost(endpoints.userView.getList, {})
      })(),
    )
  }

  if (opts.includeScanPoints) {
    tasks.push(
      (async () => {
        stats.scanPoints = await safeCountPost(endpoints.checkPointView.getList, {})
      })(),
    )
  }

  if (opts.includeRoutes) {
    tasks.push(
      (async () => {
        stats.routes = await safeCountPost(endpoints.routeView.getList, {})
      })(),
    )
  }

  await Promise.all(tasks)
  return stats
}
