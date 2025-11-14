# 📁 Frontend (Seed) Directory Structure

## 🎯 Overview
PBN SaaS 프론트엔드 Next.js 프로젝트의 전체 디렉토리 구조 및 파일 위치 가이드입니다.
각 디렉토리별 상세 설명은 해당 폴더의 README.md를 참조하세요.

---

## 📂 Root Level (`/seed`)

### ⚙️ **설정 파일** (Configuration)
- `package.json` - 📦 **npm 패키지 의존성** (Next.js, React, MUI 등)
- `next.config.js` - ⚡ **Next.js 설정** (빌드, 이미지 최적화)
- `tailwind.config.js` - 🎨 **Tailwind CSS 설정**
- `postcss.config.js` - 🎨 **PostCSS 설정**
- `jsconfig.json` - 📝 **JavaScript/TypeScript 경로 설정**
- `eslint.config.mjs` - ✅ **ESLint 코드 스타일 검사**
- `.prettierrc` - 💅 **Prettier 코드 포맷팅**
- `.gitignore` - 🚫 **Git 무시 파일 목록**

### 📚 **문서화** (Documentation)
- `PRD.md` - 📋 **Product Requirements Document** (제품 요구사항)
- `backend_setup.md` - 🔧 백엔드 연동 가이드
- `DEVELOPMENT_GUIDE.md` - 👨‍💻 개발 가이드
- `TAILWIND_MIGRATION_PLAN.md` - 🎨 Tailwind 마이그레이션 계획
- `CONVERSION_EXAMPLE.md` - 🔄 변환 예제
- `PRACTICAL_WORKFLOW.md` - 🔄 실무 워크플로우
- `GRADUAL_MIGRATION_PLAN.md` - 📈 점진적 마이그레이션 계획
- `BEGINNER_GUIDE.md` - 🌱 초보자 가이드
- `SETUP_COMMANDS.md` - ⚙️ 설정 명령어

### 🔒 **잠금 파일** (Lock Files)
- `package-lock.json` - npm 의존성 잠금
- `yarn.lock` - yarn 의존성 잠금

---

## 📂 Main Directories

### 1. `/src` - 🎯 **핵심 소스 코드**
> Next.js App Router, 컴포넌트, 비즈니스 로직
- **상세 문서**: `src/README.md`

**주요 하위 디렉토리**:
- `app/` - Next.js 13+ App Router (페이지 라우팅)
- `components/` - 재사용 가능한 React 컴포넌트
- `lib/` - API 클라이언트, 유틸리티 함수
- `layout/` - 레이아웃 컴포넌트 (대시보드, 인증)
- `views/` - 페이지별 뷰 컴포넌트
- `themes/` - MUI 테마 설정
- `utils/` - 유틸리티 함수
- `contexts/` - React Context (전역 상태)
- `hooks/` - Custom React Hooks
- `menu-items/` - 사이드바 메뉴 구성

### 2. `/public` - 🖼️ **정적 파일**
> 이미지, 아이콘, 정적 에셋
- **상세 문서**: `public/README.md`

---

## 🔍 Quick Navigation

### 어디서 무엇을 수정해야 할까?

| 수정하고 싶은 내용 | 파일 위치 |
|------------------|----------|
| **페이지 추가/수정** | `src/app/(dashboard)/` |
| **컴포넌트 수정** | `src/components/` |
| **API 호출 로직** | `src/lib/api/` |
| **레이아웃 변경** | `src/layout/` |
| **메뉴 구성** | `src/menu-items/` |
| **테마/스타일** | `src/themes/` |
| **Mock 데이터** | `src/data/mockData.js` |
| **이미지/아이콘** | `public/assets/images/` |

---

## 🚀 Development Commands

### 개발 서버 시작
```bash
npm run dev
# or
yarn dev

# 접속: http://localhost:3000
```

### 빌드
```bash
npm run build
# or
yarn build
```

### 프로덕션 실행
```bash
npm run start
# or
yarn start
```

### 코드 검사
```bash
npm run lint
# or
yarn lint
```

---

## 🎯 디렉토리별 상세 문서

각 디렉토리에는 해당 폴더의 파일들과 기능을 설명하는 `README.md`가 있습니다:

1. 📁 **[src/README.md](src/README.md)** - 소스 코드 전체 구조
2. 📁 **[src/app/README.md](src/app/README.md)** - Next.js App Router 페이지
3. 📁 **[src/components/README.md](src/components/README.md)** - React 컴포넌트
4. 📁 **[src/lib/README.md](src/lib/README.md)** - API & 유틸리티
5. 📁 **[src/layout/README.md](src/layout/README.md)** - 레이아웃 컴포넌트
6. 📁 **[src/themes/README.md](src/themes/README.md)** - MUI 테마 설정
7. 📁 **[public/README.md](public/README.md)** - 정적 파일

---

## 📊 Technology Stack

### Core
- **Next.js 14** - React 프레임워크
- **React 18** - UI 라이브러리
- **Material-UI (MUI)** - UI 컴포넌트 라이브러리

### Styling
- **Tailwind CSS** - 유틸리티 CSS 프레임워크
- **Emotion** - CSS-in-JS (MUI 사용)

### State Management
- **React Context API** - 전역 상태 관리
- **Custom Hooks** - 로컬 상태 관리

### API Communication
- **Axios** - HTTP 클라이언트
- **Supabase Client** - 데이터베이스 연동

---

## 🔗 Backend Integration

### API Base URLs
```javascript
// Development
const API_BASE_URL = "http://localhost:8000/api"

// Production
const API_BASE_URL = "https://your-domain.com/api"
```

### 주요 API 연결
- `src/lib/api/campaigns.js` → `http://localhost:8000/api/campaigns`
- `src/lib/api/logs.js` → `http://localhost:8000/api/logs`
- `src/lib/supabase.js` → Supabase 직접 연결

---

**최종 업데이트**: 2025-11-03  
**작성자**: Frontend Team

