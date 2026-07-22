# 📁 public/ Directory

## 🎯 Purpose
Next.js 정적 파일 저장소입니다.
이미지, 아이콘, SVG 등 정적 에셋을 포함합니다.

---

## 📂 Directory Structure

```
public/
├── next.svg               # Next.js 로고
├── vercel.svg             # Vercel 로고
└── assets/                # 🎨 에셋 폴더
    ├── images/            # 🖼️ 이미지
    │   ├── auth/          # 🔐 인증 페이지 이미지
    │   ├── icons/         # 🎨 아이콘
    │   ├── logo.png       # 🎨 메인 로고
    │   ├── maintenance/   # 🚧 유지보수 페이지 이미지
    │   ├── users/         # 👤 사용자 아바타
    │   └── widget/        # 📊 위젯 이미지
    └── third-party/       # 🔌 서드파티 에셋
        └── github.jsx     # GitHub 로고 컴포넌트
```

---

## 🖼️ **Images** (`/assets/images`)

### 📂 **Subdirectories**

#### `/auth` - 인증 페이지 배경
- `AuthBackground.jsx` - 로그인/회원가입 배경 컴포넌트

#### `/icons` - OAuth 아이콘
- `google.svg` - Google 로그인 아이콘
- `auth0.svg` - Auth0 아이콘
- `aws-cognito.svg` - AWS Cognito 아이콘

#### `/logo` - 로고 파일
- `logo.png` - 메인 로고 이미지

#### `/maintenance` - 유지보수 페이지 이미지
- `img-error-404.svg` - 404 에러 일러스트
- `img-error-500.svg` - 500 에러 일러스트
- `img-construction-*.svg` - 공사중 일러스트
- `img-soon-*.png/svg` - Coming Soon 일러스트

#### `/users` - 사용자 아바타
- `avatar-1.png` ~ `avatar-10.png` - 샘플 아바타
- `default.png` - 기본 아바타
- `customer-support-1.png` - 고객 지원 이미지

#### `/widget` - 위젯 이미지
- `message/` - 메시지 아이콘 (다크/라이트 모드)
- `img-dropbox-bg.svg` - 위젯 배경

---

## 🔧 How to Use Images

### 1. Next.js Image 컴포넌트 (권장)
```jsx
import Image from 'next/image';

<Image 
  src="/assets/images/logo.png"
  alt="Logo"
  width={200}
  height={60}
  priority  // 최우선 로드
/>
```

### 2. 일반 img 태그
```jsx
<img 
  src="/assets/images/users/avatar-1.png" 
  alt="User Avatar"
  style={{ width: 40, height: 40 }}
/>
```

### 3. CSS 배경 이미지
```jsx
<div style={{
  backgroundImage: 'url(/assets/images/auth/AuthBackground.jsx)',
  backgroundSize: 'cover'
}} />
```

### 4. SVG as Component
```jsx
import GitHubIcon from '/public/assets/third-party/github.jsx';

<GitHubIcon width={24} height={24} />
```

---

## 📊 **Image Categories**

| 카테고리 | 경로 | 용도 | 개수 |
|---------|------|------|------|
| **인증** | `images/auth/` | 로그인 배경 | 1 |
| **아이콘** | `images/icons/` | OAuth 로고 | 3 |
| **로고** | `images/logo.png` | 브랜드 로고 | 1 |
| **에러** | `images/maintenance/` | 404, 500 일러스트 | 10+ |
| **아바타** | `images/users/` | 사용자 프로필 | 20+ |
| **위젯** | `images/widget/` | 대시보드 위젯 | 10+ |

---

## 🎨 **Image Optimization**

### Next.js Image 자동 최적화
```jsx
// ✅ Next.js Image 사용 시
- WebP/AVIF 자동 변환
- 반응형 이미지 자동 생성
- Lazy loading 자동 적용
- 캐싱 최적화

// ❌ 일반 img 태그 사용 시
- 최적화 없음
- 원본 이미지 그대로 로드
```

### 이미지 크기 최적화
```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['owngoodinfo.co.kr'],  // 외부 이미지 도메인
    formats: ['image/avif', 'image/webp']
  }
};
```

---

## 🔧 How to Add New Images

### 1. 이미지 파일 추가
```bash
# 적절한 폴더에 이미지 배치
public/assets/images/my-category/my-image.png
```

### 2. 컴포넌트에서 사용
```jsx
import Image from 'next/image';

<Image 
  src="/assets/images/my-category/my-image.png"
  alt="Description"
  width={300}
  height={200}
/>
```

### 3. 외부 이미지 사용 (워드프레스 등)
```jsx
// next.config.js에 도메인 추가 필요
<Image 
  src="https://owngoodinfo.co.kr/wp-content/uploads/2025/11/image.png"
  alt="WordPress Image"
  width={400}
  height={300}
/>
```

---

## 📁 **File Naming Convention**

### 이미지 파일명
```
snake_case 또는 kebab-case 사용

✅ Good:
- logo.png
- avatar-1.png
- img-error-404.svg
- auth-background.jpg

❌ Bad:
- Logo.png
- Avatar 1.png
- imgError404.svg
```

### SVG 컴포넌트
```
PascalCase 사용

✅ Good:
- github.jsx
- AuthBackground.jsx

❌ Bad:
- GitHub.jsx (파일명은 소문자)
```

---

## 🔍 Quick Reference

| 이미지 종류 | 경로 | 사용 페이지 |
|-----------|------|-----------|
| **메인 로고** | `assets/images/logo.png` | 헤더, 사이드바 |
| **404 일러스트** | `assets/images/maintenance/img-error-404.svg` | not-found 페이지 |
| **500 일러스트** | `assets/images/maintenance/img-error-500.svg` | error 페이지 |
| **아바타** | `assets/images/users/avatar-*.png` | 프로필, 댓글 |
| **OAuth 아이콘** | `assets/images/icons/*.svg` | 로그인 페이지 |

---

## ⚠️ Important Notes

### 이미지 최적화 권장사항
1. **WebP/AVIF 사용** - PNG/JPG보다 30-50% 작음
2. **적절한 크기** - 실제 사용 크기의 2배 이하
3. **Lazy Loading** - `loading="lazy"` 또는 Next.js Image 사용
4. **Alt 텍스트** - 접근성 및 SEO를 위해 필수

### 외부 이미지 도메인
```javascript
// next.config.js
module.exports = {
  images: {
    domains: [
      'owngoodinfo.co.kr',        // 워드프레스
      'images.unsplash.com',       // Unsplash
      'via.placeholder.com'        // 플레이스홀더
    ]
  }
};
```

---

## 🔗 Related Files

- **Next.js 설정**: `../../next.config.js`
- **컴포넌트**: `../../src/components/`
- **로고 컴포넌트**: `../../src/components/logo/`

---

**최종 업데이트**: 2025-11-03  
**작성자**: Frontend Team

