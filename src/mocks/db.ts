// ==========================================
// 1. TYPE DEFINITIONS (Khớp với SQL Table)
// ==========================================

export type Role = {
  role_id: number
  role_status: number
  role_code: string
  role_name: string
  role_allow_view?: string // New column
  created_at: string
  created_by: string // UUID
  updated_at: string
  updated_by: string // UUID
}

export type User = {
  user_id: string // Changed to UUID
  user_status: number
  user_role_id: number
  user_name: string
  user_code: string
  user_password?: string
  created_date: string // Note: SQL uses created_date here
  created_by: string // UUID
  updated_date: string // Note: SQL uses updated_date here
  updated_by: string // UUID
}

export type Area = {
  area_id: number
  area_status: number
  area_code: string
  area_name: string
  created_date: string
  created_by: string // UUID
  updated_date: string
  updated_by: string // UUID
}

export type CheckPoint = {
  cp_id: number
  cp_status: number
  cp_code: string
  cp_name: string
  cp_qr: string
  cp_description: string
  cp_priority: number
  area_id: number
  created_at: string
  created_by: string
  updated_at: string
  updated_by: string
}

export type PointReport = {
  pr_id: number
  pr_check: boolean // SQL bit -> boolean
  pr_note: string
  cp_id: number
  created_at: string
  created_by: string // UUID (User who scanned)
  // Removed updated_at, updated_by per SQL
}

export type PointReportImage = {
  pri_id: number
  pr_id: number
  pri_image: string // Base64 or URL
  created_at: string
  created_by: string // UUID
}

export type AppSetting = {
  as_id: number
  as_section: string
  as_value: string
  created_at: string
  created_by: string
  updated_at: string
  updated_by: string
}

export type MenuCategory = {
  mc_id: number
  mc_status: number
  mc_code: string
  mc_name: string
  mc_active: boolean // SQL bit -> boolean
  mc_priority: number
  created_at: string
  created_by: string
  updated_at: string
  updated_by: string
}

// ==========================================
// 2. MOCK DATA GENERATION
// ==========================================

// Pre-defined UUIDs for Users to maintain referential integrity
const ADMIN_UUID = '550e8400-e29b-41d4-a716-446655440001'
const IT_UUID = '550e8400-e29b-41d4-a716-446655440002'
const EXPAT1_UUID = '550e8400-e29b-41d4-a716-446655440003'
const EXPAT2_UUID = '550e8400-e29b-41d4-a716-446655440004'
const SEC_UUID = '550e8400-e29b-41d4-a716-446655440005'
const SYSTEM_UUID = '00000000-0000-0000-0000-000000000000' // For system generated records

export const roles: Role[] = [
  {
    role_id: 1,
    role_status: 1,
    role_code: 'ADMIN',
    role_name: 'Administrator',
    role_allow_view: 'ALL',
    created_at: '2026-01-01T00:00:00Z',
    created_by: SYSTEM_UUID,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: SYSTEM_UUID,
  },
  {
    role_id: 2,
    role_status: 1,
    role_code: 'IT',
    role_name: 'IT Support',
    role_allow_view: 'IT_ONLY',
    created_at: '2026-01-01T00:00:00Z',
    created_by: SYSTEM_UUID,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: SYSTEM_UUID,
  },
  {
    role_id: 3,
    role_status: 1,
    role_code: 'SEC',
    role_name: 'Security',
    role_allow_view: 'ASSIGNED_AREA',
    created_at: '2026-01-01T00:00:00Z',
    created_by: SYSTEM_UUID,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: SYSTEM_UUID,
  },
  {
    role_id: 4,
    role_status: 1,
    role_code: 'EXP',
    role_name: 'Expat',
    role_allow_view: 'ASSIGNED_AREA',
    created_at: '2026-01-01T00:00:00Z',
    created_by: SYSTEM_UUID,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: SYSTEM_UUID,
  },
]

export const users: User[] = [
  {
    user_id: ADMIN_UUID,
    user_status: 1,
    user_role_id: 1,
    user_name: 'Admin User',
    user_code: 'P23591',
    user_password: 'P23591',
    created_date: '2026-01-01T00:00:00Z',
    created_by: SYSTEM_UUID,
    updated_date: '2026-01-01T00:00:00Z',
    updated_by: SYSTEM_UUID,
  },
  {
    user_id: IT_UUID,
    user_status: 1,
    user_role_id: 2,
    user_name: 'IT Staff',
    user_code: 'R39558',
    user_password: 'R39558',
    created_date: '2026-01-01T00:00:00Z',
    created_by: SYSTEM_UUID,
    updated_date: '2026-01-01T00:00:00Z',
    updated_by: SYSTEM_UUID,
  },
  {
    user_id: EXPAT1_UUID,
    user_status: 1,
    user_role_id: 4,
    user_name: 'Expat Manager 1',
    user_code: 'E26231',
    user_password: 'E26231',
    created_date: '2026-01-01T00:00:00Z',
    created_by: SYSTEM_UUID,
    updated_date: '2026-01-01T00:00:00Z',
    updated_by: SYSTEM_UUID,
  },
  {
    user_id: EXPAT2_UUID,
    user_status: 1,
    user_role_id: 4,
    user_name: 'Expat Manager 2',
    user_code: 'E26237',
    user_password: 'E26237',
    created_date: '2026-01-01T00:00:00Z',
    created_by: SYSTEM_UUID,
    updated_date: '2026-01-01T00:00:00Z',
    updated_by: SYSTEM_UUID,
  },
  {
    user_id: SEC_UUID,
    user_status: 1,
    user_role_id: 3,
    user_name: 'Security Guard',
    user_code: 'S45345',
    user_password: 'S45345',
    created_date: '2026-01-01T00:00:00Z',
    created_by: SYSTEM_UUID,
    updated_date: '2026-01-01T00:00:00Z',
    updated_by: SYSTEM_UUID,
  },
]

export const areas: Area[] = [
  {
    area_id: 1,
    area_status: 1,
    area_code: 'BU1',
    area_name: 'JHV',
    created_date: '2026-01-01T00:00:00Z',
    created_by: ADMIN_UUID,
    updated_date: '2026-01-01T00:00:00Z',
    updated_by: ADMIN_UUID,
  },
  {
    area_id: 2,
    area_status: 1,
    area_code: 'BU2',
    area_name: 'JHV',
    created_date: '2026-01-01T00:00:00Z',
    created_by: ADMIN_UUID,
    updated_date: '2026-01-01T00:00:00Z',
    updated_by: ADMIN_UUID,
  },
  {
    area_id: 3,
    area_status: 1,
    area_code: 'BU3',
    area_name: 'SHM',
    created_date: '2026-01-01T00:00:00Z',
    created_by: ADMIN_UUID,
    updated_date: '2026-01-01T00:00:00Z',
    updated_by: ADMIN_UUID,
  },
]

export const appSettings: AppSetting[] = [
  {
    as_id: 1,
    as_section: 'GENERAL',
    as_value: '{"theme": "dark", "language": "en"}',
    created_at: '2026-01-01T00:00:00Z',
    created_by: ADMIN_UUID,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: ADMIN_UUID,
  },
  {
    as_id: 2,
    as_section: 'SCANNING',
    as_value: '{"timeout": 30, "allow_offline": true}',
    created_at: '2026-01-01T00:00:00Z',
    created_by: ADMIN_UUID,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: ADMIN_UUID,
  },
]

