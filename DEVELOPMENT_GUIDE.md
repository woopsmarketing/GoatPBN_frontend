# 🎯 MVP 대시보드 개발 가이드

## 📋 프로젝트 개요
ThemeForest Able Pro 템플릿을 기반으로 한 커스텀 대시보드 개발
- **목표**: 빠른 MVP 개발 및 클라이언트 맞춤형 대시보드 구축
- **전략**: MUI → Tailwind 점진적 마이그레이션
- **기간**: 약 2-3주 예상

## 🛠️ 기술 스택
- **Frontend**: Next.js 15.5.2 + Tailwind CSS
- **Backend**: FastAPI (향후 연동)
- **Authentication**: NextAuth.js
- **UI Components**: 커스텀 Tailwind 컴포넌트
- **State Management**: React Context + SWR

## 📁 프로젝트 구조 (목표)
```
src/
├── components/
│   ├── ui/              # Tailwind 기반 재사용 컴포넌트
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Input.jsx
│   │   └── Modal.jsx
│   ├── layout/          # 레이아웃 컴포넌트
│   └── forms/           # 폼 관련 컴포넌트
├── lib/
│   ├── api.js           # API 호출 중앙 관리
│   ├── utils.js         # 공통 유틸리티
│   └── constants.js     # 상수 관리
├── data/
│   ├── mock/            # Mock 데이터
│   └── schemas/         # 데이터 스키마
└── styles/
    └── globals.css      # Tailwind + 커스텀 스타일
```

## 🎨 디자인 시스템 계획
### 색상 팔레트
```css
/* Primary Colors */
--primary-50: #eff6ff;
--primary-500: #3b82f6;
--primary-900: #1e3a8a;

/* Neutral Colors */
--gray-50: #f9fafb;
--gray-500: #6b7280;
--gray-900: #111827;
```

### 타이포그래피
- **제목**: font-bold text-2xl/3xl
- **부제목**: font-semibold text-lg/xl
- **본문**: font-normal text-sm/base

## 🚀 개발 단계별 체크리스트

### ✅ 1단계: 환경 설정
- [ ] Tailwind CSS 설치 및 설정
- [ ] 기본 유틸리티 라이브러리 설치
- [ ] 폴더 구조 정리
- [ ] 디자인 토큰 설정

### ⏳ 2단계: 핵심 컴포넌트
- [ ] Button 컴포넌트 (variants: primary, secondary, danger)
- [ ] Card 컴포넌트 (shadow, border, padding 옵션)
- [ ] Input/Form 컴포넌트 (validation 포함)
- [ ] Navigation 컴포넌트 (sidebar, header)

### 📋 3단계: 페이지 개발
- [ ] 로그인/회원가입 페이지 리디자인
- [ ] 대시보드 메인 페이지
- [ ] 사용자 관리 페이지
- [ ] 설정 페이지

### 🔌 4단계: 백엔드 연동
- [ ] Mock 데이터 구조 설계
- [ ] API 인터페이스 설계
- [ ] FastAPI 백엔드 구현
- [ ] 에러 핸들링 및 로딩 상태

## 💡 개발 팁
1. **컴포넌트 우선**: 재사용 가능한 작은 컴포넌트부터 시작
2. **모바일 퍼스트**: 작은 화면부터 디자인 후 확장
3. **점진적 마이그레이션**: 한 번에 모든 것을 바꾸지 말고 점진적으로
4. **성능 고려**: 불필요한 리렌더링 방지, 이미지 최적화

## 🎯 MVP 핵심 기능
- [ ] 사용자 인증 (로그인/로그아웃)
- [ ] 대시보드 메인 화면
- [ ] 기본적인 데이터 표시 (테이블, 카드)
- [ ] 반응형 디자인
- [ ] 기본적인 CRUD 기능

## 📞 다음 단계
1. Tailwind CSS 설치 및 기본 설정
2. 첫 번째 컴포넌트 (Button) 제작
3. 기존 MUI 컴포넌트와 비교 테스트
