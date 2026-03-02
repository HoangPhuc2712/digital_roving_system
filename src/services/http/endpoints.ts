export const endpoints = {
  user: {
    getList: '/User/getlist',
    getOne: (userId: string) => `/User/getone/${userId}`,
    validate: '/User/validate',
    create: '/User/create',
    update: (userId: string) => `/User/update/${userId}`,
    delete: (userId: string) => `/User/delete/${userId}`,
  },
  userBaseView: {
    getList: '/UserBaseView/getlist',
    getOne: (userId: string) => `/UserBaseView/getone/${userId}`,
  },
  userView: {
    getList: '/UserView/getlist',
    getOne: (userId: string) => `/UserView/getone/${userId}`,
  },
  role: {
    getBaseList: '/Role/getbaselist',
    create: '/Role/create',
    update: (roleId: number | string) => `/Role/update/${roleId}`,
    delete: (roleId: number | string) => `/Role/delete/${roleId}`,
  },
  roleView: {
    getList: '/RoleView/getlist',
    getOne: (roleId: number | string) => `/RoleView/getone/${roleId}`,
  },
  roleMenuCategoryView: {
    getList: '/RoleMenuCategoryView/getlist',
  },
}
