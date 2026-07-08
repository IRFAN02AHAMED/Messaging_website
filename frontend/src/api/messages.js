import axiosClient from './axiosClient';

export const getMessages = (skip = 0, limit = 1000) =>
  axiosClient.get('/messages', { params: { skip, limit } });

export const getMessageById = (id) =>
  axiosClient.get(`/messages/${id}`);

export const sendMessage = (data) =>
  axiosClient.post('/messages', data);

export const updateMessage = (id, data) =>
  axiosClient.put(`/messages/${id}`, data);

export const deleteMessage = (id) =>
  axiosClient.delete(`/messages/${id}`);
