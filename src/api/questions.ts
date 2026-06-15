import client from './client';
import type { ApiResponse, Question } from '../types';

interface BulkCreatePayload {
  questions: Omit<Question, 'id'>[];
}

export const bulkCreateQuestions = (payload: BulkCreatePayload) =>
  client.post<ApiResponse<Question[]>>('/questions/bulk', payload);

export const fetchBulkQuestions = (question_ids: string[]) =>
  client.post<ApiResponse<Question[]>>('/questions/fetchBulk', { question_ids });
