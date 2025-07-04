import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { config } from '../config';

export interface ApiResponse<T = any> {
    data: T;
    status: number;
    headers: any;
}

export class ApiClient {
    private client: AxiosInstance;
    private authToken?: string;

    constructor() {
        this.client = axios.create({
            baseURL: config.apiBaseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Add request interceptor to include auth token
        this.client.interceptors.request.use((config) => {
            if (this.authToken) {
                config.headers.Authorization = `Bearer ${this.authToken}`;
            }
            return config;
        });

        // Add response interceptor for better error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response) {
                    // Server responded with error status
                    console.error(`API Error ${error.response.status}:`, error.response.data);
                } else if (error.request) {
                    // Network error
                    console.error('Network Error:', error.message);
                } else {
                    // Other error
                    console.error('Request Error:', error.message);
                }
                throw error;
            }
        );
    }

    setAuthToken(token: string) {
        this.authToken = token;
    }

    clearAuthToken() {
        this.authToken = undefined;
    }

    async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response: AxiosResponse<T> = await this.client.get(url, config);
        return {
            data: response.data,
            status: response.status,
            headers: response.headers,
        };
    }

    async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response: AxiosResponse<T> = await this.client.post(url, data, config);
        return {
            data: response.data,
            status: response.status,
            headers: response.headers,
        };
    }

    async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response: AxiosResponse<T> = await this.client.put(url, data, config);
        return {
            data: response.data,
            status: response.status,
            headers: response.headers,
        };
    }

    async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response: AxiosResponse<T> = await this.client.delete(url, config);
        return {
            data: response.data,
            status: response.status,
            headers: response.headers,
        };
    }

    // Convenience method for making requests that expect errors
    async requestWithExpectedError(method: 'get' | 'post' | 'put' | 'delete', url: string, data?: any) {
        try {
            const response = await this[method](url, data);
            throw new Error(`Expected request to fail, but it succeeded with status ${response.status}`);
        } catch (error: any) {
            if (error.response) {
                return {
                    status: error.response.status,
                    data: error.response.data,
                };
            }
            throw error;
        }
    }
}