export const menuCategories: MenuCategory[] = [
  {
    mc_id: 1,
    mc_status: 1,
    mc_code: 'DASHBOARD',
    mc_name: 'Dashboard',
    mc_active: true,
    mc_priority: 1,
    created_at: '2026-01-01T00:00:00Z',
    created_by: ADMIN_UUID,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: ADMIN_UUID,
  },
  {
    mc_id: 2,
    mc_status: 1,
    mc_code: 'REPORT',
    mc_name: 'Reports',
    mc_active: true,
    mc_priority: 2,
    created_at: '2026-01-01T00:00:00Z',
    created_by: ADMIN_UUID,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: ADMIN_UUID,
  },
  {
    mc_id: 3,
    mc_status: 1,
    mc_code: 'SETTINGS',
    mc_name: 'System Settings',
    mc_active: true,
    mc_priority: 99,
    created_at: '2026-01-01T00:00:00Z',
    created_by: ADMIN_UUID,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: ADMIN_UUID,
  },
]

export const checkPoints: CheckPoint[] = [
  // 3 Checkpoints for BU1
  {
    cp_id: 1,
    cp_status: 1,
    cp_code: '01',
    cp_name: 'BU1-1',
    cp_qr:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsBAMAAACLU5NGAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADBQTFRFR3BMAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQF4c+wTgAAAA90Uk5TAL+AQJ+PYM9wIDDf768Qyd8uWQAABKhJREFUeNrtnV1u00AQx12iIsEDpBVQiQ8lUAQPCDUiSHw8EEEPULhB4QaoB+CBA1DBBUCcAC6AeoKKm6SlUiuBFHbLjhmvd7et7fQj/f1f1rHX61/8MJ6ZnbWzDCGEEEIIIYQQQgghhBBCCE2oHtxK6I7tYTd6pv1o2nnTnpOjy26Ilv1hN96kxpo/ENbCKKEN28NudE07MO2mpZCjbTfEGfvDbnRSY22CBRZYE4q12O/3P5h2y7SPDwtrGDpwUbCiF2z7p3RSY4EFFlhgNYw1PaP0UmPZHetiX8WpE6wpc/CyjxUcqxrWlH8fLmorXzLVpV4aKzgWWGCBdRqwLhhXsG9/rJh2cGywWnrHr5CVBwsssMA6eqxZ5/3dNH7dnN3xwvywFNshN/DQsLqud96rp/IEG2CBBdaEY6XD12U3i3HPXsjuSNqtBsPXdLCfudzpSPKRSSt/aDkIsMAC69Ri7X/OJ59ceW82lhzWMZqKkocPWGCBNclYr2cSuqzdwBKWPfWSjWkF61VqrCvZeFTCEvudm/4jEVhggXXqsEpWvut7p9rKj/xgf8e4gw/9UxsK9mtg5Q8fsMACawKxpKb5ngzzzblt1sG7L4m/nsOyxSy3k1hfzBk3dC3zTzfWfCWzOuXftfyCvZiVD2IN/Buz4KcEwAILrBOD9ck4TL0QVu5J2Qxb369pTmLZXk/rYe2dpAyG7j3VM2jlN+p7p2CBBRZYUawNl6w7r7N3l2RpWyFrKc7dWzfdm2PZnXLqDfEgZ1SvalF1vKgnWUmZhXKnm/oWtsECC6zJw9px3l8/WtNsL9gSZ9HufOd6belc3Iob5kk9K99RAXpw4qYVKhBqRaeLGlpxBxZYYIGVjKrFUObmdNFtPxrtV7tYMsTgwFhZLN+Z6edMN5apSGNpBxwssMA6mViFauV1037X0xAlLAlMf7ia5msFHLPjumDJEHcrFbMUihGD9TsFLD/9eEb3HOpgP1jYCBZYYIFVD2t3bO3gLbpq5cLkyqoPH5zmltfKNOAGlhbUdP370Avd0+js+6CZhw9YYIF1HLBsYbJ1Rqdlse2sKkDZnYr4nP179d5z5/3NWcdu1WEV3EB76pLb/q09yYXKTnMWC+PzDMBQ9+rFrHxDFeBggQXWycCS+YlfbiqiFS0eHhNWWMmxg6XWBe+0XSsHARZYYIEVdAPTS9uCL1vWJS+FpW1tH2vN7OyMYSFg8haWFgIGg/0RWGCBNcFYX90c7XnrE+oL5m7gGLCGoQNBpzlPUpb+QdDKVxdYYIEF1p5Y8RddZS4baFOQZ+XLHEKzJW6gPt1OCv+RRKL1M69Wxoq/Fmx/D59onXi9lStggQXW8cbyPzMUDl/9YpZdyWv8tip9ZiiNFV3iVwj2/bnqmklKsMACC6yaWMGxJSDf1p9EkrG29eqSncpLRGpgFSrAg8H+OB4+YIEF1uFhxcNX7eAV3rnSGf1/T3Mca61W+BoP9pP2W+5DHKs9phwEWGCBdaqx0pMrpb19pWcaS9c0N+CdHhArNEzLr6QECyywJgBrfx8dLyg0zDmdM2zgo+MIIYQQQgghhBBCCCGEEELoBOkvD09bSjXsVU8AAAAASUVORK5CYII=',
    cp_description: '[BU1-1] Scanning Point',
    cp_priority: 1,
    area_id: 1,
    created_at: '2026-01-01T00:00:00Z',
    created_by: ADMIN_UUID,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: ADMIN_UUID,
  },
  {
    cp_id: 2,
    cp_status: 1,
    cp_code: '02',
    cp_name: 'BU1-2',
    cp_qr:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsBAMAAACLU5NGAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADBQTFRFR3BMAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQF4c+wTgAAAA90Uk5TAL+AQJ+PYM9wIDDf768Qyd8uWQAABKhJREFUeNrtnV1u00AQx12iIsEDpBVQiQ8lUAQPCDUiSHw8EEEPULhB4QaoB+CBA1DBBUCcAC6AeoKKm6SlUiuBFHbLjhmvd7et7fQj/f1f1rHX61/8MJ6ZnbWzDCGEEEIIIYQQQgghhBBCCE2oHtxK6I7tYTd6pv1o2nnTnpOjy26Ilv1hN96kxpo/ENbCKKEN28NudE07MO2mpZCjbTfEGfvDbnRSY22CBRZYE4q12O/3P5h2y7SPDwtrGDpwUbCiF2z7p3RSY4EFFlhgNYw1PaP0UmPZHetiX8WpE6wpc/CyjxUcqxrWlH8fLmorXzLVpV4aKzgWWGCBdRqwLhhXsG9/rJh2cGywWnrHr5CVBwsssMA6eqxZ5/3dNH7dnN3xwvywFNshN/DQsLqud96rp/IEG2CBBdaEY6XD12U3i3HPXsjuSNqtBsPXdLCfudzpSPKRSSt/aDkIsMAC69Ri7X/OJ59ceW82lhzWMZqKkocPWGCBNclYr2cSuqzdwBKWPfWSjWkF61VqrCvZeFTCEvudm/4jEVhggXXqsEpWvut7p9rKj/xgf8e4gw/9UxsK9mtg5Q8fsMACawKxpKb5ngzzzblt1sG7L4m/nsOyxSy3k1hfzBk3dC3zTzfWfCWzOuXftfyCvZiVD2IN/Buz4KcEwAILrBOD9ck4TL0QVu5J2Qxb369pTmLZXk/rYe2dpAyG7j3VM2jlN+p7p2CBBRZYUawNl6w7r7N3l2RpWyFrKc7dWzfdm2PZnXLqDfEgZ1SvalF1vKgnWUmZhXKnm/oWtsECC6zJw9px3l8/WtNsL9gSZ9HufOd6belc3Iob5kk9K99RAXpw4qYVKhBqRaeLGlpxBxZYYIGVjKrFUObmdNFtPxrtV7tYMsTgwFhZLN+Z6edMN5apSGNpBxwssMA6mViFauV1037X0xAlLAlMf7ia5msFHLPjumDJEHcrFbMUihGD9TsFLD/9eEb3HOpgP1jYCBZYYIFVD2t3bO3gLbpq5cLkyqoPH5zmltfKNOAGlhbUdP370Avd0+js+6CZhw9YYIF1HLBsYbJ1Rqdlse2sKkDZnYr4nP179d5z5/3NWcdu1WEV3EB76pLb/q09yYXKTnMWC+PzDMBQ9+rFrHxDFeBggQXWycCS+YlfbiqiFS0eHhNWWMmxg6XWBe+0XSsHARZYYIEVdAPTS9uCL1vWJS+FpW1tH2vN7OyMYSFg8haWFgIGg/0RWGCBNcFYX90c7XnrE+oL5m7gGLCGoQNBpzlPUpb+QdDKVxdYYIEF1p5Y8RddZS4baFOQZ+XLHEKzJW6gPt1OCv+RRKL1M69Wxoq/Fmx/D59onXi9lStggQXW8cbyPzMUDl/9YpZdyWv8tip9ZiiNFV3iVwj2/bnqmklKsMACC6yaWMGxJSDf1p9EkrG29eqSncpLRGpgFSrAg8H+OB4+YIEF1uFhxcNX7eAV3rnSGf1/T3Mca61W+BoP9pP2W+5DHKs9phwEWGCBdaqx0pMrpb19pWcaS9c0N+CdHhArNEzLr6QECyywJgBrfx8dLyg0zDmdM2zgo+MIIYQQQgghhBBCCCGEEELoBOkvD09bSjXsVU8AAAAASUVORK5CYII=',
    cp_description: '[BU1-2] Scanning Point',
    cp_priority: 2,
    area_id: 1,
    created_at: '2026-01-01T00:00:00Z',
    created_by: ADMIN_UUID,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: ADMIN_UUID,
  },
  {
    cp_id: 3,
    cp_status: 1,
    cp_code: '03',
    cp_name: 'BU1-3',
    cp_qr:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsBAMAAACLU5NGAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADBQTFRFR3BMAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQF4c+wTgAAAA90Uk5TAL+AQJ+PYM9wIDDf768Qyd8uWQAABKhJREFUeNrtnV1u00AQx12iIsEDpBVQiQ8lUAQPCDUiSHw8EEEPULhB4QaoB+CBA1DBBUCcAC6AeoKKm6SlUiuBFHbLjhmvd7et7fQj/f1f1rHX61/8MJ6ZnbWzDCGEEEIIIYQQQgghhBBCCE2oHtxK6I7tYTd6pv1o2nnTnpOjy26Ilv1hN96kxpo/ENbCKKEN28NudE07MO2mpZCjbTfEGfvDbnRSY22CBRZYE4q12O/3P5h2y7SPDwtrGDpwUbCiF2z7p3RSY4EFFlhgNYw1PaP0UmPZHetiX8WpE6wpc/CyjxUcqxrWlH8fLmorXzLVpV4aKzgWWGCBdRqwLhhXsG9/rJh2cGywWnrHr5CVBwsssMA6eqxZ5/3dNH7dnN3xwvywFNshN/DQsLqud96rp/IEG2CBBdaEY6XD12U3i3HPXsjuSNqtBsPXdLCfudzpSPKRSSt/aDkIsMAC69Ri7X/OJ59ceW82lhzWMZqKkocPWGCBNclYr2cSuqzdwBKWPfWSjWkF61VqrCvZeFTCEvudm/4jEVhggXXqsEpWvut7p9rKj/xgf8e4gw/9UxsK9mtg5Q8fsMACawKxpKb5ngzzzblt1sG7L4m/nsOyxSy3k1hfzBk3dC3zTzfWfCWzOuXftfyCvZiVD2IN/Buz4KcEwAILrBOD9ck4TL0QVu5J2Qxb369pTmLZXk/rYe2dpAyG7j3VM2jlN+p7p2CBBRZYUawNl6w7r7N3l2RpWyFrKc7dWzfdm2PZnXLqDfEgZ1SvalF1vKgnWUmZhXKnm/oWtsECC6zJw9px3l8/WtNsL9gSZ9HufOd6belc3Iob5kk9K99RAXpw4qYVKhBqRaeLGlpxBxZYYIGVjKrFUObmdNFtPxrtV7tYMsTgwFhZLN+Z6edMN5apSGNpBxwssMA6mViFauV1037X0xAlLAlMf7ia5msFHLPjumDJEHcrFbMUihGD9TsFLD/9eEb3HOpgP1jYCBZYYIFVD2t3bO3gLbpq5cLkyqoPH5zmltfKNOAGlhbUdP370Avd0+js+6CZhw9YYIF1HLBsYbJ1Rqdlse2sKkDZnYr4nP179d5z5/3NWcdu1WEV3EB76pLb/q09yYXKTnMWC+PzDMBQ9+rFrHxDFeBggQXWycCS+YlfbiqiFS0eHhNWWMmxg6XWBe+0XSsHARZYYIEVdAPTS9uCL1vWJS+FpW1tH2vN7OyMYSFg8haWFgIGg/0RWGCBNcFYX90c7XnrE+oL5m7gGLCGoQNBpzlPUpb+QdDKVxdYYIEF1p5Y8RddZS4baFOQZ+XLHEKzJW6gPt1OCv+RRKL1M69Wxoq/Fmx/D59onXi9lStggQXW8cbyPzMUDl/9YpZdyWv8tip9ZiiNFV3iVwj2/bnqmklKsMACC6yaWMGxJSDf1p9EkrG29eqSncpLRGpgFSrAg8H+OB4+YIEF1uFhxcNX7eAV3rnSGf1/T3Mca61W+BoP9pP2W+5DHKs9phwEWGCBdaqx0pMrpb19pWcaS9c0N+CdHhArNEzLr6QECyywJgBrfx8dLyg0zDmdM2zgo+MIIYQQQgghhBBCCCGEEELoBOkvD09bSjXsVU8AAAAASUVORK5CYII=',
    cp_description: '[BU1-3] Scanning Point',
    cp_priority: 3,
    area_id: 1,
    created_at: '2026-01-01T00:00:00Z',
    created_by: ADMIN_UUID,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: ADMIN_UUID,
  },

  // 3 Checkpoints for BU2
  {
    cp_id: 4,
    cp_status: 1,
    cp_code: '04',
    cp_name: 'BU2-1',
    cp_qr:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsBAMAAACLU5NGAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADBQTFRFR3BMAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQF4c+wTgAAAA90Uk5TAL+AQJ+PYM9wIDDf768Qyd8uWQAABKhJREFUeNrtnV1u00AQx12iIsEDpBVQiQ8lUAQPCDUiSHw8EEEPULhB4QaoB+CBA1DBBUCcAC6AeoKKm6SlUiuBFHbLjhmvd7et7fQj/f1f1rHX61/8MJ6ZnbWzDCGEEEIIIYQQQgghhBBCCE2oHtxK6I7tYTd6pv1o2nnTnpOjy26Ilv1hN96kxpo/ENbCKKEN28NudE07MO2mpZCjbTfEGfvDbnRSY22CBRZYE4q12O/3P5h2y7SPDwtrGDpwUbCiF2z7p3RSY4EFFlhgNYw1PaP0UmPZHetiX8WpE6wpc/CyjxUcqxrWlH8fLmorXzLVpV4aKzgWWGCBdRqwLhhXsG9/rJh2cGywWnrHr5CVBwsssMA6eqxZ5/3dNH7dnN3xwvywFNshN/DQsLqud96rp/IEG2CBBdaEY6XD12U3i3HPXsjuSNqtBsPXdLCfudzpSPKRSSt/aDkIsMAC69Ri7X/OJ59ceW82lhzWMZqKkocPWGCBNclYr2cSuqzdwBKWPfWSjWkF61VqrCvZeFTCEvudm/4jEVhggXXqsEpWvut7p9rKj/xgf8e4gw/9UxsK9mtg5Q8fsMACawKxpKb5ngzzzblt1sG7L4m/nsOyxSy3k1hfzBk3dC3zTzfWfCWzOuXftfyCvZiVD2IN/Buz4KcEwAILrBOD9ck4TL0QVu5J2Qxb369pTmLZXk/rYe2dpAyG7j3VM2jlN+p7p2CBBRZYUawNl6w7r7N3l2RpWyFrKc7dWzfdm2PZnXLqDfEgZ1SvalF1vKgnWUmZhXKnm/oWtsECC6zJw9px3l8/WtNsL9gSZ9HufOd6belc3Iob5kk9K99RAXpw4qYVKhBqRaeLGlpxBxZYYIGVjKrFUObmdNFtPxrtV7tYMsTgwFhZLN+Z6edMN5apSGNpBxwssMA6mViFauV1037X0xAlLAlMf7ia5msFHLPjumDJEHcrFbMUihGD9TsFLD/9eEb3HOpgP1jYCBZYYIFVD2t3bO3gLbpq5cLkyqoPH5zmltfKNOAGlhbUdP370Avd0+js+6CZhw9YYIF1HLBsYbJ1Rqdlse2sKkDZnYr4nP179d5z5/3NWcdu1WEV3EB76pLb/q09yYXKTnMWC+PzDMBQ9+rFrHxDFeBggQXWycCS+YlfbiqiFS0eHhNWWMmxg6XWBe+0XSsHARZYYIEVdAPTS9uCL1vWJS+FpW1tH2vN7OyMYSFg8haWFgIGg/0RWGCBNcFYX90c7XnrE+oL5m7gGLCGoQNBpzlPUpb+QdDKVxdYYIEF1p5Y8RddZS4baFOQZ+XLHEKzJW6gPt1OCv+RRKL1M69Wxoq/Fmx/D59onXi9lStggQXW8cbyPzMUDl/9YpZdyWv8tip9ZiiNFV3iVwj2/bnqmklKsMACC6yaWMGxJSDf1p9EkrG29eqSncpLRGpgFSrAg8H+OB4+YIEF1uFhxcNX7eAV3rnSGf1/T3Mca61W+BoP9pP2W+5DHKs9phwEWGCBdaqx0pMrpb19pWcaS9c0N+CdHhArNEzLr6QECyywJgBrfx8dLyg0zDmdM2zgo+MIIYQQQgghhBBCCCGEEELoBOkvD09bSjXsVU8AAAAASUVORK5CYII=',
    cp_description: '[BU2-1] Scanning Point',
    cp_priority: 1,
    area_id: 2,
    created_at: '2026-01-01T00:00:00Z',
    created_by: ADMIN_UUID,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: ADMIN_UUID,
  },
  {
    cp_id: 5,
    cp_status: 1,
    cp_code: '05',
    cp_name: 'BU2-2',
    cp_qr:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsBAMAAACLU5NGAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADBQTFRFR3BMAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQF4c+wTgAAAA90Uk5TAL+AQJ+PYM9wIDDf768Qyd8uWQAABKhJREFUeNrtnV1u00AQx12iIsEDpBVQiQ8lUAQPCDUiSHw8EEEPULhB4QaoB+CBA1DBBUCcAC6AeoKKm6SlUiuBFHbLjhmvd7et7fQj/f1f1rHX61/8MJ6ZnbWzDCGEEEIIIYQQQgghhBBCCE2oHtxK6I7tYTd6pv1o2nnTnpOjy26Ilv1hN96kxpo/ENbCKKEN28NudE07MO2mpZCjbTfEGfvDbnRSY22CBRZYE4q12O/3P5h2y7SPDwtrGDpwUbCiF2z7p3RSY4EFFlhgNYw1PaP0UmPZHetiX8WpE6wpc/CyjxUcqxrWlH8fLmorXzLVpV4aKzgWWGCBdRqwLhhXsG9/rJh2cGywWnrHr5CVBwsssMA6eqxZ5/3dNH7dnN3xwvywFNshN/DQsLqud96rp/IEG2CBBdaEY6XD12U3i3HPXsjuSNqtBsPXdLCfudzpSPKRSSt/aDkIsMAC69Ri7X/OJ59ceW82lhzWMZqKkocPWGCBNclYr2cSuqzdwBKWPfWSjWkF61VqrCvZeFTCEvudm/4jEVhggXXqsEpWvut7p9rKj/xgf8e4gw/9UxsK9mtg5Q8fsMACawKxpKb5ngzzzblt1sG7L4m/nsOyxSy3k1hfzBk3dC3zTzfWfCWzOuXftfyCvZiVD2IN/Buz4KcEwAILrBOD9ck4TL0QVu5J2Qxb369pTmLZXk/rYe2dpAyG7j3VM2jlN+p7p2CBBRZYUawNl6w7r7N3l2RpWyFrKc7dWzfdm2PZnXLqDfEgZ1SvalF1vKgnWUmZhXKnm/oWtsECC6zJw9px3l8/WtNsL9gSZ9HufOd6belc3Iob5kk9K99RAXpw4qYVKhBqRaeLGlpxBxZYYIGVjKrFUObmdNFtPxrtV7tYMsTgwFhZLN+Z6edMN5apSGNpBxwssMA6mViFauV1037X0xAlLAlMf7ia5msFHLPjumDJEHcrFbMUihGD9TsFLD/9eEb3HOpgP1jYCBZYYIFVD2t3bO3gLbpq5cLkyqoPH5zmltfKNOAGlhbUdP370Avd0+js+6CZhw9YYIF1HLBsYbJ1Rqdlse2sKkDZnYr4nP179d5z5/3NWcdu1WEV3EB76pLb/q09yYXKTnMWC+PzDMBQ9+rFrHxDFeBggQXWycCS+YlfbiqiFS0eHhNWWMmxg6XWBe+0XSsHARZYYIEVdAPTS9uCL1vWJS+FpW1tH2vN7OyMYSFg8haWFgIGg/0RWGCBNcFYX90c7XnrE+oL5m7gGLCGoQNBpzlPUpb+QdDKVxdYYIEF1p5Y8RddZS4baFOQZ+XLHEKzJW6gPt1OCv+RRKL1M69Wxoq/Fmx/D59onXi9lStggQXW8cbyPzMUDl/9YpZdyWv8tip9ZiiNFV3iVwj2/bnqmklKsMACC6yaWMGxJSDf1p9EkrG29eqSncpLRGpgFSrAg8H+OB4+YIEF1uFhxcNX7eAV3rnSGf1/T3Mca61W+BoP9pP2W+5DHKs9phwEWGCBdaqx0pMrpb19pWcaS9c0N+CdHhArNEzLr6QECyywJgBrfx8dLyg0zDmdM2zgo+MIIYQQQgghhBBCCCGEEELoBOkvD09bSjXsVU8AAAAASUVORK5CYII=',
    cp_description: '[BU2-2] Scanning Point',
    cp_priority: 2,
    area_id: 2,
    created_at: '2026-01-01T00:00:00Z',
    created_by: ADMIN_UUID,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: ADMIN_UUID,
  },
  {
    cp_id: 6,
    cp_status: 1,
    cp_code: '06',
    cp_name: 'BU2-3',
    cp_qr:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsBAMAAACLU5NGAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADBQTFRFR3BMAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQF4c+wTgAAAA90Uk5TAL+AQJ+PYM9wIDDf768Qyd8uWQAABKhJREFUeNrtnV1u00AQx12iIsEDpBVQiQ8lUAQPCDUiSHw8EEEPULhB4QaoB+CBA1DBBUCcAC6AeoKKm6SlUiuBFHbLjhmvd7et7fQj/f1f1rHX61/8MJ6ZnbWzDCGEEEIIIYQQQgghhBBCCE2oHtxK6I7tYTd6pv1o2nnTnpOjy26Ilv1hN96kxpo/ENbCKKEN28NudE07MO2mpZCjbTfEGfvDbnRSY22CBRZYE4q12O/3P5h2y7SPDwtrGDpwUbCiF2z7p3RSY4EFFlhgNYw1PaP0UmPZHetiX8WpE6wpc/CyjxUcqxrWlH8fLmorXzLVpV4aKzgWWGCBdRqwLhhXsG9/rJh2cGywWnrHr5CVBwsssMA6eqxZ5/3dNH7dnN3xwvywFNshN/DQsLqud96rp/IEG2CBBdaEY6XD12U3i3HPXsjuSNqtBsPXdLCfudzpSPKRSSt/aDkIsMAC69Ri7X/OJ59ceW82lhzWMZqKkocPWGCBNclYr2cSuqzdwBKWPfWSjWkF61VqrCvZeFTCEvudm/4jEVhggXXqsEpWvut7p9rKj/xgf8e4gw/9UxsK9mtg5Q8fsMACawKxpKb5ngzzzblt1sG7L4m/nsOyxSy3k1hfzBk3dC3zTzfWfCWzOuXftfyCvZiVD2IN/Buz4KcEwAILrBOD9ck4TL0QVu5J2Qxb369pTmLZXk/rYe2dpAyG7j3VM2jlN+p7p2CBBRZYUawNl6w7r7N3l2RpWyFrKc7dWzfdm2PZnXLqDfEgZ1SvalF1vKgnWUmZhXKnm/oWtsECC6zJw9px3l8/WtNsL9gSZ9HufOd6belc3Iob5kk9K99RAXpw4qYVKhBqRaeLGlpxBxZYYIGVjKrFUObmdNFtPxrtV7tYMsTgwFhZLN+Z6edMN5apSGNpBxwssMA6mViFauV1037X0xAlLAlMf7ia5msFHLPjumDJEHcrFbMUihGD9TsFLD/9eEb3HOpgP1jYCBZYYIFVD2t3bO3gLbpq5cLkyqoPH5zmltfKNOAGlhbUdP370Avd0+js+6CZhw9YYIF1HLBsYbJ1Rqdlse2sKkDZnYr4nP179d5z5/3NWcdu1WEV3EB76pLb/q09yYXKTnMWC+PzDMBQ9+rFrHxDFeBggQXWycCS+YlfbiqiFS0eHhNWWMmxg6XWBe+0XSsHARZYYIEVdAPTS9uCL1vWJS+FpW1tH2vN7OyMYSFg8haWFgIGg/0RWGCBNcFYX90c7XnrE+oL5m7gGLCGoQNBpzlPUpb+QdDKVxdYYIEF1p5Y8RddZS4baFOQZ+XLHEKzJW6gPt1OCv+RRKL1M69Wxoq/Fmx/D59onXi9lStggQXW8cbyPzMUDl/9YpZdyWv8tip9ZiiNFV3iVwj2/bnqmklKsMACC6yaWMGxJSDf1p9EkrG29eqSncpLRGpgFSrAg8H+OB4+YIEF1uFhxcNX7eAV3rnSGf1/T3Mca61W+BoP9pP2W+5DHKs9phwEWGCBdaqx0pMrpb19pWcaS9c0N+CdHhArNEzLr6QECyywJgBrfx8dLyg0zDmdM2zgo+MIIYQQQgghhBBCCCGEEELoBOkvD09bSjXsVU8AAAAASUVORK5CYII=',
    cp_description: '[BU2-3] Scanning Point',
    cp_priority: 3,
    area_id: 2,
    created_at: '2026-01-01T00:00:00Z',
    created_by: ADMIN_UUID,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: ADMIN_UUID,
  },

  // 3 Checkpoints for BU3
  {
    cp_id: 7,
    cp_status: 1,
    cp_code: '07',
    cp_name: 'BU3-1',
    cp_qr:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsBAMAAACLU5NGAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADBQTFRFR3BMAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQF4c+wTgAAAA90Uk5TAL+AQJ+PYM9wIDDf768Qyd8uWQAABKhJREFUeNrtnV1u00AQx12iIsEDpBVQiQ8lUAQPCDUiSHw8EEEPULhB4QaoB+CBA1DBBUCcAC6AeoKKm6SlUiuBFHbLjhmvd7et7fQj/f1f1rHX61/8MJ6ZnbWzDCGEEEIIIYQQQgghhBBCCE2oHtxK6I7tYTd6pv1o2nnTnpOjy26Ilv1hN96kxpo/ENbCKKEN28NudE07MO2mpZCjbTfEGfvDbnRSY22CBRZYE4q12O/3P5h2y7SPDwtrGDpwUbCiF2z7p3RSY4EFFlhgNYw1PaP0UmPZHetiX8WpE6wpc/CyjxUcqxrWlH8fLmorXzLVpV4aKzgWWGCBdRqwLhhXsG9/rJh2cGywWnrHr5CVBwsssMA6eqxZ5/3dNH7dnN3xwvywFNshN/DQsLqud96rp/IEG2CBBdaEY6XD12U3i3HPXsjuSNqtBsPXdLCfudzpSPKRSSt/aDkIsMAC69Ri7X/OJ59ceW82lhzWMZqKkocPWGCBNclYr2cSuqzdwBKWPfWSjWkF61VqrCvZeFTCEvudm/4jEVhggXXqsEpWvut7p9rKj/xgf8e4gw/9UxsK9mtg5Q8fsMACawKxpKb5ngzzzblt1sG7L4m/nsOyxSy3k1hfzBk3dC3zTzfWfCWzOuXftfyCvZiVD2IN/Buz4KcEwAILrBOD9ck4TL0QVu5J2Qxb369pTmLZXk/rYe2dpAyG7j3VM2jlN+p7p2CBBRZYUawNl6w7r7N3l2RpWyFrKc7dWzfdm2PZnXLqDfEgZ1SvalF1vKgnWUmZhXKnm/oWtsECC6zJw9px3l8/WtNsL9gSZ9HufOd6belc3Iob5kk9K99RAXpw4qYVKhBqRaeLGlpxBxZYYIGVjKrFUObmdNFtPxrtV7tYMsTgwFhZLN+Z6edMN5apSGNpBxwssMA6mViFauV1037X0xAlLAlMf7ia5msFHLPjumDJEHcrFbMUihGD9TsFLD/9eEb3HOpgP1jYCBZYYIFVD2t3bO3gLbpq5cLkyqoPH5zmltfKNOAGlhbUdP370Avd0+js+6CZhw9YYIF1HLBsYbJ1Rqdlse2sKkDZnYr4nP179d5z5/3NWcdu1WEV3EB76pLb/q09yYXKTnMWC+PzDMBQ9+rFrHxDFeBggQXWycCS+YlfbiqiFS0eHhNWWMmxg6XWBe+0XSsHARZYYIEVdAPTS9uCL1vWJS+FpW1tH2vN7OyMYSFg8haWFgIGg/0RWGCBNcFYX90c7XnrE+oL5m7gGLCGoQNBpzlPUpb+QdDKVxdYYIEF1p5Y8RddZS4baFOQZ+XLHEKzJW6gPt1OCv+RRKL1M69Wxoq/Fmx/D59onXi9lStggQXW8cbyPzMUDl/9YpZdyWv8tip9ZiiNFV3iVwj2/bnqmklKsMACC6yaWMGxJSDf1p9EkrG29eqSncpLRGpgFSrAg8H+OB4+YIEF1uFhxcNX7eAV3rnSGf1/T3Mca61W+BoP9pP2W+5DHKs9phwEWGCBdaqx0pMrpb19pWcaS9c0N+CdHhArNEzLr6QECyywJgBrfx8dLyg0zDmdM2zgo+MIIYQQQgghhBBCCCGEEELoBOkvD09bSjXsVU8AAAAASUVORK5CYII=',
    cp_description: '[BU3-1] Scanning Point',
    cp_priority: 1,
    area_id: 3,
    created_at: '2026-01-01T00:00:00Z',
    created_by: ADMIN_UUID,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: ADMIN_UUID,
  },
  {
    cp_id: 8,
    cp_status: 1,
    cp_code: '08',
    cp_name: 'BU3-2',
    cp_qr:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsBAMAAACLU5NGAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADBQTFRFR3BMAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQF4c+wTgAAAA90Uk5TAL+AQJ+PYM9wIDDf768Qyd8uWQAABKhJREFUeNrtnV1u00AQx12iIsEDpBVQiQ8lUAQPCDUiSHw8EEEPULhB4QaoB+CBA1DBBUCcAC6AeoKKm6SlUiuBFHbLjhmvd7et7fQj/f1f1rHX61/8MJ6ZnbWzDCGEEEIIIYQQQgghhBBCCE2oHtxK6I7tYTd6pv1o2nnTnpOjy26Ilv1hN96kxpo/ENbCKKEN28NudE07MO2mpZCjbTfEGfvDbnRSY22CBRZYE4q12O/3P5h2y7SPDwtrGDpwUbCiF2z7p3RSY4EFFlhgNYw1PaP0UmPZHetiX8WpE6wpc/CyjxUcqxrWlH8fLmorXzLVpV4aKzgWWGCBdRqwLhhXsG9/rJh2cGywWnrHr5CVBwsssMA6eqxZ5/3dNH7dnN3xwvywFNshN/DQsLqud96rp/IEG2CBBdaEY6XD12U3i3HPXsjuSNqtBsPXdLCfudzpSPKRSSt/aDkIsMAC69Ri7X/OJ59ceW82lhzWMZqKkocPWGCBNclYr2cSuqzdwBKWPfWSjWkF61VqrCvZeFTCEvudm/4jEVhggXXqsEpWvut7p9rKj/xgf8e4gw/9UxsK9mtg5Q8fsMACawKxpKb5ngzzzblt1sG7L4m/nsOyxSy3k1hfzBk3dC3zTzfWfCWzOuXftfyCvZiVD2IN/Buz4KcEwAILrBOD9ck4TL0QVu5J2Qxb369pTmLZXk/rYe2dpAyG7j3VM2jlN+p7p2CBBRZYUawNl6w7r7N3l2RpWyFrKc7dWzfdm2PZnXLqDfEgZ1SvalF1vKgnWUmZhXKnm/oWtsECC6zJw9px3l8/WtNsL9gSZ9HufOd6belc3Iob5kk9K99RAXpw4qYVKhBqRaeLGlpxBxZYYIGVjKrFUObmdNFtPxrtV7tYMsTgwFhZLN+Z6edMN5apSGNpBxwssMA6mViFauV1037X0xAlLAlMf7ia5msFHLPjumDJEHcrFbMUihGD9TsFLD/9eEb3HOpgP1jYCBZYYIFVD2t3bO3gLbpq5cLkyqoPH5zmltfKNOAGlhbUdP370Avd0+js+6CZhw9YYIF1HLBsYbJ1Rqdlse2sKkDZnYr4nP179d5z5/3NWcdu1WEV3EB76pLb/q09yYXKTnMWC+PzDMBQ9+rFrHxDFeBggQXWycCS+YlfbiqiFS0eHhNWWMmxg6XWBe+0XSsHARZYYIEVdAPTS9uCL1vWJS+FpW1tH2vN7OyMYSFg8haWFgIGg/0RWGCBNcFYX90c7XnrE+oL5m7gGLCGoQNBpzlPUpb+QdDKVxdYYIEF1p5Y8RddZS4baFOQZ+XLHEKzJW6gPt1OCv+RRKL1M69Wxoq/Fmx/D59onXi9lStggQXW8cbyPzMUDl/9YpZdyWv8tip9ZiiNFV3iVwj2/bnqmklKsMACC6yaWMGxJSDf1p9EkrG29eqSncpLRGpgFSrAg8H+OB4+YIEF1uFhxcNX7eAV3rnSGf1/T3Mca61W+BoP9pP2W+5DHKs9phwEWGCBdaqx0pMrpb19pWcaS9c0N+CdHhArNEzLr6QECyywJgBrfx8dLyg0zDmdM2zgo+MIIYQQQgghhBBCCCGEEELoBOkvD09bSjXsVU8AAAAASUVORK5CYII=',
    cp_description: '[BU3-2] Scanning Point',
    cp_priority: 2,
    area_id: 3,
    created_at: '2026-01-01T00:00:00Z',
    created_by: ADMIN_UUID,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: ADMIN_UUID,
  },
  {
    cp_id: 9,
    cp_status: 1,
    cp_code: '09',
    cp_name: 'BU3-3',
    cp_qr:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsBAMAAACLU5NGAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADBQTFRFR3BMAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQFAwQF4c+wTgAAAA90Uk5TAL+AQJ+PYM9wIDDf768Qyd8uWQAABKhJREFUeNrtnV1u00AQx12iIsEDpBVQiQ8lUAQPCDUiSHw8EEEPULhB4QaoB+CBA1DBBUCcAC6AeoKKm6SlUiuBFHbLjhmvd7et7fQj/f1f1rHX61/8MJ6ZnbWzDCGEEEIIIYQQQgghhBBCCE2oHtxK6I7tYTd6pv1o2nnTnpOjy26Ilv1hN96kxpo/ENbCKKEN28NudE07MO2mpZCjbTfEGfvDbnRSY22CBRZYE4q12O/3P5h2y7SPDwtrGDpwUbCiF2z7p3RSY4EFFlhgNYw1PaP0UmPZHetiX8WpE6wpc/CyjxUcqxrWlH8fLmorXzLVpV4aKzgWWGCBdRqwLhhXsG9/rJh2cGywWnrHr5CVBwsssMA6eqxZ5/3dNH7dnN3xwvywFNshN/DQsLqud96rp/IEG2CBBdaEY6XD12U3i3HPXsjuSNqtBsPXdLCfudzpSPKRSSt/aDkIsMAC69Ri7X/OJ59ceW82lhzWMZqKkocPWGCBNclYr2cSuqzdwBKWPfWSjWkF61VqrCvZeFTCEvudm/4jEVhggXXqsEpWvut7p9rKj/xgf8e4gw/9UxsK9mtg5Q8fsMACawKxpKb5ngzzzblt1sG7L4m/nsOyxSy3k1hfzBk3dC3zTzfWfCWzOuXftfyCvZiVD2IN/Buz4KcEwAILrBOD9ck4TL0QVu5J2Qxb369pTmLZXk/rYe2dpAyG7j3VM2jlN+p7p2CBBRZYUawNl6w7r7N3l2RpWyFrKc7dWzfdm2PZnXLqDfEgZ1SvalF1vKgnWUmZhXKnm/oWtsECC6zJw9px3l8/WtNsL9gSZ9HufOd6belc3Iob5kk9K99RAXpw4qYVKhBqRaeLGlpxBxZYYIGVjKrFUObmdNFtPxrtV7tYMsTgwFhZLN+Z6edMN5apSGNpBxwssMA6mViFauV1037X0xAlLAlMf7ia5msFHLPjumDJEHcrFbMUihGD9TsFLD/9eEb3HOpgP1jYCBZYYIFVD2t3bO3gLbpq5cLkyqoPH5zmltfKNOAGlhbUdP370Avd0+js+6CZhw9YYIF1HLBsYbJ1Rqdlse2sKkDZnYr4nP179d5z5/3NWcdu1WEV3EB76pLb/q09yYXKTnMWC+PzDMBQ9+rFrHxDFeBggQXWycCS+YlfbiqiFS0eHhNWWMmxg6XWBe+0XSsHARZYYIEVdAPTS9uCL1vWJS+FpW1tH2vN7OyMYSFg8haWFgIGg/0RWGCBNcFYX90c7XnrE+oL5m7gGLCGoQNBpzlPUpb+QdDKVxdYYIEF1p5Y8RddZS4baFOQZ+XLHEKzJW6gPt1OCv+RRKL1M69Wxoq/Fmx/D59onXi9lStggQXW8cbyPzMUDl/9YpZdyWv8tip9ZiiNFV3iVwj2/bnqmklKsMACC6yaWMGxJSDf1p9EkrG29eqSncpLRGpgFSrAg8H+OB4+YIEF1uFhxcNX7eAV3rnSGf1/T3Mca61W+BoP9pP2W+5DHKs9phwEWGCBdaqx0pMrpb19pWcaS9c0N+CdHhArNEzLr6QECyywJgBrfx8dLyg0zDmdM2zgo+MIIYQQQgghhBBCCCGEEELoBOkvD09bSjXsVU8AAAAASUVORK5CYII=',
    cp_description: '[BU3-3] Scanning Point',
    cp_priority: 3,
    area_id: 3,
    created_at: '2026-01-01T00:00:00Z',
    created_by: ADMIN_UUID,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: ADMIN_UUID,
  },
]

