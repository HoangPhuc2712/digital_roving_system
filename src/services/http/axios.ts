import Axios from 'axios'
import { appConfig } from '@/config/app'

const baseURL = appConfig.apiBaseUrl || ''

export const http = Axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    return Promise.reject(err)
  },
)
