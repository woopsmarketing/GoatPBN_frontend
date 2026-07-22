# 📁 src/layout/ Directory

## 🎯 Purpose

페이지 레이아웃 컴포넌트입니다.
대시보드 레이아웃, 인증 레이아웃 등 페이지 구조를 정의합니다.

---

## 📂 Directory Structure

```
layout/
├── DashboardLayout/       # 📊 대시보드 레이아웃 (메인)
│   ├── Drawer/            # 🗂️ 사이드바
│   ├── Header/            # 📌 상단 헤더
│   ├── Footer.jsx         # 📌 하단 푸터
│   └── index.jsx          # 메인 레이아웃 컴포넌트
└── SimpleLayout/          # 📄 간단한 레이아웃
    ├── Header.jsx         # 📌 헤더만
    ├── FooterBlock.jsx    # 📌 푸터
    └── index.jsx          # 메인 레이아웃
```

---

## 📊 **DashboardLayout** ⭐

### `index.jsx` - **메인 레이아웃**

**구조**:

```
┌─────────────────────────────────┐
│         Header                   │ ← 검색, 알림, 프로필
├──────────┬──────────────────────┤
│          │                       │
│  Drawer  │     Main Content      │ ← 페이지 내용
│ (사이드바) │                       │
│          │                       │
│          │                       │
├──────────┴──────────────────────┤
│         Footer                   │
└─────────────────────────────────┘
```

**기능**:

- 반응형 레이아웃 (모바일, 태블릿, 데스크톱)
- 사이드바 토글 (열기/닫기)
- 스크롤 복원
- 브레드크럼 자동 생성

---

### **Drawer** (`/Drawer`) - 🗂️ **사이드바**

**주요 파일**:

- `index.jsx` - 사이드바 메인 컴포넌트
- `DrawerHeader.jsx` - 사이드바 헤더 (로고)
- `DrawerContent/index.jsx` - 사이드바 콘텐츠
- `DrawerContent/Navigation/index.jsx` - 네비게이션 메뉴
- `DrawerContent/NavCard.jsx` - 하단 카드 (업그레이드 등)

**메뉴 구조**:

```javascript
// src/menu-items/pbn-dashboard.js에서 정의
- 📊 대시보드
- 📈 통계
- 🎯 캠페인
  - 캠페인 목록
  - 캠페인 생성
- 📋 로그
- 📊 보고서
- 🌐 사이트 관리
- 🔧 도구
```

**기능**:

- 메뉴 아이템 렌더링
- 활성 메뉴 하이라이트
- 아이콘 + 텍스트
- 중첩 메뉴 지원

---

### **Header** (`/Header`) - 📌 **상단 헤더**

**주요 파일**:

- `index.jsx` - 헤더 메인
- `HeaderContent/index.jsx` - 헤더 콘텐츠
- `HeaderContent/Profile/index.jsx` - 프로필 드롭다운
- `HeaderContent/Notification.jsx` - 알림 아이콘
- `HeaderContent/Search.jsx` - 검색 박스
- `HeaderContent/MobileSection.jsx` - 모바일 뷰

**기능**:

- 햄버거 메뉴 (모바일)
- 검색 기능
- 알림 센터
- 프로필 드롭다운 (설정, 로그아웃)
- 다국어 선택
- 테마 토글 (라이트/다크)

---

### `Footer.jsx` - **푸터**

- 저작권 정보
- 링크 (개인정보처리방침, 이용약관 등)

---

## 📄 **SimpleLayout**

### 구조

```
┌─────────────────────────────────┐
│         Header                   │ ← 로고만
├─────────────────────────────────┤
│                                  │
│       Main Content               │ ← 페이지 내용
│                                  │
├─────────────────────────────────┤
│         Footer                   │
└─────────────────────────────────┘
```

**용도**:

- 인증 페이지 (로그인, 회원가입)
- 공개 페이지 (문의하기)
- 사이드바가 필요 없는 페이지

---

## 🔧 How to Modify

### 사이드바 메뉴 추가

```javascript
// 1. src/menu-items/pbn-dashboard.js 수정
{
  id: 'new-menu',
  title: '새 메뉴',
  type: 'item',
  url: '/new-page',
  icon: icons.NewIcon
}

// 2. 자동으로 사이드바에 표시됨
```

### 헤더 버튼 추가

```jsx
// Drawer/Header/HeaderContent/index.jsx 수정
<Box>
  {/* 기존 버튼들... */}
  <IconButton onClick={handleNewAction}>
    <NewIcon />
  </IconButton>
</Box>
```

### 레이아웃 스타일 변경

```jsx
// DashboardLayout/index.jsx 수정
<Box sx={{
  display: 'flex',
  width: '100%',
  minHeight: '100vh',
  // 커스텀 스타일 추가
}}>
```

---

## 🎨 **Layout Customization**

### 사이드바 너비 변경

```javascript
// src/config.js
export const drawerWidth = 260; // 기본값
```

### 헤더 높이 변경

```javascript
// themes에서 설정
const headerHeight = 60; // px
```

### 반응형 브레이크포인트

```javascript
// MUI 기본값 사용
- xs: 0px
- sm: 600px
- md: 900px
- lg: 1200px
- xl: 1536px
```

---

## 🔍 Quick Reference

| 컴포넌트              | 위치                        | 역할                     |
| --------------------- | --------------------------- | ------------------------ |
| **대시보드 레이아웃** | `DashboardLayout/index.jsx` | 사이드바 + 헤더 + 콘텐츠 |
| **사이드바**          | `DashboardLayout/Drawer/`   | 네비게이션 메뉴          |
| **헤더**              | `DashboardLayout/Header/`   | 검색, 알림, 프로필       |
| **간단한 레이아웃**   | `SimpleLayout/index.jsx`    | 헤더만                   |

---

## ⚠️ Important Notes

### 레이아웃 적용

```jsx
// src/app/(dashboard)/layout.jsx
import DashboardLayout from '@/layout/DashboardLayout';

export default function Layout({ children }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
```

### 레이아웃 없는 페이지

```jsx
// src/app/(blank)/layout.jsx
export default function BlankLayout({ children }) {
  return <>{children}</>; // 레이아웃 없이 콘텐츠만
}
```

---

## 🔗 Related Files

- **메뉴 구성**: `../menu-items/`
- **테마**: `../themes/`
- **페이지**: `../app/`
- **설정**: `../config.js`

---

**최종 업데이트**: 2025-11-03  
**작성자**: Frontend Team
