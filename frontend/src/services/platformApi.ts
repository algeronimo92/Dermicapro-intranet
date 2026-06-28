import axios from 'axios';

const platformApi = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/platform',
  headers: { 'Content-Type': 'application/json' },
});

export default platformApi;
