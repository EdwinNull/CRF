/**
 * 后端 API 基础客户端
 * - 统一 baseURL（Vite 开发走代理 /api，生产走同源）
 * - 请求拦截器自动附加 JWT
 * - 401 自动清理 token 并跳登录
 */
import axios from 'axios';

const TOKEN_KEY = 'crf_access_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

const http = axios.create({
  baseURL: '/api/v1',
  timeout: 20000,
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      setToken(null);
      // 重定向到登录（跳过当前 history 定位问题，直接清 location）
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

/** 提取后端 error detail，便于界面提示 */
export function apiErrorText(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = (err.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((d) => (d as { msg?: string }).msg ?? '').join('; ');
  }
  return '网络错误，请稍后重试';
}

export default http;
