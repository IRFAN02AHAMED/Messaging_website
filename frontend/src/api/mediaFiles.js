import axiosClient from './axiosClient';

export const getMediaFiles = (skip = 0, limit = 100) =>
  axiosClient.get('/media-files', { params: { skip, limit } });

export const getMediaFileById = (id) =>
  axiosClient.get(`/media-files/${id}`);

export const createMediaFile = (data) =>
  axiosClient.post('/media-files', data);

export const updateMediaFile = (id, data) =>
  axiosClient.put(`/media-files/${id}`, data);

export const deleteMediaFile = (id) =>
  axiosClient.delete(`/media-files/${id}`);
