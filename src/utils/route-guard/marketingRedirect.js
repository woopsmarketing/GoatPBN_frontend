// v1.0 - 외부 회원가입 리다이렉트 유틸 (2026.01.23)
// 기능 요약: 마케팅 도메인, return_to, 무료 쿠폰 파라미터를 구성합니다.

// 한글 주석: 기본 설정값
export const DEFAULT_MARKETING_ORIGIN = 'https://goatpbn.com';
export const DEFAULT_SIGNUP_PATH = '/register';
export const DEFAULT_FREE_COUPON_CODE = 'BHWFREECREDIT';

// 한글 주석: 마케팅 도메인을 환경 변수에서 우선 읽습니다.
export const resolveMarketingOrigin = () => {
  try {
    return process.env.NEXT_PUBLIC_MARKETING_URL || DEFAULT_MARKETING_ORIGIN;
  } catch (error) {
    console.warn('마케팅 도메인 읽기 실패:', error);
    return DEFAULT_MARKETING_ORIGIN;
  }
};

// 한글 주석: 회원가입 URL에 return_to + 쿠폰 파라미터를 붙입니다.
export const buildSignupRedirectUrl = (currentUrl, options = {}) => {
  try {
    const marketingOrigin = resolveMarketingOrigin();
    const signupPath = options.signupPath || DEFAULT_SIGNUP_PATH;
    const couponCode = options.couponCode || DEFAULT_FREE_COUPON_CODE;
    const signupUrl = new URL(signupPath, marketingOrigin);
    const returnTo = new URL(currentUrl);

    if (!returnTo.searchParams.get('auto_coupon')) {
      returnTo.searchParams.set('auto_coupon', '1');
    }
    if (!returnTo.searchParams.get('coupon')) {
      returnTo.searchParams.set('coupon', couponCode);
    }

    signupUrl.searchParams.set('return_to', returnTo.toString());
    return signupUrl.toString();
  } catch (error) {
    console.warn('회원가입 리다이렉트 URL 생성 실패:', error);
    return '';
  }
};
