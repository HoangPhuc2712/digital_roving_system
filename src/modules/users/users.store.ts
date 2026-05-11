import { defineStore } from 'pinia'
import { fetchAllPagedRows, toApiPage } from '@/utils/pagination'
import type { UserRow } from './users.types'
import { fetchAreaOptions, fetchRoleOptions, fetchUserRows } from './users.api'

let roleOptionsPromise: Promise<{ label: string; value: number }[]> | null = null
let areaOptionsPromise: Promise<{ label: string; value: number }[]> | null = null

function buildUserKeyword(searchText: string, filterUserId: string | null) {
  return [searchText, filterUserId]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ')
}

function filterUserRows(
  rows: UserRow[],
  searchText: string,
  filterUserId: string | null,
  filterUserCode: string,
  filterRoleId: number | null,
  filterAreaId: number | null,
) {
  const q = searchText.trim().toLowerCase()

  return rows.filter((r) => {
    if (q && (!r._q || !r._q.includes(q))) return false

    const userNameQuery = String(filterUserId ?? '')
      .trim()
      .toLowerCase()
    if (
      userNameQuery &&
      !String(r.user_keyword ?? '')
        .toLowerCase()
        .includes(userNameQuery)
    ) {
      return false
    }

    if (
      filterUserCode.trim() &&
      !String(r.user_code ?? '')
        .toLowerCase()
        .includes(filterUserCode.trim().toLowerCase())
    ) {
      return false
    }
    if (filterRoleId != null && r.user_role_id !== filterRoleId) return false
    if (filterAreaId != null && r.user_area_id !== filterAreaId) return false

    return true
  })
}

function buildFallbackUserOptions(rows: UserRow[]) {
  return Array.from(
    new Map(
      rows
        .filter((r) => String(r.user_id).trim() && String(r.user_name).trim())
        .map((r) => [
          String(r.user_id),
          {
            label: String(r.user_name),
            searchText: String(r.user_keyword ?? '')
              .toLowerCase()
              .trim(),
          },
        ]),
    ).entries(),
  )
    .map(([value, option]) => ({ value, ...option }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function buildFallbackUserCodeOptions(rows: UserRow[]) {
  return Array.from(new Set(rows.map((r) => String(r.user_code ?? '').trim()).filter(Boolean)))
    .map((value) => ({ value, label: value }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export const useUsersStore = defineStore('users', {
  state: () => ({
    rows: [] as UserRow[],
    totalRecords: 0,
    loading: false,

    searchText: '' as string,
    filterUserId: null as string | null,
    filterUserCode: '' as string,
    filterRoleId: null as number | null,
    filterAreaId: null as number | null,

    userOptions: [] as { label: string; value: string; searchText?: string }[],
    userCodeOptions: [] as { label: string; value: string }[],
    roleOptions: [] as { label: string; value: number }[],
    areaOptions: [] as { label: string; value: number }[],
    roleOptionsLoaded: false,
    areaOptionsLoaded: false,

    first: 0,
    rowsPerPage: 25,
  }),

  getters: {
    filteredRows(state): UserRow[] {
      return filterUserRows(
        state.rows,
        state.searchText,
        state.filterUserId,
        state.filterUserCode,
        state.filterRoleId,
        state.filterAreaId,
      )
    },
  },

  actions: {
    async load() {
      this.loading = true
      try {
        const userKeyword = buildUserKeyword(this.searchText, this.filterUserId)

        const result = await fetchUserRows({
          page: toApiPage(this.first, this.rowsPerPage),
          pageSize: this.rowsPerPage,
          userKeyword,
          userCode: this.filterUserCode,
          userRoleId: this.filterRoleId,
          userAreaId: this.filterAreaId,
        })
        const rows = result.items

        this.rows = rows
        this.totalRecords = result.totalCount
        this.userOptions = buildFallbackUserOptions(rows)
        this.userCodeOptions = buildFallbackUserCodeOptions(rows)
      } finally {
        this.loading = false
      }
    },

    async getRowsForExport() {
      const userKeyword = buildUserKeyword(this.searchText, this.filterUserId)
      const rows = await fetchAllPagedRows((pageParams) =>
        fetchUserRows({
          ...pageParams,
          userKeyword,
          userCode: this.filterUserCode,
          userRoleId: this.filterRoleId,
          userAreaId: this.filterAreaId,
        }),
      )

      return filterUserRows(
        rows,
        this.searchText,
        this.filterUserId,
        this.filterUserCode,
        this.filterRoleId,
        this.filterAreaId,
      )
    },

    clearFilters() {
      this.searchText = ''
      this.filterUserId = null
      this.filterUserCode = ''
      this.filterRoleId = null
      this.filterAreaId = null
      this.first = 0
      this.totalRecords = 0
    },

    async ensureRoleOptionsLoaded() {
      if (this.roleOptionsLoaded && this.roleOptions.length) {
        return
      }
      if (roleOptionsPromise) {
        await roleOptionsPromise
        return
      }

      roleOptionsPromise = fetchRoleOptions()
        .then((options) => {
          this.roleOptions = options
          this.roleOptionsLoaded = true
          return options
        })
        .catch((error) => {
          console.error('[UsersStore] ensureRoleOptionsLoaded:error', error)
          this.roleOptionsLoaded = false
          return []
        })
        .finally(() => {
          roleOptionsPromise = null
        })

      await roleOptionsPromise
    },

    async ensureAreaOptionsLoaded() {
      if (this.areaOptionsLoaded && this.areaOptions.length) {
        return
      }
      if (areaOptionsPromise) {
        await areaOptionsPromise
        return
      }

      areaOptionsPromise = fetchAreaOptions()
        .then((options) => {
          this.areaOptions = options
          this.areaOptionsLoaded = true
          return options
        })
        .catch((error) => {
          console.error('[UsersStore] ensureAreaOptionsLoaded:error', error)
          this.areaOptionsLoaded = false
          return []
        })
        .finally(() => {
          areaOptionsPromise = null
        })

      await areaOptionsPromise
    },

    setFirst(first: number) {
      this.first = first
    },

    setPage(first: number, rowsPerPage: number) {
      this.first = first
      this.rowsPerPage = rowsPerPage
    },
  },
})
