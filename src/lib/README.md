# 📁 src/lib/ Directory

## 🎯 Purpose

API 클라이언트, Supabase 연동, 유틸리티 함수 모음입니다.
백엔드와의 통신 및 데이터 처리를 담당합니다.

---

## 📂 Directory Structure

```
lib/
├── api/                   # 🌐 백엔드 API 호출 함수
├── utils/                 # 🛠️ 유틸리티 함수
├── cache/                 # 💾 캐싱 로직
├── activity/              # 📊 활동 로깅
└── supabase.js            # 🗄️ Supabase 클라이언트
```

---

## 🌐 API Clients (`/api`)

### ⭐ `campaigns.js` - **캠페인 API**

**백엔드 캠페인 API와 통신**

```javascript
// 캠페인 목록 조회
export async function getCampaigns(userId)

// 캠페인 생성
export async function createCampaign(campaignData)

// 캠페인 시작
export async function startCampaign(campaignId, userId)

// 캠페인 중지
export async function pauseCampaign(campaignId, userId)

// 캠페인 삭제
export async function deleteCampaign(campaignId, userId)
```

**사용 예시**:

```jsx
import { getCampaigns, createCampaign } from '@/lib/api/campaigns';

// 캠페인 조회
const campaigns = await getCampaigns(userId);

// 캠페인 생성
const newCampaign = await createCampaign({
  name: '테스트 캠페인',
  target_site: 'https://example.com',
  keywords: ['키워드1', '키워드2'],
  quantity: 50,
  duration: 30
});
```

---

### `logs.js` - **로그 API**

**콘텐츠 생성 로그 조회**

```javascript
// 로그 목록 조회
export async function getLogs(userId, filters = {})

// 캠페인별 로그 조회
export async function getCampaignLogs(campaignId, userId)

// 로그 통계
export async function getLogStatistics(userId)
```

**사용 예시**:

```jsx
import { getLogs } from '@/lib/api/logs';

const logs = await getLogs(userId, {
  status: 'success',
  limit: 20
});
```

---

### `sites.js` - **사이트 API**

**워드프레스 사이트 관리**

```javascript
// 사이트 목록 조회
export async function getSites(userId)

// 사이트 추가
export async function addSite(siteData)

// 사이트 연결 테스트
export async function testSiteConnection(siteId)

// 사이트 삭제
export async function deleteSite(siteId)
```

---

### `keyword.js` - **키워드 API**

```javascript
export async function generateKeywords(mainKeyword)
```

### `title.js` - **제목 API**

```javascript
export async function generateTitle(keywords, persona)
```

### `contentStructure.js` - **구조 API**

```javascript
export async function generateStructure(title, keywords, sectionCount)
```

### `sectionContent.js` - **섹션 API**

```javascript
export async function generateSectionContent(section, keywords)
```

### `activity.js` - **활동 API**

```javascript
export async function logActivity(userId, action, details)
export async function getActivities(userId)
```

---

## 🗄️ **Supabase Client**

### `supabase.js` ⭐

**Supabase 직접 연결 (프론트엔드용)**

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**사용 예시**:

```jsx
import { supabase } from '@/lib/supabase';

// 실시간 구독
const subscription = supabase
  .channel('campaigns')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'campaigns'
    },
    (payload) => {
      console.log('변경됨:', payload);
    }
  )
  .subscribe();

// 직접 쿼리
const { data, error } = await supabase.from('campaigns').select('*').eq('user_id', userId);
```

---

## 🛠️ **Utilities** (`/utils`)

### `timeUtils.js`

**시간 관련 유틸리티**

```javascript
// UTC를 로컬 시간으로 변환
export function formatToLocalTime(utcDate, timezone = 'Asia/Seoul')

// 상대 시간 표시 ("3분 전")
export function getRelativeTime(date)

// 날짜 포맷팅
export function formatDate(date, format = 'YYYY-MM-DD')
```

**사용 예시**:

