import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { AuthTokens, ApiError } from '../types/route'

class ApiService {
  private api: AxiosInstance
  private baseURL: string

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const tokens = this.getStoredTokens()
        if (tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor for error handling and token refresh
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response
      },
      async (error) => {
        const originalRequest = error.config

        // Handle 401 errors (token expired)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            const tokens = this.getStoredTokens()
            if (tokens?.refreshToken) {
              const newTokens = await this.refreshToken(tokens.refreshToken)
              this.storeTokens(newTokens)
              
              // Retry the original request with new token
              originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`
              return this.api(originalRequest)
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.clearTokens()
            window.location.href = '/login'
            return Promise.reject(refreshError)
          }
        }

        // Transform error to our ApiError format
        const apiError: ApiError = {
          message: error.response?.data?.message || error.message || 'An error occurred',
          status: error.response?.status,
          errors: error.response?.data?.errors,
        }

        return Promise.reject(apiError)
      }
    )
  }

  private getStoredTokens(): AuthTokens | null {
    try {
      const tokens = localStorage.getItem('auth_tokens')
      return tokens ? JSON.parse(tokens) : null
    } catch {
      return null
    }
  }

  private storeTokens(tokens: AuthTokens): void {
    localStorage.setItem('auth_tokens', JSON.stringify(tokens))
  }

  private clearTokens(): void {
    localStorage.removeItem('auth_tokens')
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await this.api.post('/api/v1/auth/login', { email, password })
    return response.data
  }

  async register(email: string, password: string, name: string) {
    const response = await this.api.post('/api/v1/auth/register', { email, password, name })
    return response.data
  }

  async refreshToken(refreshToken: string) {
    const response = await this.api.post('/api/v1/auth/refresh', { refreshToken })
    return response.data
  }

  async logout(refreshToken: string) {
    const response = await this.api.post('/api/v1/auth/logout', { refreshToken })
    this.clearTokens()
    return response.data
  }

  // Route methods
  async generateRoute(request: any) {
    const response = await this.api.post('/api/v1/routes/generate', request)
    return response.data
  }

  async getRoute(id: string) {
    const response = await this.api.get(`/api/v1/routes/${id}`)
    return response.data
  }

  async getUserRoutes() {
    const response = await this.api.get('/api/v1/routes')
    return response.data
  }

  async saveRoute(routeId: string) {
    const response = await this.api.post(`/api/v1/routes/${routeId}/save`)
    return response.data
  }

  // Health check
  async healthCheck() {
    const response = await this.api.get('/health')
    return response.data
  }

  // Generic methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.get(url, config)
    return response.data
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.post(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.put(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.delete(url, config)
    return response.data
  }
}

export const apiService = new ApiService()
export default apiService