export const pointReports: PointReport[] = [
  // Day 1: 01-02-2026
  {
    pr_id: 1,
    pr_check: false,
    pr_note: 'Need to be checked',
    cp_id: 1,
    created_at: '2026-02-01T08:00:00Z',
    created_by: EXPAT1_UUID,
  },
  {
    pr_id: 2,
    pr_check: true,
    pr_note: '',
    cp_id: 2,
    created_at: '2026-02-01T08:05:00Z',
    created_by: EXPAT1_UUID,
  },
  {
    pr_id: 3,
    pr_check: false,
    pr_note: 'Need to be checked',
    cp_id: 3,
    created_at: '2026-02-01T08:10:00Z',
    created_by: EXPAT1_UUID,
  },
  {
    pr_id: 4,
    pr_check: true,
    pr_note: '',
    cp_id: 4,
    created_at: '2026-02-01T09:00:00Z',
    created_by: EXPAT2_UUID,
  },
  {
    pr_id: 5,
    pr_check: true,
    pr_note: '',
    cp_id: 5,
    created_at: '2026-02-01T09:05:00Z',
    created_by: EXPAT2_UUID,
  },
  {
    pr_id: 6,
    pr_check: false,
    pr_note: 'Need to be checked',
    cp_id: 6,
    created_at: '2026-02-01T09:10:00Z',
    created_by: EXPAT2_UUID,
  },
  {
    pr_id: 7,
    pr_check: false,
    pr_note: 'Need to be checked',
    cp_id: 7,
    created_at: '2026-02-01T10:00:00Z',
    created_by: SEC_UUID,
  },
  {
    pr_id: 8,
    pr_check: true,
    pr_note: '',
    cp_id: 8,
    created_at: '2026-02-01T10:05:00Z',
    created_by: SEC_UUID,
  },
  {
    pr_id: 9,
    pr_check: true,
    pr_note: '',
    cp_id: 9,
    created_at: '2026-02-01T10:10:00Z',
    created_by: SEC_UUID,
  },

  // Day 2: 04-02-2026
  {
    pr_id: 10,
    pr_check: true,
    pr_note: '',
    cp_id: 1,
    created_at: '2026-02-04T08:00:00Z',
    created_by: EXPAT1_UUID,
  },
  {
    pr_id: 11,
    pr_check: true,
    pr_note: '',
    cp_id: 2,
    created_at: '2026-02-04T08:05:00Z',
    created_by: EXPAT1_UUID,
  },
  {
    pr_id: 12,
    pr_check: true,
    pr_note: '',
    cp_id: 3,
    created_at: '2026-02-04T08:10:00Z',
    created_by: EXPAT1_UUID,
  },
  {
    pr_id: 13,
    pr_check: true,
    pr_note: '',
    cp_id: 4,
    created_at: '2026-02-04T09:00:00Z',
    created_by: EXPAT1_UUID,
  },
  {
    pr_id: 14,
    pr_check: true,
    pr_note: '',
    cp_id: 5,
    created_at: '2026-02-04T09:05:00Z',
    created_by: EXPAT1_UUID,
  },
  {
    pr_id: 15,
    pr_check: true,
    pr_note: '',
    cp_id: 6,
    created_at: '2026-02-04T09:10:00Z',
    created_by: EXPAT1_UUID,
  },
  {
    pr_id: 16,
    pr_check: false,
    pr_note: 'Need to be checked',
    cp_id: 7,
    created_at: '2026-02-04T10:00:00Z',
    created_by: SEC_UUID,
  },
  {
    pr_id: 17,
    pr_check: true,
    pr_note: '',
    cp_id: 8,
    created_at: '2026-02-04T10:05:00Z',
    created_by: SEC_UUID,
  },
  {
    pr_id: 18,
    pr_check: true,
    pr_note: '',
    cp_id: 9,
    created_at: '2026-02-04T10:10:00Z',
    created_by: SEC_UUID,
  },

  // Day 3: 06-02-2026
  {
    pr_id: 19,
    pr_check: false,
    pr_note: 'Need to be checked',
    cp_id: 1,
    created_at: '2026-02-06T08:00:00Z',
    created_by: SEC_UUID,
  },
  {
    pr_id: 20,
    pr_check: true,
    pr_note: '',
    cp_id: 2,
    created_at: '2026-02-06T08:05:00Z',
    created_by: SEC_UUID,
  },
  {
    pr_id: 21,
    pr_check: true,
    pr_note: '',
    cp_id: 3,
    created_at: '2026-02-06T08:10:00Z',
    created_by: SEC_UUID,
  },
  {
    pr_id: 22,
    pr_check: true,
    pr_note: '',
    cp_id: 4,
    created_at: '2026-02-06T09:00:00Z',
    created_by: SEC_UUID,
  },
  {
    pr_id: 23,
    pr_check: true,
    pr_note: '',
    cp_id: 5,
    created_at: '2026-02-06T09:05:00Z',
    created_by: SEC_UUID,
  },
  {
    pr_id: 24,
    pr_check: true,
    pr_note: '',
    cp_id: 6,
    created_at: '2026-02-06T09:10:00Z',
    created_by: SEC_UUID,
  },
  {
    pr_id: 25,
    pr_check: false,
    pr_note: 'Need to be checked',
    cp_id: 7,
    created_at: '2026-02-06T10:00:00Z',
    created_by: EXPAT1_UUID,
  },
  {
    pr_id: 26,
    pr_check: true,
    pr_note: '',
    cp_id: 8,
    created_at: '2026-02-06T10:05:00Z',
    created_by: EXPAT1_UUID,
  },
  {
    pr_id: 27,
    pr_check: true,
    pr_note: '',
    cp_id: 9,
    created_at: '2026-02-06T10:10:00Z',
    created_by: EXPAT1_UUID,
  },
]

