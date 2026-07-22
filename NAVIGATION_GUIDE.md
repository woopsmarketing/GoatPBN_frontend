# 🗺️ Frontend Navigation Guide

## 🎯 빠른 파일 찾기 가이드

**"이 기능을 수정하려면 어디로 가야 할까?"**

---

## 🔍 페이지별 파일 위치

### 📊 **메인 페이지들**

| 페이지 | 파일 경로 | URL |
|-------|----------|-----|
| **대시보드 홈** | `src/app/(dashboard)/dashboard/page.jsx` | `/dashboard` |
| **통계** | `src/app/(dashboard)/statistics/page.jsx` | `/statistics` |
| **캠페인 목록** | `src/app/(dashboard)/campaigns/page.jsx` | `/campaigns` |
| **캠페인 생성** | `src/app/(dashboard)/campaigns/create/page.jsx` | `/campaigns/create` |
| **로그** | `src/app/(dashboard)/logs/page.jsx` | `/logs` |
| **보고서** | `src/app/(dashboard)/reports/page.jsx` | `/reports` |
| **사이트 목록** | `src/app/(dashboard)/sites/page.jsx` | `/sites` |
| **사이트 추가** | `src/app/(dashboard)/sites/add/page.jsx` | `/sites/add` |
| **콘텐츠 생성기** | `src/app/(dashboard)/content-generator/page.jsx` | `/content-generator` |

### 🔐 **인증 페이지**

| 페이지 | 파일 경로 | URL |
|-------|----------|-----|
| **로그인** | `src/app/(auth)/login/page.jsx` | `/login` |
| **회원가입** | `src/app/(auth)/register/page.jsx` | `/register` |
| **비밀번호 찾기** | `src/app/(auth)/forgot-password/page.jsx` | `/forgot-password` |
| **이메일 확인** | `src/app/(auth)/check-mail/page.jsx` | `/check-mail` |

---

## 🎨 **UI 컴포넌트 수정**

| 수정하고 싶은 내용 | 파일 경로 |
|------------------|----------|
| **사이드바 메뉴** | `src/layout/DashboardLayout/Drawer/` |
| **헤더** | `src/layout/DashboardLayout/Header/` |
| **버튼 스타일** | `src/themes/overrides/Button.js` |
| **카드 컴포넌트** | `src/components/MainCard.jsx` |
| **로딩 스피너** | `src/components/Loader.jsx` |
| **통계 카드** | `src/components/cards/statistics/AnalyticEcommerce.jsx` |

---

## 🌐 **API 연동**

| 기능 | 파일 경로 |
|-----|----------|
| **캠페인 API 호출** | `src/lib/api/campaigns.js` |
| **로그 API 호출** | `src/lib/api/logs.js` |
| **사이트 API 호출** | `src/lib/api/sites.js` |
| **Supabase 연결** | `src/lib/supabase.js` |
| **Axios 설정** | `src/utils/axios.js` |

---

## 🎨 **스타일 & 테마**

| 수정하고 싶은 내용 | 파일 경로 |
|------------------|----------|
| **색상 팔레트** | `src/themes/palette.js` |
| **폰트 설정** | `src/themes/typography.js` |
| **MUI 버튼 스타일** | `src/themes/overrides/Button.js` |
| **MUI 테이블 스타일** | `src/themes/overrides/TableCell.js` |
| **전역 CSS** | `src/app/globals.css` |
| **Tailwind 설정** | `tailwind.config.js` (루트) |

---

## 🛠️ **유틸리티 & 헬퍼**

| 기능 | 파일 경로 |
|-----|----------|
| **시간대 변환** | `src/utils/timezone.js` |
| **시간 포맷팅** | `src/lib/utils/timeUtils.js` |
| **인증 가드** | `src/utils/route-guard/AuthGuard.jsx` |
| **비밀번호 검증** | `src/utils/password-validation.js` |
| **로그 캐싱** | `src/lib/cache/logCache.js` |

---

## 📊 **데이터 & 상태**

| 항목 | 파일 경로 |
|-----|----------|
| **Mock 데이터** | `src/data/mockData.js` |
| **전역 설정 Context** | `src/contexts/ConfigContext.jsx` |
| **설정 Hook** | `src/hooks/useConfig.js` |
| **사용자 Hook** | `src/hooks/useUser.js` |
| **메뉴 구성** | `src/menu-items/pbn-dashboard.js` |

---

## 🎯 일반적인 수정 시나리오

### **시나리오 1: 대시보드 페이지 수정**
```
1. src/app/(dashboard)/dashboard/page.jsx 열기
   → 페이지 레이아웃 및 로직 수정

2. 필요 시 API 호출
   → src/lib/api/campaigns.js 사용

3. 필요 시 새 컴포넌트 생성
   → src/components/ 에 추가
```

### **시나리오 2: 새로운 페이지 추가**
```
1. src/app/(dashboard)/new-page/ 폴더 생성
   → page.jsx 파일 생성

2. src/menu-items/pbn-dashboard.js 수정
   → 메뉴 아이템 추가

3. 자동으로 사이드바에 메뉴 표시됨
```

### **시나리오 3: 캠페인 생성 폼 수정**
```
1. src/app/(dashboard)/campaigns/create/page.jsx 열기
   → 폼 필드 추가/수정

2. src/lib/api/campaigns.js
   → createCampaign() 함수 파라미터 수정

3. 백엔드 API도 함께 수정
   → backend/src/api/campaign_schedule_api.py
```

