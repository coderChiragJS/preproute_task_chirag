import client from './client';
import type { ApiResponse, Test, CreateTestPayload } from '../types';

export const getAllTests = () =>
  client.get<ApiResponse<Test[]>>('/tests');

export const getTestById = (id: string) =>
  client.get<ApiResponse<Test>>(`/tests/${id}`);

export const createTest = (payload: CreateTestPayload) =>
  client.post<ApiResponse<Test>>('/tests', payload);

export const updateTest = (id: string, payload: Partial<Test> & { status?: string | null }) =>
  client.put<ApiResponse<Test>>(`/tests/${id}`, payload);

export const deleteTest = (id: string) =>
  client.delete<ApiResponse<null>>(`/tests/${id}`);
