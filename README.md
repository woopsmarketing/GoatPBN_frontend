# GoatPBN Frontend

## 개요
- PBN SaaS 클라이언트 대시보드의 Next.js 15 기반 프론트엔드 코드입니다.
- `/dashboard`는 한국어, `/en/dashboard`는 영어 UI를 제공합니다.

## 빠른 시작
1. Node.js 18.x 이상을 설치합니다.
2. `npm install`
3. `.env`는 로컬에만 두고, `NEXT_PUBLIC_API_BASE_URL` 등 필요한 값을 채웁니다.
4. `npm run dev`

## 품질 점검
- `npm run lint`
- `npm run build`
- 위 두 명령이 통과해야 Git push 및 배포를 진행합니다.

## 배포 전 체크리스트
- `git status`가 깨끗한지 확인합니다.
- Vercel 환경 변수에 API 엔드포인트 등 민감 값을 등록합니다.
- Preview URL에서 `/dashboard`, `/en/dashboard` UI를 교차 확인합니다.

## 디렉터리 구조 요약
- `src/app`: App Router 페이지 (한글/영문 라우트 모두 포함)
- `src/components`: 재사용 가능한 UI 컴포넌트
- `src/lib`: API stub 및 유틸리티
- `archive/`: 사용 여부가 불분명하거나 임시 보관이 필요한 파일을 이동하는 백업 폴더

## 정리 원칙
- 불필요한 파일은 삭제하지 말고 `archive/`에 이동 후 커밋합니다.
- 이동 사유를 커밋 메시지 또는 PR 설명에 남겨 추후 복원 가능하도록 관리합니다.
