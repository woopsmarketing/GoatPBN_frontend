# 외부 API 연동 가이드

## 📋 개요

이 문서는 외부 웹앱에서 PBN SaaS 시스템에 API를 통해 캠페인을 자동 생성하는 방법을 설명합니다.

---

## 🔑 1. API 키 발급

### 1.1 대시보드에서 API 키 생성

1. PBN 대시보드에 로그인
2. 좌측 메뉴에서 **설정 > API 키 관리** 클릭
3. **새 API 키 생성** 버튼 클릭
4. API 키 이름 입력 (예: "외부 프로젝트 연동")
5. 생성된 API 키를 복사하여 안전한 곳에 보관

⚠️ **중요**: API 키는 생성 시 한 번만 표시됩니다. 분실 시 새로 생성해야 합니다.

---

## 🌐 2. API 엔드포인트

### 2.1 캠페인 생성 API

**엔드포인트**: `POST /api/external/create-campaign`

**인증**: Bearer Token (API 키)

**Content-Type**: `application/json`

---

## 📝 3. 요청 형식

### 3.1 필수 파라미터

| 파라미터 | 타입 | 설명 | 예시 |
|---------|------|------|------|
| `campaignName` | string | 캠페인 이름 | "자동 생성 캠페인" |
| `siteId` | uuid | 워드프레스 사이트 ID | "550e8400-e29b-41d4-a716-446655440000" |
| `targetSite` | string | 타겟 사이트 URL | "https://example.com" |
| `keywords` | string[] | 키워드 배열 | ["키워드1", "키워드2", "키워드3"] |
| `quantity` | number | 생성할 콘텐츠 수량 | 50 |
| `duration` | number | 캠페인 기간 (일) | 30 |

### 3.2 선택 파라미터

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `siteIds` | uuid[] | `[siteId]` | 다중 사이트 선택 |
| `description` | string | "외부 API를 통해 자동 생성된 캠페인" | 캠페인 설명 |
| `persona` | string | "expert" | 페르소나 (expert, casual, professional 등) |
| `sectionCount` | number | 5 | 콘텐츠 섹션 개수 |
| `includeImages` | boolean | false | 이미지 포함 여부 |
| `sectionImageCount` | number | 0 | 섹션당 이미지 개수 |
| `includeToc` | boolean | false | 목차 포함 여부 |
| `includeBacklinks` | boolean | true | 백링크 포함 여부 |
| `includeInternalLinks` | boolean | false | 내부 링크 포함 여부 |
| `contentLanguage` | string | "ko" | 콘텐츠 언어 (ko, en 등) |
| `startType` | string | "immediate" | 시작 타입 (immediate, delayed, scheduled) |
| `scheduledStart` | string | null | 예약 시작 시간 (ISO 8601) |
| `delayMinutes` | number | 5 | 지연 시작 시 분 단위 |
| `creditsPerContent` | number | 10 | 콘텐츠당 크레딧 |

---

## 💻 4. 코드 예시

### 4.1 cURL

```bash
curl -X POST https://your-domain.com/api/external/create-campaign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "campaignName": "테스트 캠페인",
    "siteId": "550e8400-e29b-41d4-a716-446655440000",
    "targetSite": "https://example.com",
    "keywords": ["키워드1", "키워드2", "키워드3"],
    "quantity": 10,
    "duration": 5,
    "includeImages": true,
    "includeBacklinks": true
  }'
```

### 4.2 JavaScript (Node.js)

```javascript
const fetch = require('node-fetch');

async function createCampaign(orderData) {
  try {
    const response = await fetch('https://your-domain.com/api/external/create-campaign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
      },
      body: JSON.stringify({
        campaignName: orderData.campaignName,
        siteId: orderData.siteId,
        targetSite: orderData.targetSite,
        keywords: orderData.keywords,
        quantity: orderData.quantity,
        duration: orderData.duration,
        includeImages: true,
        includeBacklinks: true
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('캠페인 생성 성공:', result.campaign_id);
      return result;
    } else {
      console.error('캠페인 생성 실패:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('API 호출 오류:', error);
    throw error;
  }
}

// 사용 예시
createCampaign({
  campaignName: '자동 생성 캠페인',
  siteId: '550e8400-e29b-41d4-a716-446655440000',
  targetSite: 'https://example.com',
  keywords: ['키워드1', '키워드2'],
  quantity: 50,
  duration: 30
});
```

