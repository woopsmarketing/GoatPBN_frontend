# 🚀 외부 API 연동 구현 완료

## ✅ 구현 완료 항목

### 1. API 키 관리 시스템
- ✅ Supabase `api_keys` 테이블 생성 (마이그레이션 파일)
- ✅ API 키 CRUD 함수 구현
- ✅ API 키 관리 UI 페이지

### 2. API 인증 시스템
- ✅ Bearer Token 기반 API 키 인증
- ✅ 서비스 역할 키를 사용한 검증
- ✅ 마지막 사용 시간 자동 기록

### 3. 외부 연동 API 엔드포인트
- ✅ `POST /api/external/create-campaign` 구현
- ✅ 필수/선택 파라미터 검증
- ✅ 사이트 존재 여부 확인
- ✅ 캠페인 자동 생성 및 스케줄 초기화

### 4. Rate Limiting
- ✅ 메모리 기반 Rate Limiter 구현
- ✅ 분당 10회, 시간당 100회 제한
- ✅ Rate Limit 헤더 응답

### 5. 문서 및 테스트
- ✅ API 연동 가이드 문서
- ✅ 테스트 스크립트 (Node.js)
- ✅ cURL 예시 코드

---

## 📂 생성된 파일 목록

### 백엔드 마이그레이션
- `backend/migrations/create_api_keys_table.sql` - API 키 테이블 생성 SQL

### API 로직
- `seed/src/lib/api/apiKeyAuth.js` - API 키 인증 로직
- `seed/src/lib/api/apiKeys.js` - API 키 CRUD 함수
- `seed/src/lib/api/rateLimiter.js` - Rate Limiting 시스템

### API 엔드포인트
- `seed/src/app/api/external/create-campaign/route.js` - 외부 연동 API

### UI 페이지
- `seed/src/app/(dashboard)/settings/api-keys/page.jsx` - API 키 관리 페이지

### 문서 및 테스트
- `seed/API_INTEGRATION_GUIDE.md` - API 연동 가이드
- `seed/test-api-integration.js` - 테스트 스크립트
- `seed/README_API_INTEGRATION.md` - 이 파일

### 메뉴 업데이트
- `seed/src/menu-items/pbn-dashboard.js` - 설정 메뉴에 API 키 관리 추가

---

## 🔧 다음 단계

### 1. Supabase 마이그레이션 적용

Supabase 연결이 복구되면 다음 명령으로 마이그레이션을 적용하세요:

```bash
# Supabase CLI 사용
supabase db push

# 또는 Supabase 대시보드에서 SQL Editor로 직접 실행
# backend/migrations/create_api_keys_table.sql 파일 내용 복사 후 실행
```

### 2. 환경 변수 설정

`.env.local` 파일에 다음 환경 변수가 있는지 확인:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # 필수!
NEXT_PUBLIC_API_URL=https://your-fastapi-backend.com
```

⚠️ **중요**: `SUPABASE_SERVICE_ROLE_KEY`가 없으면 API 키 인증이 작동하지 않습니다.

### 3. 개발 서버 실행

```bash
cd seed
npm run dev
# 또는
yarn dev
```

### 4. API 키 생성

1. 브라우저에서 `http://localhost:3000/settings/api-keys` 접속
2. 로그인 후 "새 API 키 생성" 클릭
3. API 키 이름 입력 (예: "테스트용")
4. 생성된 API 키 복사

### 5. API 테스트

#### 방법 1: 테스트 스크립트 사용

```bash
# 환경 변수 설정 후 실행
API_KEY=your_generated_api_key \
API_URL=http://localhost:3000 \
SITE_ID=your_site_uuid \
node test-api-integration.js
```

#### 방법 2: cURL 사용

```bash
curl -X POST http://localhost:3000/api/external/create-campaign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "campaignName": "테스트 캠페인",
    "siteId": "YOUR_SITE_UUID",
    "targetSite": "https://example.com",
    "keywords": ["테스트"],
    "quantity": 1,
    "duration": 1
  }'
```

---

## 🔐 보안 체크리스트

- [ ] `SUPABASE_SERVICE_ROLE_KEY` 환경 변수 설정 확인
- [ ] API 키가 Git에 커밋되지 않도록 `.gitignore` 확인
- [ ] 프로덕션 환경에서 HTTPS 사용 확인
- [ ] API 키 생성 후 안전한 곳에 보관
- [ ] Rate Limit 설정 확인 (분당 10회, 시간당 100회)

---

## 📊 API 사용 흐름

```
외부 웹앱 주문 발생
    ↓
POST /api/external/create-campaign
    ↓
API 키 인증 (apiKeyAuth.js)
    ↓
Rate Limit 체크 (rateLimiter.js)
    ↓
파라미터 검증
    ↓
사이트 존재 확인
    ↓
Supabase에 캠페인 생성
    ↓
FastAPI 백엔드 스케줄 초기화
    ↓
성공 응답 반환 (campaign_id 포함)
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 정상 캠페인 생성
- ✅ 유효한 API 키 사용
- ✅ 모든 필수 파라미터 제공
- ✅ 존재하는 사이트 ID 사용
- 예상 결과: 201 Created, campaign_id 반환

### 시나리오 2: 인증 실패
- ❌ 잘못된 API 키 사용
- 예상 결과: 401 Unauthorized

### 시나리오 3: 파라미터 누락
- ❌ 필수 파라미터 일부 누락
- 예상 결과: 400 Bad Request

### 시나리오 4: Rate Limit 초과
- ❌ 분당 10회 이상 요청
- 예상 결과: 429 Too Many Requests

### 시나리오 5: 존재하지 않는 사이트
- ❌ 잘못된 siteId 사용
- 예상 결과: 404 Not Found

---

## 📞 문제 해결

### Supabase 연결 타임아웃

현재 Supabase 연결에 타임아웃이 발생하고 있습니다. 다음을 확인하세요:

1. 인터넷 연결 상태
2. Supabase 프로젝트 상태 (대시보드에서 확인)
3. 환경 변수 설정 확인
4. 방화벽 또는 VPN 설정

### API 키 인증 실패

1. `SUPABASE_SERVICE_ROLE_KEY` 환경 변수 확인
2. API 키가 활성화 상태인지 확인
3. Authorization 헤더 형식 확인 (`Bearer YOUR_API_KEY`)

### 캠페인 생성 실패

1. 사이트 ID가 올바른지 확인
2. 사용자 크레딧 잔액 확인
3. FastAPI 백엔드 연결 상태 확인

---

## 🎯 외부 프로젝트 연동 예시

### Node.js / Express

```javascript
const express = require('express');
const app = express();

app.post('/order/complete', async (req, res) => {
  const order = req.body;
  
  // PBN API로 캠페인 생성
  const campaignResponse = await fetch('https://pbn-domain.com/api/external/create-campaign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PBN_API_KEY}`
    },
    body: JSON.stringify({
      campaignName: `주문 #${order.id} - ${order.customer}`,
      siteId: process.env.PBN_SITE_ID,
      targetSite: order.targetSite,
      keywords: order.keywords,
      quantity: order.quantity,
      duration: order.duration
    })
  });
  
  const result = await campaignResponse.json();
  
  if (result.success) {
    // 주문에 캠페인 ID 저장
    await db.orders.update(order.id, {
      pbn_campaign_id: result.campaign_id
    });
    
    res.json({ success: true, campaign_id: result.campaign_id });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});
```

---

**문서 버전**: 1.0  
**최종 수정**: 2026년 3월 5일  
**상태**: 구현 완료 (Supabase 마이그레이션 적용 대기)
