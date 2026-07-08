import axiosClient from './axiosClient';

export const getUsers = (skip = 0, limit = 100) =>
  axiosClient.get('/users', { params: { skip, limit } });

export const getUserById = (id) =>
  axiosClient.get(`/users/${id}`);

export const createUser = (data) =>
  axiosClient.post('/users', data);

export const updateUser = (id, data) =>
  axiosClient.put(`/users/${id}`, data);

export const deleteUser = (id) =>
  axiosClient.delete(`/users/${id}`);
