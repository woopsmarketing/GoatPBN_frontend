# GoatPBN 다국어(i18n) 적용 가이드

이 문서는 **goatpbn.com** 메인 웹사이트의 메뉴와 푸터를 한국어/영어로 자동 전환하는 방법을 설명합니다.

## 📋 배경

- **한국어 페이지**: `https://goatpbn.com/`
- **영어 페이지**: `https://goatpbn.com/en/`
- URL 경로를 기준으로 자동으로 언어가 전환됩니다.

## 🚀 빠른 적용 방법

### 1단계: 스크립트 추가

WordPress 테마의 `<head>` 또는 `<footer>` 영역에 다음 스크립트를 추가하세요:

```html
<!-- 한글 주석: 다국어 처리 스크립트 -->
<script type="module" src="/assets/i18n-main-site.js"></script>
```

### 2단계: HTML 요소에 속성 추가

다국어 처리가 필요한 텍스트에 `data-i18n` 속성을 추가하세요.

#### 예시 1: 상단 메뉴

**변경 전:**
```html
<nav>
  <a href="/">홈</a>
  <a href="/about">회사 소개</a>
  <a href="/contact">연락처</a>
</nav>
```

**변경 후:**
```html
<nav>
  <a href="/" data-i18n-link="/" data-i18n="menu-home">Home</a>
  <a href="/about" data-i18n-link="/about" data-i18n="company-about">About Us</a>
  <a href="/contact" data-i18n-link="/contact" data-i18n="company-contact">Contact</a>
</nav>
```

#### 예시 2: 푸터

**변경 전:**
```html
<footer>
  <p>© 2026 GOATPBN. All rights reserved.</p>
  <p>상호명 : 제로버블솔루션 | ZEROBUBBLESOLUTION</p>
  <p>대표자명 : 박장우</p>
  <a href="/refund">환불 규정</a>
</footer>
```

**변경 후:**
```html
<footer>
  <p data-i18n="footer-copyright">© 2026 GOATPBN. All rights reserved.</p>
  <p data-i18n="footer-business-name">Business Name: ZEROBUBBLESOLUTION</p>
  <p data-i18n="footer-ceo">CEO: Park Jang-woo</p>
  <a href="/refund" data-i18n-link="/refund" data-i18n="footer-refund">Refund Policy</a>
</footer>
```

#### 예시 3: 입력 필드 placeholder

**변경 전:**
```html
<input type="email" placeholder="goat@goatpbn.com" />
```

**변경 후:**
```html
<input 
  type="email" 
  placeholder="goat@goatpbn.com" 
  data-i18n-placeholder="subscribe-placeholder" 
/>
```

## 🎯 사용 가능한 번역 키

### 메뉴 관련
- `menu-home` - 홈 / Home
- `menu-product` - Product
- `menu-resource` - Resource  
- `menu-plans` - Plans
- `menu-company` - Company

### Product 하위
- `product-automated-pbn` - Automated PBN Publishing
- `product-ai-content` - AI-Powered Content Generation
- `product-safe-link` - Safe Link Diversification
- `product-seo-performance` - SEO Performance Tracking
- `product-multi-site` - Multi-Site Management

### Resource 하위
- `resource-news` - News & Media
- `resource-culture` - Culture
- `resource-blog` - Blog

### Plans 하위
- `plan-free` - Free
- `plan-starter` - starter
- `plan-pro` - pro
- `plan-elite` - elite

### Company 하위
- `company-about` - About Us / 회사 소개
- `company-contact` - Contact / 연락처

### 푸터 관련
- `footer-copyright` - © 2026 GOATPBN. All rights reserved.
- `footer-business-name` - 상호명 정보
- `footer-ceo` - 대표자명
- `footer-business-number` - 사업자등록번호
- `footer-telecom-number` - 통신판매신고
- `footer-address` - 사업장주소
- `footer-phone` - 전화번호
- `footer-refund` - 환불 규정 / Refund Policy
- `footer-terms` - Terms of use / 이용약관
- `footer-disclosure` - Disclosure / 정보공개

### 구독 폼 관련
- `subscribe-title` - Subscribe / 구독
- `subscribe-desc` - Stay in the loop with GOATPBN
- `subscribe-placeholder` - 이메일 입력 placeholder
- `subscribe-button` - Sign Up / 가입하기

## 🔧 새로운 번역 추가하기

`assets/i18n-main-site.js` 파일의 `translations` 객체에 새 키를 추가하세요:

```javascript
const translations = {
  ko: {
    'new-key': '새로운 한국어 텍스트',
    // ... 기존 키들
  },
  en: {
    'new-key': 'New English Text',
    // ... 기존 키들
  }
};
```

그리고 HTML에서 사용:
```html
<span data-i18n="new-key">New English Text</span>
```

## 🎨 작동 방식

1. **URL 감지**: `/en/` 경로가 있으면 영어, 없으면 한국어
2. **자동 번역**: 페이지 로드 시 `data-i18n` 속성이 있는 모든 요소의 텍스트 교체
3. **링크 조정**: `data-i18n-link` 속성이 있는 링크는 영어 페이지에서 자동으로 `/en` 접두사 추가

## ✅ 체크리스트

메인 웹사이트에 다국어를 적용하려면:

- [ ] `i18n-main-site.js` 파일을 `/assets/` 폴더에 업로드
- [ ] WordPress 테마에 스크립트 태그 추가
- [ ] 상단 메뉴의 모든 링크와 텍스트에 `data-i18n` 속성 추가
- [ ] 푸터의 모든 텍스트에 `data-i18n` 속성 추가
- [ ] 입력 필드의 placeholder에 `data-i18n-placeholder` 속성 추가
- [ ] `/en/` 경로로 접속해서 영어로 표시되는지 테스트
- [ ] `/` 경로로 접속해서 한국어로 표시되는지 테스트

## 🔍 디버깅

브라우저 콘솔에서 다음 명령으로 현재 locale 확인:

```javascript
console.log(window.GoatPbnI18n.locale); // 'ko' 또는 'en'
console.log(window.GoatPbnI18n.isEnglish); // true 또는 false
```

특정 키의 번역 확인:
```javascript
console.log(window.GoatPbnI18n.t('menu-home')); // 'Home' 또는 '홈'
```

## 📞 문의

문제가 발생하면 개발팀에 문의하세요.

---

**버전**: 1.0  
**작성일**: 2026.01.29  
**작성자**: AI Assistant
