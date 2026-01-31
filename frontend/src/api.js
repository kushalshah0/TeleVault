import axios from 'axios';

// Use environment variable in production, fallback to proxy in development
const API_BASE_URL = import.meta.env.PROD 
  ? import.meta.env.VITE_BACKEND_URL || 'https://your-render-url.onrender.com'
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes timeout for large file uploads
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          
          const { access_token, refresh_token: newRefreshToken } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', newRefreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/';
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
  register: (username, email, password) =>
    api.post('/auth/register', { username, email, password }),
  getMe: () => api.get('/auth/me'),
  getUsage: () => api.get('/auth/me/usage'),
};

export const storageAPI = {
  list: () => api.get('/storages'),
  get: (id) => api.get(`/storages/${id}`),
  create: (name, telegram_channel_id) =>
    api.post('/storages', { name, telegram_channel_id }),
  delete: (id) => api.delete(`/storages/${id}`),
  search: (storageId, query, folderId = null) => 
    api.get(`/storages/${storageId}/search`, { 
      params: { q: query, folder_id: folderId } 
    }),
  getActivities: (limit = 50, offset = 0) =>
    api.get('/storages/activities', { params: { limit, offset } }),
};

export const folderAPI = {
  list: (storageId, parentId = null) =>
    api.get(`/storages/${storageId}/folders`, { params: { parent_id: parentId } }),
  create: (storageId, name, parentId = null) =>
    api.post(`/storages/${storageId}/folders`, { name, parent_id: parentId }),
  rename: (storageId, folderId, newName) =>
    api.patch(`/storages/${storageId}/folders/${folderId}`, null, { params: { new_name: newName } }),
  delete: (storageId, folderId) =>
    api.delete(`/storages/${storageId}/folders/${folderId}`),
};

export const fileAPI = {
  list: (storageId, folderId = null) =>
    api.get(`/storages/${storageId}/files`, { params: { folder_id: folderId } }),
  upload: (storageId, file, folderId = null, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folder_id', folderId);
    }
    
    return api.post(`/storages/${storageId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 0, // No timeout for file uploads (or set to very large value)
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
  },
  download: (storageId, fileId) =>
    api.get(`/storages/${storageId}/files/${fileId}/download`, {
      responseType: 'blob',
      timeout: 0, // No timeout for file downloads
    }),
  rename: (storageId, fileId, newName) =>
    api.patch(`/storages/${storageId}/files/${fileId}`, null, { params: { new_name: newName } }),
  delete: (storageId, fileId) =>
    api.delete(`/storages/${storageId}/files/${fileId}`),
};

export default api;