```jsx
import { formatToLocalTime, getRelativeTime } from '@/lib/utils/timeUtils';

const localTime = formatToLocalTime('2025-11-03T09:20:03Z');
// "2025-11-03 18:20:03"

const relative = getRelativeTime('2025-11-03T09:20:03Z');
// "3시간 전"
```

---

### `userTimeZone.js`

**사용자 시간대 관리**

```javascript
// 브라우저 시간대 감지
export function detectUserTimezone()

// 사용자 시간대 저장
export async function saveUserTimezone(userId, timezone)

// 사용자 시간대 조회
export async function getUserTimezone(userId)
```

---

## 💾 **Cache** (`/cache`)

### `logCache.js`

**로그 데이터 캐싱**

```javascript
// 로그 캐시 저장
export function cacheLog(logId, logData)

// 로그 캐시 조회
export function getCachedLog(logId)

// 캐시 무효화
export function invalidateLogCache()
```

**기능**:

- 로그 페이지 성능 최적화
- 중복 API 호출 방지
- 5분 TTL

---

## 📊 **Activity** (`/activity`)

### `inMemoryActivityLogger.js`

**인메모리 활동 로거**

```javascript
export class ActivityLogger {
  logPageView(userId, page)
  logAction(userId, action, details)
  getRecentActivities(userId, limit = 10)
}
```

**사용 예시**:

```jsx
import { activityLogger } from '@/lib/activity/inMemoryActivityLogger';

// 페이지 뷰 로깅
activityLogger.logPageView(userId, '/dashboard');

// 액션 로깅
activityLogger.logAction(userId, 'campaign_created', {
  campaignId: '123',
  name: '테스트 캠페인'
});
```

---

## 🔧 How to Add New API Function

### 1. API 함수 파일 생성/수정

```javascript
// lib/api/my_feature.js
import { buildApiUrl, jsonHeaders } from '@/lib/api/httpClient';

export async function getMyData(userId) {
  try {
    const response = await fetch(`${buildApiUrl('/api/my-feature')}?user_id=${userId}`, {
      method: 'GET',
      headers: jsonHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API 오류:', error);
    throw error;
  }
}
```

### 2. 페이지에서 사용

```jsx
import { getMyData } from '@/lib/api/my_feature';

const MyPage = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const result = await getMyData(userId);
      setData(result);
    }
    fetchData();
  }, [userId]);

  return <div>{/* 데이터 표시 */}</div>;
};
```

---

## 🔍 Quick Reference

| 기능              | 파일                 | 주요 함수                        |
| ----------------- | -------------------- | -------------------------------- |
| **캠페인 관리**   | `api/campaigns.js`   | `getCampaigns`, `createCampaign` |
| **로그 조회**     | `api/logs.js`        | `getLogs`, `getCampaignLogs`     |
| **사이트 관리**   | `api/sites.js`       | `getSites`, `addSite`            |
| **키워드 생성**   | `api/keyword.js`     | `generateKeywords`               |
| **Supabase 연결** | `supabase.js`        | `supabase` client                |
| **시간 변환**     | `utils/timeUtils.js` | `formatToLocalTime`              |
| **로그 캐싱**     | `cache/logCache.js`  | `cacheLog`                       |

---

## ⚠️ Important Notes

### API Base URL

```javascript
import { getApiBaseUrl } from '@/lib/api/httpClient';

const API_BASE_URL = `${getApiBaseUrl()}/api`;
```

### Error Handling

```javascript
try {
  const data = await apiFunction();
  return data;
} catch (error) {
  console.error('API 오류:', error);
  // 사용자에게 알림
  openSnackbar({
    message: '데이터 로드 실패',
    variant: 'alert',
    alert: { color: 'error' }
  });
  throw error;
}
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJ...
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

---

## 🔗 Related Files

- **API 사용**: `../app/` (페이지들)
- **환경변수**: `../../.env.local` (생성 필요)
- **백엔드 API**: `../../backend/src/api/`

---

**최종 업데이트**: 2025-11-03  
**작성자**: Frontend Team