### 4.3 Python

```python
import requests
import json

def create_campaign(order_data):
    url = "https://your-domain.com/api/external/create-campaign"
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_API_KEY"
    }
    
    payload = {
        "campaignName": order_data["campaign_name"],
        "siteId": order_data["site_id"],
        "targetSite": order_data["target_site"],
        "keywords": order_data["keywords"],
        "quantity": order_data["quantity"],
        "duration": order_data["duration"],
        "includeImages": True,
        "includeBacklinks": True
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        result = response.json()
        
        if result.get("success"):
            print(f"캠페인 생성 성공: {result['campaign_id']}")
            return result
        else:
            print(f"캠페인 생성 실패: {result.get('error')}")
            raise Exception(result.get("error"))
    except Exception as e:
        print(f"API 호출 오류: {e}")
        raise

# 사용 예시
create_campaign({
    "campaign_name": "자동 생성 캠페인",
    "site_id": "550e8400-e29b-41d4-a716-446655440000",
    "target_site": "https://example.com",
    "keywords": ["키워드1", "키워드2"],
    "quantity": 50,
    "duration": 30
})
```

---

## 📤 5. 응답 형식

### 5.1 성공 응답 (201 Created)

```json
{
  "success": true,
  "campaign_id": "campaign-uuid",
  "campaign_name": "테스트 캠페인",
  "status": "pending",
  "message": "캠페인이 성공적으로 생성되었습니다.",
  "details": {
    "quantity": 50,
    "duration": 30,
    "keywords": ["키워드1", "키워드2"],
    "target_site": "https://example.com",
    "start_type": "immediate"
  }
}
```

### 5.2 에러 응답

#### 401 Unauthorized (인증 실패)

```json
{
  "success": false,
  "error": "유효하지 않은 API 키입니다."
}
```

#### 400 Bad Request (잘못된 요청)

```json
{
  "success": false,
  "error": "필수 파라미터가 누락되었습니다: campaignName, keywords"
}
```

#### 404 Not Found (사이트 없음)

```json
{
  "success": false,
  "error": "유효하지 않은 siteId입니다. 사이트가 존재하지 않거나 접근 권한이 없습니다."
}
```

#### 500 Internal Server Error (서버 오류)

```json
{
  "success": false,
  "error": "서버 오류가 발생했습니다."
}
```

---

## 🔐 6. 보안 가이드

### 6.1 API 키 보관

- ✅ **서버 환경 변수**에 저장 (`.env` 파일)
- ✅ **비밀 관리 시스템** 사용 (AWS Secrets Manager, Azure Key Vault 등)
- ❌ Git 저장소에 커밋하지 말 것
- ❌ 클라이언트 사이드 코드에 노출하지 말 것

### 6.2 API 키 관리

- 정기적으로 API 키 갱신 (3-6개월마다)
- 사용하지 않는 API 키는 즉시 삭제
- API 키 유출 의심 시 즉시 비활성화 후 새로 생성

### 6.3 HTTPS 사용

- 프로덕션 환경에서는 반드시 HTTPS를 사용하세요.
- HTTP로 API 키를 전송하면 중간자 공격에 노출될 수 있습니다.

---

## 🧪 7. 테스트 방법

### 7.1 API 정보 확인

```bash
curl -X GET https://your-domain.com/api/external/create-campaign
```

이 엔드포인트는 GET 요청 시 API 사용 방법과 파라미터 정보를 반환합니다.

### 7.2 최소 요청 테스트

```bash
curl -X POST https://your-domain.com/api/external/create-campaign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "campaignName": "테스트",
    "siteId": "YOUR_SITE_UUID",
    "targetSite": "https://example.com",
    "keywords": ["테스트"],
    "quantity": 1,
    "duration": 1
  }'
```

### 7.3 전체 옵션 테스트

