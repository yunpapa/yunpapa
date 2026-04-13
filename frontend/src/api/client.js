import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
})

export const receiptApi = {
  upload: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/api/receipts/upload', form)
  },
  list: (params) => api.get('/api/receipts', { params }),
  get: (id) => api.get(`/api/receipts/${id}`),
  update: (id, data) => api.put(`/api/receipts/${id}`, data),
  delete: (id) => api.delete(`/api/receipts/${id}`),
}

export const statsApi = {
  summary: (params) => api.get('/api/stats/summary', { params }),
}

export const categoryApi = {
  list: () => api.get('/api/categories'),
}

export default api
