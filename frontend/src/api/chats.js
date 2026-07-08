import axiosClient from './axiosClient';

export const getChats = (skip = 0, limit = 100) =>
  axiosClient.get('/chats', { params: { skip, limit } });

export const getChatById = (id) =>
  axiosClient.get(`/chats/${id}`);

export const createChat = (data) =>
  axiosClient.post('/chats', data);

export const updateChat = (id, data) =>
  axiosClient.put(`/chats/${id}`, data);

export const deleteChat = (id) =>
  axiosClient.delete(`/chats/${id}`);

export const muteChat = (id, data) =>
  axiosClient.post(`/chats/${id}/mute`, data);

export const clearChat = (id, data) =>
  axiosClient.post(`/chats/${id}/clear`, data);
