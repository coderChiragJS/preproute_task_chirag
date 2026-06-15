import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AxiosInstance } from 'axios';
import { anonClient, authedClient, NIL_UUID } from './api-helpers';

let api: AxiosInstance;

let subjectId = '';
let subjectName = '';
let topicId = '';
let topicName = '';
let testId = '';
let questionIds: string[] = [];

const createdTestIds: string[] = [];

beforeAll(async () => {
  api = await authedClient();
});

afterAll(async () => {
  for (const id of createdTestIds) {
    await api.delete(`/tests/${id}`);
  }
});

describe('auth', () => {
  it('logs in with valid credentials and returns a JWT + user', async () => {
    const res = await anonClient().post('/auth/login', {
      userId: 'vedant-admin',
      password: 'vedant123',
    });
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('success');
    expect(res.data.data.token).toMatch(/^eyJ/);
    expect(res.data.data.user.userId).toBe('vedant-admin');
  });

  it('rejects wrong credentials with 401 and a readable message', async () => {
    const res = await anonClient().post('/auth/login', {
      userId: 'wrong-user',
      password: 'wrong-pass',
    });
    expect(res.status).toBe(401);
    expect(res.data.status).toBe('error');
    expect(res.data.message).toContain('Invalid credentials');
  });

  it('rejects empty credentials', async () => {
    const res = await anonClient().post('/auth/login', { userId: '', password: '' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.data.status).toBe('error');
  });

  it('blocks protected endpoints without a token (401)', async () => {
    const res = await anonClient().get('/tests');
    expect(res.status).toBe(401);
    expect(res.data.message).toContain('No token');
  });

  it('blocks protected endpoints with a garbage token (401)', async () => {
    const res = await anonClient().get('/tests', {
      headers: { Authorization: 'Bearer not-a-real-token' },
    });
    expect(res.status).toBe(401);
  });
});

describe('master data', () => {
  it('fetches subjects (non-empty, each with id + name)', async () => {
    const res = await api.get('/subjects');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.data)).toBe(true);
    expect(res.data.data.length).toBeGreaterThan(0);
    const subj = res.data.data.find((s: { name: string }) => s.name === 'Maths') ?? res.data.data[0];
    expect(subj.id).toBeTruthy();
    expect(subj.name).toBeTruthy();
    subjectId = subj.id;
    subjectName = subj.name;
  });

  it('fetches topics for a subject', async () => {
    const res = await api.get(`/topics/subject/${subjectId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.data)).toBe(true);
    expect(res.data.data.length).toBeGreaterThan(0);
    expect(res.data.data[0].subject_id).toBe(subjectId);
    topicId = res.data.data[0].id;
    topicName = res.data.data[0].name;
  });

  it('returns an empty list (not an error) for an unknown subject uuid', async () => {
    const res = await api.get(`/topics/subject/${NIL_UUID}`);
    expect(res.status).toBe(200);
    expect(res.data.data).toEqual([]);
  });

  it('rejects a non-uuid subject id with 400', async () => {
    const res = await api.get('/topics/subject/garbage');
    expect(res.status).toBe(400);
  });

  it('fetches sub-topics for multiple topics', async () => {
    const res = await api.post('/sub-topics/multi-topics', { topicIds: [topicId] });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.data)).toBe(true);
  });

  it('rejects an empty topicIds array with 400', async () => {
    const res = await api.post('/sub-topics/multi-topics', { topicIds: [] });
    expect(res.status).toBe(400);
    expect(res.data.errors[0].msg).toContain('non-empty');
  });
});

describe('tests CRUD', () => {
  const basePayload = () => ({
    name: `Integration Test ${Date.now()}`,
    type: 'chapterwise',
    subject: subjectId,
    topics: [topicId],
    sub_topics: [],
    difficulty: 'easy',
    wrong_marks: -1,
    unattempt_marks: 0,
    correct_marks: 5,
    total_time: 60,
    total_questions: 2,
    total_marks: 10,
  });

  it('rejects status null — API requires a string enum value', async () => {
    const res = await api.post('/tests', { ...basePayload(), status: null });
    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Validation failed');
    const statusError = res.data.errors.find((e: { path: string }) => e.path === 'status');
    expect(statusError.msg).toMatch(/live, unpublished, scheduled, expired, draft|must be a string/);
  });

  it('rejects an empty topics array with 400', async () => {
    const res = await api.post('/tests', { ...basePayload(), topics: [], status: 'draft' });
    expect(res.status).toBe(400);
    const err = res.data.errors.find((e: { path: string }) => e.path === 'topics');
    expect(err.msg).toContain('non-empty');
  });

  it('rejects a missing name with 400', async () => {
    const payload: Record<string, unknown> = { ...basePayload(), status: 'draft' };
    delete payload.name;
    const res = await api.post('/tests', payload);
    expect(res.status).toBe(400);
  });

  it('creates a draft test (the flow the app uses)', async () => {
    const res = await api.post('/tests', { ...basePayload(), status: 'draft' });
    expect(res.status).toBeLessThan(300);
    expect(res.data.status).toBe('success');
    expect(res.data.data.id).toBeTruthy();
    expect(res.data.data.status).toBe('draft');
    expect(res.data.data.subject).toBe(subjectId);
    testId = res.data.data.id;
    createdTestIds.push(testId);
  });

  it('GET /tests/:id returns subject and topics as resolved names', async () => {
    const res = await api.get(`/tests/${testId}`);
    expect(res.status).toBe(200);
    expect(res.data.data.subject).toBe(subjectName);
    expect(res.data.data.topics).toContain(topicName);
  });

  it('lists all tests and includes the new draft', async () => {
    const res = await api.get('/tests');
    expect(res.status).toBe(200);
    const found = res.data.data.find((t: { id: string }) => t.id === testId);
    expect(found).toBeTruthy();
  });

  it('updates the test name', async () => {
    const res = await api.put(`/tests/${testId}`, { name: 'Renamed Integration Test' });
    expect(res.status).toBe(200);
    expect(res.data.data.name).toBe('Renamed Integration Test');
  });

  it('returns 404 for an unknown test id', async () => {
    const res = await api.get(`/tests/${NIL_UUID}`);
    expect(res.status).toBe(404);
    expect(res.data.message).toContain('not found');
  });

  it('returns 400 for a malformed test id', async () => {
    const res = await api.get('/tests/not-a-uuid');
    expect(res.status).toBe(400);
  });
});

describe('questions', () => {
  const question = (overrides: Record<string, unknown> = {}) => ({
    type: 'mcq',
    question: 'What is 2 + 2?',
    option1: '3',
    option2: '4',
    option3: '5',
    option4: '6',
    correct_option: 'option2',
    explanation: 'Basic addition',
    difficulty: 'easy',
    subject: subjectId,
    test_id: testId,
    ...overrides,
  });

  it('rejects questions without the subject field', async () => {
    const q: Record<string, unknown> = question();
    delete q.subject;
    const res = await api.post('/questions/bulk', { questions: [q] });
    expect(res.status).toBe(400);
    const err = res.data.errors.find((e: { path: string }) => e.path.includes('subject'));
    expect(err.msg).toContain('Subject');
  });

  it('rejects an empty questions array with 400', async () => {
    const res = await api.post('/questions/bulk', { questions: [] });
    expect(res.status).toBe(400);
    expect(res.data.errors[0].msg).toContain('non-empty');
  });

  it('rejects any topic/sub_topic value on questions', async () => {
    const res = await api.post('/questions/bulk', {
      questions: [question({ topic: topicId })],
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.data.message).toContain('not found');

    const res2 = await api.post('/questions/bulk', {
      questions: [question({ topic: topicName })],
    });
    expect(res2.status).toBeGreaterThanOrEqual(400);
    expect(res2.data.message).toContain('not found');
  });

  it('rejects questions referencing a non-existent test (FK violation)', async () => {
    const res = await api.post('/questions/bulk', {
      questions: [question({ test_id: NIL_UUID })],
    });
    expect(res.status).toBe(400);
    expect(res.data.message).toContain('reference');
  });

  it('bulk-creates questions for the draft test', async () => {
    const res = await api.post('/questions/bulk', {
      questions: [
        question(),
        question({ question: 'What is 3 × 3?', option1: '6', option2: '9', correct_option: 'option2' }),
      ],
    });
    expect(res.status).toBeLessThan(300);
    expect(res.data.data).toHaveLength(2);
    questionIds = res.data.data.map((q: { id: string }) => q.id);
    expect(questionIds.every(Boolean)).toBe(true);
  });

  it('links questions to the test and updates totals (app flow)', async () => {
    const res = await api.put(`/tests/${testId}`, {
      questions: questionIds,
      total_questions: questionIds.length,
      total_marks: 5 * questionIds.length,
    });
    expect(res.status).toBe(200);
    expect(res.data.data.questions).toEqual(questionIds);
    expect(res.data.data.total_questions).toBe(2);
  });

  it('fetchBulk returns the created questions', async () => {
    const res = await api.post('/questions/fetchBulk', { question_ids: questionIds });
    expect(res.status).toBe(200);
    expect(res.data.data).toHaveLength(2);
    const fetched = res.data.data.find((q: { id: string }) => q.id === questionIds[0]);
    expect(fetched.question).toBe('What is 2 + 2?');
    expect(fetched.correct_option).toBe('option2');
  });

  it('fetchBulk with unknown ids returns an empty list, not an error', async () => {
    const res = await api.post('/questions/fetchBulk', { question_ids: [NIL_UUID] });
    expect(res.status).toBe(200);
    expect(res.data.data).toEqual([]);
  });

  it('stores formatted html and a base64 image in media_url', async () => {
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    const create = await api.post('/questions/bulk', {
      questions: [question({
        question: '<b>Bold</b> and <i>italic</i> text',
        explanation: '<u>underlined</u> solution',
        media_url: dataUrl,
      })],
    });
    expect(create.status).toBeLessThan(300);
    const newId = create.data.data[0].id;

    const fetched = await api.post('/questions/fetchBulk', { question_ids: [newId] });
    const q = fetched.data.data[0];
    expect(q.question).toBe('<b>Bold</b> and <i>italic</i> text');
    expect(q.explanation).toBe('<u>underlined</u> solution');
    expect(q.media_url).toBe(dataUrl);
  });
});

describe('publish & delete', () => {
  it('publishes the test (status → live)', async () => {
    const res = await api.put(`/tests/${testId}`, { status: 'live' });
    expect(res.status).toBe(200);
    expect(res.data.data.status).toBe('live');
  });

  it('rejects an invalid status value', async () => {
    const res = await api.put(`/tests/${testId}`, { status: 'bogus-status' });
    expect(res.status).toBe(400);
  });

  it('supports scheduled publishing with scheduled_date', async () => {
    const when = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const res = await api.put(`/tests/${testId}`, {
      status: 'scheduled',
      scheduled_date: when,
    });
    expect(res.status).toBe(200);
    expect(res.data.data.status).toBe('scheduled');
    expect(res.data.data.scheduled_date).toBeTruthy();
  });

  it('supports expiry_date for test availability window', async () => {
    const until = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const res = await api.put(`/tests/${testId}`, {
      status: 'live',
      expiry_date: until,
    });
    expect(res.status).toBe(200);
    expect(res.data.data.status).toBe('live');
    expect(res.data.data.expiry_date).toBeTruthy();
  });

  it('deletes the test along with its questions', async () => {
    const res = await api.delete(`/tests/${testId}`);
    expect(res.status).toBe(200);
    expect(res.data.message).toContain('deleted');
    const qRes = await api.post('/questions/fetchBulk', { question_ids: questionIds });
    expect(qRes.data.data).toEqual([]);
    const tRes = await api.get(`/tests/${testId}`);
    expect(tRes.status).toBe(404);
    createdTestIds.length = 0;
  });
});
