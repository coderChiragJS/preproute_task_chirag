export interface User {
  id: string;
  userId: string;
  name?: string;
  email?: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
}

export interface Subject {
  id: string;
  name: string;
}

export interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

export interface SubTopic {
  id: string;
  name: string;
  topic_id: string;
}

export type TestStatus = 'draft' | 'live' | 'unpublished' | 'scheduled' | 'expired' | null;
export type Difficulty = 'easy' | 'medium' | 'hard';
export type TestType = 'chapterwise' | 'full_length' | 'mock' | 'practice';

export interface Test {
  id: string;
  name: string;
  type: TestType;
  subject: string;
  subject_id?: string;
  topics: string[];
  topic_ids?: string[];
  sub_topics?: string[];
  sub_topic_ids?: string[];
  correct_marks: number;
  wrong_marks: number;
  unattempt_marks: number;
  difficulty: Difficulty;
  total_time: number;
  total_marks: number;
  total_questions: number;
  status: TestStatus;
  questions?: string[];
  created_at?: string;
  scheduled_date?: string | null;
  expiry_date?: string | null;
}

export interface CreateTestPayload {
  name: string;
  type: TestType;
  subject: string;
  topics: string[];
  sub_topics: string[];
  correct_marks: number;
  wrong_marks: number;
  unattempt_marks: number;
  difficulty: Difficulty;
  total_time: number;
  total_marks: number;
  total_questions: number;
  status: TestStatus;
}

export interface Question {
  id: string;
  type: 'mcq';
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: 'option1' | 'option2' | 'option3' | 'option4';
  explanation?: string;
  difficulty?: Difficulty;
  subject?: string;
  topic?: string;
  sub_topic?: string;
  media_url?: string;
  test_id: string;
}

export interface QuestionFormData {
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: 'option1' | 'option2' | 'option3' | 'option4';
  explanation?: string;
  difficulty?: Difficulty;
  topic_id?: string;
  sub_topic_id?: string;
  media_url?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
