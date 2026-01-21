// v0.1 - Supabase 인증 유틸 (2026.01.20)
// 기능 요약: 로그인/세션 확인을 공통 함수로 제공합니다.
// 사용 예시: const user = await GoatAuth.getCurrentUser();

// 한글 주석: Supabase 클라이언트를 지연 생성합니다.
const getSupabaseClient = () => {
  const config = GoatUtils.getConfig();
  if (!window.supabase || !window.supabase.createClient) {
    throw new Error('Supabase SDK가 로드되지 않았습니다.');
  }
  if (!window.__GOAT_SUPABASE__) {
    window.__GOAT_SUPABASE__ = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        flowType: 'pkce'
      }
    });
  }
  return window.__GOAT_SUPABASE__;
};

// 한글 주석: 현재 세션을 가져옵니다.
const getCurrentSession = async () => {
  try {
    const supabaseClient = getSupabaseClient();
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    return data?.session || null;
  } catch (err) {
    console.error('세션 조회 실패:', err);
    return null;
  }
};

// 한글 주석: 현재 사용자 정보를 반환합니다.
const getCurrentUser = async () => {
  try {
    const supabaseClient = getSupabaseClient();
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) throw error;
    return data?.user || null;
  } catch (err) {
    console.error('사용자 조회 실패:', err);
    return null;
  }
};

// 한글 주석: 구글 OAuth 로그인을 시작합니다.
const signInWithGoogle = async (redirectTo) => {
  try {
    const supabaseClient = getSupabaseClient();
    const options = redirectTo ? { redirectTo } : undefined;
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options });
    if (error) throw error;
  } catch (err) {
    const message = err instanceof Error ? err.message : '구글 로그인에 실패했습니다.';
    throw new Error(message);
  }
};

// 한글 주석: 로그아웃을 수행합니다.
const signOut = async () => {
  try {
    const supabaseClient = getSupabaseClient();
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  } catch (err) {
    const message = err instanceof Error ? err.message : '로그아웃에 실패했습니다.';
    throw new Error(message);
  }
};

// 한글 주석: 로그인 필요 시 로그인 페이지로 이동합니다.
const redirectToLogin = (returnTo, plan, autoPay) => {
  const safeReturnTo = GoatUtils.sanitizeReturnTo(returnTo || '');
  const loginUrl = new URL(window.location.origin + GoatUtils.getBasePath() + '/login.html');
  if (safeReturnTo) loginUrl.searchParams.set('return_to', safeReturnTo);
  if (plan) loginUrl.searchParams.set('plan', plan);
  if (autoPay) loginUrl.searchParams.set('autoPay', '1');
  window.location.href = loginUrl.toString();
};

// 한글 주석: 전역 접근을 위해 window에 노출합니다.
window.GoatAuth = {
  getSupabaseClient,
  getCurrentSession,
  getCurrentUser,
  signInWithGoogle,
  signOut,
  redirectToLogin
};
