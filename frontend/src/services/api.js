import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  getProfile: () => api.get('/api/auth/profile'),
};

// ─── Workflows ───────────────────────────────────
export const workflowAPI = {
  getAll: () => api.get('/api/workflows'),
  getById: (id) => api.get(`/api/workflows/${id}`),
  create: (data) => api.post('/api/workflows', data),
  update: (id, data) => api.put(`/api/workflows/${id}`, data),
  delete: (id) => api.delete(`/api/workflows/${id}`),
  getWebhookUrl: (id) => api.get(`/api/workflows/${id}/webhook-url`),
  schedulePost: (id) => api.post(`/api/workflows/${id}/schedule`),
};

// ─── Execution Logs ──────────────────────────────
export const logsAPI = {
  getByWorkflow: (workflowId) => api.get(`/api/webhook/${workflowId}/logs`),
  getById: (logId) => api.get(`/api/webhook/logs/${logId}`),
};

// ─── Zoom Meetings ───────────────────────────────
export const zoomAPI = {
  getMeetings: (workflowId) => api.get(`/api/zoom/meetings/${workflowId}`),
  getMeeting: (meetingDbId) => api.get(`/api/zoom/meeting/${meetingDbId}`),
};

// ─── Health ──────────────────────────────────────
export const healthAPI = {
  check: () => api.get('/api/health'),
};

// ─── LinkedIn ────────────────────────────────────
export const linkedinAPI = {
  getStatus: () => api.get('/api/linkedin/status'),
  disconnect: () => api.delete('/api/linkedin/disconnect'),
  testPost: (text) => api.post('/api/linkedin/test-post', { text }),
};

export default api;
