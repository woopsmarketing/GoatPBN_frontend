// v2.2 - SSO 토큰 중복 방지 및 URL 정리 (2026.01.28)
// 기능 요약: 설정 병합/검증, Supabase 로더, 토스 SDK 로더, 계획 조회 공통 제공
// 사용 예시:
//   import { resolveConfig, validateConfig } from './utils.js';

const DEFAULT_PLAN_MAP = {
  basic: { amount: 20000, orderName: 'GoatPBN Basic 1개월' },
  pro: { amount: 50000, orderName: 'GoatPBN Pro 1개월' }
};

// 한글 주석: Supabase JS는 최신 버전이 jsDelivr에서 깨질 수 있어 고정 버전 사용.
const SUPABASE_JS_VERSION = '2.39.7';
const SUPABASE_ESM_URL = `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${SUPABASE_JS_VERSION}/+esm`;
const SUPABASE_ESM_FALLBACK_URL = `https://esm.sh/@supabase/supabase-js@${SUPABASE_JS_VERSION}?bundle`;

const DEFAULT_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  tossClientKey: '',
  apiBaseUrl: 'https://app.goatpbn.com',
  homeUrl: 'https://goatpbn.com/',
  loginUrl: 'https://goatpbn.com/login',
  signupUrl: 'https://goatpbn.com/register',
  pricingUrl: 'https://goatpbn.com/#pricing',
  billingSuccessUrl: 'https://goatpbn.com/success',
  billingFailUrl: 'https://goatpbn.com/fail',
  afterSuccessRedirectUrl: 'https://app.goatpbn.com/ko/subscription?payment_status=success',
  appDashboardUrlKo: 'https://app.goatpbn.com/ko/dashboard',
  appDashboardUrlEn: 'https://app.goatpbn.com/en/dashboard',
  freeCouponCode: 'BHWFREECREDIT',
  freeOpenNewTab: false,
  planMap: DEFAULT_PLAN_MAP,
  selectors: {
    checkoutButton: '[data-goatpbn-checkout]',
    messageBox: '[data-goatpbn-message]'
  }
};

const DEFAULT_REQUIRED_KEYS = ['supabaseUrl', 'supabaseAnonKey', 'tossClientKey', 'apiBaseUrl'];

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

// 한글 주석: 지정한 필수 키 기준으로 설정 누락 여부를 점검합니다.
export const validateConfigWithKeys = (config, requiredKeys = []) => {
  const keys = requiredKeys.length ? requiredKeys : DEFAULT_REQUIRED_KEYS;
  const missing = keys.filter((key) => !String(config?.[key] || '').trim());
  return { ok: missing.length === 0, missing };
};

// 한글 주석: 기본 필수 키로 설정 누락 여부를 점검합니다.
export const validateConfig = (config) => validateConfigWithKeys(config, DEFAULT_REQUIRED_KEYS);

// 한글 주석: Supabase 모듈을 동적으로 로드해 클라이언트를 생성합니다(테스트 주입 가능).
export const createSupabaseClient = async (config, deps = {}, options = {}) => {
  const importer =
    deps.importSupabase ||
    (async () => {
      try {
        return await import(SUPABASE_ESM_URL);
      } catch (err) {
        console.warn('Supabase CDN 로드 실패, 대체 CDN으로 재시도합니다.', err);
        return await import(SUPABASE_ESM_FALLBACK_URL);
      }
    });
  const { createClient } = await importer();
  return createClient(config.supabaseUrl, config.supabaseAnonKey, options);
};

// 한글 주석: 현재 로그인 세션을 조회합니다.
export const getSessionUser = async (supabaseClient) => {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data?.session?.user || null;
};

// 한글 주석: 사용할 수 있는 스토리지 목록을 안전하게 수집합니다.
// 한글 주석: 세션 스토리지를 먼저 확인해 "현재 탭" 로그인을 우선합니다.
const resolveAvailableStorages = () => {
  const storages = [];
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      storages.push({ type: 'session', storage: window.sessionStorage });
    }
  } catch (err) {
    console.warn('sessionStorage 접근 실패:', err);
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      storages.push({ type: 'local', storage: window.localStorage });
    }
  } catch (err) {
    console.warn('localStorage 접근 실패:', err);
  }
  return storages;
};

// 한글 주석: 스토리지 옵션을 반영한 Supabase 클라이언트를 생성합니다.
export const createSupabaseClientWithStorage = async (config, deps = {}, storage, options = {}) => {
  const authOptions = {
    storage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    ...(options.auth || {})
  };
  return createSupabaseClient(config, deps, {
    ...options,
    auth: authOptions
  });
};

// 한글 주석: localStorage/sessionStorage 중 존재하는 세션을 탐색합니다.
export const getSessionFromAnyStorage = async (config, deps = {}) => {
  const storages = resolveAvailableStorages();
  for (const item of storages) {
    try {
      const supabase = await createSupabaseClientWithStorage(config, deps, item.storage);
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const session = data?.session || null;
      if (session?.user) {
        return { user: session.user, session, storageType: item.type, supabase };
      }
    } catch (err) {
      console.warn(`세션 확인 실패(${item.type}):`, err);
    }
  }
  return { user: null, session: null, storageType: null, supabase: null };
};

