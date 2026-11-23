import axios from 'axios';
import { toast } from 'react-toastify';

declare module 'axios' {
  export interface AxiosRequestConfig {
    suppressErrorToastStatuses?: number[];
  }
  export interface InternalAxiosRequestConfig {
    suppressErrorToastStatuses?: number[];
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cricketvault_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const suppressed =
      axios.isAxiosError(error) &&
      error.config?.suppressErrorToastStatuses?.includes(
        error.response?.status ?? 0,
      );
    if (axios.isAxiosError(error) && !suppressed) {
      const responseMessage = error.response?.data?.error;
      const message = typeof responseMessage === 'string'
        ? responseMessage
        : error.message || 'The request failed.';
      toast.error(message, { toastId: `error:${message}` });
    }
    return Promise.reject(error);
  },
);

export const apiErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || error.message || 'The request failed.';
  }
  return error instanceof Error ? error.message : 'The request failed.';
};

export const apiStatusCode = (error: unknown): number | undefined =>
  axios.isAxiosError(error) ? error.response?.status : undefined;

export const apiClient = api;
