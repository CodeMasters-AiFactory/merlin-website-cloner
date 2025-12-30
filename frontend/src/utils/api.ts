import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Dev auto-login credentials (same as App.tsx)
const DEV_USER = '777'

// Track if we're already refreshing to prevent loops
let isRefreshing = false

// Auto-login function - gets fresh token
async function autoLogin(): Promise<string | null> {
  try {
    const response = await axios.post('/api/auth/login', { email: DEV_USER })
    const token = response.data.token
    localStorage.setItem('token', token)
    console.log('[API] Auto-refreshed token for user', DEV_USER)
    return token
  } catch {
    console.error('[API] Auto-login failed')
    return null
  }
}

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors - AUTO REFRESH instead of redirect
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If 401/403 and we haven't tried refreshing yet
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry && !isRefreshing) {
      originalRequest._retry = true
      isRefreshing = true

      const newToken = await autoLogin()
      isRefreshing = false

      if (newToken) {
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      }

      // Auto-login failed, redirect to login
      localStorage.removeItem('token')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default api

/**
 * Standard clone (backward compatible)
 */
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

/**
 * Enhanced clone with visual verification and DR testing
 */
export async function enhancedCloneWebsite(url: string, options: any = {}) {
  const response = await api.post('/enhanced/clone', {
    url,
    options: {
      maxPages: 100,
      maxDepth: 5,
      verifyAfterClone: true,
      exportFormat: 'zip',
      // Enhanced features (on by default)
      enableVisualVerification: true,
      enableDisasterRecoveryTest: true,
      enableCDNCache: true,
      generateCertificate: true,
      ...options,
    },
  });
  return response.data;
}

/**
 * Check if enhanced features are available
 */
export async function getEnhancedStatus() {
  const response = await api.get('/enhanced/status');
  return response.data;
}

/**
 * Get visual verification report
 */
export async function getVisualReport(jobId: string) {
  const response = await api.get(`/enhanced/jobs/${jobId}/visual-report`);
  return response.data;
}

/**
 * Get disaster recovery test report
 */
export async function getDRReport(jobId: string) {
  const response = await api.get(`/enhanced/jobs/${jobId}/dr-report`);
  return response.data;
}

/**
 * Download certificate
 */
export async function downloadCertificate(jobId: string) {
  const response = await api.get(`/enhanced/jobs/${jobId}/certificate`, {
    responseType: 'blob',
  });
  
  // Create download link
  const blob = new Blob([response.data], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `certificate-${jobId}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
