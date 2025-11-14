# 📚 PBN SaaS Frontend - Complete Index

## 🎯 문서 체계

이 프론트엔드 프로젝트는 **계층적 문서 구조**를 사용합니다.
각 디렉토리마다 해당 폴더의 파일들을 설명하는 README.md가 있습니다.

---

## 📖 Main Documentation

### 🌟 **시작하기**
1. **[DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md)** - 📁 전체 디렉토리 구조 개요
2. **[NAVIGATION_GUIDE.md](NAVIGATION_GUIDE.md)** - 🗺️ 기능별 파일 위치 빠른 찾기 ⭐
3. **[DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)** - 👨‍💻 개발 가이드

### 📚 **프로젝트 정보**
- **[PRD.md](PRD.md)** - 📋 Product Requirements Document (제품 요구사항 명세)
- **[backend_setup.md](backend_setup.md)** - 🔧 백엔드 연동 가이드

### 🎨 **마이그레이션 & 변환**
- **[TAILWIND_MIGRATION_PLAN.md](TAILWIND_MIGRATION_PLAN.md)** - 🎨 Tailwind 마이그레이션 계획
- **[GRADUAL_MIGRATION_PLAN.md](GRADUAL_MIGRATION_PLAN.md)** - 📈 점진적 마이그레이션 계획
- **[CONVERSION_EXAMPLE.md](CONVERSION_EXAMPLE.md)** - 🔄 MUI → Tailwind 변환 예제
- **[PRACTICAL_WORKFLOW.md](PRACTICAL_WORKFLOW.md)** - 🔄 실무 워크플로우

### 🌱 **초보자 가이드**
- **[BEGINNER_GUIDE.md](BEGINNER_GUIDE.md)** - 🌱 Next.js + React 초보자 가이드
- **[SETUP_COMMANDS.md](SETUP_COMMANDS.md)** - ⚙️ 설정 명령어 모음

---

## 📂 디렉토리별 README

### 🎯 **핵심 소스 코드**
- **[src/README.md](src/README.md)** - 소스 코드 전체 구조
  - **[src/app/README.md](src/app/README.md)** - 📄 Next.js App Router 페이지
  - **[src/components/README.md](src/components/README.md)** - 🧩 React 컴포넌트
  - **[src/lib/README.md](src/lib/README.md)** - 📚 API & 유틸리티
  - **[src/layout/README.md](src/layout/README.md)** - 🎨 레이아웃 컴포넌트
  - **[src/themes/README.md](src/themes/README.md)** - 🎨 MUI 테마 설정
  - **[src/utils/README.md](src/utils/README.md)** - 🛠️ 유틸리티

### 🖼️ **정적 파일**
- **[public/README.md](public/README.md)** - 🖼️ 이미지, 아이콘, SVG

---

## 🎯 핵심 파일 Top 10

| 순위 | 파일 | 역할 | 중요도 |
|-----|------|------|--------|
| 1 | `src/app/(dashboard)/campaigns/page.jsx` | 캠페인 목록 페이지 | ⭐⭐⭐ |
| 2 | `src/app/(dashboard)/dashboard/page.jsx` | 메인 대시보드 | ⭐⭐⭐ |
| 3 | `src/lib/api/campaigns.js` | 캠페인 API 클라이언트 | ⭐⭐⭐ |
| 4 | `src/layout/DashboardLayout/index.jsx` | 대시보드 레이아웃 | ⭐⭐ |
| 5 | `src/app/(dashboard)/logs/page.jsx` | 로그 페이지 | ⭐⭐ |
| 6 | `src/themes/palette.js` | 색상 테마 | ⭐⭐ |
| 7 | `src/lib/supabase.js` | Supabase 연결 | ⭐⭐ |
| 8 | `src/menu-items/pbn-dashboard.js` | 메뉴 구성 | ⭐⭐ |
| 9 | `src/utils/timezone.js` | 시간대 변환 | ⭐ |
| 10 | `src/components/MainCard.jsx` | 메인 카드 | ⭐ |

---

## 🚀 Quick Start

### 최초 설정
```bash
# 1. 패키지 설치
cd seed
npm install

# 2. 환경변수 설정
cp .env.example .env.local
# .env.local 파일 편집

# 3. 개발 서버 시작
npm run dev

# 4. 브라우저 접속
http://localhost:3000
```

### 백엔드와 함께 실행
```bash
# 터미널 1: 백엔드
cd backend
.\start_all.bat

# 터미널 2: 프론트엔드
cd seed
npm run dev
```

---

## 🔧 일반적인 개발 작업

