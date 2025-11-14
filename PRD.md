# PBN SaaS 클라이언트 대시보드 PRD (Product Requirements Document)

## 📋 프로젝트 개요

**프로젝트명**: PBN (Private Blog Network) SaaS 클라이언트 대시보드  
**버전**: MVP 1.0  
**기술 스택**: Next.js + React + Tailwind CSS (프론트엔드), FastAPI (백엔드 - 추후 연동)  
**개발 방식**: 프론트엔드 우선 개발, API 연동은 2차 단계  
**작성일**: 2025년 9월 24일  

## 🎯 비즈니스 목표

클라이언트가 자신의 워드프레스 사이트에 자동으로 백링크를 생성하는 캠페인을 관리할 수 있는 대시보드를 제공합니다.

### 핵심 비즈니스 플로우
1. **사이트 등록**: 클라이언트가 워드프레스 사이트 정보 입력
2. **캠페인 생성**: 백링크 캠페인 설정 (타겟 사이트, 키워드, 수량, 기간)
3. **자동 실행**: 설정된 기간 동안 콘텐츠 자동 생성 및 백링크 삽입
4. **모니터링**: 실시간 진행 상황 추적 및 로그 관리
5. **보고서**: 캠페인 완료 후 성과 분석 및 결과 리포트

## 📊 데이터 흐름 구조

```
사이트 등록 → 캠페인 생성 → 자동 실행 엔진 → 로그 기록 → 결과 보고서 → 통계 대시보드
```

## 🏗️ 페이지 구성 및 기능 명세

### 1. 대시보드 홈페이지 (`/dashboard`)
**목적**: 전체 시스템 현황을 한눈에 파악할 수 있는 메인 대시보드

**주요 기능**:
- 전체 진행 상황 요약 위젯
- 활성 캠페인 수 및 상태 표시
- 등록된 사이트 수 표시
- 총 생성된 콘텐츠 수 카운터
- 최근 캠페인 현황 테이블 (최근 5개)
- 오늘 생성 예정 콘텐츠 수
- 시스템 알림 및 경고 메시지

**UI 구성**:
- 상단: KPI 카드 4개 (활성 캠페인, 등록 사이트, 총 콘텐츠, 성공률)
- 중단: 최근 활동 테이블
- 하단: 진행률 차트 및 알림 패널

### 2. 통계 페이지 (`/statistics`)
**목적**: 캠페인별 성과 분석 및 데이터 시각화

**주요 기능**:
- **전체 현황 요약**: 총 캠페인 수, 활성 캠페인, 완료율, 성공률
- **캠페인별 진행률 그래프**: 각 캠페인의 완료 진행도 (원형/도넛 차트)
  - 진행률 = (completedCount / quantity) × 100
  - 상태별 색상 구분 (활성: 파란색, 완료: 초록색, 중지: 회색)
- **기간별 콘텐츠 생성 추이**: 일별/주별/월별 생성 현황 (막대 그래프)
- **성공/실패 비율 분석**: 전체 및 캠페인별 성공률 통계
- **키워드별 성과 통계**: 가장 많이 사용된 키워드와 성과
- **사이트별 활동 현황**: 사이트별 콘텐츠 생성 및 성공률
- **실시간 진행 상황**: 현재 진행 중인 캠페인의 상세 현황
  - 오늘 생성 예정/완료 수량
  - 남은 기간과 일일 목표 달성률

**진행률 계산 로직**:
```javascript
// 캠페인 진행률 = 완료된 콘텐츠 수 / 총 목표 수량 × 100
const progress = Math.round((completedCount / quantity) * 100);

// 일일 목표 대비 진행률
const dailyTarget = quantity / duration;
const todayGenerated = getTodayGeneratedCount(campaignId);
const dailyProgress = Math.round((todayGenerated / dailyTarget) * 100);
```

**UI 구성**:
- 상단: KPI 대시보드 (4개 주요 지표 카드)
- 중단: 캠페인별 진행률 차트 그리드 (2×2 또는 3×2 레이아웃)
- 하단: 필터링 옵션과 상세 데이터 테이블
- 사이드바: 실시간 활동 피드

### 3. 캠페인 생성 페이지 (`/campaigns/create`)
**목적**: 새로운 백링크 캠페인 설정 및 생성

