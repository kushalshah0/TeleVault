/**
 * API client utilities
 */

const API_BASE = ''

interface RequestOptions extends RequestInit {
  token?: string
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, headers, ...restOptions } = options

  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null)

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
      ...headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

/**
 * GET request
 */
export function apiGet<T = any>(endpoint: string, token?: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET', token })
}

/**
 * POST request
 */
export function apiPost<T = any>(endpoint: string, data?: any, token?: string): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  })
}

/**
 * DELETE request
 */
export function apiDelete<T = any>(endpoint: string, token?: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'DELETE', token })
}

/**
 * Download file
 */
export async function downloadFile(fileId: number, fileName: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  
  const response = await fetch(`${API_BASE}/api/files/${fileId}/download`, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  })

  if (!response.ok) {
    throw new Error('Download failed')
  }

  // Create blob and download
  const blob = await response.blob()
  
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  
  // Delay cleanup to ensure download starts
  setTimeout(() => {
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }, 100)
}