// 한글 주석: 모든 스토리지에서 로그아웃을 수행합니다.
export const signOutFromAllStorages = async (config, deps = {}) => {
  const storages = resolveAvailableStorages();
  const results = [];
  for (const item of storages) {
    try {
      const supabase = await createSupabaseClientWithStorage(config, deps, item.storage);
      await supabase.auth.signOut();
      results.push({ type: item.type, ok: true });
    } catch (err) {
      console.warn(`로그아웃 실패(${item.type}):`, err);
      results.push({ type: item.type, ok: false, error: err });
    }
  }
  return { ok: results.every((r) => r.ok), results };
};

// 한글 주석: SSO 토큰 파라미터 키 목록입니다.
const SSO_TOKEN_KEYS = ['access_token', 'refresh_token', 'expires_in', 'token_type'];

// 한글 주석: URL에 포함된 SSO 토큰을 제거해 반환합니다.
export const stripAuthTokensFromUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    const searchParams = url.searchParams;
    let changed = false;
    SSO_TOKEN_KEYS.forEach((key) => {
      if (searchParams.has(key)) {
        searchParams.delete(key);
        changed = true;
      }
    });
    if (url.hash) {
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      SSO_TOKEN_KEYS.forEach((key) => {
        if (hashParams.has(key)) {
          hashParams.delete(key);
          changed = true;
        }
      });
      url.hash = hashParams.toString();
    }
    return changed ? url.toString() : urlString;
  } catch (err) {
    console.warn('SSO URL 정리 실패:', err);
    return urlString;
  }
};

// 한글 주석: SSO 링크에 접근 토큰을 포함한 URL을 생성합니다.
export const buildSsoUrl = (targetUrl, session) => {
  if (!session?.access_token) return targetUrl;
  try {
    const cleaned = stripAuthTokensFromUrl(targetUrl);
    const url = new URL(cleaned);
    const hashParams = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token || '',
      expires_in: String(session.expires_in || ''),
      token_type: session.token_type || 'bearer'
    });
    url.hash = hashParams.toString();
    return url.toString();
  } catch (err) {
    console.warn('SSO URL 생성 실패:', err);
    return targetUrl;
  }
};

// 한글 주석: data-goatpbn-sso 링크에 SSO 동작을 연결합니다.
export const bindSsoLinks = async (config, deps = {}, selector = '[data-goatpbn-sso]') => {
  if (typeof document === 'undefined') return;
  const ssoLinks = document.querySelectorAll(selector);
  if (!ssoLinks.length) return;

  const { session: cachedSession } = await getSessionFromAnyStorage(config, deps);

  ssoLinks.forEach((link) => {
    if (link.getAttribute('data-goatpbn-sso-bound') === '1') return;
    link.setAttribute('data-goatpbn-sso-bound', '1');

    const handleClick = (event) => {
      if (event.type === 'auxclick' && event.button !== 1) return;
      event.preventDefault();
      const target = link.getAttribute('data-goatpbn-target') || link.getAttribute('href') || '';
      if (!target) return;

      const isModifier = event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1 || link.getAttribute('target') === '_blank';
      const forceNewTab = config?.ssoOpenNewTab === true || link.getAttribute('data-goatpbn-newtab') === '1';
      const openInNewTab = forceNewTab || isModifier;

      const finalUrl = cachedSession?.access_token ? buildSsoUrl(target, cachedSession) : config.loginUrl || '/login';

      if (openInNewTab) {
        const nextWindow = window.open(finalUrl, '_blank', 'noopener,noreferrer');
        if (!nextWindow) {
          console.warn('팝업이 차단되어 새 탭을 열지 못했습니다.');
        }
        return;
      }
      window.location.href = finalUrl;
    };

    link.addEventListener('click', handleClick);
    link.addEventListener('auxclick', handleClick);
  });
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
    const { data, error } = await supabaseClient.from('billing_plans').select('slug, metadata').eq('slug', planSlug).limit(1);
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : null;
    const metadata = row?.metadata || {};
    const amountFromMeta = Number(metadata?.toss_amount_krw) || Number(metadata?.toss_price_krw) || Number(metadata?.toss_amount);
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

// 한글 주석: URL 기반으로 locale을 판별합니다. (lang/locale 쿼리 우선)
export const resolveLocale = () => {
  try {
    if (typeof window === 'undefined') return 'ko';
    const query = parseQuery();
    const queryLocale = String(query?.lang || query?.locale || '').toLowerCase();
    if (queryLocale === 'en') return 'en';
    if (window.location.pathname.startsWith('/en')) return 'en';
    return 'ko';
  } catch (err) {
    console.warn('locale 감지 실패:', err);
    return 'ko';
  }
};

// 한글 주석: 영어 locale 여부를 반환합니다.
export const isEnglishLocale = () => resolveLocale() === 'en';

// 한글 주석: 잘못된 app 도메인을 교정합니다(ap9p -> app).
export const normalizeAppUrl = (url) => {
  const raw = String(url || '').trim();
  if (!raw) return raw;
  return raw.replace('://ap9p.', '://app.').replace('//ap9p.', '//app.');
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
