import client from './client';
import type { ApiResponse, Subject, Topic, SubTopic } from '../types';

export const getSubjects = () =>
  client.get<ApiResponse<Subject[]>>('/subjects');

export const getTopicsBySubject = (subjectId: string) =>
  client.get<ApiResponse<Topic[]>>(`/topics/subject/${subjectId}`);

export const getSubTopicsByTopic = (topicId: string) =>
  client.get<ApiResponse<SubTopic[]>>(`/sub-topics/topic/${topicId}`);

export const getSubTopicsByMultipleTopics = (topicIds: string[]) =>
  client.post<ApiResponse<SubTopic[]>>('/sub-topics/multi-topics', { topicIds });
