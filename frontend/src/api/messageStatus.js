import axiosClient from './axiosClient';

export const getMessageStatuses = (skip = 0, limit = 1000, userId = null, messageId = null) =>
  axiosClient.get('/message-status', { params: { skip, limit, user_id: userId, message_id: messageId } });

export const getMessageStatusById = (id) =>
  axiosClient.get(`/message-status/${id}`);

export const createMessageStatus = (data) =>
  axiosClient.post('/message-status', data);

export const updateMessageStatus = (id, data) =>
  axiosClient.put(`/message-status/${id}`, data);

export const deleteMessageStatus = (id) =>
  axiosClient.delete(`/message-status/${id}`);
