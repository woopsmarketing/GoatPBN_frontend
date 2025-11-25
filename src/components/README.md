# 📁 src/components/ Directory

## 🎯 Purpose

재사용 가능한 React 컴포넌트 모음입니다.
UI 컴포넌트, 카드, 로고, 확장 컴포넌트를 포함합니다.

---

## 📂 Directory Structure

```
components/
├── ui/                    # 🎨 기본 UI 컴포넌트
├── cards/                 # 📇 카드 컴포넌트
├── @extended/             # 🔧 확장 컴포넌트 (MUI 커스터마이징)
├── logo/                  # 🎨 로고 컴포넌트
├── third-party/           # 🔌 서드파티 컴포넌트
├── KeywordGenerator.jsx  # 🔑 키워드 생성기 컴포넌트
├── Loader.jsx            # ⏳ 로딩 스피너
├── MainCard.jsx          # 📇 메인 카드 컴포넌트
├── Locales.jsx           # 🌍 다국어 선택기
├── RTLLayout.jsx         # ↔️ RTL 레이아웃
└── ScrollTop.jsx         # ⬆️ 맨 위로 버튼
```

---

## 📋 Component Categories

### 🎨 **UI Components** (`/ui`)

#### `SimpleButton.jsx`

- 간단한 버튼 컴포넌트
- Tailwind CSS 기반

#### `TailwindButton.jsx`

- Tailwind 스타일 버튼
- 다양한 variant 지원

**사용 예시**:

```jsx
import { SimpleButton } from '@/components/ui/SimpleButton';

<SimpleButton onClick={handleClick} variant="primary">
  클릭하세요
</SimpleButton>;
```

---

### 📇 **Card Components** (`/cards`)

#### `cards/statistics/AnalyticEcommerce.jsx`

- 통계 카드 컴포넌트
- 대시보드에서 KPI 표시용

**사용 예시**:

```jsx
import AnalyticEcommerce from '@/components/cards/statistics/AnalyticEcommerce';

<AnalyticEcommerce title="총 캠페인" count="24" percentage={15.5} extra="지난주 대비" />;
```

---

### 🔧 **Extended Components** (`/@extended`)

**Material-UI 컴포넌트 확장 및 커스터마이징**

#### `AnimateButton.jsx`

- 버튼 애니메이션 래퍼
- 클릭 효과, 호버 효과

#### `Avatar.jsx`

- 커스텀 아바타 컴포넌트
- 색상, 크기 변형 지원

#### `Breadcrumbs.jsx`

- 페이지 경로 표시
- 자동 경로 생성

#### `IconButton.jsx`

- 아이콘 버튼 확장
- 툴팁 지원

#### `Snackbar.jsx`

- 알림 메시지
- 성공/경고/에러 타입

#### `Transitions.jsx`

- 페이지 전환 애니메이션
- Fade, Slide, Grow 등

**사용 예시**:

```jsx
import AnimateButton from '@/components/@extended/AnimateButton';
import Avatar from '@/components/@extended/Avatar';
import { openSnackbar } from '@/components/@extended/Snackbar';

// 애니메이션 버튼
<AnimateButton>
  <Button>클릭</Button>
</AnimateButton>

// 아바타
<Avatar alt="User" src="/path/to/image.jpg" />

// 스낵바 (알림)
openSnackbar({
  open: true,
  message: '저장되었습니다',
  variant: 'alert',
  alert: { color: 'success' }
});
```

---

### 🎨 **Logo Components** (`/logo`)

#### `index.jsx`

- 로고 메인 컴포넌트
- 반응형 크기 조절

#### `LogoMain.jsx`

- 전체 로고 (아이콘 + 텍스트)

#### `LogoIcon.jsx`

- 로고 아이콘만

**사용 예시**:

```jsx
import Logo from '@/components/logo';
import LogoIcon from '@/components/logo/LogoIcon';

// 전체 로고
<Logo />

// 아이콘만
<LogoIcon />
```

