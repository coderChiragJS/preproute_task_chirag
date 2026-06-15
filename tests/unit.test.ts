import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { getApiErrorMessage, isUuid } from '../src/api/client';

function makeAxiosError(status: number, data: unknown): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', { headers }, {}, {
    status,
    statusText: '',
    headers: {},
    config: { headers },
    data,
  });
}

describe('isUuid', () => {
  it('accepts valid uuids', () => {
    expect(isUuid('c495e328-066c-4ae5-a959-4bb9f3e357d7')).toBe(true);
    expect(isUuid('00000000-0000-0000-0000-000000000000')).toBe(true);
    expect(isUuid('C495E328-066C-4AE5-A959-4BB9F3E357D7')).toBe(true);
  });

  it('rejects names, empties and malformed values', () => {
    expect(isUuid('Maths')).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid('c495e328-066c-4ae5-a959')).toBe(false);
    expect(isUuid('c495e328066c4ae5a9594bb9f3e357d7')).toBe(false);
  });
});

describe('getApiErrorMessage', () => {
  it('extracts the first validation error with its field path', () => {
    const err = makeAxiosError(400, {
      status: 'error',
      message: 'Validation failed',
      errors: [
        { type: 'field', msg: 'Status must be a string', path: 'status', location: 'body' },
        { type: 'field', msg: 'other', path: 'x', location: 'body' },
      ],
    });
    expect(getApiErrorMessage(err)).toBe('status: Status must be a string');
  });

  it('falls back to the top-level message when there is no errors array', () => {
    const err = makeAxiosError(401, {
      status: 'error',
      message: 'Access denied. Invalid credentials.',
    });
    expect(getApiErrorMessage(err)).toBe('Access denied. Invalid credentials.');
  });

  it('handles the object-shaped errors field (e.g. postgres FK violations)', () => {
    const err = makeAxiosError(400, {
      status: 'error',
      message: 'Invalid topic, sub_topic, or test_id reference',
      errors: { code: '23503', details: '...' },
    });
    expect(getApiErrorMessage(err)).toBe('Invalid topic, sub_topic, or test_id reference');
  });

  it('returns the fallback for non-axios errors', () => {
    expect(getApiErrorMessage(new Error('boom'), 'fallback msg')).toBe('fallback msg');
    expect(getApiErrorMessage(undefined, 'fallback msg')).toBe('fallback msg');
  });

  it('reports network errors distinctly', () => {
    const headers = new AxiosHeaders();
    const err = new AxiosError('Network Error', 'ERR_NETWORK', { headers });
    expect(getApiErrorMessage(err)).toBe('Network error — check your connection');
  });
});
