// v1.1 - 비로그인 사용자를 외부 회원가입으로 유도 (2026.01.23)
// src/utils/route-guard/AuthGuard.jsx
// 한글 주석: 인증 상태 확인 및 리다이렉트 처리
// 목적: 로그인하지 않은 사용자가 대시보드에 접근하지 못하게 차단

'use client';

import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { authAPI } from '../../lib/supabase';
import { buildSignupRedirectUrl } from './marketingRedirect';
import Loader from 'components/Loader';

// 한글 주석: 현재 경로를 기반으로 locale별 로그인 경로를 계산
const resolveLoginBasePath = (pathname) => {
  if (!pathname) return '/en';
  if (pathname.startsWith('/ko')) return '/ko';
  if (pathname.startsWith('/en')) return '/en';
  return '/en';
};

// ==============================|| AUTH GUARD ||============================== //

export default function AuthGuard({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const loginBasePath = useMemo(() => resolveLoginBasePath(pathname), [pathname]);

  // 한글 주석: 외부 회원가입 페이지로 리다이렉트합니다.
  const redirectToSignup = useCallback(() => {
    try {
      if (typeof window === 'undefined') {
        router.replace(loginBasePath);
        return;
      }
      const redirectUrl = buildSignupRedirectUrl(window.location.href);
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      router.replace(loginBasePath);
    } catch (error) {
      console.error('회원가입 리다이렉트 실패:', error);
      router.replace(loginBasePath);
    }
  }, [loginBasePath, router]);

  const checkAuth = useCallback(async () => {
    try {
      // 한글 주석: SSO 해시 토큰이 있으면 먼저 세션으로 동기화합니다.
      await authAPI.syncSessionFromUrlHash();
      const {
        data: { session }
      } = await authAPI.getSession();

      if (session) {
        setIsAuthenticated(true);
      } else {
        redirectToSignup();
      }
    } catch (error) {
      console.error('인증 확인 오류:', error);
      redirectToSignup();
    } finally {
      setIsLoading(false);
    }
  }, [loginBasePath, redirectToSignup, router]);

  useEffect(() => {
    checkAuth();

    const {
      data: { subscription }
    } = authAPI.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setIsAuthenticated(true);
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setIsLoading(false);
        redirectToSignup();
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAuth, loginBasePath, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

AuthGuard.propTypes = { children: PropTypes.any };
