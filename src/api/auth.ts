import client from './client';
import type { ApiResponse, User } from '../types';

interface LoginResponse {
  token: string;
  user: User;
}

export const login = (userId: string, password: string) =>
  client.post<ApiResponse<LoginResponse>>('/auth/login', { userId, password });
