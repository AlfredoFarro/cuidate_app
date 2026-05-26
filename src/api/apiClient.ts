import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  api_url,
  api_url_learning,
  api_url_medical,
  api_url_training,
} from './endpoints';
import { secureStorage } from '../utils/storage';

const attachAuth = async (config: InternalAxiosRequestConfig) => {
  const token = await secureStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

const on401 = async (error: AxiosError) => {
  if (error.response?.status === 401) {
    await secureStorage.removeToken();
    // Navigation to login can be wired later (e.g. event emitter / global handler).
  }
  return Promise.reject(error);
};

export const apiClient = axios.create({
  baseURL: api_url,
});

export const learningClient = axios.create({
  baseURL: api_url_learning,
});

export const medicalClient = axios.create({
  baseURL: api_url_medical,
});

export const trainingClient = axios.create({
  baseURL: api_url_training,
});

for (const client of [apiClient, learningClient, medicalClient, trainingClient]) {
  client.interceptors.request.use(attachAuth);
  client.interceptors.response.use((res) => res, on401);
}
