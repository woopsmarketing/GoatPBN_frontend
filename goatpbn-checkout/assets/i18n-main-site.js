// v1.1 - lang=en 페이지용 푸터 폴백 번역 추가 (2026.01.29)
// 기능 요약: URL 경로(/en) 또는 lang=en 감지 시 메뉴/푸터를 영어로 변환
// 사용 예시: <script type="module" src="/assets/i18n-main-site.js"></script>

import { resolveLocale, isEnglishLocale } from './utils.js?v=18';

const createI18nController = () => {
  const locale = resolveLocale();
  const isEnglish = isEnglishLocale();

  // 한글 주석: 메인 웹사이트의 다국어 텍스트 맵
  const translations = {
    ko: {
      // 상단 메뉴 (Product, Resource, Plans, Company)
      'menu-home': '홈',
      'menu-product': 'Product',
      'menu-resource': 'Resource',
      'menu-plans': 'Plans',
      'menu-company': 'Company',
      
      // Product 하위 메뉴
      'product-automated-pbn': 'Automated PBN Publishing',
      'product-ai-content': 'AI-Powered Content Generation',
      'product-safe-link': 'Safe Link Diversification',
      'product-seo-performance': 'SEO Performance Tracking',
      'product-multi-site': 'Multi-Site Management',
      
      // Resource 하위 메뉴
      'resource-news': 'News & Media',
      'resource-culture': 'Culture',
      'resource-blog': 'Blog',
      
      // Plans 하위 메뉴
      'plan-free': 'Free',
      'plan-starter': 'starter',
      'plan-pro': 'pro',
      'plan-elite': 'elite',
      
      // Company 하위 메뉴
      'company-about': 'About Us',
      'company-contact': 'Contact',
      
      // 푸터
      'footer-copyright': '© 2026 GOATPBN. All rights reserved.',
      'footer-business-name': '상호명 : 제로버블솔루션 | ZEROBUBBLESOLUTION',
      'footer-ceo': '대표자명 : 박장우',
      'footer-business-number': '사업자등록번호 : 517-11-03160',
      'footer-telecom-number': '통신판매신고 2025-대구남구-0558',
      'footer-address': '사업장주소 : 대구광역시 남구 대봉로 313, 3층-514호 ( 대명동 )',
      'footer-phone': '유선전화번호 : 010-7169-8390',
      'footer-refund': '환불 규정',
      'footer-terms': 'Terms of use',
      'footer-disclosure': 'Disclosure',
      
      // 구독 버튼
      'subscribe-title': 'Subscribe',
      'subscribe-desc': 'Stay in the loop with GOATPBN',
      'subscribe-placeholder': 'goat@goatpbn.com',
      'subscribe-button': 'Sign Up'
    },
    en: {
      // 상단 메뉴
      'menu-home': 'Home',
      'menu-product': 'Product',
      'menu-resource': 'Resource',
      'menu-plans': 'Plans',
      'menu-company': 'Company',
      
      // Product 하위 메뉴
      'product-automated-pbn': 'Automated PBN Publishing',
      'product-ai-content': 'AI-Powered Content Generation',
      'product-safe-link': 'Safe Link Diversification',
      'product-seo-performance': 'SEO Performance Tracking',
      'product-multi-site': 'Multi-Site Management',
      
      // Resource 하위 메뉴
      'resource-news': 'News & Media',
      'resource-culture': 'Culture',
      'resource-blog': 'Blog',
      
      // Plans 하위 메뉴
      'plan-free': 'Free',
      'plan-starter': 'starter',
      'plan-pro': 'pro',
      'plan-elite': 'elite',
      
      // Company 하위 메뉴
      'company-about': 'About Us',
      'company-contact': 'Contact',
      
      // 푸터
      'footer-copyright': '© 2026 GOATPBN. All rights reserved.',
      'footer-business-name': 'Business Name: ZEROBUBBLESOLUTION',
      'footer-ceo': 'CEO: Park Jang-woo',
      'footer-business-number': 'Business Registration No.: 517-11-03160',
      'footer-telecom-number': 'Telecom Sales Report: 2025-Daegu Namgu-0558',
      'footer-address': 'Address: 313 Daebong-ro, Nam-gu, Daegu, 3F-514 (Daemyeong-dong)',
      'footer-phone': 'Phone: 010-7169-8390',
      'footer-refund': 'Refund Policy',
      'footer-terms': 'Terms of use',
      'footer-disclosure': 'Disclosure',
      
      // 구독 버튼
      'subscribe-title': 'Subscribe',
      'subscribe-desc': 'Stay in the loop with GOATPBN',
      'subscribe-placeholder': 'goat@goatpbn.com',
      'subscribe-button': 'Sign Up'
    }
  };

  // 한글 주석: 현재 locale의 번역을 반환합니다.
  const t = (key) => {
    const localeTexts = translations[locale] || translations.ko;
    return localeTexts[key] || key;
  };

  // 한글 주석: 텍스트 정규화를 통해 공백 차이를 줄입니다.
  const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

  // 한글 주석: 라벨형 텍스트(예: 상호명: ...)를 영문으로 변환합니다.
  const replaceLabelText = (text) => {
    const labelMap = [
      { ko: '상호명', en: 'Business Name' },
      { ko: '대표자명', en: 'CEO' },
      { ko: '사업자등록번호', en: 'Business Registration No.' },
      { ko: '통신판매업신고', en: 'Telecom Sales Report' },
      { ko: '통신판매신고', en: 'Telecom Sales Report' },
      { ko: '사업장주소', en: 'Address' },
      { ko: '유선전화번호', en: 'Phone' },
      { ko: '이메일', en: 'Email' }
    ];

    for (const label of labelMap) {
      const regex = new RegExp(`^${label.ko}\\s*:?\\s*(.*)$`);
      const match = text.match(regex);
      if (match) {
        const value = normalizeText(match[1]);
        return value ? `${label.en}: ${value}` : `${label.en}`;
      }
    }
    return text;
  };

  // 한글 주석: data-i18n이 없을 때 사용할 푸터 텍스트 매핑입니다.
  const footerFallbackMap = {
    '워드프레스 자동 발행': 'Automated PBN Publishing',
    'AI 콘텐츠 생성': 'AI-Powered Content Generation',
    '링크·앵커 관리': 'Safe Link Diversification',
    '인덱싱 모니터링': 'SEO Performance Tracking',
    '멀티사이트 관리': 'Multi-Site Management',
    '공지사항': 'News & Media',
    '블로그': 'Blog',
    '사용 가이드': 'User Guide',
    '자주 묻는 질문': 'FAQ',
    '문의하기': 'Contact',
    '회사소개': 'About Us',
    '이용약관': 'Terms of use',
    '개인정보처리방침': 'Privacy Policy',
    '환불 정책': 'Refund Policy',
    '구독하기': 'Subscribe',
    'GOATPBN 소식과 업데이트를 받아보세요.': 'Stay in the loop with GOATPBN',
    '신청하기': 'Sign Up',
    'basic (베이직)': 'Basic',
    'pro (프로)': 'Pro'
  };

  // 한글 주석: 푸터 텍스트를 영문으로 보정합니다(폴백).
  const applyFooterFallbackTranslations = () => {
    if (!isEnglish || typeof document === 'undefined') return;
    const footerRoots = document.querySelectorAll('footer, .elementor-location-footer');
    if (!footerRoots.length) return;

    footerRoots.forEach((root) => {
      const candidates = root.querySelectorAll(
        'p, span, a, li, div, small, strong, em, h1, h2, h3, h4, h5, h6, button'
      );
      candidates.forEach((el) => {
        if (!el || el.children.length > 0) return;
        if (el.closest('[data-i18n], [data-i18n-placeholder]')) return;
        const original = normalizeText(el.textContent);
        if (!original) return;
        if (footerFallbackMap[original]) {
          el.textContent = footerFallbackMap[original];
          return;
        }
        const replaced = replaceLabelText(original);
        if (replaced !== original) {
          el.textContent = replaced;
        }
      });
    });
  };

  // 한글 주석: data-i18n 속성을 가진 모든 요소의 텍스트를 교체합니다.
  const applyTranslations = () => {
    if (typeof document === 'undefined') return;
    
    // HTML lang 속성 설정
    document.documentElement.setAttribute('lang', locale);
    
    // 텍스트 교체
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = t(key);
      }
    });
    
    // placeholder 속성 교체
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.setAttribute('placeholder', t(key));
      }
    });
    
    console.log(`✅ 다국어 적용 완료: ${locale.toUpperCase()}`);
  };

  // 한글 주석: 언어별 링크를 설정합니다. (메뉴 링크에 /en 접두사 추가/제거)
  const applyLocaleLinks = () => {
    if (typeof document === 'undefined') return;
    
    document.querySelectorAll('[data-i18n-link]').forEach((el) => {
      const basePath = el.getAttribute('data-i18n-link');
      if (!basePath) return;
      
      // 영어 페이지면 /en 접두사 추가
      if (isEnglish) {
        el.setAttribute('href', `/en${basePath}`);
      } else {
        el.setAttribute('href', basePath);
      }
    });
  };

  const init = () => {
    applyTranslations();
    applyLocaleLinks();
    applyFooterFallbackTranslations(); // 한글 주석: data-i18n 미설정 푸터 폴백 처리
  };

  return { init, t, locale, isEnglish };
};

// 한글 주석: DOMContentLoaded 이벤트에서 자동 초기화
if (typeof window !== 'undefined') {
  const controller = createI18nController();
  window.GoatPbnI18n = controller;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => controller.init());
  } else {
    controller.init();
  }
}

export default createI18nController;
