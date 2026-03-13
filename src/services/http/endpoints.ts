export const endpoints = {
  user: {
    getList: '/user/getlist',
    getOne: (userId: string) => `/user/getone/${userId}`,
    validate: '/user/validate',
    create: '/user/create',
    update: (userId: string) => `/user/update/${userId}`,
    delete: (userId: string) => `/user/delete/${userId}`,
  },
  userBaseView: {
    getList: '/userbaseview/getlist',
    getOne: (userId: string) => `/userbaseview/getone/${userId}`,
  },
  userView: {
    getList: '/userview/getlist',
    getOne: (userId: string) => `/userview/getone/${userId}`,
  },
  role: {
    getBaseList: '/role/getbaselist',
    create: '/role/create',
    update: (roleId: number | string) => `/role/update/${roleId}`,
    delete: (roleId: number | string) => `/role/delete/${roleId}`,
  },
  roleView: {
    getList: '/roleview/getlist',
    getOne: (roleId: number | string) => `/roleview/getone/${roleId}`,
  },
  roleMenuCategoryView: {
    getList: '/rolemenucategoryview/getlist',
  },
  area: {
    create: '/area/create',
    update: (areaId: number | string) => `/area/update/${areaId}`,
    delete: (areaId: number | string) => `/area/delete/${areaId}`,
    getBaseList: '/area/getbaselist',
  },
  areaView: {
    getList: '/areaview/getlist',
    getOne: (areaId: number | string) => `/areaview/getone/${areaId}`,
  },
  checkPoint: {
    getList: '/checkpoint/getlist',
    getOne: (cpId: number | string) => `/checkpoint/getone/${cpId}`,
    create: '/checkpoint/create',
    update: (cpId: number | string) => `/checkpoint/update/${cpId}`,
    delete: (cpId: number | string) => `/checkpoint/delete/${cpId}`,
    getBaseList: '/checkpoint/getbaselist',
  },
  checkPointView: {
    getList: '/checkpointview/getlist',
    getOne: (cpwId: number | string) => `/checkpointview/getone/${cpwId}`,
  },
  route: {
    create: '/route/create',
    update: (routeId: number | string) => `/route/update/${routeId}`,
    delete: (routeId: number | string) => `/route/delete/${routeId}`,
  },

  routeView: {
    getList: '/routeview/getlist',
    getOne: (routeId: number | string) => `/routeview/getone/${routeId}`,
  },
  pointReportView: {
    getList: '/pointreportview/getlist',
    getOne: (prId: number | string) => `/pointreportview/getone/${prId}`,
  },
  patrolShiftView: {
    getList: '/patrolshiftview/getlist',
  },
  report: {
    totalAppData: '/report/totalappdata',
    totalUserByRole: '/report/totaluserbyrole',
    totalUserByArea: '/report/totaluserbyarea',
    totalCheckpointByArea: '/report/totalcheckpointbyarea',
    totalPointReportByStatus: '/report/totalpointreportbystatus',
    ctpatReport: '/report/reportctpat',
    patrolDetailReport: '/report/reportpatrolshift',
    totalPatrolShift: '/report/totalpatrolshift',
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
