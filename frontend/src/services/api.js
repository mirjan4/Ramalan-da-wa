import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const baseURL = rawBaseURL.endsWith('/api') ? rawBaseURL : `${rawBaseURL}/api`;

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authService = {
    login: (credentials) => api.post('/auth/login', credentials),
};

export const seasonService = {
    getAll: () => api.get('/seasons'),
    create: (data) => api.post('/seasons', data),
    activate: (id) => api.put(`/seasons/${id}/activate`),
    getActive: () => api.get('/seasons/active'),
};

export const teamService = {
    getAll: (seasonId) => api.get('/teams', { params: { seasonId } }),
    getById: (id) => api.get(`/teams/${id}`),
    create: (data) => api.post('/teams', data),
    update: (id, data) => api.put(`/teams/${id}`, data),
    assignBooks: (id, receiptBooks) => api.put(`/teams/${id}/assign-books`, { receiptBooks }),
    delete: (id) => api.delete(`/teams/${id}`),
};

export const settlementService = {
    submitCollection: (id, data) => api.put(`/settlements/${id}/collection`, data),
    finalize: (id, data) => api.put(`/settlements/${id}/finalize`, data),
    finalizeComplete: (id, data) => api.put(`/settlements/${id}/finalize-complete`, data),
};

export const dashboardService = {
    getStats: (seasonId) => api.get('/dashboard/stats', { params: { seasonId } }),
};

export const userService = {
    getAll: () => api.get('/auth/users'),
    create: (data) => api.post('/auth/users', data),
    delete: (id) => api.delete(`/auth/users/${id}`),
    update: (id, userData) => api.put(`/auth/users/${id}`, userData),
};

export const fieldDataService = {
    getAll: (seasonId) => api.get('/field-data', { params: { seasonId } }),
    getById: (id) => api.get(`/field-data/${id}`),
    create: (data) => api.post('/field-data', data),
    update: (id, data) => api.put(`/field-data/${id}`, data),
    delete: (id) => api.delete(`/field-data/${id}`),
    lockBySeason: (seasonId, isLocked) => api.put(`/field-data/season/${seasonId}/lock`, { isLocked }),
};

export default api;
