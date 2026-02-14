import { pointReports, pointReportImages, checkPoints, areas, users, roles } from '@/mocks/db'

import type { ReportRow } from './reports.types'

export async function fetchReportRows(): Promise<ReportRow[]> {
  const cpMap = new Map(checkPoints.map((cp) => [cp.cp_id, cp]))
  const areaMap = new Map(areas.map((a) => [a.area_id, a]))
  const userMap = new Map(users.map((u) => [u.user_id, u]))
  const roleMap = new Map(roles.map((r) => [r.role_id, r]))

  const imageCountMap = new Map<number, number>()
  for (const img of pointReportImages) {
    imageCountMap.set(img.pr_id, (imageCountMap.get(img.pr_id) ?? 0) + 1)
  }

  const rows: ReportRow[] = pointReports
    .map((pr) => {
      const cp = cpMap.get(pr.cp_id)
      const area = cp ? areaMap.get(cp.area_id) : undefined
      const user = userMap.get(pr.created_by)
      const role = user ? roleMap.get(user.user_role_id) : undefined

      const areaCode = area?.area_code ?? ''
      const areaName = area?.area_name ?? ''
      const cpName = cp?.cp_name ?? ''
      const userCode = user?.user_code ?? ''
      const userName = user?.user_name ?? ''

      const q = `${areaCode} ${areaName} ${cpName} ${userCode} ${userName}`.toLowerCase()

      return {
        pr_id: pr.pr_id,
        pr_check: pr.pr_check,
        pr_note: pr.pr_note,
        cp_id: pr.cp_id,
        created_at: pr.created_at,
        created_by: pr.created_by,

        area_id: area?.area_id ?? 0,
        area_code: areaCode,
        area_name: areaName,

        cp_code: cp?.cp_code ?? '',
        cp_name: cpName,
        cp_description: cp?.cp_description ?? '',

        user_id: user?.user_id ?? '',
        user_code: userCode,
        user_name: userName,

        role_id: role?.role_id ?? 0,
        role_code: role?.role_code ?? '',
        role_name: role?.role_name ?? '',

        image_count: imageCountMap.get(pr.pr_id) ?? 0,

        _q: q,
      }
    })
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

  return rows
}

export async function fetchReportRowById(pr_id: number): Promise<ReportRow | null> {
  const rows = await fetchReportRows()
  return rows.find((r) => r.pr_id === pr_id) ?? null
}

export async function fetchReportImagesByReportId(pr_id: number) {
  const imgs = pointReportImages
    .filter((x) => x.pr_id === pr_id)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))

  return imgs
}

function getNextPriId() {
  let maxId = 0
  for (const x of pointReportImages) {
    if (x.pri_id > maxId) maxId = x.pri_id
  }
  return maxId + 1
}

export async function updateReportMock(payload: {
  pr_id: number
  pr_check: boolean
  pr_note: string
  delete_image_ids: number[]
  add_images: string[]
  actor_id: string
}) {
  const pr = pointReports.find((x) => x.pr_id === payload.pr_id)
  if (!pr) throw new Error('REPORT_NOT_FOUND')

  pr.pr_check = payload.pr_check
  pr.pr_note = payload.pr_note

  const del = new Set(payload.delete_image_ids ?? [])

  for (let i = pointReportImages.length - 1; i >= 0; i--) {
    const item = pointReportImages[i]
    if (!item) continue

    if (del.has(item.pri_id)) {
      pointReportImages.splice(i, 1)
    }
  }

  let nextId = getNextPriId()
  const now = new Date().toISOString()
  for (const img of payload.add_images ?? []) {
    const s = (img ?? '').trim()
    if (!s) continue

    pointReportImages.push({
      pri_id: nextId++,
      pr_id: payload.pr_id,
      pri_image: s,
      created_at: now,
      created_by: payload.actor_id,
    })
  }

  return true
}
