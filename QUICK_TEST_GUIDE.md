# ⚡ 빠른 API 테스트 가이드

로컬에서 `app.goatpbn.com` 서버로 API 호출하여 실제 캠페인이 생성되는지 테스트하는 방법입니다.

---

## 🎯 목표

로컬 컴퓨터에서 API를 호출하여 `app.goatpbn.com` 서버에 실제 캠페인을 생성하고 작동을 확인합니다.

---

## 📋 사전 준비 (5분)

### 1단계: API 키 생성

1. 브라우저에서 https://app.goatpbn.com/settings/api-keys 접속
2. 로그인
3. **"새 API 키 생성"** 버튼 클릭
4. API 키 이름 입력 (예: "로컬 테스트용")
5. 생성된 API 키를 **복사**하여 메모장에 저장

⚠️ **중요**: API 키는 생성 시 한 번만 표시됩니다!

### 2단계: 사이트 ID 확인

1. https://app.goatpbn.com/sites 접속
2. 사용할 워드프레스 사이트의 **ID 복사** (UUID 형식)
3. 메모장에 저장

---

## 🚀 테스트 방법 (3가지)

### 방법 1: 대화형 테스트 스크립트 (가장 쉬움) ⭐

```bash
# 프로젝트 폴더에서 실행
cd d:\Documents\ablepro\nextjs\nextjs\seed

# 테스트 스크립트 실행
node test-production-api.js
```

스크립트가 실행되면:
1. API 키 입력 프롬프트 → 복사한 API 키 붙여넣기
2. 사이트 ID 입력 프롬프트 → 복사한 사이트 UUID 붙여넣기
3. 확인 (y/n) → `y` 입력
4. 결과 확인!

**장점**: 
- 가장 간단하고 안전
- 입력 실수 방지
- 자세한 결과 출력

---

### 방법 2: cURL (빠른 테스트)

Windows PowerShell에서:

```powershell
# 변수 설정 (여기에 실제 값 입력)
$API_KEY = "your_api_key_here"
$SITE_ID = "your_site_uuid_here"

# API 호출
curl.exe -X POST https://app.goatpbn.com/api/external/create-campaign `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $API_KEY" `
  -d '{
    \"campaignName\": \"cURL 테스트 캠페인\",
    \"siteId\": \"'$SITE_ID'\",
    \"targetSite\": \"https://example.com\",
    \"keywords\": [\"테스트1\", \"테스트2\"],
    \"quantity\": 3,
    \"duration\": 2
  }'
```

또는 한 줄로:

```powershell
curl.exe -X POST https://app.goatpbn.com/api/external/create-campaign -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_API_KEY" -d "{\"campaignName\":\"테스트\",\"siteId\":\"YOUR_SITE_UUID\",\"targetSite\":\"https://example.com\",\"keywords\":[\"테스트\"],\"quantity\":3,\"duration\":2}"
```

**장점**: 
- 매우 빠름
- 추가 설치 불필요

---

### 방법 3: Postman (상세 테스트)

#### 3.1 Postman 설치
- https://www.postman.com/downloads/ 에서 다운로드

#### 3.2 요청 설정

1. **Method**: `POST`
2. **URL**: `https://app.goatpbn.com/api/external/create-campaign`
3. **Headers** 탭:
   - Key: `Content-Type`, Value: `application/json`
   - Key: `Authorization`, Value: `Bearer YOUR_API_KEY`
4. **Body** 탭 → `raw` 선택 → `JSON` 선택
5. 아래 JSON 붙여넣기:

```json
{
  "campaignName": "Postman 테스트 캠페인",
  "siteId": "YOUR_SITE_UUID",
  "targetSite": "https://example.com",
  "keywords": ["테스트1", "테스트2", "테스트3"],
  "quantity": 5,
  "duration": 3,
  "includeBacklinks": true,
  "includeToc": true
}
```

6. **Send** 버튼 클릭

**장점**: 
- 시각적으로 보기 쉬움
- 요청/응답 히스토리 저장
- 다양한 테스트 케이스 관리

---

## 📊 성공 응답 예시

