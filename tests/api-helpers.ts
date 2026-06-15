import axios from 'axios';
import type { AxiosInstance } from 'axios';

export const BASE = 'https://admin-moderator-backend-staging.up.railway.app/api';
export const CREDS = { userId: 'vedant-admin', password: 'vedant123' };

export function anonClient(): AxiosInstance {
  return axios.create({
    baseURL: BASE,
    headers: { 'Content-Type': 'application/json' },
    validateStatus: () => true,
  });
}

export async function login(): Promise<string> {
  const res = await anonClient().post('/auth/login', CREDS);
  if (res.status !== 200) throw new Error(`Login failed: ${res.status}`);
  return res.data.data.token;
}

export async function authedClient(): Promise<AxiosInstance> {
  const token = await login();
  return axios.create({
    baseURL: BASE,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    validateStatus: () => true,
  });
}

export const NIL_UUID = '00000000-0000-0000-0000-000000000000';