```bash
curl -X POST https://your-domain.com/api/external/create-campaign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "campaignName": "풀옵션 테스트 캠페인",
    "siteId": "YOUR_SITE_UUID",
    "siteIds": ["SITE_UUID_1", "SITE_UUID_2"],
    "targetSite": "https://example.com",
    "keywords": ["키워드1", "키워드2", "키워드3"],
    "quantity": 50,
    "duration": 30,
    "description": "테스트용 캠페인입니다",
    "persona": "expert",
    "sectionCount": 7,
    "includeImages": true,
    "sectionImageCount": 2,
    "includeToc": true,
    "includeBacklinks": true,
    "includeInternalLinks": true,
    "contentLanguage": "ko",
    "startType": "delayed",
    "delayMinutes": 10,
    "creditsPerContent": 15
  }'
```

---

## 🚀 8. 배포 체크리스트

### 8.1 환경 변수 설정

프로덕션 환경에 다음 환경 변수가 설정되어 있는지 확인:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_API_URL=https://your-fastapi-backend.com
```

### 8.2 Supabase 마이그레이션 적용

```bash
# backend/migrations/create_api_keys_table.sql 실행
# Supabase 대시보드 또는 CLI로 마이그레이션 적용
```

### 8.3 API 키 생성

- 프로덕션 환경에서 API 키 생성
- 외부 프로젝트 서버에 환경 변수로 설정

---

## 🔍 9. 문제 해결

### 9.1 401 Unauthorized

**원인**: API 키가 유효하지 않거나 비활성화됨

**해결**:
- API 키가 정확한지 확인
- 대시보드에서 API 키 활성화 상태 확인
- API 키 앞뒤 공백 제거

### 9.2 400 Bad Request

**원인**: 필수 파라미터 누락 또는 잘못된 형식

**해결**:
- 필수 파라미터 모두 포함되었는지 확인
- `keywords`가 배열 형식인지 확인
- `quantity`, `duration`이 양수인지 확인

### 9.3 404 Not Found

**원인**: `siteId`가 존재하지 않거나 접근 권한 없음

**해결**:
- 대시보드에서 사이트 목록 확인
- 올바른 사이트 UUID 사용
- 해당 사용자의 사이트인지 확인

### 9.4 500 Internal Server Error

**원인**: 서버 내부 오류

**해결**:
- 서버 로그 확인
- Supabase 연결 상태 확인
- FastAPI 백엔드 상태 확인

---

## 📊 10. 캠페인 생성 후 확인

캠페인 생성 후 다음 방법으로 확인할 수 있습니다:

1. **대시보드**: `/dashboard` 페이지에서 최근 캠페인 확인
2. **캠페인 목록**: `/campaigns` 페이지에서 상세 정보 확인
3. **로그**: `/logs` 페이지에서 콘텐츠 생성 진행 상황 확인
4. **통계**: `/statistics` 페이지에서 진행률 모니터링

---

## 🔄 11. 워크플로우 예시

### 외부 프로젝트에서 주문 발생 시

```javascript
// 1. 주문 데이터 수신
const order = {
  customer: "고객명",
  product: "백링크 패키지 50개",
  targetSite: "https://customer-site.com",
  keywords: ["키워드1", "키워드2"]
};

// 2. PBN API로 캠페인 생성
const campaignResult = await fetch('https://pbn-domain.com/api/external/create-campaign', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.PBN_API_KEY}`
  },
  body: JSON.stringify({
    campaignName: `${order.customer} - ${order.product}`,
    siteId: process.env.DEFAULT_SITE_ID,
    targetSite: order.targetSite,
    keywords: order.keywords,
    quantity: 50,
    duration: 30,
    includeBacklinks: true
  })
});

const result = await campaignResult.json();

if (result.success) {
  console.log('✅ 캠페인 생성 완료:', result.campaign_id);
  // 3. 주문 시스템에 캠페인 ID 저장
  await saveOrderCampaignId(order.id, result.campaign_id);
} else {
  console.error('❌ 캠페인 생성 실패:', result.error);
  // 4. 에러 처리 (재시도, 알림 등)
}
```

---

## 📞 12. 지원

문제가 발생하거나 추가 기능이 필요한 경우:

- 이메일: support@your-domain.com
- 대시보드 헬프 센터: `/help`

---

**문서 버전**: 1.0  
**최종 수정**: 2026년 3월 5일  
**작성자**: PBN SaaS 개발팀
