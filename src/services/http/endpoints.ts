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
  area: {
    create: '/Area/create',
    update: (areaId: number | string) => `/Area/update/${areaId}`,
    delete: (areaId: number | string) => `/Area/delete/${areaId}`,
    getBaseList: '/Area/getbaselist',
  },
  areaView: {
    getList: '/AreaView/getlist',
    getOne: (areaId: number | string) => `/AreaView/getone/${areaId}`,
  },
  checkPoint: {
    getList: '/CheckPoint/getlist',
    getOne: (cpId: number | string) => `/CheckPoint/getone/${cpId}`,
    create: '/CheckPoint/create',
    update: (cpId: number | string) => `/CheckPoint/update/${cpId}`,
    delete: (cpId: number | string) => `/CheckPoint/delete/${cpId}`,
    getBaseList: '/CheckPoint/getbaselist',
  },
  checkPointView: {
    getList: '/CheckPointView/getlist',
    getOne: (cpwId: number | string) => `/CheckPointView/getone/${cpwId}`,
  },
  route: {
    create: '/Route/create',
    update: (routeId: number | string) => `/Route/update/${routeId}`,
    delete: (routeId: number | string) => `/Route/delete/${routeId}`,
  },

  routeView: {
    getList: '/RouteView/getlist',
    getOne: (routeId: number | string) => `/RouteView/getone/${routeId}`,
  },
  pointReportView: {
    getList: '/pointreportview/getlist',
    getOne: (prId: number | string) => `/pointreportview/getone/${prId}`,
  },

  report: {
    totalAppData: '/report/totalappdata',
  },
  pointReport: {
    changeStatus: (prId: number | string) => `/pointreport/changestatus/${prId}`,
  },
  pointReportImage: {
    getListByReportId: (prId: number | string) => `/pointreportimage/getlistbyreportid/${prId}`,
  },
  reportNoteCategory: {
    getList: '/reportnotecategory/getlist',
    getTreeData: '/reportnotecategory/gettreedata',
    getOne: (rncId: number | string) => `/reportnotecategory/getone/${rncId}`,
    create: '/reportnotecategory/create',
    update: (rncId: number | string) => `/reportnotecategory/update/${rncId}`,
    delete: (rncId: number | string) => `/reportnotecategory/delete/${rncId}`,
  },
  menuCategoryView: {
    getList: '/menucategoryview/getlist',
    getOne: (mcId: number | string) => `/menucategoryview/getone/${mcId}`,
  },
}