```json
{
  "success": true,
  "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
  "campaign_name": "테스트 캠페인",
  "status": "pending",
  "message": "캠페인이 성공적으로 생성되었습니다.",
  "details": {
    "quantity": 5,
    "duration": 3,
    "keywords": ["테스트1", "테스트2"],
    "target_site": "https://example.com",
    "start_type": "delayed"
  }
}
```

---

## ✅ 결과 확인 방법

### 1. 대시보드에서 확인
https://app.goatpbn.com/dashboard
- 최근 캠페인 섹션에 새 캠페인 표시됨

### 2. 캠페인 목록에서 확인
https://app.goatpbn.com/campaigns
- 방금 생성한 캠페인의 상세 정보 확인

### 3. 로그에서 실시간 확인
https://app.goatpbn.com/logs
- 5분 후부터 콘텐츠 생성 로그가 나타남

### 4. 통계에서 확인
https://app.goatpbn.com/statistics
- 캠페인 진행률 차트에 추가됨

---

## ❌ 에러 해결

### 401 Unauthorized
```json
{
  "success": false,
  "error": "유효하지 않은 API 키입니다."
}
```

**해결 방법**:
- API 키를 다시 확인하세요
- https://app.goatpbn.com/settings/api-keys 에서 API 키가 활성화되어 있는지 확인
- 앞뒤 공백이 없는지 확인

### 404 Not Found
```json
{
  "success": false,
  "error": "유효하지 않은 siteId입니다."
}
```

**해결 방법**:
- 사이트 ID가 올바른지 확인
- https://app.goatpbn.com/sites 에서 사이트 목록 확인
- 해당 사이트가 본인 계정에 등록되어 있는지 확인

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Too Many Requests",
  "retry_after": 30
}
```

**해결 방법**:
- 분당 10회 제한 초과
- 30초 후 다시 시도

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "서버 오류가 발생했습니다."
}
```

**해결 방법**:
- 서버 상태 확인
- 잠시 후 다시 시도
- 문제가 지속되면 관리자에게 문의

---

## 🎯 추천 테스트 순서

### 1차 테스트: 최소 파라미터
```json
{
  "campaignName": "최소 테스트",
  "siteId": "YOUR_SITE_UUID",
  "targetSite": "https://example.com",
  "keywords": ["테스트"],
  "quantity": 1,
  "duration": 1
}
```

### 2차 테스트: 일반 옵션
```json
{
  "campaignName": "일반 테스트",
  "siteId": "YOUR_SITE_UUID",
  "targetSite": "https://example.com",
  "keywords": ["테스트1", "테스트2"],
  "quantity": 5,
  "duration": 3,
  "includeBacklinks": true
}
```

### 3차 테스트: 풀 옵션
```json
{
  "campaignName": "풀옵션 테스트",
  "siteId": "YOUR_SITE_UUID",
  "targetSite": "https://example.com",
  "keywords": ["테스트1", "테스트2", "테스트3"],
  "quantity": 10,
  "duration": 5,
  "persona": "expert",
  "sectionCount": 7,
  "includeImages": true,
  "sectionImageCount": 2,
  "includeToc": true,
  "includeBacklinks": true,
  "includeInternalLinks": true
}
```

---

## 💡 팁

### 빠른 테스트를 위한 설정
- `quantity`: 1-5개 (적은 수량으로 빠르게 테스트)
- `duration`: 1-3일 (짧은 기간)
- `startType`: "delayed" (5분 후 시작)
- `includeImages`: false (이미지 생성 시간 절약)

### 실제 운영을 위한 설정
- `quantity`: 30-100개
- `duration`: 15-30일
- `startType`: "immediate" 또는 "scheduled"
- `includeImages`: true (콘텐츠 품질 향상)

---

## 📞 도움이 필요하신가요?

### 테스트 실패 시
1. API 키와 사이트 ID를 다시 확인
2. https://app.goatpbn.com 이 정상 작동하는지 확인
3. 브라우저 개발자 도구 콘솔 확인

### 추가 문서
- **상세 API 가이드**: `API_INTEGRATION_GUIDE.md`
- **설정 가이드**: `SETUP_INSTRUCTIONS.md`
- **구현 보고서**: `README_API_INTEGRATION.md`

---

**작성일**: 2026년 3월 5일  
**권장 테스트 방법**: 방법 1 (대화형 스크립트) ⭐