**주요 기능**:
- 등록된 사이트 선택 드롭다운
- 타겟 사이트 주소 입력
- 키워드(앵커텍스트) 입력 (쉼표로 구분)
- 생성할 콘텐츠 수량 설정
- 캠페인 기간 설정 (일 단위)
- 시작 시간 설정 (즉시 시작 / 예약 시작)
- 캠페인 이름 및 설명 입력
- 미리보기 및 검증 기능

**자동 계산 로직**:
- 입력된 수량과 기간을 바탕으로 일일 생성 목표 계산
- 예: 30일 80개 → 평균 2.66개/일 → 실제 2~4개 랜덤 배치

**UI 구성**:
- 단계별 폼 (Step by Step)
- 실시간 계산 결과 표시
- 검증 결과 메시지

### 4. 로그 페이지 (`/logs`)
**목적**: 모든 콘텐츠 생성 활동 기록 및 오류 추적

**주요 기능**:
- 발행된 콘텐츠 리스트 (제목, 생성일, 상태, 사이트, URL)
- 실시간 로그 스트림
- 오류 발생 시 상세 메시지 표시
- 로그 필터링 (날짜, 상태, 캠페인별)
- 로그 검색 기능
- 재시도 버튼 (실패한 작업에 대해)

**테이블 컬럼**:
- 생성일시, 캠페인명, 콘텐츠 제목, 타겟 사이트, 키워드, 상태, 액션

**상태 종류**:
- 성공, 실패, 진행중, 대기중

### 5. 사이트 추가 페이지 (`/sites/add`)
**목적**: 워드프레스 사이트 등록 및 연결 관리

**주요 기능**:
- 사이트 주소 입력 (URL 검증)
- 워드프레스 사용자명 입력
- 워드프레스 비밀번호 입력
- 앱 패스워드 입력
- 연결 테스트 버튼
- 등록된 사이트 목록 표시
- 사이트 수정/삭제 기능

**연결 테스트**:
- WordPress REST API 연결 확인
- 권한 검증
- 연결 상태 실시간 표시

**UI 구성**:
- 사이트 등록 폼
- 등록된 사이트 카드 리스트
- 연결 상태 인디케이터

### 6. 결과 보고서 페이지 (`/reports`)
**목적**: 완료된 캠페인의 성과 분석 및 보고서 생성

**주요 기능**:
- 완료된 캠페인 목록
- 캠페인별 상세 보고서 (총 발행 수, 성공률, 소요 시간)
- 키워드별 성과 분석
- 생성된 콘텐츠 품질 평가
- 보고서 PDF 다운로드
- 보고서 이메일 전송 (추후)

**보고서 내용**:
- 캠페인 요약, 목표 대비 달성률, 일별 진행 현황, 오류 분석, 개선 제안

## 🎨 UI/UX 가이드라인

### 디자인 원칙
- **단순함**: MVP 기준으로 복잡한 애니메이션 지양
- **직관성**: 사용자가 즉시 이해할 수 있는 인터페이스
- **반응형**: 모바일 퍼스트 디자인 (Tailwind 반응형 클래스 활용)
- **일관성**: 통일된 색상 팔레트와 타이포그래피

