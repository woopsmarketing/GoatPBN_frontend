// v1.0 - 다국어 로그인 템플릿 추가 (2025.11.17)
// 기능 요약: locale에 맞는 로그인 화면을 제공하며 구글 OAuth 리다이렉트 경로를 관리
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/supabase';

// 한글 주석: locale별 로그인 텍스트와 메시지를 정의
const LOGIN_LOCALE_CONFIG = {
  ko: {
    title: 'PBN SaaS 로그인',
    description: '구글 계정으로 로그인하세요',
    buttonLabel: '구글로 로그인',
    loadingLabel: '로그인 처리중...',
    terms: '로그인하면 서비스 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.',
    errorMessage: '로그인 중 오류가 발생했습니다.',
    sessionErrorMessage: '세션 확인 중 오류가 발생했습니다.'
  },
  en: {
    title: 'Sign in to PBN SaaS',
    description: 'Sign in with your Google account',
    buttonLabel: 'Sign in with Google',
    loadingLabel: 'Signing you in...',
    terms: 'By signing in, you agree to our Terms of Service and Privacy Policy.',
    errorMessage: 'An error occurred during login.',
    sessionErrorMessage: 'Failed to validate session.'
  }
};

// 한글 주석: 지원하지 않는 locale은 기본적으로 영어 설정을 반환
const getLocaleConfig = (locale) => {
  if (!locale) return LOGIN_LOCALE_CONFIG.en;
  return LOGIN_LOCALE_CONFIG[locale] ?? LOGIN_LOCALE_CONFIG.en;
};

// 한글 주석: locale별 대시보드 경로를 생성
const getDashboardPath = (locale) => {
  if (locale === 'ko') {
    return '/ko/dashboard';
  }
  if (locale === 'en') {
    return '/en/dashboard';
  }
  return '/en/dashboard';
};

// 한글 주석: locale별 로그인 페이지 베이스 경로 생성
const getLoginBasePath = (locale) => {
  if (locale === 'ko') {
    return '/ko';
  }
  if (locale === 'en') {
    return '/en';
  }
  return '/en';
};

export default function LoginPageTemplate({ locale = 'en' }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const localeConfig = useMemo(() => getLocaleConfig(locale), [locale]);
  const dashboardPath = useMemo(() => getDashboardPath(locale), [locale]);
  const loginBasePath = useMemo(() => getLoginBasePath(locale), [locale]);

  useEffect(() => {
    let subscription;

    const notifySignupIfNew = async () => {
      try {
        const {
          data: { session }
        } = await authAPI.getSession();
        const user = session?.user;
        if (!user) return;
        const createdAt = user.created_at;
        const lastSignInAt = user.last_sign_in_at;
        // 최초 로그인(가입 직후)일 때만 관리자 알림 전송
        if (createdAt && lastSignInAt && createdAt === lastSignInAt) {
          await fetch('/api/events/user-signed-up', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.user_metadata?.full_name || ''
            })
          });
        }
      } catch (error) {
        console.error('Signup notification failed:', error);
      }
    };

    const initializeAuthState = async () => {
      try {
        // 한글 주석: 기존 세션이 있다면 locale에 맞는 대시보드로 이동
        const {
          data: { session }
        } = await authAPI.getSession();

        if (session) {
          if (typeof window !== 'undefined' && window.location.hash) {
            window.location.hash = '';
          }
          router.replace(dashboardPath);
          return;
        }
      } catch (error) {
        console.error('세션 확인 오류:', error);
        alert(localeConfig.sessionErrorMessage);
      }

      // 한글 주석: 로그인 상태가 SIGNED_IN으로 변경되면 locale별 대시보드로 이동
      subscription = authAPI.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN') {
          notifySignupIfNew();
          if (typeof window !== 'undefined' && window.location.hash) {
            window.location.hash = '';
          }
          router.replace(dashboardPath);
        }
      })?.data?.subscription;
    };

    initializeAuthState();

    return () => subscription?.unsubscribe();
  }, [dashboardPath, localeConfig.sessionErrorMessage, router]);

  const handleGoogleLogin = async () => {
    if (typeof window === 'undefined') return;
    setIsLoading(true);
    try {
      const redirectTo = `${window.location.origin}${loginBasePath}`;
      const { error } = await authAPI.signInWithGoogle({ redirectTo });
      if (error) {
        console.error('로그인 오류:', error);
        alert(localeConfig.errorMessage);
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      alert(localeConfig.errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">{localeConfig.title}</h2>
          <p className="mt-2 text-sm text-gray-600">{localeConfig.description}</p>
        </div>

        <div className="mt-8">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>{localeConfig.loadingLabel}</span>
              </div>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {localeConfig.buttonLabel}
              </>
            )}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">{localeConfig.terms}</p>
        </div>
      </div>
    </div>
  );
}
