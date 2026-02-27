import Axios from 'axios'

const baseURL = (import.meta.env.VITE_API_BASE_URL as string) || ''

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
    // Giữ đơn giản, các module sẽ tự bắt lỗi theo message/code
    return Promise.reject(err)
  },
)
