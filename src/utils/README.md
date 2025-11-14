# 📁 src/utils/ Directory

## 🎯 Purpose
프론트엔드 공통 유틸리티 함수 및 헬퍼 모듈입니다.

---

## 📋 Utility Files

### 🔐 **인증** (Authentication)

#### `authOptions.js`
**NextAuth.js 설정 (향후 사용)**

```javascript
export const authOptions = {
  providers: [
    // Google, GitHub 등
  ],
  callbacks: {
    // 로그인 콜백
  }
};
```

---

### 🌐 **HTTP 클라이언트**

#### `axios.js`
**Axios 인스턴스 설정**

```javascript
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 요청 인터셉터
axiosInstance.interceptors.request.use(config => {
  // 토큰 추가 등
  return config;
});

// 응답 인터셉터
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    // 에러 처리
    return Promise.reject(error);
  }
);

export default axiosInstance;
```

**사용 예시**:
```jsx
import axios from '@/utils/axios';

const response = await axios.get('/api/campaigns');
const data = response.data;
```

---

### 🎨 **테마 유틸리티**

#### `getColors.js`
**테마 색상 가져오기**

```javascript
export default function getColors(theme, color) {
  // theme: MUI theme object
  // color: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'
  
  return theme.palette[color];
}
```

**사용 예시**:
```jsx
import { useTheme } from '@mui/material/styles';
import getColors from '@/utils/getColors';

const theme = useTheme();
const primaryColors = getColors(theme, 'primary');
// { main: '#3B82F6', light: '#60A5FA', dark: '#2563EB' }
```

---

#### `getShadow.js`
**그림자 효과 가져오기**

```javascript
export default function getShadow(theme, shadow) {
  return theme.customShadows[shadow];
}
```

---

#### `getWindowScheme.js`
**시스템 다크모드 감지**

```javascript
export function getWindowScheme() {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? 'dark' 
      : 'light';
  }
  return 'light';
}
```

---

### 🌍 **다국어** (Localization)

#### `locales/*.json`
**다국어 번역 파일**

**지원 언어**:
- `en.json` - English
- `ko.json` - 한국어 (향후 추가)
- `fr.json` - Français
- `zh.json` - 中文
- `ro.json` - Română

**구조**:
```json
{
  "common": {
    "dashboard": "Dashboard",
    "campaigns": "Campaigns",
    "logout": "Logout"
  },
  "pages": {
    "dashboard": {
      "title": "Main Dashboard",
      "welcome": "Welcome back!"
    }
  }
}
```

**사용** (향후):
```jsx
import { useTranslation } from 'next-i18next';

const { t } = useTranslation('common');
const title = t('dashboard');  // "Dashboard"
```

---

### 🔒 **Route Guards**

#### `route-guard/AuthGuard.jsx`
**인증 필요 페이지 보호**

```jsx
export default function AuthGuard({ children }) {
  const { user, loading } = useUser();
  
  if (loading) return <Loader />;
  if (!user) {
    router.push('/login');
    return null;
  }
  
  return <>{children}</>;
}
```

**사용**:
```jsx
// app/(dashboard)/layout.jsx
import AuthGuard from '@/utils/route-guard/AuthGuard';

export default function DashboardLayout({ children }) {
  return (
    <AuthGuard>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthGuard>
  );
}
```

---

#### `route-guard/GuestGuard.jsx`
**로그인한 사용자 차단 (인증 페이지용)**

```jsx
export default function GuestGuard({ children }) {
  const { user } = useUser();
  
  if (user) {
    router.push('/dashboard');
    return null;
  }
  
  return <>{children}</>;
}
```

---

### 🔑 **비밀번호 검증**

#### `password-strength.js`
**비밀번호 강도 측정**

```javascript
export function getPasswordStrength(password) {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  
  return strength;  // 0~5
}
```

#### `password-validation.js`
**비밀번호 유효성 검증**

```javascript
export function validatePassword(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('8자 이상 입력하세요');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('대문자를 포함하세요');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

---

### 🛣️ **라우팅**

#### `matchPath.js`
**경로 매칭 유틸리티**

```javascript
export function matchPath(pathname, route) {
  // 현재 경로와 메뉴 경로 매칭
  return pathname === route || pathname.startsWith(route + '/');
}
```

---

### 🎨 **코드 하이라이팅**

#### `SyntaxHighlight.jsx`
**코드 블록 하이라이팅**

```jsx
import SyntaxHighlight from '@/utils/SyntaxHighlight';

<SyntaxHighlight language="javascript">
  {codeString}
</SyntaxHighlight>
```

---

### ⏰ **시간대**

#### `timezone.js` ⭐
**프론트엔드 시간대 처리**

```javascript
// 브라우저 시간대 감지
export function detectBrowserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
  // "Asia/Seoul"
}

// UTC를 로컬 시간으로 변환
export function formatUTCToLocal(utcDateString, timezone = 'Asia/Seoul') {
  const date = new Date(utcDateString);
  return date.toLocaleString('ko-KR', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// 상대 시간 ("3분 전")
export function getRelativeTimeString(utcDateString) {
  const date = new Date(utcDateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  // ...
}
```

**사용 예시**:
```jsx
import { formatUTCToLocal, getRelativeTimeString } from '@/utils/timezone';

// UTC → KST 변환
const localTime = formatUTCToLocal('2025-11-03T09:20:03Z');
// "2025-11-03 18:20:03"

// 상대 시간
const relative = getRelativeTimeString('2025-11-03T09:20:03Z');
// "3시간 전"
```

---

## 🔧 How to Add New Utility

### 1. 유틸리티 파일 생성
```javascript
// utils/myUtil.js
export function myUtilFunction(input) {
  // 로직
  return output;
}

export const MY_CONSTANT = 'value';
```

### 2. 사용
```jsx
import { myUtilFunction, MY_CONSTANT } from '@/utils/myUtil';

const result = myUtilFunction(data);
```

---

## 🔍 Quick Reference

| 기능 | 파일 | 주요 함수 |
|-----|------|----------|
| **HTTP 요청** | `axios.js` | axios 인스턴스 |
| **시간대 변환** | `timezone.js` | `formatUTCToLocal` |
| **색상 가져오기** | `getColors.js` | `getColors` |
| **인증 가드** | `route-guard/AuthGuard.jsx` | AuthGuard |
| **비밀번호 검증** | `password-validation.js` | `validatePassword` |

---

## ⚠️ Important Notes

### Import Path
```jsx
// ✅ 절대 경로 사용
import axios from '@/utils/axios';

// ❌ 상대 경로 지양
import axios from '../../utils/axios';
```

### Client-Side Only
대부분의 유틸리티는 **브라우저 환경 전용**:
```javascript
if (typeof window !== 'undefined') {
  // 브라우저에서만 실행
}
```

---

## 🔗 Related Files

- **테마**: `../themes/`
- **Hook**: `../hooks/`
- **API**: `../lib/api/`

---

**최종 업데이트**: 2025-11-03  
**작성자**: Frontend Team

