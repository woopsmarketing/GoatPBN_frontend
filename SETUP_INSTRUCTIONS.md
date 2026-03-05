# 🔧 외부 API 연동 설정 가이드

## ⚠️ 필수 설정 사항

외부 API 연동 기능을 사용하려면 다음 단계를 완료해야 합니다.

---

## 1. 환경 변수 설정

### 1.1 Supabase Service Role Key 추가

`.env.local` 파일에 다음 환경 변수를 추가하세요:

```bash
# 기존 환경 변수 (이미 설정됨)
NEXT_PUBLIC_SUPABASE_URL=https://sfaxhhmfftlvykqmjklk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# 🆕 추가 필요: Service Role Key (API 키 인증용)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 1.2 Service Role Key 찾는 방법

1. Supabase 대시보드 접속: https://supabase.com/dashboard
2. 프로젝트 선택
3. 좌측 메뉴에서 **Settings** > **API** 클릭
4. **Project API keys** 섹션에서 `service_role` 키 복사
5. `.env.local` 파일에 붙여넣기

⚠️ **주의**: Service Role Key는 절대 클라이언트 사이드 코드나 Git에 노출하지 마세요!

---

## 2. Supabase 마이그레이션 적용

### 2.1 SQL 파일 실행

`backend/migrations/create_api_keys_table.sql` 파일의 내용을 Supabase에서 실행하세요.

#### 방법 1: Supabase 대시보드 (권장)

1. Supabase 대시보드 접속
2. 좌측 메뉴에서 **SQL Editor** 클릭
3. **New query** 클릭
4. `backend/migrations/create_api_keys_table.sql` 파일 내용 복사
5. 붙여넣기 후 **Run** 클릭

#### 방법 2: Supabase CLI

```bash
# Supabase CLI 설치 (없는 경우)
npm install -g supabase

# 프로젝트 링크
supabase link --project-ref sfaxhhmfftlvykqmjklk

# 마이그레이션 적용
supabase db push
```

### 2.2 테이블 생성 확인

SQL Editor에서 다음 쿼리로 확인:

```sql
SELECT * FROM api_keys LIMIT 1;
```

---

## 3. 개발 서버 실행

```bash
cd seed
npm install  # 의존성 설치 (처음 한 번만)
npm run dev  # 개발 서버 시작
```

서버가 시작되면 `http://localhost:3000` 접속

---

## 4. API 키 생성

### 4.1 대시보드에서 생성

1. `http://localhost:3000/settings/api-keys` 접속
2. 로그인
3. **새 API 키 생성** 버튼 클릭
4. API 키 이름 입력 (예: "외부 프로젝트 연동")
5. 생성된 API 키를 복사하여 안전한 곳에 보관

⚠️ **중요**: API 키는 생성 시 한 번만 표시됩니다!

---

## 5. API 테스트

### 5.1 사이트 ID 확인

먼저 사용할 사이트의 UUID를 확인하세요:

1. `http://localhost:3000/sites` 접속
2. 사이트 목록에서 사용할 사이트의 ID 복사

### 5.2 테스트 스크립트 실행

```bash
# 프로젝트 루트에서 실행
API_KEY=your_generated_api_key \
API_URL=http://localhost:3000 \
SITE_ID=your_site_uuid \
node test-api-integration.js
```

### 5.3 cURL 테스트

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

성공 시 응답:

```json
{
  "success": true,
  "campaign_id": "campaign-uuid",
  "campaign_name": "테스트 캠페인",
  "status": "pending",
  "message": "캠페인이 성공적으로 생성되었습니다."
}
```

---

## 6. 외부 프로젝트 연동

### 6.1 환경 변수 설정 (외부 프로젝트)

외부 프로젝트의 `.env` 파일에 추가:

```bash
PBN_API_URL=https://your-pbn-domain.com
PBN_API_KEY=your_generated_api_key
PBN_DEFAULT_SITE_ID=your_site_uuid
```

### 6.2 연동 코드 예시

```javascript
// 주문 완료 시 캠페인 자동 생성
async function createCampaignFromOrder(order) {
  const response = await fetch(`${process.env.PBN_API_URL}/api/external/create-campaign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PBN_API_KEY}`
    },
    body: JSON.stringify({
      campaignName: `주문 #${order.id} - ${order.customer}`,
      siteId: process.env.PBN_DEFAULT_SITE_ID,
      targetSite: order.targetSite,
      keywords: order.keywords,
      quantity: order.quantity,
      duration: order.duration
    })
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('✅ 캠페인 생성 성공:', result.campaign_id);
    return result.campaign_id;
  } else {
    console.error('❌ 캠페인 생성 실패:', result.error);
    throw new Error(result.error);
  }
}
```

---

## 7. 프로덕션 배포

### 7.1 환경 변수 설정 (프로덕션)

배포 플랫폼 (Vercel, Netlify 등)에서 환경 변수 설정:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_API_URL=https://your-fastapi-backend.com
```

### 7.2 HTTPS 확인

- 프로덕션 환경에서는 반드시 HTTPS 사용
- API 키는 HTTPS를 통해서만 전송

### 7.3 API 키 재생성

- 개발용과 프로덕션용 API 키를 분리하여 사용
- 프로덕션 API 키는 더 엄격하게 관리

---

## 📋 체크리스트

설정 완료 여부를 확인하세요:

- [ ] `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY` 추가
- [ ] Supabase에 `api_keys` 테이블 생성
- [ ] 개발 서버 실행 (`npm run dev`)
- [ ] 대시보드에서 API 키 생성
- [ ] 테스트 스크립트로 API 테스트
- [ ] 외부 프로젝트에 연동 코드 작성
- [ ] 프로덕션 환경 변수 설정

---

## 📚 추가 문서

- **API 연동 가이드**: `API_INTEGRATION_GUIDE.md`
- **구현 완료 보고서**: `README_API_INTEGRATION.md`
- **테스트 스크립트**: `test-api-integration.js`

---

**작성일**: 2026년 3월 5일  
**작성자**: PBN SaaS 개발팀
