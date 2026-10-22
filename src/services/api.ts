import axios from 'axios'

// Alamat API Golang. Bisa dioverride lewat .env.local tanpa mengubah kode.
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8090'
).replace(/\/+$/, '')

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})
