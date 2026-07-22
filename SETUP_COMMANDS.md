# 🚀 즉시 실행 가능한 설정 명령어

## 1️⃣ Tailwind CSS 설치 및 설정
```bash
# 개발 서버 중지 후 실행
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 추가 유틸리티 라이브러리
npm install clsx tailwind-merge
npm install lucide-react  # 아이콘 라이브러리
npm install @headlessui/react  # 접근성 좋은 UI 컴포넌트
```

## 2️⃣ Tailwind 설정 파일 수정
`tailwind.config.js` 파일을 다음과 같이 수정:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/views/**/*.{js,ts,jsx,tsx,mdx}',
    './src/sections/**/*.{js,ts,jsx,tsx,mdx}',
    './src/layout/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          900: '#1e3a8a',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          500: '#6b7280',
          600: '#4b5563',
          900: '#111827',
        }
      }
    },
  },
  plugins: [],
}
```

## 3️⃣ globals.css 파일 수정
`src/app/globals.css` 파일 상단에 Tailwind 지시문 추가:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 기존 스타일들은 그대로 유지 */
```

## 4️⃣ 폴더 구조 생성
```bash
# src 폴더 내에 새로운 구조 생성
mkdir -p src/components/ui
mkdir -p src/lib
mkdir -p src/data/mock
```

## 5️⃣ 첫 번째 Tailwind 컴포넌트 테스트
`src/components/ui/Button.jsx` 파일 생성:

```jsx
// 기본 Tailwind 버튼 컴포넌트
import { clsx } from 'clsx';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  return (
    <button
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
```

## 6️⃣ 개발 서버 재시작
```bash
npm run dev
```

## 7️⃣ 첫 번째 테스트
샘플 페이지에서 새로운 Tailwind 버튼 테스트해보기!

---

**💡 팁**: 
- 설정 후 브라우저에서 Tailwind 클래스가 적용되는지 확인
- MUI 컴포넌트와 Tailwind 컴포넌트를 나란히 비교해보기
- 개발자 도구에서 CSS 클래스 확인하기
