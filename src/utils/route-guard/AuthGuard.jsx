// src/utils/route-guard/AuthGuard.jsx
// 한글 주석: 인증 상태 확인 및 리다이렉트 처리
// 목적: 로그인하지 않은 사용자가 대시보드에 접근하지 못하게 차단

'use client';

import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, authAPI } from '../../lib/supabase';
import Loader from 'components/Loader';

// ==============================|| AUTH GUARD ||============================== //

export default function AuthGuard({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();

    // 인증 상태 변화 감지
    const {
      data: { subscription }
    } = authAPI.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setIsAuthenticated(true);
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setIsLoading(false);
        router.push('/auth/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const checkAuth = async () => {
    try {
      const {
        data: { session }
      } = await authAPI.getSession();

      if (session) {
        setIsAuthenticated(true);
      } else {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('인증 확인 오류:', error);
      router.push('/auth/login');
    } finally {
      setIsLoading(false);
    }
  };

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
