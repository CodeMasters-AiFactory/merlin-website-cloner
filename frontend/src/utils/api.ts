import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

export async function cloneWebsite(url: string, options: any = {}) {
  const response = await api.post('/clone', {
    url,
    options: {
      maxPages: 100,
      maxDepth: 5,
      verifyAfterClone: true,
      exportFormat: 'zip',
      ...options,
    },
  });
  return response.data;
}

