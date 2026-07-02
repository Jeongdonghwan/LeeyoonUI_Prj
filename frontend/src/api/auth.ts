import api from './axios';
import type { LoginResponse } from '../types';

export const login = (username: string, password: string) =>
  api.post<LoginResponse>('/auth/login', { username, password });

export const refresh = () =>
  api.post('/auth/refresh');

export const logout = () =>
  api.post('/auth/logout');
