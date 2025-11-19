// v1.1 - Supabase 로컬 로그인 경로 리다이렉트 대응 (2025.11.19)
// 목적: Axios 요청 실패 시 locale에 맞는 로그인 화면으로 이동
import axios from 'axios';
import { authAPI } from '@/lib/supabase';

const axiosServices = axios.create({ baseURL: process.env.NEXT_APP_API_URL });

const resolveLoginBasePath = (pathname) => {
  if (!pathname) return '/en';
  if (pathname.startsWith('/ko')) return '/ko';
  if (pathname.startsWith('/en')) return '/en';
  return '/en';
};

// ==============================|| AXIOS - FOR MOCK SERVICES ||============================== //

/**
 * Request interceptor to add Authorization token to request
 */
axiosServices.interceptors.request.use(
  async (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

if (typeof window !== 'undefined') {
  axiosServices.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        try {
          await authAPI.signOut();
        } catch (logoutError) {
          console.error('Supabase 로그아웃 실패:', logoutError);
        } finally {
          const loginBasePath = resolveLoginBasePath(window.location.pathname);
          window.location.href = loginBasePath;
        }
      }
      return Promise.reject((error.response && error.response.data) || 'Wrong Services');
    }
  );
}

export default axiosServices;

export const fetcher = async (args) => {
  const [url, config] = Array.isArray(args) ? args : [args];

  const res = await axiosServices.get(url, { ...config });

  return res.data;
};