---

### 🔌 **Third-Party** (`/third-party`)

#### `SimpleBar.jsx`

- 커스텀 스크롤바
- 스타일링된 스크롤

**사용 예시**:

```jsx
import SimpleBar from '@/components/third-party/SimpleBar';

<SimpleBar style={{ maxHeight: 400 }}>{/* 스크롤 가능한 콘텐츠 */}</SimpleBar>;
```

---

## 🔧 **Utility Components**

### `KeywordGenerator.jsx` 🔑

**키워드 생성기 UI 컴포넌트**

**기능**:

- 메인 키워드 입력
- LSI/롱테일 키워드 자동 생성
- 백엔드 API 호출

**사용**:

```jsx
import KeywordGenerator from '@/components/KeywordGenerator';

<KeywordGenerator onGenerate={handleKeywords} />;
```

---

### `Loader.jsx` ⏳

**전역 로딩 스피너**

**사용**:

```jsx
import Loader from '@/components/Loader';

{
  isLoading && <Loader />;
}
```

---

### `MainCard.jsx` 📇

**메인 카드 래퍼**

**기능**:

- 표준 카드 레이아웃
- 그림자, 패딩 일관성

**사용**:

```jsx
import MainCard from '@/components/MainCard';

<MainCard title="제목" secondary={<Button>액션</Button>}>
  {/* 카드 내용 */}
</MainCard>;
```

---

### `Locales.jsx` 🌍

**다국어 선택기**

**지원 언어**:

- 한국어 (ko)
- English (en)
- Français (fr)
- 中文 (zh)
- Română (ro)

---

### `ScrollTop.jsx` ⬆️

**맨 위로 스크롤 버튼**

**기능**:

- 스크롤 감지
- 일정 이상 스크롤 시 버튼 표시
- 클릭 시 맨 위로 이동

---

## 🎯 How to Create New Component

### 1. 기본 컴포넌트

```jsx
// components/MyComponent.jsx
'use client';

export default function MyComponent({ title, children }) {
  return (
    <div className="my-component">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
```

### 2. MUI 확장 컴포넌트

```jsx
// components/@extended/MyExtendedButton.jsx
import { Button } from '@mui/material';
import { forwardRef } from 'react';

const MyExtendedButton = forwardRef(({ children, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      {...props}
      sx={
        {
          /* 커스텀 스타일 */
        }
      }
    >
      {children}
    </Button>
  );
});

export default MyExtendedButton;
```

### 3. 사용

```jsx
import MyComponent from '@/components/MyComponent';

<MyComponent title="제목">내용</MyComponent>;
```

---

## 🔍 Quick Reference

| 컴포넌트 종류 | 위치         | 용도                |
| ------------- | ------------ | ------------------- |
| **기본 UI**   | `ui/`        | 버튼, 입력 등       |
| **카드**      | `cards/`     | 통계 카드           |
| **MUI 확장**  | `@extended/` | 커스텀 MUI          |
| **로고**      | `logo/`      | 브랜드 로고         |
| **유틸리티**  | 루트 레벨    | Loader, MainCard 등 |

---

## ⚠️ Important Notes

### Client vs Server Components

- UI 컴포넌트는 대부분 **Client Component** (`'use client'`)
- 상태(useState), 이벤트(onClick) 사용 시 필수

### Import Alias

```jsx
// ✅ 절대 경로 사용
import MyComponent from '@/components/MyComponent';

// ❌ 상대 경로 지양
import MyComponent from '../components/MyComponent';
```

### Component Naming

- 파일명: PascalCase (`MyComponent.jsx`)
- 컴포넌트명: 파일명과 동일
- 폴더명: kebab-case (`my-component/`)

---

## 🔗 Related Files

- **페이지에서 사용**: `../app/`
- **레이아웃에서 사용**: `../layout/`
- **테마 스타일**: `../themes/`

---

**최종 업데이트**: 2025-11-03  
**작성자**: Frontend Team
