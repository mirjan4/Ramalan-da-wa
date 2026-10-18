import axios from 'axios';

const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const rawBaseURL = import.meta.env.VITE_API_URL || `http://${hostname}:5000/api`;
const baseURL = rawBaseURL.endsWith('/api') ? rawBaseURL : `${rawBaseURL}/api`;

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isAuthError = error.response && (
            error.response.status === 401 ||
            (error.response.status === 403 && (
                error.response.data?.message?.toLowerCase().includes('token') ||
                error.response.data?.message?.toLowerCase().includes('jwt') ||
                error.response.data?.message?.toLowerCase().includes('expired')
            ))
        );
        if (isAuthError) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const authService = {
    login: (credentials) => api.post('/auth/login', credentials),
};

export const seasonService = {
    getAll: () => api.get('/seasons'),
    create: (data) => api.post('/seasons', data),
    update: (id, data) => api.put(`/seasons/${id}`, data),
    activate: (id) => api.put(`/seasons/${id}/activate`),
    delete: (id) => api.delete(`/seasons/${id}`),
    getActive: () => api.get('/seasons/active'),
};

export const teamService = {
    getAll: (seasonId) => api.get('/teams', { params: { seasonId } }),
    getById: (id) => api.get(`/teams/${id}`),
    create: (data) => api.post('/teams', data),
    update: (id, data) => api.put(`/teams/${id}`, data),
    assignBooks: (id, receiptBooks) => api.put(`/teams/${id}/assign-books`, { receiptBooks }),
    delete: (id) => api.delete(`/teams/${id}`),
    copyFromSeason: (data) => api.post('/teams/copy-from-season', data),
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

export const depositService = {
    getAll: (seasonId) => api.get('/deposits', { params: { seasonId } }),
    create: (data) => api.post('/deposits', data),
    delete: (id) => api.delete(`/deposits/${id}`),
};

export const teamCollectionService = {
    getMyTeam: (teamId) => api.get('/team-collections/my-team', { params: { teamId } }),
    getTeamBooks: (teamId) => api.get(`/team-collections/team/${teamId}/books`),
    getBookReceipts: (teamId, bookNumber) => api.get(`/team-collections/team/${teamId}/book/${bookNumber}`),
    saveBookReceipts: (teamId, bookNumber, data) => api.put(`/team-collections/team/${teamId}/book/${bookNumber}`, data),
    submitBookCollection: (teamId, bookNumber) => api.post(`/team-collections/team/${teamId}/book/${bookNumber}/submit`),
    getAdminSubmissions: (params) => api.get('/team-collections/admin/submissions', { params }),
    approveSubmission: (id, data) => api.post(`/team-collections/admin/submissions/${id}/approve`, data),
    reopenSubmission: (id, data) => api.post(`/team-collections/admin/submissions/${id}/reopen`, data),
};

export const bankAccountService = {
    getAll: () => api.get('/bank-accounts'),
    create: (data) => api.post('/bank-accounts', data),
    update: (id, data) => api.put(`/bank-accounts/${id}`, data),
    delete: (id) => api.delete(`/bank-accounts/${id}`),
};

export const seasonBankService = {
    getBySeason: (seasonId) => api.get(`/seasons/${seasonId}/bank-amounts`),
    add: (seasonId, data) => api.post(`/seasons/${seasonId}/bank-amounts`, data),
    update: (seasonId, id, data) => api.put(`/seasons/${seasonId}/bank-amounts/${id}`, data),
    delete: (seasonId, id) => api.delete(`/seasons/${seasonId}/bank-amounts/${id}`),
};

export default api;