### 새 페이지 추가
```bash
# 1. 폴더 생성
mkdir -p src/app/(dashboard)/settings

# 2. 페이지 파일 생성
echo "'use client';
export default function SettingsPage() {
  return <div>설정</div>;
}" > src/app/(dashboard)/settings/page.jsx

# 3. 메뉴 추가 (src/menu-items/pbn-dashboard.js)
```

### API 함수 추가
```javascript
// src/lib/api/my_feature.js
export async function getMyData(userId) {
  const response = await axios.get(`/api/my-feature`, {
    params: { user_id: userId }
  });
  return response.data;
}
```

### 컴포넌트 생성
```jsx
// src/components/MyComponent.jsx
'use client';

export default function MyComponent({ title }) {
  return (
    <div className="p-4">
      <h2>{title}</h2>
    </div>
  );
}
```

---

## 🎨 스타일링 가이드

### Tailwind CSS (권장)
```jsx
<div className="
  flex flex-col gap-4
  p-6 
  bg-white dark:bg-gray-800
  rounded-lg shadow-md
  hover:shadow-lg transition-shadow
">
  콘텐츠
</div>
```

### MUI Components
```jsx
import { Button, Card, CardContent } from '@mui/material';

<Card>
  <CardContent>
    <Button variant="contained" color="primary">
      클릭
    </Button>
  </CardContent>
</Card>
```

### 혼합 사용
```jsx
<Button 
  variant="contained" 
  className="mt-4 px-6"
  sx={{ borderRadius: 2 }}
>
  하이브리드 스타일
</Button>
```

---

## 📊 Technology Stack

### Core
- **Next.js 14** - React 프레임워크
- **React 18** - UI 라이브러리
- **TypeScript/JavaScript** - 프로그래밍 언어

### UI Framework
- **Material-UI (MUI) v5** - 컴포넌트 라이브러리
- **Tailwind CSS v3** - 유틸리티 CSS

### State Management
- **React Context API** - 전역 상태
- **useState/useEffect** - 로컬 상태

### API
- **Axios** - HTTP 클라이언트
- **Supabase Client** - 실시간 데이터베이스
- **REST API** - 백엔드 통신

### Styling
- **Emotion** - CSS-in-JS (MUI)
- **PostCSS** - CSS 처리
- **Tailwind CSS** - 유틸리티 클래스

---

## 🔗 Backend Connection

### API Endpoints
```javascript
// Development
http://localhost:8000/api/campaigns
http://localhost:8000/api/logs
http://localhost:8000/api/sites

// API 문서
http://localhost:8000/docs
```

### Supabase Tables
```
- campaigns   (캠페인 데이터)
- logs        (콘텐츠 생성 로그)
- sites       (워드프레스 사이트)
- user_settings (사용자 설정)
```

---

## 📱 **Pages Overview**

### 📊 대시보드 그룹 (`/dashboard/...`)
1. **Dashboard** - 전체 현황 요약, KPI 카드
2. **Statistics** - 성과 분석, 차트, 그래프
3. **Campaigns** - 캠페인 생성/관리
4. **Logs** - 콘텐츠 생성 로그 조회
5. **Reports** - 완료 캠페인 보고서
6. **Sites** - 워드프레스 사이트 관리
7. **Content Generator** - 개별 콘텐츠 생성 도구
8. **Tools** - 키워드/제목 생성 도구

### 🔐 인증 그룹 (`/auth/...`)
1. **Login** - 로그인
2. **Register** - 회원가입
3. **Forgot Password** - 비밀번호 찾기
4. **Check Mail** - 이메일 확인

---

## 🐛 **Debugging**

### 개발자 도구
```
F12 또는 Ctrl+Shift+I
- Console: 콘솔 로그 확인
- Network: API 요청 확인
- React DevTools: 컴포넌트 상태 확인
```

### 로그 확인
```javascript
console.log('디버깅:', data);
console.error('오류:', error);
```

### Hot Reload 문제
```bash
# 서버 재시작
Ctrl+C (종료)
npm run dev (재시작)

# 또는 파일 저장 (Ctrl+S)만으로 자동 리로드
```

---

## 🎉 **완료!**

**프론트엔드 프로젝트 문서화 완료!**

- ✅ 전체 구조 문서 (`DIRECTORY_STRUCTURE.md`)
- ✅ 빠른 네비게이션 가이드 (`NAVIGATION_GUIDE.md`)
- ✅ 디렉토리별 상세 README (7개)
- ✅ 기능별 파일 위치 매핑
- ✅ 코드 예제 및 사용법

**이제 어떤 기능도 쉽게 찾아서 수정할 수 있습니다!** 🚀

---

**최종 업데이트**: 2025-11-03  
**작성자**: Frontend Team  
**버전**: 1.0

