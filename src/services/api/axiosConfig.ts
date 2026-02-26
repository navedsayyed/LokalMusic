import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'https://saavn.sumit.co',
  timeout: 10000,
});

