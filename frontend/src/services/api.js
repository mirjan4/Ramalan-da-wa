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
};

export const settlementService = {
    submitCollection: (id, data) => api.put(`/settlements/${id}/collection`, data),
    finalize: (id, data) => api.put(`/settlements/${id}/finalize`, data),
    finalizeComplete: (id, data) => api.put(`/settlements/${id}/finalize-complete`, data),
};

export const dashboardService = {
    getStats: (seasonId) => api.get('/dashboard/stats', { params: { seasonId } }),
};

export default api;
