# 📁 src/app/ Directory

## 🎯 Purpose

Next.js 13+ App Router 기반 페이지 라우팅 구조입니다.
폴더 구조가 URL 경로와 직접 매핑됩니다.

---

## 📂 Route Groups

### 🔐 `(auth)` - **인증 페이지**

**URL**: `/login`, `/register`, `/forgot-password`, `/check-mail`

**파일 구조**:

```
(auth)/
├── layout.jsx              # 인증 페이지 공통 레이아웃
├── login/page.jsx          # /login
├── register/page.jsx       # /register
├── forgot-password/page.jsx # /forgot-password
└── check-mail/page.jsx     # /check-mail
```

**기능**:

- 로그인 폼
- 회원가입 폼
- 비밀번호 찾기
- 이메일 확인

---

### 📊 `(dashboard)` - **대시보드 페이지** ⭐

**URL**: `/dashboard`, `/campaigns`, `/logs`, `/statistics`, etc.

**파일 구조**:

```
(dashboard)/
├── layout.jsx                    # 대시보드 공통 레이아웃 (사이드바, 헤더)
├── loading.jsx                   # 로딩 컴포넌트
├── dashboard/page.jsx            # /dashboard (메인 대시보드)
├── campaigns/
│   ├── page.jsx                  # /campaigns (캠페인 목록)
│   └── create/page.jsx           # /campaigns/create (캠페인 생성)
├── logs/page.jsx                 # /logs (로그 페이지)
├── statistics/page.jsx           # /statistics (통계 페이지)
├── reports/page.jsx              # /reports (보고서 페이지)
├── sites/
│   ├── page.jsx                  # /sites (사이트 목록)
│   └── add/page.jsx              # /sites/add (사이트 추가)
├── tools/
│   ├── keyword-generator/page.jsx     # /tools/keyword-generator
│   └── content-generator/page.jsx     # /tools/content-generator
├── content-generator/page.jsx    # /content-generator
├── sample-page/
│   ├── page.jsx                  # /sample-page
│   └── component-sample/page.jsx # /sample-page/component-sample
└── admin/page.jsx                # /admin (관리자 페이지)
```

**핵심 페이지**:

1. **Dashboard** - 전체 현황 요약
2. **Campaigns** - 캠페인 생성/관리
3. **Logs** - 콘텐츠 생성 로그
4. **Statistics** - 성과 통계 및 차트
5. **Sites** - 워드프레스 사이트 관리

---

### 📄 `(blank)` - **빈 레이아웃 페이지**

**URL**: 커스텀 페이지들 (사이드바 없음)

**파일 구조**:

```
(blank)/
├── layout.jsx              # 빈 레이아웃
└── (pages)/                # 각종 커스텀 페이지
    ├── pricing/page.jsx
    ├── payment/page.jsx
    └── ...
```

---

### 📧 `(simple)` - **간단한 레이아웃 페이지**

**URL**: `/contact-us`

**파일 구조**:

```
(simple)/
├── layout.jsx              # 간단한 레이아웃
└── contact-us/page.jsx     # /contact-us
```

---

## 📄 Root Files

### `layout.jsx` ⭐ **루트 레이아웃**

- 전체 앱의 최상위 레이아웃
- HTML 구조 (`<html>`, `<body>`)
- 전역 Provider 설정
- 폰트 설정

```jsx
export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <ProviderWrapper>{children}</ProviderWrapper>
      </body>
    </html>
  );
}
```

### `page.jsx` - **홈페이지**

- URL: `/`
- 랜딩 페이지 또는 대시보드로 리다이렉트

### `error.jsx` - **에러 페이지**

- 앱 레벨 에러 처리
- 에러 바운더리

### `not-found.jsx` - **404 페이지**

- 존재하지 않는 경로 처리

### `loading.jsx` - **로딩 페이지**

- 페이지 전환 시 로딩 UI

### `globals.css` - **전역 CSS**

- Tailwind CSS imports
- 전역 스타일 설정

### `ProviderWrapper.jsx` - **Provider 래퍼**

