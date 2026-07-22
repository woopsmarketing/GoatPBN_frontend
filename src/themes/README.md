# 📁 src/themes/ Directory

## 🎯 Purpose

Material-UI 테마 설정 및 커스터마이징 파일입니다.
색상, 타이포그래피, 컴포넌트 스타일을 정의합니다.

---

## 📂 Directory Structure

```
themes/
├── index.jsx              # 🎨 메인 테마 Provider
├── palette.js             # 🎨 색상 팔레트 정의
├── typography.js          # 📝 폰트 및 타이포그래피
├── shadows.jsx            # 🌑 그림자 효과
├── emotionCache.jsx       # 🎭 Emotion 캐시 설정
├── theme/                 # 🎨 테마 프리셋
│   ├── index.js           # 테마 선택 로직
│   ├── default.js         # 기본 테마
│   ├── theme1.js          # 테마 1
│   ├── theme2.js          # 테마 2
│   └── ...                # 테마 3~8
└── overrides/             # 🔧 컴포넌트 오버라이드
    ├── index.js           # 모든 오버라이드 통합
    ├── Button.js          # Button 커스터마이징
    ├── Chip.js            # Chip 커스터마이징
    └── ...                # 50+ 컴포넌트 오버라이드
```

---

## 🎨 **Core Theme Files**

### `index.jsx` ⭐ **메인 테마 Provider**

**전체 앱에 테마 적용**

```jsx
import { ThemeProvider } from '@mui/material/styles';
import Palette from './palette';
import Typography from './typography';
import CustomShadows from './shadows';
import componentsOverride from './overrides';

export default function ThemeCustomization({ children }) {
  const theme = React.useMemo(() => {
    return createTheme({
      palette: Palette(),
      typography: Typography(),
      shadows: CustomShadows(),
      components: componentsOverride()
    });
  }, []);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
```

---

### `palette.js` 🎨 **색상 팔레트**

**전체 색상 시스템 정의**

```javascript
export default function Palette() {
  return {
    mode: 'light', // 'light' | 'dark'

    // Primary Color
    primary: {
      main: '#3B82F6', // Blue
      light: '#60A5FA',
      dark: '#2563EB',
      contrastText: '#fff'
    },

    // Secondary Color
    secondary: {
      main: '#8B5CF6', // Purple
      light: '#A78BFA',
      dark: '#7C3AED'
    },

    // Success, Error, Warning, Info
    success: { main: '#10B981' }, // Green
    error: { main: '#EF4444' }, // Red
    warning: { main: '#F59E0B' }, // Yellow
    info: { main: '#3B82F6' }, // Blue

    // Gray Scale
    grey: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB'
      // ... 900까지
    }
  };
}
```

**사용 예시**:

```jsx
import { useTheme } from '@mui/material/styles';

const theme = useTheme();
const primaryColor = theme.palette.primary.main; // '#3B82F6'
```

---

### `typography.js` 📝 **타이포그래피**

**폰트 및 텍스트 스타일 정의**

```javascript
export default function Typography() {
  return {
    fontFamily: "'Public Sans', sans-serif",

    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700
    }
    // h3 ~ h6, body1, body2, caption 등
  };
}
```

---

### `shadows.jsx` 🌑 **그림자 효과**

**카드, 버튼 등의 그림자 정의**

```javascript
export default function Shadows(theme) {
  return [
    'none',
    '0px 2px 4px rgba(0,0,0,0.1)', // shadow[1]
    '0px 4px 8px rgba(0,0,0,0.1)' // shadow[2]
    // ... 24단계까지
  ];
}
```

---

## 🎨 **Theme Presets** (`/theme`)

### 8가지 테마 프리셋 제공

| 테마        | 파일         | 주요 색상 |
| ----------- | ------------ | --------- |
| **Default** | `default.js` | Blue      |
| **Theme 1** | `theme1.js`  | Purple    |
| **Theme 2** | `theme2.js`  | Green     |
| **Theme 3** | `theme3.js`  | Orange    |
| **Theme 4** | `theme4.js`  | Red       |
| **Theme 5** | `theme5.js`  | Cyan      |
| **Theme 6** | `theme6.js`  | Pink      |
| **Theme 7** | `theme7.js`  | Indigo    |
| **Theme 8** | `theme8.js`  | Teal      |