### **시나리오 4: 로그 테이블 컬럼 추가**
```
1. src/app/(dashboard)/logs/page.jsx 열기
   → 테이블 컬럼 정의 수정

2. src/lib/api/logs.js
   → getLogs() 반환 데이터 확인

3. 백엔드에서 새 필드 제공하는지 확인
   → backend/src/api/logs_api.py
```

### **시나리오 5: 테마 색상 변경**
```
1. src/themes/palette.js 열기
   → primary.main 색상 변경

2. 자동으로 전체 앱에 적용됨
   → 버튼, 링크, 아이콘 등
```

### **시나리오 6: 사이드바 메뉴 수정**
```
1. src/menu-items/pbn-dashboard.js 열기
   → 메뉴 아이템 추가/수정/삭제

2. src/layout/DashboardLayout/Drawer/ 에서 렌더링
   → 자동 반영됨
```

---

## 🔧 **데이터 흐름 예시**

### 캠페인 목록 표시
```
1. 사용자가 /campaigns 접속
   ↓
2. src/app/(dashboard)/campaigns/page.jsx 렌더링
   ↓
3. useEffect에서 API 호출
   ↓
4. src/lib/api/campaigns.js → getCampaigns()
   ↓
5. Axios → http://localhost:8000/api/campaigns
   ↓
6. 백엔드 → backend/src/api/campaign_schedule_api.py
   ↓
7. Supabase 쿼리 → campaigns 테이블
   ↓
8. 응답 데이터 → 프론트엔드
   ↓
9. useState로 상태 업데이트
   ↓
10. 테이블 컴포넌트에 데이터 전달
   ↓
11. 화면에 캠페인 목록 표시
```

---

## 🎨 **스타일링 우선순위**

```
1. Inline Style (최우선)
   <div style={{ color: 'red' }} />

2. Tailwind Classes
   <div className="text-red-500" />

3. MUI sx prop
   <Box sx={{ color: 'red' }} />

4. MUI Theme Overrides
   themes/overrides/Button.js

5. Global CSS (최하위)
   app/globals.css
```

---

## 📱 **반응형 디자인**

### MUI Breakpoints
```jsx
import { useMediaQuery } from '@mui/material';

const isMobile = useMediaQuery(theme.breakpoints.down('sm'));  // < 600px
const isTablet = useMediaQuery(theme.breakpoints.down('md'));  // < 900px
const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));   // >= 1200px

{isMobile && <MobileView />}
{isDesktop && <DesktopView />}
```

### Tailwind Breakpoints
```jsx
<div className="
  w-full           /* 모바일: 전체 너비 */
  md:w-1/2         /* 태블릿: 50% 너비 */
  lg:w-1/3         /* 데스크톱: 33% 너비 */
">
  콘텐츠
</div>
```

---

## 🔍 Quick Command Reference

### 개발 서버
```bash
npm run dev              # 개발 서버 시작 (http://localhost:3000)
npm run build            # 프로덕션 빌드
npm run start            # 프로덕션 서버 시작
npm run lint             # ESLint 검사
npm run lint:fix         # ESLint 자동 수정
```

### 패키지 관리
```bash
npm install package-name    # 패키지 설치
npm uninstall package-name  # 패키지 제거
npm update                  # 패키지 업데이트
```

---

## 📚 **문서 인덱스**

| 디렉토리 | README 경로 | 주요 내용 |
|---------|------------|----------|
| **전체 구조** | `DIRECTORY_STRUCTURE.md` | 프로젝트 개요 |
| **소스 코드** | `src/README.md` | src 폴더 구조 |
| **페이지** | `src/app/README.md` | App Router 페이지 |
| **컴포넌트** | `src/components/README.md` | UI 컴포넌트 |
| **API** | `src/lib/README.md` | API 클라이언트 |
| **레이아웃** | `src/layout/README.md` | 레이아웃 구조 |
| **테마** | `src/themes/README.md` | MUI 테마 설정 |
| **유틸리티** | `src/utils/README.md` | 헬퍼 함수 |
| **정적 파일** | `public/README.md` | 이미지, 아이콘 |

---

## 🚀 **개발 시작하기**

### 1. 환경 설정
```bash
cd seed
npm install
```

### 2. 환경변수 설정
```bash
# .env.local 파일 생성
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. 개발 서버 시작
```bash
npm run dev
```

### 4. 브라우저에서 확인
```
http://localhost:3000
```

---

## 🔗 Backend Integration

### API 연결 확인
```javascript
// src/lib/api/campaigns.js
const API_BASE_URL = 'http://localhost:8000/api';

// 백엔드 서버가 실행 중이어야 함
// backend/start_all.bat 또는 uvicorn 실행
```

### Supabase 연결 확인
```javascript
// src/lib/supabase.js
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 환경변수가 설정되어 있어야 함
```

---

## 🎉 **완료!**

**이제 프론트엔드 프로젝트의 모든 파일 위치를 쉽게 찾을 수 있습니다!**

궁금한 기능이 있다면:
1. **[NAVIGATION_GUIDE.md](NAVIGATION_GUIDE.md)** 에서 파일 위치 찾기 (현재 문서)
2. 해당 디렉토리의 **README.md** 읽기
3. 파일 열어서 코드 확인

---

**최종 업데이트**: 2025-11-03  
**작성자**: Frontend Team  
**버전**: 1.0

