import axios from 'axios';
import { API } from '@constants';

export const faceitClient = axios.create({
  baseURL: API,
  timeout: 6000,
  headers: {
    Authorization: `Bearer ${import.meta.env.VITE_PUBLIC_API_KEY}`,
    Accept: 'application/json',
  },
});
