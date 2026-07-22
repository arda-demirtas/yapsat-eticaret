import axios from 'axios'

// Create a pre-configured Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1', // Load dynamically from environment
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api
