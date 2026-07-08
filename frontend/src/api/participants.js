import axiosClient from './axiosClient';

export const getParticipants = (skip = 0, limit = 100) =>
  axiosClient.get('/chats/participants', { params: { skip, limit } });

export const getParticipantById = (id) =>
  axiosClient.get(`/chats/participants/${id}`);

export const addParticipant = (data) =>
  axiosClient.post('/chats/participants', data);

export const updateParticipant = (id, data) =>
  axiosClient.put(`/chats/participants/${id}`, data);

export const removeParticipant = (id) =>
  axiosClient.delete(`/chats/participants/${id}`);
