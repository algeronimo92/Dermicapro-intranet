import axios from 'axios';

const platformApi = axios.create({
  baseURL: '/platform',
  headers: { 'Content-Type': 'application/json' },
});

export default platformApi;
