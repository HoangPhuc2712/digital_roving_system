import { defineStore } from 'pinia'
import type { UserRow } from './users.types'
import { fetchAreaOptions, fetchRoleOptions, fetchUserRows } from './users.api'

let roleOptionsPromise: Promise<{ label: string; value: number }[]> | null = null
let areaOptionsPromise: Promise<{ label: string; value: number }[]> | null = null

export const useUsersStore = defineStore('users', {
  state: () => ({
    rows: [] as UserRow[],
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
      const q = state.searchText.trim().toLowerCase()

      return state.rows.filter((r) => {
        if (q && (!r._q || !r._q.includes(q))) return false

        const userNameQuery = String(state.filterUserId ?? '')
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
          state.filterUserCode.trim() &&
          !String(r.user_code ?? '')
            .toLowerCase()
            .includes(state.filterUserCode.trim().toLowerCase())
        ) {
          return false
        }
        if (state.filterRoleId != null && r.user_role_id !== state.filterRoleId) return false
        if (state.filterAreaId != null && r.user_area_id !== state.filterAreaId) return false

        return true
      })
    },
  },

  actions: {
    async load() {
      this.loading = true
      try {
        const rows = await fetchUserRows()

        const fallbackUserOptions = Array.from(
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

        const fallbackUserCodeOptions = Array.from(
          new Set(rows.map((r) => String(r.user_code ?? '').trim()).filter(Boolean)),
        )
          .map((value) => ({ value, label: value }))
          .sort((a, b) => a.label.localeCompare(b.label))

        this.rows = rows
        this.userOptions = fallbackUserOptions
        this.userCodeOptions = fallbackUserCodeOptions
      } finally {
        this.loading = false
      }
    },

    clearFilters() {
      this.searchText = ''
      this.filterUserId = null
      this.filterUserCode = ''
      this.filterRoleId = null
      this.filterAreaId = null
      this.first = 0
    },

    async ensureRoleOptionsLoaded() {
      console.log('[UsersStore] ensureRoleOptionsLoaded:start', {
        loaded: this.roleOptionsLoaded,
        currentLength: this.roleOptions.length,
      })

      if (this.roleOptionsLoaded && this.roleOptions.length) {
        console.log('[UsersStore] ensureRoleOptionsLoaded:use-cache', {
          length: this.roleOptions.length,
          options: this.roleOptions,
        })
        return
      }
      if (roleOptionsPromise) {
        console.log('[UsersStore] ensureRoleOptionsLoaded:await-existing-promise')
        await roleOptionsPromise
        console.log('[UsersStore] ensureRoleOptionsLoaded:after-existing-promise', {
          length: this.roleOptions.length,
          options: this.roleOptions,
        })
        return
      }

      roleOptionsPromise = fetchRoleOptions()
        .then((options) => {
          console.log('[UsersStore] ensureRoleOptionsLoaded:fetched', {
            length: options.length,
            options,
          })
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
      console.log('[UsersStore] ensureRoleOptionsLoaded:done', {
        length: this.roleOptions.length,
        options: this.roleOptions,
      })
    },

    async ensureAreaOptionsLoaded() {
      console.log('[UsersStore] ensureAreaOptionsLoaded:start', {
        loaded: this.areaOptionsLoaded,
        currentLength: this.areaOptions.length,
      })

      if (this.areaOptionsLoaded && this.areaOptions.length) {
        console.log('[UsersStore] ensureAreaOptionsLoaded:use-cache', {
          length: this.areaOptions.length,
          options: this.areaOptions,
        })
        return
      }
      if (areaOptionsPromise) {
        console.log('[UsersStore] ensureAreaOptionsLoaded:await-existing-promise')
        await areaOptionsPromise
        console.log('[UsersStore] ensureAreaOptionsLoaded:after-existing-promise', {
          length: this.areaOptions.length,
          options: this.areaOptions,
        })
        return
      }

      areaOptionsPromise = fetchAreaOptions()
        .then((options) => {
          console.log('[UsersStore] ensureAreaOptionsLoaded:fetched', {
            length: options.length,
            options,
          })
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
      console.log('[UsersStore] ensureAreaOptionsLoaded:done', {
        length: this.areaOptions.length,
        options: this.areaOptions,
      })
    },

    setFirst(first: number) {
      this.first = first
    },
  },
})