### 색상 팔레트
- Primary: Blue (#3B82F6)
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)
- Danger: Red (#EF4444)
- Gray: 다양한 명도의 Gray 스케일

### 컴포넌트 스타일
- 카드: 둥근 모서리 (rounded-lg), 그림자 (shadow-md)
- 버튼: Tailwind 기반 커스텀 버튼 컴포넌트 사용
- 폼: 명확한 레이블과 검증 메시지
- 테이블: 스트라이프 패턴, 호버 효과

## 🔧 기술적 구현 사항

### 프론트엔드 구조
```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/page.jsx          # 홈 대시보드
│   │   ├── statistics/page.jsx         # 통계 페이지
│   │   ├── campaigns/
│   │   │   └── create/page.jsx         # 캠페인 생성
│   │   ├── logs/page.jsx               # 로그 페이지
│   │   ├── sites/
│   │   │   └── add/page.jsx            # 사이트 추가
│   │   └── reports/page.jsx            # 결과 보고서
├── components/
│   └── ui/                             # Tailwind 기반 재사용 컴포넌트
├── lib/
│   ├── api.js                          # API 호출 중앙 관리
│   └── utils.js                        # 공통 유틸리티
└── data/
    └── mockData.js                     # Mock 데이터
```

### API 인터페이스 설계 (추후 FastAPI 연동용)
```javascript
// 예시 API 엔드포인트
- GET /api/sites - 등록된 사이트 목록
- POST /api/sites - 새 사이트 등록
- POST /api/sites/test - 사이트 연결 테스트
- GET /api/campaigns - 캠페인 목록
- POST /api/campaigns - 새 캠페인 생성
- GET /api/logs - 로그 목록
- GET /api/reports - 보고서 목록
- GET /api/statistics - 통계 데이터
```

### Mock 데이터 구조
```javascript
// 사이트 데이터
const mockSites = [
  {
    id: 1,
    name: "내 블로그",
    url: "https://myblog.com",
    username: "admin",
    password: "mypassword123",
    app_password: "abcd efgh ijkl mnop",
    status: "connected", // connected, disconnected, error
    lastCheck: "2025-09-24T10:00:00Z"
  },
  {
    id: 2,
    name: "회사 블로그",
    url: "https://companyblog.com",
    username: "editor",
    password: "editor2024!",
    app_password: "qrst uvwx yz12 3456",
    status: "connected",
    lastCheck: "2025-09-24T09:30:00Z"
  }
];

// 캠페인 데이터
const mockCampaigns = [
  {
    id: 1,
    name: "아르바이트 백링크 캠페인",
    siteId: 1, // 연결된 사이트 ID
    targetSite: "example1.com",
    keywords: ["아르바이트", "구인구직", "월급 300"],
    quantity: 50, // 총 생성할 콘텐츠 수량
    duration: 20, // 캠페인 기간 (일)
    status: "active", // active, paused, completed, stopped
    completedCount: 30, // 현재까지 완료된 콘텐츠 수
    progress: 60, // 진행률 (completedCount / quantity * 100)
    dailyTarget: 2.5, // 일일 평균 목표 (quantity / duration)
    createdAt: "2025-09-01T00:00:00Z",
    startedAt: "2025-09-01T09:00:00Z",
    estimatedCompletion: "2025-09-21T09:00:00Z"
  },
  {
    id: 2,
    name: "스포츠중계 백링크 캠페인",
    siteId: 2,
    targetSite: "example2.com",
    keywords: ["스포츠중계", "축구중계", "프리미어리그 중계"],
    quantity: 100,
    duration: 15,
    status: "active",
    completedCount: 85,
    progress: 85,
    dailyTarget: 6.67,
    createdAt: "2025-09-05T00:00:00Z",
    startedAt: "2025-09-05T10:00:00Z",
    estimatedCompletion: "2025-09-20T10:00:00Z"
  },
  {
    id: 3,
    name: "대구맛집 백링크 캠페인",
    siteId: 1,
    targetSite: "example3.com",
    keywords: ["대구맛집", "서울맛집", "홍대맛집"],
    quantity: 80,
    duration: 30,
    status: "completed",
    completedCount: 80,
    progress: 100,
    dailyTarget: 2.67,
    createdAt: "2025-08-01T00:00:00Z",
    startedAt: "2025-08-01T08:00:00Z",
    completedAt: "2025-08-30T18:00:00Z"
  }
];

// 로그 데이터
const mockLogs = [
  {
    id: 1,
    campaignId: 1,
    campaignName: "아르바이트 백링크 캠페인",
    contentTitle: "2025년 최고 아르바이트 추천 사이트",
    targetSite: "example1.com",
    keyword: "아르바이트",
    status: "success", // success, failed, pending, processing
    publishedUrl: "https://myblog.com/posts/best-part-time-jobs-2025",
    createdAt: "2025-09-24T10:30:00Z",
    errorMessage: null
  },
  {
    id: 2,
    campaignId: 2,
    campaignName: "스포츠중계 백링크 캠페인",
    contentTitle: "프리미어리그 무료 시청 가이드",
    targetSite: "example2.com",
    keyword: "프리미어리그 중계",
    status: "failed",
    publishedUrl: null,
    createdAt: "2025-09-24T09:15:00Z",
    errorMessage: "WordPress API 연결 실패: 401 Unauthorized"
  }
];

// 통계 데이터
const mockStatistics = {
  overview: {
    totalCampaigns: 3,
    activeCampaigns: 2,
    completedCampaigns: 1,
    totalSites: 2,
    totalContentGenerated: 195,
    successRate: 94.2
  },
  campaignProgress: [
    { campaignId: 1, name: "아르바이트 백링크", progress: 60, status: "active" },
    { campaignId: 2, name: "스포츠중계 백링크", progress: 85, status: "active" },
    { campaignId: 3, name: "대구맛집 백링크", progress: 100, status: "completed" }
  ],
  dailyActivity: [
    { date: "2025-09-20", generated: 8, success: 7, failed: 1 },
    { date: "2025-09-21", generated: 6, success: 6, failed: 0 },
    { date: "2025-09-22", generated: 9, success: 8, failed: 1 },
    { date: "2025-09-23", generated: 7, success: 7, failed: 0 },
    { date: "2025-09-24", generated: 5, success: 4, failed: 1 }
  ]
};
```

## 🚀 MVP 개발 범위

### Phase 1: 프론트엔드 UI (현재)
- ✅ 모든 페이지 레이아웃 구성
- ✅ Tailwind 기반 컴포넌트 개발
- ✅ Mock 데이터를 활용한 기능 시뮬레이션
- ✅ API 호출 부분은 `console.log("API 구현중")` 처리
- ✅ 반응형 디자인 적용

### Phase 2: 백엔드 연동 (추후)
- FastAPI 백엔드 개발
- 실제 WordPress REST API 연동
- 데이터베이스 설계 및 구축
- 자동 콘텐츠 생성 엔진 개발
- 스케줄링 시스템 구현

## 🔄 핵심 비즈니스 로직

### 캠페인 자동 분산 로직
```javascript
// 예시: 30일 동안 80개 콘텐츠 생성
const totalDays = 30;
const totalContent = 80;
const averagePerDay = totalContent / totalDays; // 2.66개

// 실제 실행: 하루 2~4개 랜덤 배치
const dailyRange = {
  min: Math.floor(averagePerDay),     // 2개
  max: Math.ceil(averagePerDay) + 1   // 4개
};

// 매일 랜덤하게 생성할 콘텐츠 수 결정
const getDailyContentCount = () => {
  return Math.floor(Math.random() * (dailyRange.max - dailyRange.min + 1)) + dailyRange.min;
};
```

### 키워드 순환 로직
```javascript
// 키워드를 순환하면서 앵커텍스트로 사용
const keywords = ["아르바이트", "구인구직", "월급 300"];
let keywordIndex = 0;

const getNextKeyword = () => {
  const keyword = keywords[keywordIndex];
  keywordIndex = (keywordIndex + 1) % keywords.length;
  return keyword;
};
```

## 📋 개발 체크리스트

### 필수 구현 사항
- [ ] 대시보드 홈페이지 레이아웃 및 위젯
- [ ] 통계 페이지 차트 컴포넌트
- [ ] 캠페인 생성 폼 및 검증 로직
- [ ] 로그 페이지 테이블 및 필터링
- [ ] 사이트 추가 폼 및 목록 관리
- [ ] 결과 보고서 페이지 및 다운로드
- [ ] 네비게이션 메뉴 구성
- [ ] 반응형 디자인 적용
- [ ] Mock 데이터 준비
- [ ] API 호출 인터페이스 준비

### 선택적 구현 사항
- [ ] 다크 모드 지원
- [ ] 다국어 지원 (i18n)
- [ ] 실시간 알림 시스템
- [ ] 데이터 내보내기 기능
- [ ] 사용자 권한 관리

## 📝 추가 고려사항

1. **성능 최적화**: Next.js Image 컴포넌트, lazy loading, dynamic import 활용
2. **SEO**: 메타 태그, 구조화된 데이터 적용
3. **접근성**: ARIA 라벨, 키보드 네비게이션 지원
4. **보안**: XSS 방지, 입력 검증, HTTPS 강제
5. **모니터링**: 에러 추적, 성능 모니터링 도구 연동

---

**문서 버전**: 1.0  
**최종 수정**: 2025년 9월 24일  
**작성자**: AI Assistant  
**승인자**: 개발팀장
