export type OrganizationMember = {
  id: string
  userCode: string
  userName: string
  roleName: string
  areaName: string
  parentId: string | null
  email: string
  phone: string
  active: boolean
  order: number
}

export type OrganizationTreeNode = {
  key: string
  type?: string
  label?: string
  expanded?: boolean
  selectable?: boolean
  data: OrganizationMember & {
    childrenCount?: number
    level?: number
  }
  children?: OrganizationTreeNode[]
  styleClass?: string
}