- Redux, Theme Provider 등 래핑

---

## 🔧 How to Add New Page

### 1. 대시보드 페이지 추가

**예시: `/settings` 페이지 추가**

```bash
# 1. 폴더 및 파일 생성
mkdir src/app/(dashboard)/settings
touch src/app/(dashboard)/settings/page.jsx
```

```jsx
// src/app/(dashboard)/settings/page.jsx
'use client';

export default function SettingsPage() {
  return (
    <div>
      <h1>설정 페이지</h1>
      {/* 내용 */}
    </div>
  );
}
```

**2. 메뉴에 추가**:

```javascript
// src/menu-items/pbn-dashboard.js
{
  id: 'settings',
  title: '설정',
  type: 'item',
  url: '/settings',
  icon: icons.SettingsOutlined
}
```

**3. 접속**:

```
http://localhost:3000/settings
```

---

### 2. 인증 페이지 추가

**예시: `/reset-password` 페이지**

```bash
mkdir src/app/(auth)/reset-password
touch src/app/(auth)/reset-password/page.jsx
```

---

## 📊 Route Groups 설명

### `(dashboard)` - 대시보드 그룹

- **레이아웃**: 사이드바 + 헤더 포함
- **인증**: 로그인 필수
- **용도**: 메인 애플리케이션 기능

### `(auth)` - 인증 그룹

- **레이아웃**: 중앙 정렬 카드
- **인증**: 비로그인 사용자만 접근
- **용도**: 로그인, 회원가입

### `(blank)` - 빈 그룹

- **레이아웃**: 최소한의 구조
- **인증**: 선택적
- **용도**: 커스텀 페이지 (가격, 결제 등)

### `(simple)` - 간단한 그룹

- **레이아웃**: 헤더만 포함
- **인증**: 선택적
- **용도**: 공개 페이지 (문의하기 등)

---

## 🔍 Quick Reference

| 페이지            | 파일 경로                                | URL                  |
| ----------------- | ---------------------------------------- | -------------------- |
| **메인 대시보드** | `(dashboard)/dashboard/page.jsx`         | `/dashboard`         |
| **캠페인 목록**   | `(dashboard)/campaigns/page.jsx`         | `/campaigns`         |
| **캠페인 생성**   | `(dashboard)/campaigns/create/page.jsx`  | `/campaigns/create`  |
| **로그**          | `(dashboard)/logs/page.jsx`              | `/logs`              |
| **통계**          | `(dashboard)/statistics/page.jsx`        | `/statistics`        |
| **보고서**        | `(dashboard)/reports/page.jsx`           | `/reports`           |
| **사이트 목록**   | `(dashboard)/sites/page.jsx`             | `/sites`             |
| **사이트 추가**   | `(dashboard)/sites/add/page.jsx`         | `/sites/add`         |
| **콘텐츠 생성기** | `(dashboard)/content-generator/page.jsx` | `/content-generator` |
| **로그인**        | `(auth)/login/page.jsx`                  | `/login`             |
| **회원가입**      | `(auth)/register/page.jsx`               | `/register`          |

---

## ⚠️ Important Notes

### App Router vs Pages Router

- ✅ 이 프로젝트는 **App Router** 사용 (Next.js 13+)
- ❌ `pages/` 폴더 사용 안함

### File Naming Convention

- `page.jsx` - 페이지 컴포넌트 (URL 매핑)
- `layout.jsx` - 레이아웃 컴포넌트
- `loading.jsx` - 로딩 UI
- `error.jsx` - 에러 UI
- `not-found.jsx` - 404 UI

### Client vs Server Components

```jsx
// Client Component (상태, 이벤트 사용)
'use client';
export default function MyPage() { ... }

// Server Component (기본값, 서버 렌더링)
export default function MyPage() { ... }
```

---

## 🔗 Related Files

- **레이아웃**: `../layout/`
- **컴포넌트**: `../components/`
- **API 호출**: `../lib/api/`
- **메뉴**: `../menu-items/`

---

**최종 업데이트**: 2025-11-03  
**작성자**: Frontend Team