export const pointReportImages: PointReportImage[] = [
  // Linked to failed report pr_id: 1
  {
    pri_id: 1,
    pr_id: 1,
    pri_image:
      'data:image/webp;base64,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',
    created_at: '2026-02-01T08:00:00Z',
    created_by: EXPAT1_UUID,
  },
  // Linked to failed report pr_id: 3
  {
    pri_id: 2,
    pr_id: 3,
    pri_image:
      'data:image/webp;base64,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',
    created_at: '2026-02-01T08:10:00Z',
    created_by: EXPAT1_UUID,
  },
  // Linked to failed report pr_id: 6
  {
    pri_id: 3,
    pr_id: 6,
    pri_image:
      'data:image/webp;base64,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',
    created_at: '2026-02-01T09:10:00Z',
    created_by: EXPAT2_UUID,
  },
  {
    pri_id: 4,
    pr_id: 6,
    pri_image:
      'data:image/webp;base64,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',
    created_at: '2026-02-01T09:11:00Z',
    created_by: EXPAT2_UUID,
  },
  // Linked to failed report pr_id: 7
  {
    pri_id: 5,
    pr_id: 7,
    pri_image:
      'data:image/webp;base64,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',
    created_at: '2026-02-01T10:00:00Z',
    created_by: SEC_UUID,
  },
  // Linked to failed report pr_id: 16
  {
    pri_id: 6,
    pr_id: 16,
    pri_image:
      'data:image/webp;base64,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',
    created_at: '2026-02-04T10:00:00Z',
    created_by: SEC_UUID,
  },
  {
    pri_id: 7,
    pr_id: 16,
    pri_image:
      'data:image/webp;base64,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',
    created_at: '2026-02-04T10:01:00Z',
    created_by: SEC_UUID,
  },
  {
    pri_id: 8,
    pr_id: 16,
    pri_image:
      'data:image/webp;base64,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',
    created_at: '2026-02-04T10:02:00Z',
    created_by: SEC_UUID,
  },
  // Linked to failed report pr_id: 19
  {
    pri_id: 9,
    pr_id: 19,
    pri_image:
      'data:image/webp;base64,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',
    created_at: '2026-02-06T08:00:00Z',
    created_by: SEC_UUID,
  },
  // Linked to failed report pr_id: 25
  {
    pri_id: 10,
    pr_id: 25,
    pri_image:
      'data:image/webp;base64,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',
    created_at: '2026-02-06T10:00:00Z',
    created_by: EXPAT1_UUID,
  },
  {
    pri_id: 11,
    pr_id: 25,
    pri_image:
      'data:image/webp;base64,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',
    created_at: '2026-02-06T10:01:00Z',
    created_by: EXPAT1_UUID,
  },
]

export type UserView = User & {
  role_code: string
  role_name: string
  role_allow_view: string
  created_name: string
  updated_name: string
}
export type CheckPointView = CheckPoint & { area_code: string; area_name: string }
export type PointReportView = PointReport & {
  cp_code: string
  cp_name: string
  cp_description: string
  area_id: number
  area_code: string
  area_name: string
  created_name: string
}
