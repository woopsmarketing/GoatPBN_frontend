# 📁 src/ Directory

## 🎯 Purpose
Next.js 프론트엔드의 핵심 소스 코드입니다.
페이지, 컴포넌트, API 연동, 스타일링을 포함합니다.

---

## 📂 Directory Structure

```
src/
├── app/                       # 📄 Next.js App Router (페이지)
├── components/                # 🧩 재사용 컴포넌트
├── lib/                       # 📚 API & 유틸리티
├── layout/                    # 🎨 레이아웃 컴포넌트
├── views/                     # 👁️ 페이지별 뷰 컴포넌트
├── themes/                    # 🎨 MUI 테마 설정
├── utils/                     # 🛠️ 유틸리티 함수
├── contexts/                  # 🌐 React Context
├── hooks/                     # 🪝 Custom Hooks
├── menu-items/                # 📋 메뉴 구성
├── sections/                  # 📦 섹션 컴포넌트
├── data/                      # 💾 Mock 데이터
├── config.js                  # ⚙️ 앱 설정
└── globals.css                # 🎨 전역 CSS
```

---

## 📂 Subdirectories

### 1. `/app` - 📄 **Pages (App Router)**
> Next.js 13+ App Router 기반 페이지 라우팅
- **상세 문서**: `app/README.md`

**주요 그룹**:
- `(dashboard)/` - 대시보드 페이지들
- `(auth)/` - 인증 페이지들 (로그인, 회원가입)
- `(blank)/` - 빈 레이아웃 페이지
- `(simple)/` - 간단한 레이아웃 페이지

### 2. `/components` - 🧩 **Components**
> 재사용 가능한 React 컴포넌트
- **상세 문서**: `components/README.md`

**주요 카테고리**:
- `ui/` - 기본 UI 컴포넌트 (버튼 등)
- `cards/` - 카드 컴포넌트
- `@extended/` - 확장 컴포넌트 (MUI 커스터마이징)
- `logo/` - 로고 컴포넌트

### 3. `/lib` - 📚 **Libraries**
> API 클라이언트, 유틸리티, Supabase 연동
- **상세 문서**: `lib/README.md`

**주요 카테고리**:
- `api/` - 백엔드 API 호출 함수
- `utils/` - 유틸리티 함수
- `cache/` - 캐싱 로직
- `supabase.js` - Supabase 클라이언트

### 4. `/layout` - 🎨 **Layouts**
> 페이지 레이아웃 컴포넌트
- **상세 문서**: `layout/README.md`

**주요 레이아웃**:
- `DashboardLayout/` - 대시보드 레이아웃 (사이드바, 헤더)
- `SimpleLayout/` - 간단한 레이아웃

### 5. `/views` - 👁️ **Views**
> 페이지별 뷰 컴포넌트 (복잡한 UI 로직)
- **상세 문서**: `views/README.md`

### 6. `/themes` - 🎨 **Themes**
> Material-UI 테마 설정 및 커스터마이징
- **상세 문서**: `themes/README.md`

### 7. `/utils` - 🛠️ **Utilities**
> 공통 유틸리티 함수
- **상세 문서**: `utils/README.md`

### 8. `/contexts` - 🌐 **Contexts**
> React Context (전역 상태 관리)

### 9. `/hooks` - 🪝 **Custom Hooks**
> React Custom Hooks

### 10. `/menu-items` - 📋 **Menu Items**
> 사이드바 메뉴 구성 파일

### 11. `/sections` - 📦 **Sections**
> 페이지 섹션 컴포넌트

### 12. `/data` - 💾 **Data**
> Mock 데이터

---

## 🚀 Quick Start

### 개발 서버 시작
```bash
cd seed
npm install  # 최초 1회
npm run dev
```

### 프론트엔드 접속
```
http://localhost:3000
```

---

## 🔍 Quick Reference

| 작업 | 위치 |
|-----|------|
| **대시보드 페이지** | `app/(dashboard)/dashboard/page.jsx` |
| **캠페인 목록** | `app/(dashboard)/campaigns/page.jsx` |
| **로그 페이지** | `app/(dashboard)/logs/page.jsx` |
| **통계 페이지** | `app/(dashboard)/statistics/page.jsx` |
| **사이트 관리** | `app/(dashboard)/sites/page.jsx` |
| **API 호출** | `lib/api/` |
| **Mock 데이터** | `data/mockData.js` |

---

**최종 업데이트**: 2025-11-03  
**작성자**: Frontend Team

