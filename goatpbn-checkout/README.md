# v1.0 - goatpbn.com 결제/로그인 정적 키트 안내 (2026.01.20)
# 기능 요약: 워드프레스(goatpbn.com)에서 로그인/결제/성공·실패/환불 페이지를 정적 파일로 제공

## 목적
- 토스 심사 도메인(`goatpbn.com`)에서 **로그인 → 결제 → 성공/실패 → 환불 규정** 흐름을 유지합니다.
- 결제 완료 후에는 `app.goatpbn.com`에서 구독 상태를 확인할 수 있도록 **Supabase 연동**을 수행합니다.

## 디렉토리 구성
- `assets/` : 공통 JS/CSS (로그인/결제/성공 처리 로직)
- `pages/` : 워드프레스에 올릴 정적 페이지 샘플
- `tools/` : 설정 점검용 간단한 CLI

## 빠른 적용 순서
1. `assets/`와 `pages/`를 워드프레스 호스팅 경로에 업로드합니다.
2. 워드프레스 페이지를 아래 경로로 생성합니다.
   - `https://goatpbn.com/login`
   - `https://goatpbn.com/success`
   - `https://goatpbn.com/fail`
   - `https://goatpbn.com/refund`
3. 워드프레스 테마/페이지 상단에 **설정 객체**를 주입합니다.

```html
<!-- 예시: 워드프레스 헤더 또는 개별 페이지 상단에 삽입 -->
<script>
  window.GOATPBN_CHECKOUT_CONFIG = {
    supabaseUrl: "https://YOUR_PROJECT.supabase.co",
    supabaseAnonKey: "PUBLIC_ANON_KEY",
    tossClientKey: "test_ck_xxxxxxxxxx",
    apiBaseUrl: "https://app.goatpbn.com",
    loginUrl: "https://goatpbn.com/login",
    pricingUrl: "https://goatpbn.com/#pricing",
    billingSuccessUrl: "https://goatpbn.com/success",
    billingFailUrl: "https://goatpbn.com/fail",
    afterSuccessRedirectUrl: "https://app.goatpbn.com/ko/subscription?payment_status=success",
    planMap: {
      basic: { amount: 20000, orderName: "GoatPBN Basic 1개월" },
      pro: { amount: 50000, orderName: "GoatPBN Pro 1개월" }
    }
  };
</script>
```

4. 가격표의 Try out 버튼에 `data-goatpbn-checkout` 속성을 붙입니다.

```html
<button data-goatpbn-checkout data-plan="basic">Try out</button>
```

5. 버튼이 있는 페이지에 아래 스크립트를 로드합니다.

```html
<script type="module" src="/assets/checkout.js"></script>
```

## 로그인 흐름
- 로그인 페이지는 `pages/login.html`을 워드프레스 페이지 템플릿에 넣습니다.
- 로그인 성공 후 `return_to` 쿼리로 돌아가며, `auto_checkout=1`이 있으면 결제창을 자동으로 띄웁니다.

## 결제 성공 처리
- `pages/success.html`은 `authKey/customerKey`를 받아 `billing/issue` API를 호출합니다.
- 이 호출은 **CORS 허용**이 필요하므로, 앱 API에서 `goatpbn.com` origin을 허용해야 합니다.

## 주의 사항
- Supabase OAuth Redirect URL에 `https://goatpbn.com/login`을 추가하세요.
- Supabase Auth 쿠키 도메인은 `.goatpbn.com`으로 설정하면 서브도메인 간 로그인 공유가 쉬워집니다.
- `apiBaseUrl`은 Vercel에 배포된 `app.goatpbn.com`으로 설정하세요.
- 정적 파일 경로가 다르면 `pages/*.html`의 `/assets/...` 경로를 실제 업로드 위치로 수정하세요.
- CORS 허용 도메인은 `NEXT_PUBLIC_ALLOWED_ORIGINS`로 커스텀할 수 있습니다.
- 워드프레스 CSP/보안 플러그인에서 `https://js.tosspayments.com` 및 `https://cdn.jsdelivr.net` 로드가 막히지 않도록 허용하세요.

## 로컬 점검 (선택)
```bash
node tools/validate-config.js
```