**테마 전환**:

```jsx
import { useConfig } from '@/hooks/useConfig';

const { onChangePresetColor } = useConfig();

// 테마 변경
onChangePresetColor('theme1'); // Purple 테마로 변경
```

---

## 🔧 **Component Overrides** (`/overrides`)

### 50+ MUI 컴포넌트 커스터마이징

**주요 오버라이드**:

#### `Button.js`

```javascript
export default function Button(theme) {
  return {
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none', // 대문자 변환 비활성화
          fontWeight: 600
        },
        contained: {
          boxShadow: theme.shadows[2]
        }
      }
    }
  };
}
```

#### `Chip.js`

- 칩 스타일 커스터마이징
- 색상별 variant

#### `Tab.js`

- 탭 스타일
- 활성 탭 하이라이트

#### `TableCell.js`

- 테이블 셀 패딩
- 경계선 스타일

**전체 오버라이드 목록**:

- Accordion, Alert, Autocomplete, Badge, Button, Checkbox, Chip, Dialog, Drawer, Fab, Input, Link, Pagination, Popover, Radio, Slider, Switch, Tab, Table, Tooltip, Typography 등 50+

---

## 🔧 How to Customize

### 1. 색상 변경

```javascript
// palette.js 수정
primary: {
  main: '#FF5722',  // Orange로 변경
}
```

### 2. 폰트 변경

```javascript
// typography.js 수정
fontFamily: ("'Noto Sans KR', sans-serif",
  (
    // public/index.html에 폰트 추가 필요
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR" />
  ));
```

### 3. 버튼 스타일 변경

```javascript
// overrides/Button.js 수정
styleOverrides: {
  root: {
    borderRadius: 12,        // 더 둥글게
    padding: '12px 24px'     // 패딩 증가
  }
}
```

### 4. 다크모드 토글

```jsx
import { useConfig } from '@/hooks/useConfig';

const { mode, onChangeMode } = useConfig();

// 다크모드 전환
onChangeMode(mode === 'light' ? 'dark' : 'light');
```

---

## 🎨 **Theme Context**

### ConfigContext 사용

```jsx
import { useConfig } from '@/hooks/useConfig';

const {
  mode, // 'light' | 'dark'
  presetColor, // 'default' | 'theme1' | ...
  fontFamily, // 폰트 패밀리
  borderRadius, // 기본 border radius
  onChangeMode, // 모드 변경 함수
  onChangePresetColor // 프리셋 변경 함수
} = useConfig();
```

---

## 🔍 Quick Reference

| 수정하고 싶은 내용 | 파일                     |
| ------------------ | ------------------------ |
| **색상 변경**      | `palette.js`             |
| **폰트 변경**      | `typography.js`          |
| **그림자 효과**    | `shadows.jsx`            |
| **버튼 스타일**    | `overrides/Button.js`    |
| **테이블 스타일**  | `overrides/TableCell.js` |
| **테마 전체**      | `theme/default.js`       |
| **새 테마 추가**   | `theme/theme9.js` (생성) |

---

## 🎯 **Tailwind CSS Integration**

### Tailwind + MUI 동시 사용

```jsx
// ✅ MUI 컴포넌트에 Tailwind 클래스 적용 가능
<Button className="mt-4 px-6">버튼</Button>

// ✅ Tailwind와 MUI sx 동시 사용
<Box className="flex gap-4" sx={{ p: 2 }}>
  {/* 콘텐츠 */}
</Box>
```

---

## ⚠️ Important Notes

### Theme Override 우선순위

```
1. Inline sx prop (최우선)
2. Component overrides (themes/overrides/)
3. Theme defaults (palette, typography)
4. MUI defaults (최하위)
```

### 성능 최적화

- `React.useMemo`로 테마 메모이제이션
- 불필요한 재렌더링 방지

---

## 🔗 Related Files

- **전역 설정**: `../config.js`
- **Context**: `../contexts/ConfigContext.jsx`
- **Hook**: `../hooks/useConfig.js`

---

**최종 업데이트**: 2025-11-03  
**작성자**: Frontend Team
