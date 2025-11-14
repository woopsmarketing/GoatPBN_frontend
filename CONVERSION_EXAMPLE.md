# 🔄 HTML → React 변환 실제 예시

## 📋 **당신의 상황 정리**
```
❌ Next.js 템플릿 = MUI 기반 (원하지 않음)
✅ HTML 템플릿 = Tailwind 기반 (디자인 참고용)
🎯 목표 = React + Next.js + Tailwind 조합
```

## 🚀 **변환 과정 실제 예시**

### 1️⃣ HTML 템플릿에서 발견한 버튼들:

```html
<!-- HTML 버전 (able-pro-tailwind-1.2.0/dist/elements/bc_button.html) -->
<button type="button" class="btn btn-primary">Primary</button>
<button type="button" class="btn btn-secondary">Secondary</button>
<button type="button" class="btn btn-success">Success</button>
<button type="button" class="btn btn-outline-primary">Primary</button>
<button type="button" class="btn btn-light-primary">Light Primary</button>
```

### 2️⃣ React 컴포넌트로 변환:

```jsx
// src/components/ui/Button.jsx
function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  outline = false,
  light = false,
  disabled = false,
  className = '',
  ...props 
}) {
  // 기본 스타일
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // 크기별 스타일
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  // 색상별 스타일
  const variants = {
    primary: outline 
      ? 'border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white'
      : light 
        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        : 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500',
    secondary: outline
      ? 'border-2 border-gray-500 text-gray-500 hover:bg-gray-500 hover:text-white'
      : light
        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        : 'bg-gray-500 text-white hover:bg-gray-600 focus:ring-gray-500',
    success: outline
      ? 'border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white'
      : light
        ? 'bg-green-100 text-green-700 hover:bg-green-200'
        : 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500',
    danger: outline
      ? 'border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white'
      : light
        ? 'bg-red-100 text-red-700 hover:bg-red-200'
        : 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
  };
  
  // disabled 스타일
  const disabledStyles = 'opacity-50 cursor-not-allowed hover:bg-current';
  
  const buttonClasses = [
    baseStyles,
    sizes[size],
    variants[variant],
    disabled ? disabledStyles : '',
    className
  ].join(' ');
  
  return (
    <button 
      className={buttonClasses}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
```

### 3️⃣ 사용 방법:

```jsx
// 페이지에서 사용하기
import Button from '@/components/ui/Button';

export default function MyPage() {
  return (
    <div className="p-8 space-y-4">
      {/* 기본 버튼들 */}
      <div className="flex gap-2">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="success">Success</Button>
        <Button variant="danger">Danger</Button>
      </div>
      
      {/* 아웃라인 버튼들 */}
      <div className="flex gap-2">
        <Button variant="primary" outline>Primary Outline</Button>
        <Button variant="success" outline>Success Outline</Button>
      </div>
      
      {/* 라이트 버튼들 */}
      <div className="flex gap-2">
        <Button variant="primary" light>Light Primary</Button>
        <Button variant="success" light>Light Success</Button>
      </div>
      
      {/* 크기별 버튼들 */}
      <div className="flex gap-2 items-center">
        <Button variant="primary" size="sm">Small</Button>
        <Button variant="primary" size="md">Medium</Button>
        <Button variant="primary" size="lg">Large</Button>
      </div>
    </div>
  );
}
```

## 🎯 **핵심 포인트**

### ✅ **이렇게 활용하세요:**

1. **HTML 템플릿 = 디자인 참고서**
   - 예쁜 디자인 찾기
   - HTML 구조 분석하기
   - Tailwind 클래스 확인하기

2. **React 컴포넌트로 변환**
   - HTML → JSX 문법 변경
   - 동적 props 추가
   - 재사용 가능하게 만들기

3. **Next.js 프로젝트에 적용**
   - 컴포넌트 폴더에 저장
   - 페이지에서 import해서 사용
   - 필요에 따라 커스터마이징

### 🚀 **작업 순서:**

```
1. HTML 템플릿 브라우저에서 열기
2. 마음에 드는 컴포넌트 찾기
3. 해당 HTML 코드 복사
4. React 컴포넌트로 변환
5. Next.js 프로젝트에 적용
6. 테스트 및 커스터마이징
```

## 💡 **실전 팁**

### A. **CSS 클래스 매핑**
```html
<!-- HTML: -->
<button class="btn btn-primary">

<!-- React: -->
<button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
```

### B. **동적 스타일링**
```jsx
// 조건부 스타일링
const buttonColor = variant === 'primary' ? 'bg-blue-500' : 'bg-gray-500';
<button className={`px-4 py-2 rounded ${buttonColor}`}>
```

### C. **반응형 디자인**
```jsx
// HTML에서 발견한 반응형 클래스 그대로 사용
<div className="col-span-12 md:col-span-6 lg:col-span-4">
```

## 🎨 **다음 단계**

1. ✅ **Button 컴포넌트** (위 예시 완료)
2. 📋 **Card 컴포넌트** (HTML에서 `.card` 클래스 찾아서 변환)
3. 📝 **Input 컴포넌트** (폼 관련 HTML 참고)
4. 🗂️ **Modal 컴포넌트** (모달 HTML 구조 참고)
5. 📊 **Table 컴포넌트** (테이블 HTML 참고)

**이제 이해되셨나요? HTML 템플릿을 "디자인 가이드"로 활용해서 React 컴포넌트를 만드는 거예요!** 🎯
