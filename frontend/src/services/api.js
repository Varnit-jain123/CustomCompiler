import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 120000 // 2 minutes
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiService = {
  // Boards
  getBoards: () => api.get('/embedded/boards'),
  getBoardDetails: (boardId) => api.get(`/embedded/boards/${boardId}`),
  getBoardLibraries: (boardId) => api.get(`/embedded/boards/${boardId}/libraries`),

  // Templates
  getTemplates: (boardId) => api.get('/embedded/templates', { params: { boardId } }),
  getTemplate: (templateId, boardId) => api.get(`/embedded/templates/${templateId}`, { params: { boardId } }),

  // Compilation
  compile: (data) => api.post('/embedded/compile', data),
  upload: (data) => api.post('/embedded/upload', data),

  // Devices
  listDevices: () => api.get('/devices'),
  getDeviceInfo: (port) => api.get(`/devices/${encodeURIComponent(port)}/info`),
  refreshDevices: () => api.post('/devices/refresh'),

  // Serial
  connectSerial: (data) => api.post('/serial/connect', data),
  disconnectSerial: (data) => api.post('/serial/disconnect', data),
  sendSerialData: (data) => api.post('/serial/send', data),
  getSerialStatus: (port) => api.get(`/serial/status/${encodeURIComponent(port)}`)
};

export default api;