# GoatPBN 결제 페이지(WordPress 하위 경로용)

이 디렉토리는 **`goatpbn.com` 하위 경로에 업로드할 정적 HTML/JS**를 제공합니다.  
목표는 **결제 시작/성공·실패/환불/로그인 페이지를 모두 `goatpbn.com` 도메인으로 유지**하는 것입니다.

## 폴더 구조

```
seed/goatpbn-portal/
└─ public/
   ├─ index.html
   ├─ pricing.html
   ├─ login.html
   ├─ success.html
   ├─ fail.html
   ├─ refund.html
   └─ assets/
      ├─ config.js
      ├─ utils.js
      ├─ auth.js
      ├─ checkout.js
      ├─ success.js
      └─ styles.css
```

## 1) 먼저 수정해야 하는 값

`public/assets/config.js`에서 아래 값을 실제 값으로 교체하세요.

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `API_BASE_URL` (예: `https://app.goatpbn.com`)
- `TOSS_CLIENT_KEY`
- `TOSS_TENANT_KEY` (confirm 함수에서 사용)
- `TOSS_CONFIRM_API` (Supabase Functions confirm URL)
- `PLAN_CONFIG` (금액/주문명)

> 주의: `.env` 파일은 만들거나 수정하지 않습니다. (요구사항)

## 2) WordPress 호스팅에 올리는 방법

1. `seed/goatpbn-portal/public` 폴더 전체를 **`goatpbn.com` 호스팅의 하위 경로**로 업로드  
   예: `https://goatpbn.com/checkout/` 경로로 업로드
2. 업로드 후 아래 URL이 열리는지 확인
   - `https://goatpbn.com/checkout/pricing.html`
   - `https://goatpbn.com/checkout/login.html`
   - `https://goatpbn.com/checkout/success.html`
   - `https://goatpbn.com/checkout/fail.html`
   - `https://goatpbn.com/checkout/refund.html`

## 3) WordPress 랜딩의 Try out 버튼 연결

기존 랜딩 페이지의 Try out 버튼을 아래처럼 연결하면 됩니다.

```
https://goatpbn.com/checkout/pricing.html?plan=basic&autoPay=1
```

- 로그인된 상태면 즉시 결제창 실행
- 미로그인 상태면 `login.html`로 이동 후 다시 결제창 실행

## 4) 필수 시스템 설정 체크리스트

- Supabase OAuth Redirect URL에 추가
  - `https://goatpbn.com/checkout/login.html`
  - `https://goatpbn.com/checkout/pricing.html`
- CORS 허용 도메인에 추가
  - `https://goatpbn.com`
- Toss 결제 success/fail URL이 반드시 `goatpbn.com` 도메인인지 확인

## 5) 결제 성공 후 흐름

1. `success.html`에서 Toss confirm 처리
2. Supabase에 구독 정보 반영
3. `app.goatpbn.com`으로 이동 (구독 정보 확인)

---

필요하면 `mypage.html`(구독/결제 내역 페이지)도 추가 가능합니다.
