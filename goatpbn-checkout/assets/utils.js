// v1.0 - goatpbn.com 결제 공통 유틸 (2026.01.20)
// 기능 요약: 설정 병합/검증, Supabase 로더, 토스 SDK 로더, 계획 조회 공통 제공
// 사용 예시:
//   import { resolveConfig, validateConfig } from './utils.js';

const DEFAULT_PLAN_MAP = {
  basic: { amount: 20000, orderName: 'GoatPBN Basic 1개월' },
  pro: { amount: 50000, orderName: 'GoatPBN Pro 1개월' }
};

const DEFAULT_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  tossClientKey: '',
  apiBaseUrl: 'https://app.goatpbn.com',
  loginUrl: 'https://goatpbn.com/login',
  pricingUrl: 'https://goatpbn.com/#pricing',
  billingSuccessUrl: 'https://goatpbn.com/success',
  billingFailUrl: 'https://goatpbn.com/fail',
  afterSuccessRedirectUrl: 'https://app.goatpbn.com/ko/subscription?payment_status=success',
  planMap: DEFAULT_PLAN_MAP,
  selectors: {
    checkoutButton: '[data-goatpbn-checkout]',
    messageBox: '[data-goatpbn-message]'
  }
};

// 한글 주석: 기본 설정과 사용자 설정을 병합합니다.
export const resolveConfig = (userConfig = {}) => {
  return {
    ...DEFAULT_CONFIG,
    ...(userConfig || {}),
    planMap: {
      ...DEFAULT_PLAN_MAP,
      ...(userConfig?.planMap || {})
    },
    selectors: {
      ...DEFAULT_CONFIG.selectors,
      ...(userConfig?.selectors || {})
    }
  };
};

// 한글 주석: 필수 설정 누락 여부를 점검합니다.
export const validateConfig = (config) => {
  const requiredKeys = ['supabaseUrl', 'supabaseAnonKey', 'tossClientKey', 'apiBaseUrl'];
  const missing = requiredKeys.filter((key) => !String(config?.[key] || '').trim());
  return { ok: missing.length === 0, missing };
};

// 한글 주석: Supabase 모듈을 동적으로 로드해 클라이언트를 생성합니다(테스트 주입 가능).
export const createSupabaseClient = async (config, deps = {}) => {
  const importer =
    deps.importSupabase ||
    (() => import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'));
  const { createClient } = await importer();
  return createClient(config.supabaseUrl, config.supabaseAnonKey);
};

// 한글 주석: 현재 로그인 세션을 조회합니다.
export const getSessionUser = async (supabaseClient) => {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data?.session?.user || null;
};

// 한글 주석: 토스 SDK를 로드하고 초기화 가능한 함수를 반환합니다.
export const ensureTossPayments = async (clientKey, deps = {}) => {
  if (typeof window === 'undefined') {
    throw new Error('브라우저 환경에서만 결제창을 호출할 수 있습니다.');
  }

  if (window.TossPayments) return window.TossPayments;

  const loadScript =
    deps.loadScript ||
    ((src) =>
      new Promise((resolve, reject) => {
        try {
          const script = document.createElement('script');
          script.src = src;
          script.async = true;
          script.onload = () => resolve(true);
          script.onerror = () => reject(new Error('토스 SDK 로딩 실패'));
          document.head.appendChild(script);
        } catch (err) {
          reject(err);
        }
      }));

  await loadScript('https://js.tosspayments.com/v2/standard');
  if (!window.TossPayments) throw new Error('토스 SDK 로딩 실패');
  return window.TossPayments;
};

// 한글 주석: Supabase에서 플랜 금액/주문명을 조회합니다(없으면 설정값 사용).
export const resolvePlanConfig = async (planSlug, config, supabaseClient) => {
  const fallback = config?.planMap?.[planSlug];
  if (fallback?.amount) return fallback;

  if (!supabaseClient) return fallback || null;

  try {
    const { data, error } = await supabaseClient
      .from('billing_plans')
      .select('slug, metadata')
      .eq('slug', planSlug)
      .limit(1);
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : null;
    const metadata = row?.metadata || {};
    const amountFromMeta =
      Number(metadata?.toss_amount_krw) || Number(metadata?.toss_price_krw) || Number(metadata?.toss_amount);
    if (!Number.isFinite(amountFromMeta) || amountFromMeta <= 0) return fallback || null;
    return {
      amount: amountFromMeta,
      orderName: metadata?.toss_order_name_ko || metadata?.toss_order_name || fallback?.orderName
    };
  } catch (err) {
    console.warn('플랜 금액 조회 실패:', err);
    return fallback || null;
  }
};

// 한글 주석: 데이터 속성을 안전하게 읽어옵니다.
export const getDataAttr = (element, key) => {
  if (!element) return '';
  return String(element.getAttribute(key) || '').trim();
};

// 한글 주석: 쿼리스트링을 객체로 변환합니다.
export const parseQuery = () => {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const result = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};

// 한글 주석: 안내 메시지를 화면에 표기합니다.
export const renderMessage = (selector, message, type = 'info') => {
  if (typeof document === 'undefined') return;
  const target = document.querySelector(selector);
  if (!target) return;
  target.textContent = message;
  target.setAttribute('data-type', type);
};

// 한글 주석: 값이 비어있으면 fallback을 반환합니다.
export const fallbackString = (value, fallback) => {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : fallback;
};
