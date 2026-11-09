import api from '@/shared/api/axios';

// Functions are module-level so they are stable references for hooks.

// params: { cursor, limit, unreadOnly }
export const getNotificationsApi = (params) => api.get('/notifications', { params });
export const getUnreadCountApi = () => api.get('/notifications/unread-count');
export const markReadApi = (id) => api.patch(`/notifications/${id}/read`);
export const markAllReadApi = () => api.patch('/notifications/read-all');
